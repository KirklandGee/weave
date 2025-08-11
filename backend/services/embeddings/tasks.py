# backend/services/embeddings/tasks.py

"""
Background tasks for embedding generation using Redis Queue.
"""

import os
import logging
from typing import List, Dict, Any, Optional
try:
    from backend.services.embeddings.updates import get_embedding_update_service
    from backend.services.neo4j import query
except ImportError:
    from services.embeddings.updates import get_embedding_update_service
    from services.neo4j import query

logger = logging.getLogger(__name__)


def process_node_embedding(node_id: str, force: bool = False) -> Dict[str, Any]:
    """
    Background task to process embedding for a single node.
    
    Args:
        node_id: ID of the node to process
        force: If True, regenerate embedding even if content hasn't changed
        
    Returns:
        Dict with processing result
    """
    try:
        update_service = get_embedding_update_service()
        
        if force:
            # Force regeneration - get node data directly
            result = query(
                """
                MATCH (n {id: $node_id})
                RETURN n.title AS title, n.markdown AS markdown
                """,
                node_id=node_id,
            )
            
            if not result:
                return {"error": "Node not found", "updated": False, "node_id": node_id}
            
            node_data = result[0]
            embedding_service = update_service.embedding_service
            text_to_embed = f"{node_data['title']}\n{node_data['markdown'] or ''}"
            embedding = embedding_service.generate_embedding(text_to_embed)
            
            content_hash = update_service.get_content_hash(
                node_data["title"] or "", node_data["markdown"] or ""
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
            
            return {
                "message": f"Embedding generated (forced) - {len(embedding)} dimensions",
                "updated": True,
                "node_id": node_id
            }
        else:
            # Use smart update service
            result = update_service.update_node_embedding(node_id)
            result["node_id"] = node_id
            return result
            
    except Exception as e:
        logger.error(f"Failed to process embedding for node {node_id}: {e}")
        return {"error": str(e), "updated": False, "node_id": node_id}


def process_nodes_batch_embedding(node_ids: List[str], force: bool = False) -> Dict[str, Any]:
    """
    Background task to process embeddings for multiple nodes.
    
    Args:
        node_ids: List of node IDs to process
        force: If True, regenerate embeddings even if content hasn't changed
        
    Returns:
        Dict with batch processing results
    """
    try:
        results = {
            "processed": 0,
            "updated": 0,
            "skipped": 0,
            "errors": []
        }
        
        for node_id in node_ids:
            results["processed"] += 1
            result = process_node_embedding(node_id, force=force)
            
            if result.get("updated"):
                results["updated"] += 1
            elif result.get("error"):
                results["errors"].append(f"{node_id}: {result['error']}")
            else:
                results["skipped"] += 1
        
        logger.info(f"Batch embedding completed: {results['updated']} updated, {results['skipped']} skipped, {len(results['errors'])} errors")
        return results
        
    except Exception as e:
        logger.error(f"Failed to process batch embeddings: {e}")
        return {
            "processed": 0,
            "updated": 0,
            "skipped": 0,
            "errors": [f"Batch processing failed: {str(e)}"]
        }


def find_and_process_missing_embeddings(campaign_id: Optional[str] = None, limit: int = 50) -> Dict[str, Any]:
    """
    Background task to find nodes without embeddings and process them.
    
    Args:
        campaign_id: Campaign ID to limit search to, or None for global nodes
        limit: Maximum number of nodes to process in this batch
        
    Returns:
        Dict with processing results
    """
    try:
        # Find nodes without embeddings
        if campaign_id and campaign_id != "global":
            nodes_query = """
            MATCH (c:Campaign {id: $campaign_id})<-[:PART_OF]-(n)
            WHERE n.title IS NOT NULL 
            AND (n.embedding IS NULL OR size(n.embedding) = 0)
            RETURN n.id AS id
            ORDER BY coalesce(n.updatedAt, n.createdAt) DESC
            LIMIT $limit
            """
            params = {"campaign_id": campaign_id, "limit": limit}
        else:
            nodes_query = """
            MATCH (n)
            WHERE (n:Campaign OR n:Session OR n:NPC OR n:Character OR n:Location OR n:Note)
            AND n.title IS NOT NULL
            AND (n.embedding IS NULL OR size(n.embedding) = 0)
            RETURN n.id AS id
            ORDER BY coalesce(n.updatedAt, n.createdAt) DESC
            LIMIT $limit
            """
            params = {"limit": limit}
        
        nodes = query(nodes_query, **params)
        
        if not nodes:
            return {
                "message": "No nodes found without embeddings",
                "processed": 0,
                "updated": 0,
                "skipped": 0,
                "errors": []
            }
        
        # Process the nodes
        node_ids = [node["id"] for node in nodes]
        logger.info(f"Found {len(node_ids)} nodes without embeddings, processing...")
        
        return process_nodes_batch_embedding(node_ids, force=True)
        
    except Exception as e:
        logger.error(f"Failed to find and process missing embeddings: {e}")
        return {
            "processed": 0,
            "updated": 0,
            "skipped": 0,
            "errors": [f"Failed to find missing embeddings: {str(e)}"]
        }


def process_campaign_embeddings(campaign_id: str, force: bool = False, limit: Optional[int] = None) -> Dict[str, Any]:
    """
    Background task to process all embeddings for a campaign.
    
    Args:
        campaign_id: Campaign ID to process
        force: If True, regenerate all embeddings regardless of content changes
        limit: Optional limit on number of nodes to process
        
    Returns:
        Dict with processing results
    """
    try:
        update_service = get_embedding_update_service()
        result = update_service.update_campaign_embeddings(campaign_id, force=force)
        
        logger.info(f"Campaign {campaign_id} embedding processing completed: {result['updated']} updated")
        return result
        
    except Exception as e:
        logger.error(f"Failed to process campaign embeddings for {campaign_id}: {e}")
        return {
            "processed": 0,
            "updated": 0,
            "skipped": 0,
            "errors": [f"Campaign processing failed: {str(e)}"]
        }