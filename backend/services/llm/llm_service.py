from langchain_core.messages import HumanMessage, SystemMessage
from backend.models.schemas import LLMMessage
from .llm_providers import get_llm_instance
from .config import ROLE_MAP, DEFAULT_LLM_CONFIG
from .token_counter import TokenCounter
from backend.observability.trace import traced
from backend.services.usage_service import UsageService
from tenacity import retry, stop_after_attempt, wait_random, retry_if_exception_type
from fastapi import HTTPException
from decimal import Decimal
from typing import Optional


# Alternative: Always ensure there's a system message
def to_langchain_messages(messages, context=""):
    langchain_messages = []
    has_system = any(msg.role == "system" for msg in messages)

    if context and not has_system:
        # Add a system message with just the context
        langchain_messages.append(
            SystemMessage(content=f"Additional Context:\n{context}")
        )

    for msg in messages:
        if msg.role == "system" and context:
            enhanced_content = f"{msg.content}\n\nAdditional Context:\n{context}"
            langchain_messages.append(SystemMessage(content=enhanced_content))
        else:
            langchain_messages.append(
                ROLE_MAP.get(msg.role, HumanMessage)(content=msg.content)
            )

    return langchain_messages


@retry(
    stop=stop_after_attempt(3),
    wait=wait_random(1, 2),
    retry=retry_if_exception_type((TimeoutError, ConnectionError)),
)
@traced("llm_call")
async def call_llm(
    messages: list[LLMMessage],
    context: str,
    user_id: Optional[str] = None,
    stream: bool = True,
    campaign_id: Optional[str] = None,
    session_id: Optional[str] = None,
    **overrides,
):
    print("Calling LLM")
    if isinstance(messages, LLMMessage):
        messages = [messages]

    # Merge default config and per-call overrides (overrides win)
    config = {**DEFAULT_LLM_CONFIG, **overrides}
    model = config.get("model", DEFAULT_LLM_CONFIG["model"])

    # Convert to langchain messages
    langchain_messages = to_langchain_messages(messages, context=context)
    print(langchain_messages)

    # Count input tokens
    input_tokens = TokenCounter.count_tokens_in_langchain_messages(
        langchain_messages, model
    )

    # Check usage limits if user_id is provided
    if user_id:
        # Estimate cost for this request
        max_tokens = config.get("max_tokens", 4096)
        estimated_output_tokens = TokenCounter.estimate_response_tokens(
            model, max_tokens
        )
        estimated_cost = UsageService.calculate_cost(
            model, input_tokens, estimated_output_tokens
        )

        # Check if user can afford this request
        if not UsageService.check_usage_limit(user_id, estimated_cost):
            usage_summary = UsageService.get_usage_summary(user_id)
            raise HTTPException(
                status_code=429,
                detail=f"Usage limit exceeded. Current usage: ${usage_summary.current_month_usage:.4f}, "
                f"Limit: ${usage_summary.monthly_limit:.2f}, "
                f"Estimated cost: ${estimated_cost:.4f}",
            )

    llm = get_llm_instance(config)
    full_response = ""

    try:
        if stream:
            async for chunk in llm.astream(langchain_messages):
                chunk_text = chunk.text()
                full_response += chunk_text
                yield chunk_text
        else:
            result = await llm.ainvoke(langchain_messages)
            full_response = str(result.text())
            print("status=success")
            print(f"response_preview={full_response[:200]}")
            yield full_response

        # Record usage after successful completion
        if user_id and full_response:
            output_tokens = TokenCounter.count_tokens_in_text(full_response, model)
            UsageService.record_usage(
                user_id=user_id,
                model=model,
                input_tokens=input_tokens,
                output_tokens=output_tokens,
                campaign_id=campaign_id,
                session_id=session_id,
            )
            print(
                f"Recorded usage: {input_tokens} input + {output_tokens} output tokens for user {user_id}"
            )

    except Exception as e:
        print("status=error")
        print(f"error={str(e)}")
        raise
