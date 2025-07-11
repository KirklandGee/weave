# backend/api/routers/search.py

from fastapi import APIRouter, HTTPException, Header
from typing import Annotated, List
from backend.models.schemas import VectorSearchRequest, VectorSearchResult, RelationshipSuggestion
from backend.services.embeddings.vector_search import get_vector_search_service

router = APIRouter(prefix="/search", tags=["search"])

UserIdHeader = Annotated[str, Header(alias="X-User-Id")]

@router.post("/", response_model=List[VectorSearchResult])
async def search_content(
    search_request: VectorSearchRequest,
    uid: UserIdHeader,
):
    """Search for content similar to the provided text query."""
    try:
        vector_service = get_vector_search_service()
        results = vector_service.search_similar_nodes(search_request)
        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")

@router.get("/similar/{node_id}", response_model=List[VectorSearchResult])
async def get_similar_content(
    node_id: str,
    uid: UserIdHeader,
    limit: int = 5,
    threshold: float = 0.7
):
    """Find content similar to a specific node."""
    try:
        vector_service = get_vector_search_service()
        results = vector_service.find_similar_to_node(node_id, limit, threshold)
        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Similar content search failed: {str(e)}")

@router.get("/suggest-relationships/{campaign_id}", response_model=List[RelationshipSuggestion])
async def suggest_relationships(
    campaign_id: str,
    uid: UserIdHeader,
    threshold: float = 0.8
):
    """Suggest potential relationships between nodes based on content similarity."""
    try:
        vector_service = get_vector_search_service()
        suggestions = vector_service.suggest_relationships(
            campaign_id if campaign_id != "global" else None, 
            threshold
        )
        return suggestions
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Relationship suggestion failed: {str(e)}")