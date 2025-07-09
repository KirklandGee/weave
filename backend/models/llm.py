from pydantic import BaseModel

class ChatRequest(BaseModel):
    user: str
    system: str