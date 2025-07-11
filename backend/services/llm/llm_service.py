from langchain_core.messages import HumanMessage
from models.schemas import LLMMessage
from llm_providers import get_llm_instance
from config import ROLE_MAP, DEFAULT_LLM_CONFIG
from logging.trace import traced, trace_span
from tenacity import retry, stop_after_attempt, wait_random, retry_if_exception_type


def to_langchain_messages(messages):
    return [
        ROLE_MAP.get(msg.role, HumanMessage)(content=msg.content) for msg in messages
    ]
@retry(
    stop=stop_after_attempt(3),
    wait=wait_random(1,2),
    retry=retry_if_exception_type((TimeoutError, ConnectionError))
)
@traced('llm_call')
def call_llm(messages: LLMMessage, user_id=None, stream: bool = True, **overrides):
    # Merge default config and per-call overrides (overrides win)
    config = {**DEFAULT_LLM_CONFIG, **overrides}
    llm = get_llm_instance(config)

    # Message conversion here if needed
    langchain_messages = to_langchain_messages(messages)

    # Call the model and return standardized output
    response = llm.invoke(langchain_messages)
    return {
        "response": str(response.content),
        "model": config["model"],
        "used_config": config,
    }
