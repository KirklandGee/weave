from langchain_core.messages import HumanMessage, SystemMessage, AIMessage

DEFAULT_LLM_CONFIG = {
    "model": "llama3.1",
    "temperature": 0.5,
    "max_tokens": 4096,
    # ... any other defaults ...
}

ROLE_MAP = {"human": HumanMessage, "system": SystemMessage, "ai": AIMessage}
