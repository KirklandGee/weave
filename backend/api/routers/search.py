from fastapi import APIRouter, HTTPException, Depends, Header
from typing import Annotated, List, Optional
from backend.models.schemas import VectorSearchRequest, VectorSearchResult, RelationshipSuggestion
from backend.services.embeddings.vector_search import get_vector_search_service
from backend.api.auth import get_current_user

router = APIRouter(prefix="/search", tags=["search"])

@router.post("/", response_model=List[VectorSearchResult])
async def search_content(
    search_request: VectorSearchRequest,
    user_id: str = Depends(get_current_user),
    campaign_id: Optional[str] = None,
):
    """Search for content similar to the provided text query."""
    try:
        vector_service = get_vector_search_service()
        results = vector_service.search_nodes(
            search_request.query_text, 
            user_id=user_id,
            campaign_id=campaign_id
        )
        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")

@router.get("/similar/{node_id}", response_model=List[VectorSearchResult])
async def get_similar_content(
    node_id: str,
    user_id: str = Depends(get_current_user),
    campaign_id: Optional[str] = None,
    limit: int = 5,
    threshold: float = 0.7
):
    """Find content similar to a specific node."""
    try:
        vector_service = get_vector_search_service()
        results = vector_service.find_similar_to_node(
            node_id=node_id,
            user_id=user_id,
            campaign_id=campaign_id,
            limit=limit,
            threshold=threshold
        )
        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Similar content search failed: {str(e)}")

@router.get("/suggest-relationships/{campaign_id}", response_model=List[RelationshipSuggestion])
async def suggest_relationships(
    campaign_id: str,
    user_id: str = Depends(get_current_user),
    threshold: float = 0.8
):
    """Suggest potential relationships between nodes based on content similarity."""
    try:
        vector_service = get_vector_search_service()
        suggestions = vector_service.suggest_relationships(
            user_id=user_id,
            campaign_id=campaign_id if campaign_id != "global" else None, 
            threshold=threshold
        )
        return suggestions
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Relationship suggestion failed: {str(e)}")