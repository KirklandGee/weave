from langchain_ollama import ChatOllama
from langchain_openai import ChatOpenAI
from langchain_google_genai import ChatGoogleGenerativeAI

LLM_PROVIDERS = {
    "llama": lambda config: ChatOllama(base_url="http://host.docker.internal:11434", **config),
    "gpt":   lambda config: ChatOpenAI(**config),
    "gemini": lambda config: ChatGoogleGenerativeAI(**config)
}

def get_llm_instance(config):
    print("Getting LLM providers...")
    model = config["model"]
    print(model)
    for prefix, builder in LLM_PROVIDERS.items():
        if model.startswith(prefix):
            return builder(config)
    raise ValueError(f"Unknown model: {model}")