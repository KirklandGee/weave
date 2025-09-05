from dataclasses import dataclass
from typing import Callable
from enum import Enum
from pydantic import BaseModel, Field
from backend.services.embeddings.vector_search import get_vector_search_service


@dataclass
class AssistantDependencies:
  campaign_id: str
  user_id: str
  search_service: Callable = get_vector_search_service()


class ActionType(str, Enum):
    CREATE_NOTE = "create_note"
    UPDATE_NOTE = "update_note" 
    APPEND_TO_NOTE = "append_to_note"


class Action(BaseModel):
    type: ActionType = Field(
        description="The type of database operation: create_note for new notes, update_note for modifying existing notes with full content, append_to_note for adding content to end of existing notes"
    )
    target_id: str | None = Field(
        default=None,
        description="The note ID from search results. Required for update_note and append_to_note operations. Must be None for create_note operations."
    )
    title: str | None = Field(
        default=None,
        description="The title for the note. Required for create_note operations. Optional for update_note (if updating title). Not used for append_to_note."
    )
    content: str = Field(
        description="For create_note: complete markdown content for new note. For update_note: the FULL markdown content including original + all changes. For append_to_note: only the new markdown content to add at the end."
    )
    reasoning: str = Field(
        description="Brief explanation of why this action makes sense and what the expected outcome will be. Keep concise but clear."
    )
    
class AssistantOutput(BaseModel):
    message: str = Field(description="Chat message for the user")
    suggested_actions: list[Action] = Field(default_factory=list, description="Actions for frontend to handle")
