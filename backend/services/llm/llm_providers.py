import os
import hashlib
import json
import time
from typing import Dict, Tuple, Any
from langchain_openai import ChatOpenAI
from langchain_google_genai import ChatGoogleGenerativeAI

# LLM instance pool: config_hash -> (instance, last_used_timestamp)
_llm_pool: Dict[str, Tuple[Any, float]] = {}
POOL_TTL = 1800  # 30 minutes - keep instances alive longer
MAX_POOL_SIZE = 20  # More instances since they're lightweight once created

# Pre-warm common configurations - matching DEFAULT_LLM_CONFIG
_DEFAULT_CONFIGS = [
    {"model": "gpt-5-mini", "max_tokens": 1024, "streaming": True, "temperature": 0.7},    # Primary default model
    {"model": "gpt-5", "max_tokens": 1024, "streaming": True, "temperature": 0.7},         # Secondary model
    {"model": "gpt-4o-mini", "max_tokens": 1024, "streaming": True, "temperature": 0.7},   # Fallback model
    {"model": "gpt-4o", "max_tokens": 1024, "streaming": True, "temperature": 0.7},        # Fallback model
]

def _get_config_hash(config: dict) -> str:
    """Create a hash of the config to use as cache key."""
    # Sort the config to ensure consistent hashing
    sorted_config = json.dumps(config, sort_keys=True)
    return hashlib.md5(sorted_config.encode()).hexdigest()

def _cleanup_expired_instances():
    """Remove expired instances from the pool."""
    current_time = time.time()
    expired_keys = [
        key for key, (instance, timestamp) in _llm_pool.items()
        if current_time - timestamp > POOL_TTL
    ]
    for key in expired_keys:
        del _llm_pool[key]

def _evict_oldest_if_needed():
    """Evict oldest instance if pool is at capacity."""
    if len(_llm_pool) >= MAX_POOL_SIZE:
        # Find the oldest instance
        oldest_key = min(_llm_pool.keys(), key=lambda k: _llm_pool[k][1])
        del _llm_pool[oldest_key]

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

LLM_PROVIDERS = {
    "gpt": create_openai_provider,
    "gemini": create_gemini_provider,
}


def _prewarm_instances():
    """Pre-warm common LLM instances to avoid cold starts."""
    print("🔥 Pre-warming LLM instances...")
    for config in _DEFAULT_CONFIGS:
        try:
            # Create instance without going through the pool
            model = config["model"]
            for prefix, builder in LLM_PROVIDERS.items():
                if model.startswith(prefix):
                    instance = builder(config)
                    config_hash = _get_config_hash(config)
                    _llm_pool[config_hash] = (instance, time.time())
                    print(f"✅ Pre-warmed {model}")
                    break
        except Exception as e:
            print(f"❌ Failed to pre-warm {config['model']}: {e}")


def get_llm_instance(config):
    """Get an LLM instance, using pooling to reuse instances with the same config."""
    # Pre-warm on first call
    if not _llm_pool:
        _prewarm_instances()
    
    # Clean up expired instances first
    _cleanup_expired_instances()
    
    # Get config hash for pooling
    config_hash = _get_config_hash(config)
    
    # Check if we have a cached instance
    if config_hash in _llm_pool:
        instance, _ = _llm_pool[config_hash]
        # Update timestamp for LRU
        _llm_pool[config_hash] = (instance, time.time())
        print(f"♻️ Reusing cached LLM instance for {config.get('model', 'unknown')}")
        return instance
    
    # Create new instance
    print(f"🆕 Creating new LLM instance for {config.get('model', 'unknown')}")
    model = config["model"]
    instance = None
    for prefix, builder in LLM_PROVIDERS.items():
        if model.startswith(prefix):
            instance = builder(config)
            break
    
    if instance is None:
        raise ValueError(f"Unknown model: {model}")
    
    # Cache the instance
    _evict_oldest_if_needed()
    _llm_pool[config_hash] = (instance, time.time())
    
    return instance
