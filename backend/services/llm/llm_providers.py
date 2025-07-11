from langchain_ollama import ChatOllama
from langchain_openai import ChatOpenAI

LLM_PROVIDERS = {
    "llama": lambda config: ChatOllama(**config),
    "gpt":   lambda config: ChatOpenAI(**config),
    # Add more as needed
}

def get_llm_instance(config):
    print("Getting LLM providers...")
    model = config["model"]
    print(model)
    for prefix, builder in LLM_PROVIDERS.items():
        if model.startswith(prefix):
            return builder(config)
    raise ValueError(f"Unknown model: {model}")