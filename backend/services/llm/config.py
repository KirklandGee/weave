from langchain_core.messages import HumanMessage, SystemMessage, AIMessage
from decimal import Decimal

DEFAULT_LLM_CONFIG = {
    "model": "gpt-5-mini",
    "temperature": 0.7,
    "max_tokens": 4096,
    "streaming": True,
}

ROLE_MAP = {"human": HumanMessage, "system": SystemMessage, "ai": AIMessage}

# Model pricing per 1M tokens (input, output)
MODEL_PRICING = {
    "gpt-5": {"input_cost": Decimal("1.25"), "output_cost": Decimal("10.00")},
    "gpt-5-mini": {"input_cost": Decimal("0.25"), "output_cost": Decimal("2.00")},
    "gpt-4o": {"input_cost": Decimal("2.00"), "output_cost": Decimal("8.00")},
    "gpt-4o-mini": {"input_cost": Decimal("0.40"), "output_cost": Decimal("1.60")},
    # Local models (free)
    "llama3.1": {"input_cost": Decimal("0.00"), "output_cost": Decimal("0.00")},
    "llama3": {"input_cost": Decimal("0.00"), "output_cost": Decimal("0.00")},
    "gemini-2.5-flash-lite": {
        "input_cost": Decimal("0.10"),
        "output_cost": Decimal("0.40"),
    },
    "gemini-2.5-flash": {"input_cost": Decimal("0.30"), "output_cost": Decimal("1.00")},
}

DEFAULT_MONTHLY_LIMIT = Decimal("10.00")  # $10 default monthly limit
