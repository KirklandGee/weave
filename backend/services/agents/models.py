from dataclasses import dataclass
from typing import Callable
from pydantic import BaseModel, Field
from backend.services.embeddings.vector_search import get_vector_search_service


@dataclass
class AssistantDependencies:
  campaign_id: str
  user_id: str
  search_service: Callable = get_vector_search_service()


class Action(BaseModel):
    type: str  # "create_note", "update_note", "append_to_note"
    target_id: str | None = None  # For updates
    title: str | None = None  # For creates
    content: str
    reasoning: str  # Why this action makes sense
    
class AssistantOutput(BaseModel):
    message: str = Field(description="Chat message for the user")
    suggested_actions: list[Action] = Field(default_factory=list, description="Actions for frontend to handle")
