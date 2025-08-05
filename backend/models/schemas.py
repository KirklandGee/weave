from pydantic import BaseModel
from typing import Any
from datetime import datetime
from decimal import Decimal


# Existing LLM models
class LLMMessage(BaseModel):
    role: str  # e.g., "human", "system", "ai"
    content: str
    name: str | None = None
    additional_kwargs: dict[str, Any] | None = {}  # for future extensions


class ChatRequest(BaseModel):
    user_id: str
    messages: list[LLMMessage]
    context: str
    metadata: dict[str, Any] = {}
    model: str | None = (
        None  # Might use this at some point to hard-code specific models for things. We'll see.
    )


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
    task_id: str | None = None


# Template system models
class TemplateRequest(BaseModel):
    variables: dict[str, Any]
    context: str = ""
    metadata: dict[str, Any] = {}
    stream: bool = True


class AsyncTemplateRequest(BaseModel):
    variables: dict[str, Any]
    context: str = ""
    metadata: dict[str, Any] = {}
    note_id: str  # ID of the note to update when complete
    campaign_slug: str  # Campaign slug for database access


class TemplateResponse(BaseModel):
    response: str
    template_name: str
    variables_used: dict[str, Any]


class TemplateInfo(BaseModel):
    name: str
    description: str
    required_vars: list[str]
    optional_vars: list[str]
    chain_type: str
    metadata: dict[str, Any]


# Usage tracking models
class UsageEvent(BaseModel):
    user_id: str
    timestamp: datetime
    model: str
    input_tokens: int
    output_tokens: int
    cost: Decimal
    campaign_id: str | None = None
    session_id: str | None = None


class UsageLimit(BaseModel):
    user_id: str
    monthly_limit: Decimal
    current_usage: Decimal
    reset_date: datetime


class UsageSummary(BaseModel):
    user_id: str
    current_month_usage: Decimal
    monthly_limit: Decimal
    remaining_budget: Decimal
    usage_percentage: float
    total_requests: int
    most_used_model: str | None = None


class UsageHistoryRequest(BaseModel):
    user_id: str
    start_date: datetime | None = None
    end_date: datetime | None = None
    limit: int = 100


class SetUsageLimitRequest(BaseModel):
    user_id: str
    monthly_limit: Decimal
