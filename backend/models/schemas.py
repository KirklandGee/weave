from pydantic import BaseModel
from typing import Any

class LLMMessage(BaseModel):
    role: str  # e.g., "human", "system", "ai"
    content: str
    name: str | None = None
    additional_kwargs: dict[str, Any] | None = {} # for future extensions

class ChatRequest(BaseModel):
    user_id: str
    messages: list[LLMMessage]
    metadata: dict[str, Any] = {}
    model: str | None = None # Might use this at some point to hard-code specific models for things. We'll see.

class ChatResponse(BaseModel):
    response: str