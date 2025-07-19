from langchain_core.messages import HumanMessage, SystemMessage, AIMessage
from decimal import Decimal

DEFAULT_LLM_CONFIG = {
    "model": "llama3.1",
    "temperature": 0.5,
    "max_tokens": 4096,
    "streaming": True
    # ... any other defaults ...
}

ROLE_MAP = {"human": HumanMessage, "system": SystemMessage, "ai": AIMessage}

# Model pricing per 1M tokens (input, output)
MODEL_PRICING = {
    "gpt-4o": {
        "input_cost": Decimal("2.00"),   # $2.50 per 1M input tokens
        "output_cost": Decimal("8.00")  # $10.00 per 1M output tokens
    },
    "gpt-4o-mini": {
        "input_cost": Decimal("0.40"),   # $0.15 per 1M input tokens
        "output_cost": Decimal("1.60")   # $0.60 per 1M output tokens
    },
    # Local models (free)
    "llama3.1": {
        "input_cost": Decimal("0.00"),
        "output_cost": Decimal("0.00")
    },
    "llama3": {
        "input_cost": Decimal("0.00"),
        "output_cost": Decimal("0.00")
    }
}

DEFAULT_MONTHLY_LIMIT = Decimal("10.00")  # $10 default monthly limit
