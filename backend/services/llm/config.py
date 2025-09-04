from langchain_core.messages import HumanMessage, SystemMessage, AIMessage
from decimal import Decimal

DEFAULT_LLM_CONFIG = {
    "model": "gemini-2.5-flash-lite",
    "max_tokens": 4096,
    "streaming": True,
}

ROLE_MAP = {"human": HumanMessage, "system": SystemMessage, "ai": AIMessage}

# Model pricing per 1M tokens (input, output)
MODEL_PRICING = {
    "gpt-5": {"input_cost": Decimal("3.75"), "output_cost": Decimal("30.00")},
    "gpt-5-mini": {"input_cost": Decimal("0.75"), "output_cost": Decimal("6.00")},
    "gpt-4o": {"input_cost": Decimal("6.00"), "output_cost": Decimal("24.00")},
    "gpt-4o-mini": {"input_cost": Decimal("1.20"), "output_cost": Decimal("4.80")},
    # Local models (free)
    "llama3.1": {"input_cost": Decimal("0.00"), "output_cost": Decimal("0.00")},
    "llama3": {"input_cost": Decimal("0.00"), "output_cost": Decimal("0.00")},
    "gemini-2.5-flash-lite": {
        "input_cost": Decimal("0.30"),
        "output_cost": Decimal("1.20"),
    },
    "gemini-2.5-flash": {"input_cost": Decimal("0.90"), "output_cost": Decimal("3.00")},
}

DEFAULT_MONTHLY_LIMIT = Decimal("10.00")  # $10 default monthly limit
