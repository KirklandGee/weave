from pydantic import BaseModel
from typing import Any
from datetime import datetime

# Existing LLM models
class LLMMessage(BaseModel):
    role: str  # e.g., "human", "system", "ai"
    content: str
    name: str | None = None
    additional_kwargs: dict[str, Any] | None = {} # for future extensions

class ChatRequest(BaseModel):
    user_id: str
    messages: list[LLMMessage]
    context: str
    metadata: dict[str, Any] = {}
    model: str | None = None # Might use this at some point to hard-code specific models for things. We'll see.
    
class ChatResponse(BaseModel):
    response: str

# New Vector Search models
class VectorSearchRequest(BaseModel):
    query_text: str
    campaign_id: str
    node_types: list[str] | None = None  # Filter by node types (optional)
    limit: int = 10
    similarity_threshold: float = 0.7

class VectorSearchResult(BaseModel):
    node_id: str
    title: str
    type: str
    similarity_score: float
    markdown: str | None = None

class RelationshipSuggestion(BaseModel):
    from_node_id: str
    to_node_id: str
    from_title: str
    to_title: str
    similarity_score: float
    suggested_relationship_type: str
    reasoning: str | None = None

# Embedding status models
class EmbeddingStatus(BaseModel):
    total_nodes: int
    embedded_nodes: int
    stale_nodes: int
    embedding_coverage: float

class EmbeddingUpdateResult(BaseModel):
    message: str
    updated: bool
    error: str | None = None

class BatchEmbeddingResult(BaseModel):
    message: str
    processed: int
    updated: int
    skipped: int
    errors: list[str] = []