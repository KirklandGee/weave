# backend/services/embedding_updates.py

import hashlib
from typing import Any
try:
    from backend.services.neo4j import query
    from backend.services.embeddings.service import get_embedding_service
except ImportError:
    from services.neo4j import query
    from services.embeddings.service import get_embedding_service


class EmbeddingUpdateService:
    def __init__(self):
        self.embedding_service = get_embedding_service()

    def get_content_hash(self, title: str, markdown: str) -> str:
        """Get a hash of the content for change detection."""
        content = f"{title}\n{markdown or ''}"
        return hashlib.md5(content.encode()).hexdigest()

    def needs_re_embedding(self, node_data: dict[str, Any]) -> bool:
        """Determine if a node needs re-embedding."""

        # If no embedding exists, definitely needs embedding
        if not node_data.get("embedding"):
            return True

        # If we have a content hash, compare it
        if node_data.get("contentHash"):
            current_hash = self.get_content_hash(
                node_data.get("title", ""), node_data.get("markdown", "")
            )
            return current_hash != node_data.get("contentHash")

        # Unless one of the above criteria is met, do not re-embed
        return False

    def update_node_embedding(self, node_id: str) -> dict[str, Any]:
        """Update embedding for a single node if needed."""

        # Get current node data
        node_query = """
        MATCH (n {id: $node_id})
        RETURN n.id AS id, 
               n.title AS title, 
               n.markdown AS markdown,
               n.embedding AS embedding,
               n.contentHash AS contentHash,
               n.updatedAt AS updatedAt,
        """

        node_result = query(node_query, node_id=node_id)

        if not node_result:
            return {"error": "Node not found", "updated": False}

        node_data = node_result[0]

        # Check if re-embedding is needed
        if not self.needs_re_embedding(node_data):
            return {"message": "No content change", "updated": False}

        try:
            # Generate new embedding
            title = node_data["title"] or ""
            markdown = node_data["markdown"] or ""
            current_content = f"{title}\n{markdown}"
            content_hash = self.get_content_hash(title, markdown)

            new_embedding = self.embedding_service.generate_embedding(current_content)

            # Update the node - just embedding, hash, and timestamp
            update_query = """
            MATCH (n {id: $node_id})
            SET n.embedding = $embedding,
                n.embeddedAt = int(datetime.now().timestamp() * 1000)

                n.contentHash = $content_hash
            """

            query(
                update_query,
                node_id=node_id,
                embedding=new_embedding,
                content_hash=content_hash,
            )

            return {"message": "Embedding updated", "updated": True}

        except Exception as e:
            return {"error": f"Failed to update embedding: {str(e)}", "updated": False}

    def update_campaign_embeddings(
        self, campaign_id: str, force: bool = False
    ) -> dict[str, Any]:
        """Update embeddings for all nodes in a campaign that need it."""

        # Get all nodes in the campaign
        if campaign_id == "global":
            nodes_query = """
            MATCH (n)
            WHERE (n:Campaign OR n:Session OR n:NPC OR n:Character OR n:Location OR n:Note)
            AND n.title IS NOT NULL
            RETURN n.id AS id, 
                   n.title AS title, 
                   n.markdown AS markdown,
                   n.embedding AS embedding,
                   n.contentHash AS contentHash,
                   n.updatedAt AS updatedAt,
            ORDER BY n.updatedAt DESC
            """
            params = {}
        else:
            nodes_query = """
            MATCH (n)
            WHERE EXISTS((n)<-[:PART_OF]-(c:Campaign {id: $campaign_id}))
            AND n.title IS NOT NULL
            RETURN n.id AS id, 
                   n.title AS title, 
                   n.markdown AS markdown,
                   n.embedding AS embedding,
                   n.contentHash AS contentHash,
                   n.updatedAt AS updatedAt,
            ORDER BY n.updatedAt DESC
            """
            params = {"campaign_id": campaign_id}

        nodes = query(nodes_query, **params)

        if not nodes:
            return {
                "message": "No nodes found",
                "processed": 0,
                "updated": 0,
                "skipped": 0,
            }

        processed = 0
        updated = 0
        skipped = 0
        errors = []

        for node in nodes:
            processed += 1

            # Skip if not forced and no change
            if not force and not self.needs_re_embedding(node):
                skipped += 1
                continue

            # Update embedding
            result = self.update_node_embedding(node["id"])

            if result.get("updated"):
                updated += 1
            elif result.get("error"):
                errors.append(f"{node['id']}: {result['error']}")
            else:
                skipped += 1

        return {
            "message": f"Processed {processed} nodes",
            "processed": processed,
            "updated": updated,
            "skipped": skipped,
            "errors": errors,
        }


# Singleton instance
_embedding_update_service = None


def get_embedding_update_service() -> EmbeddingUpdateService:
    """Get the singleton embedding update service instance."""
    global _embedding_update_service
    if _embedding_update_service is None:
        _embedding_update_service = EmbeddingUpdateService()
    return _embedding_update_service
