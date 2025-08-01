import os
from langchain_ollama import ChatOllama
from langchain_openai import ChatOpenAI
from langchain_google_genai import ChatGoogleGenerativeAI

def create_gemini_provider(config):
    # Remove streaming from config if present to avoid warnings
    clean_config = {k: v for k, v in config.items() if k != 'streaming'}
    
    # Ensure we use API key authentication
    if 'google_api_key' not in clean_config:
        clean_config['google_api_key'] = os.getenv('GOOGLE_API_KEY')
    
    return ChatGoogleGenerativeAI(**clean_config)

def create_openai_provider(config):
    # Remove streaming from config for OpenAI to avoid conflicts
    clean_config = {k: v for k, v in config.items() if k != 'streaming'}
    return ChatOpenAI(**clean_config)

def create_ollama_provider(config):
    # Remove streaming from config for Ollama to avoid conflicts
    clean_config = {k: v for k, v in config.items() if k != 'streaming'}
    return ChatOllama(base_url="http://host.docker.internal:11434", **clean_config)

LLM_PROVIDERS = {
    "llama": create_ollama_provider,
    "gpt": create_openai_provider,
    "gemini": create_gemini_provider,
}


def get_llm_instance(config):
    print("Getting LLM providers...")
    model = config["model"]
    print(model)
    for prefix, builder in LLM_PROVIDERS.items():
        if model.startswith(prefix):
            return builder(config)
    raise ValueError(f"Unknown model: {model}")
