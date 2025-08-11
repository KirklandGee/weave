# backend/api/routers/embed.py

from fastapi import APIRouter, HTTPException, Header
from typing import Annotated
from backend.services.embeddings.service import get_embedding_service
from backend.services.embeddings.updates import get_embedding_update_service
from backend.services.neo4j import query
from backend.models.schemas import (
    EmbeddingStatus,
    EmbeddingUpdateResult,
    BatchEmbeddingResult,
)

router = APIRouter(prefix="/embed", tags=["embedding"])

UserIdHeader = Annotated[str, Header(alias="X-User-Id")]


@router.post("/node/{node_id}", response_model=EmbeddingUpdateResult)
async def embed_node(node_id: str, uid: UserIdHeader, force: bool = False):
    """Generate and store embedding for a specific node."""
    try:
        if force:
            # Force re-embedding regardless of content changes
            result = query(
                """
                MATCH (n {id: $node_id})
                RETURN n.title AS title, n.markdown AS markdown
            """,
                node_id=node_id,
            )

            if not result:
                raise HTTPException(status_code=404, detail="Node not found")

            node_data = result[0]
            embedding_service = get_embedding_service()
            text_to_embed = f"{node_data['title']}\n{node_data['markdown'] or ''}"
            embedding = embedding_service.generate_embedding(text_to_embed)

            # Simple update - just embedding and timestamp
            update_service = get_embedding_update_service()
            content_hash = update_service.get_content_hash(
                node_data["title"], node_data["markdown"]
            )

            query(
                """
                MATCH (n {id: $node_id})
                SET n.embedding = $embedding, 
                    n.embeddedAt = timestamp(),
                    n.contentHash = $content_hash
            """,
                node_id=node_id,
                embedding=embedding,
                content_hash=content_hash,
            )

            return EmbeddingUpdateResult(
                message=f"Embedding generated (forced) - {len(embedding)} dimensions",
                updated=True,
            )
        else:
            # Use smart update service
            update_service = get_embedding_update_service()
            result = update_service.update_node_embedding(node_id)

            if result.get("error"):
                return EmbeddingUpdateResult(
                    message="Failed to update embedding",
                    updated=False,
                    error=result["error"],
                )

            return EmbeddingUpdateResult(
                message=result["message"], updated=result["updated"]
            )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Embedding generation failed: {str(e)}"
        )


@router.post("/campaign/{campaign_id}", response_model=BatchEmbeddingResult)
async def embed_campaign(campaign_id: str, uid: UserIdHeader, force: bool = False):
    """Generate embeddings for all nodes in a campaign that need updating."""
    try:
        update_service = get_embedding_update_service()
        result = update_service.update_campaign_embeddings(campaign_id, force=force)

        return BatchEmbeddingResult(
            message=result["message"],
            processed=result["processed"],
            updated=result["updated"],
            skipped=result["skipped"],
            errors=result.get("errors", []),
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Batch embedding failed: {str(e)}")


@router.get("/status/{campaign_id}", response_model=EmbeddingStatus)
async def get_embedding_status(
    campaign_id: str,
    uid: UserIdHeader,
):
    """Get embedding status for a campaign."""
    try:
        # Simple status query
        status_query = """
        MATCH (n)
        WHERE EXISTS((n)<-[:PART_OF]-(c:Campaign {id: $campaign_id}))
        AND n.title IS NOT NULL
        RETURN 
            count(n) AS total_nodes,
            count(n.embedding) AS embedded_nodes,
            count(CASE WHEN n.updatedAt > coalesce(n.embeddedAt, datetime('1970-01-01')) THEN 1 END) AS stale_nodes
        """

        result = query(status_query, campaign_id=campaign_id)

        if result:
            stats = result[0]
            return EmbeddingStatus(
                total_nodes=stats["total_nodes"],
                embedded_nodes=stats["embedded_nodes"],
                stale_nodes=stats["stale_nodes"],
                embedding_coverage=stats["embedded_nodes"]
                / max(stats["total_nodes"], 1),
            )
        else:
            return EmbeddingStatus(
                total_nodes=0, embedded_nodes=0, stale_nodes=0, embedding_coverage=0.0
            )

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to get embedding status: {str(e)}"
        )
