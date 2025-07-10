# models/schemas.py
from pydantic import BaseModel
from typing import Any

class LLMMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    user_id: str
    messages: list[LLMMessage]
    metadata: dict[str, Any] = {}

class ChatResponse(BaseModel):
    response: str