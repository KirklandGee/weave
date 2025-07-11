from langchain_core.messages import HumanMessage
from backend.models.schemas import LLMMessage
from .llm_providers import get_llm_instance
from .config import ROLE_MAP, DEFAULT_LLM_CONFIG
from backend.logging.trace import traced, trace_span
from tenacity import retry, stop_after_attempt, wait_random, retry_if_exception_type


def to_langchain_messages(messages):
    return [
        ROLE_MAP.get(msg.role, HumanMessage)(content=msg.content) for msg in messages
    ]


@retry(
    stop=stop_after_attempt(3),
    wait=wait_random(1, 2),
    retry=retry_if_exception_type((TimeoutError, ConnectionError)),
)
@traced("llm_call")
async def call_llm(
    messages: list[LLMMessage], user_id=None, stream: bool = True, **overrides
):
    print("Calling LLM")
    if isinstance(messages, LLMMessage):
        messages = [messages]
    # Merge default config and per-call overrides (overrides win)
    config = {**DEFAULT_LLM_CONFIG, **overrides}
    llm = get_llm_instance(config)
    messages = to_langchain_messages(messages)
    print(messages)

    try:
        if stream:
            async for chunk in llm.astream(messages):
                yield chunk.text()
        else:
            result = await llm.ainvoke(messages)
            response = str(result.text())
            print("status=success")
            print(f"response_preview={response[:200]}")
            yield response
    except Exception as e:
        print("status=error")
        print(f"error={str(e)}")
        raise
