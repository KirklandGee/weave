# backend/api/routers/embed.py

from fastapi import APIRouter, HTTPException, Header
from typing import Annotated
from backend.services.embeddings.service import get_embedding_service
from backend.services.neo4j import query

router = APIRouter(prefix="/embed", tags=["embedding"])

UserIdHeader = Annotated[str, Header(alias="X-User-Id")]

@router.post("/node/{node_id}")
async def embed_node(
    node_id: str,
    uid: UserIdHeader,
):
    """Generate and store embedding for a specific node."""
    try:
        # Get the node
        result = query("""
            MATCH (n {id: $node_id})
            RETURN n.title AS title, n.markdown AS markdown
        """, node_id=node_id)
        
        if not result:
            raise HTTPException(status_code=404, detail="Node not found")
        
        node_data = result[0]
        
        # Generate embedding
        embedding_service = get_embedding_service()
        text_to_embed = f"{node_data['title']}\n{node_data['markdown'] or ''}"
        embedding = embedding_service.generate_embedding(text_to_embed)
        
        # Store embedding
        query("""
            MATCH (n {id: $node_id})
            SET n.embedding = $embedding, n.updatedAt = datetime()
        """, node_id=node_id, embedding=embedding)
        
        return {"message": "Embedding generated successfully", "dimensions": len(embedding)}
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Embedding generation failed: {str(e)}")

@router.post("/campaign/{campaign_id}")
async def embed_campaign(
    campaign_id: str,
    uid: UserIdHeader,
):
    """Generate embeddings for all nodes in a campaign."""
    try:
        # Get all nodes in the campaign
        nodes_query = """
        MATCH (n)
        WHERE EXISTS((n)<-[:PART_OF]-(c:Campaign {id: $campaign_id}))
        AND (n.embedding IS NULL OR n.updatedAt > coalesce(n.embeddedAt, datetime('1970-01-01')))
        RETURN n.id AS id, n.title AS title, n.markdown AS markdown
        LIMIT 100
        """
        
        nodes = query(nodes_query, campaign_id=campaign_id)
        
        if not nodes:
            return {"message": "No nodes need embedding", "processed": 0}
        
        embedding_service = get_embedding_service()
        processed_count = 0
        
        for node in nodes:
            try:
                text_to_embed = f"{node['title']}\n{node['markdown'] or ''}"
                embedding = embedding_service.generate_embedding(text_to_embed)
                
                # Store embedding with timestamp
                query("""
                    MATCH (n {id: $node_id})
                    SET n.embedding = $embedding, 
                        n.embeddedAt = datetime(),
                        n.updatedAt = datetime()
                """, node_id=node['id'], embedding=embedding)
                
                processed_count += 1
                
            except Exception as e:
                print(f"Error embedding node {node['id']}: {e}")
                continue
        
        return {
            "message": f"Processed {processed_count} nodes", 
            "processed": processed_count,
            "total_found": len(nodes)
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Batch embedding failed: {str(e)}")