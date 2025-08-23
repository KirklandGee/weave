from langchain_core.messages import HumanMessage, SystemMessage
from backend.models.schemas import LLMMessage
from .llm_providers import get_llm_instance
from .config import ROLE_MAP, DEFAULT_LLM_CONFIG
from .token_counter import TokenCounter
from .prompts.base_chat import get_base_system_prompt
from backend.observability.trace import traced
from backend.services.usage_service import UsageService
from backend.services.security.security_service import security_service
from tenacity import retry, stop_after_attempt, wait_random, retry_if_exception_type
from fastapi import HTTPException
from decimal import Decimal
from typing import Optional
import time
import logging
import asyncio

# Configure logger to ensure timing logs are visible
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# Alternative: Always ensure there's a system message
def to_langchain_messages(messages, context="", verbosity="normal"):
    langchain_messages = []
    
    # STATIC CONTENT FIRST (cacheable)
    # Add base system prompt for latency optimization (from OpenAI guide)
    has_system_message = any(msg.role == "system" for msg in messages)
    if not has_system_message:
        langchain_messages.append(SystemMessage(content=get_base_system_prompt(verbosity)))
    
    # Add user-provided system messages
    for msg in messages:
        if msg.role == "system":
            langchain_messages.append(SystemMessage(content=msg.content))
    
    # Add context as separate system message if provided
    # This keeps static system prompts cacheable while adding dynamic context
    if context:
        langchain_messages.append(SystemMessage(content=f"Campaign Context:\n{context}"))
    
    # DYNAMIC CONTENT LAST
    # Add non-system messages at the end
    for msg in messages:
        if msg.role != "system":
            langchain_messages.append(
                ROLE_MAP.get(msg.role, HumanMessage)(content=msg.content)
            )
    
    return langchain_messages


async def _count_tokens_async(langchain_messages, model):
    """Async wrapper for token counting to enable parallelization."""
    start = time.time()
    result = TokenCounter.count_tokens_in_langchain_messages(langchain_messages, model)
    print(f"🔢 Token counting took {(time.time() - start)*1000:.1f}ms")
    return result


async def _get_llm_instance_async(config):
    """Async wrapper for LLM instance creation to enable parallelization."""
    start = time.time()
    result = get_llm_instance(config)
    print(f"🤖 LLM instance creation took {(time.time() - start)*1000:.1f}ms")
    return result


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
    verbosity: str = "normal",
    **overrides,
):
    start_time = time.time()
    print(f"🚀 Starting LLM call for user {user_id}")
    
    # SECURITY: Check rate limits first
    if user_id:
        rate_allowed, rate_error = security_service.check_rate_limits(user_id)
        if not rate_allowed:
            raise HTTPException(status_code=429, detail=rate_error)
    
    # SECURITY: Validate request for prompt injection and other threats
    security_start = time.time()
    is_safe, security_error, sanitized_messages = security_service.validate_llm_request(
        messages=messages,
        context=context,
        user_id=user_id
    )
    security_time = time.time()
    print(f"🛡️ Security validation completed in {(security_time - security_start)*1000:.1f}ms")
    
    if not is_safe:
        print(f"🚨 Request blocked by security service for user {user_id}")
        # Return security error as a generator to match expected interface
        async def security_response():
            yield security_error
        return security_response()
    
    # Use sanitized messages if provided
    if sanitized_messages:
        messages = sanitized_messages
        print(f"🧹 Using sanitized messages for user {user_id}")
    
    print(f"🔒 Total security overhead: {(security_time - start_time)*1000:.1f}ms")
    
    if isinstance(messages, LLMMessage):
        messages = [messages]

    # Merge default config and per-call overrides (overrides win)
    config = {**DEFAULT_LLM_CONFIG, **overrides}
    model = config.get("model", DEFAULT_LLM_CONFIG["model"])
    
    setup_time = time.time()
    print(f"⚙️ Setup completed in {(setup_time - start_time)*1000:.1f}ms")

    # Convert to langchain messages
    langchain_messages = to_langchain_messages(messages, context=context, verbosity=verbosity)
    
    message_time = time.time()
    print(f"📝 Message conversion completed in {(message_time - setup_time)*1000:.1f}ms")

    # OPTIMISTIC APPROACH: Start LLM call immediately, do validation in parallel
    llm = get_llm_instance(config)
    llm_ready_time = time.time()
    print(f"🤖 LLM instance ready in {(llm_ready_time - message_time)*1000:.1f}ms")
    
    # Start the LLM stream IMMEDIATELY (optimistic)
    stream_start_time = time.time()
    llm_stream = llm.astream(langchain_messages)
    print(f"🚀 LLM stream started in {(time.time() - stream_start_time)*1000:.1f}ms")
    
    # Do validation in parallel while LLM is processing
    validation_start = time.time()
    input_tokens = await _count_tokens_async(langchain_messages, model)
    validation_time = time.time()
    print(f"🔍 Validation completed in {(validation_time - validation_start)*1000:.1f}ms")

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

        # If usage exceeded, we need to cancel the stream
        if not UsageService.check_usage_limit(user_id, estimated_cost):
            # Try to cancel the stream (may not work with all providers)
            try:
                await llm_stream.aclose()
            except:
                pass
            
            usage_summary = UsageService.get_usage_summary(user_id)
            raise HTTPException(
                status_code=429,
                detail=f"Usage limit exceeded. Current usage: ${usage_summary.current_month_usage:.4f}, "
                f"Limit: ${usage_summary.monthly_limit:.2f}, "
                f"Estimated cost: ${estimated_cost:.4f}",
            )
    
    usage_check_time = time.time()
    print(f"💰 Usage check completed in {(usage_check_time - validation_time)*1000:.1f}ms")
    print(f"⏱️ Total validation time: {(usage_check_time - validation_start)*1000:.1f}ms")
    print(f"📊 Stream started at: {(stream_start_time - start_time)*1000:.1f}ms from request start")
    
    full_response = ""

    try:
        if stream:
            first_chunk = True
            async for chunk in llm_stream:
                if first_chunk:
                    first_chunk_time = time.time()
                    print(f"🎯 First chunk received in {(first_chunk_time - stream_start_time)*1000:.1f}ms from stream start")
                    print(f"📊 Total time to first response: {(first_chunk_time - start_time)*1000:.1f}ms")
                    first_chunk = False
                
                chunk_text = chunk.text()
                full_response += chunk_text
                yield chunk_text
        else:
            result = await llm.ainvoke(langchain_messages)
            full_response = str(result.text())
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

    except Exception as e:
        print("status=error")
        print(f"error={str(e)}")
        raise
