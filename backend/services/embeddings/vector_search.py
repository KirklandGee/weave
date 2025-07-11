# backend/services/vector_search.py

from typing import List, Optional
from backend.services.neo4j import query
from backend.services.embeddings.service import get_embedding_service
from backend.models.schemas import VectorSearchRequest, VectorSearchResult, RelationshipSuggestion

class VectorSearchService:
    def __init__(self):
        self.embedding_service = get_embedding_service()
    
    def search_similar_nodes(self, search_request: VectorSearchRequest) -> List[VectorSearchResult]:
        """Search for nodes similar to the query text."""
        
        query_embedding = self.embedding_service.generate_embedding(search_request.query_text)
        
        search_query = """
        CALL db.index.vector.queryNodes('allNodesEmbeddings', $limit, $query_embedding)
        YIELD node AS n, score
        WHERE score >= $threshold 
        AND EXISTS((n)<-[:PART_OF]-(c:Campaign {id: $campaign_id}))
        RETURN {
            node_id: n.id,
            title: n.title,
            type: n.type,
            similarity_score: score,
            markdown: n.markdown
        } AS result
        ORDER BY score DESC
        """
        
        params = {
            "query_embedding": query_embedding,
            "limit": search_request.limit,
            "threshold": search_request.similarity_threshold,
            "campaign_id": search_request.campaign_id
        }
        
        try:
            results = query(search_query, **params)
            return [VectorSearchResult(**r["result"]) for r in results]
        except Exception as e:
            print(f"Error in vector search: {e}")

            return []
    
    def find_similar_to_node(self, node_id: str, limit: int = 5, threshold: float = 0.7) -> List[VectorSearchResult]:
        """Find nodes similar to a specific node."""
        
        # Get the target node and its embedding
        target_query = """
            MATCH (n {id: $node_id})
            WHERE n.embedding IS NOT NULL
            RETURN n.embedding AS embedding
        """
        
        target_result = query(target_query, node_id=node_id)
        if not target_result:
            return []
        
        target_embedding = target_result[0]["embedding"]
        
        # Search for similar nodes using the unified index
        search_query = """
        CALL db.index.vector.queryNodes('allNodesEmbeddings', $limit, $target_embedding)
        YIELD node AS n, score
        WHERE n.id <> $node_id AND score >= $threshold
        RETURN {
            node_id: n.id,
            title: n.title,
            type: n.type,
            similarity_score: score,
            markdown: n.markdown
        } AS result
        ORDER BY score DESC
        """
        
        params = {
            "target_embedding": target_embedding,
            "node_id": node_id,
            "limit": limit + 1,
            "threshold": threshold
        }
        
        try:
            results = query(search_query, **params)
            return [VectorSearchResult(**r["result"]) for r in results]
        except Exception as e:
            print(f"Error finding similar nodes: {e}")
            return []
    
    def suggest_relationships(self, campaign_id: str | None = None, threshold: float = 0.8) -> List[RelationshipSuggestion]:
        """Suggest potential relationships between nodes based on similarity."""
        
        # Get recent nodes with embeddings
        if campaign_id:
            nodes_query = """
            MATCH (n)
            WHERE EXISTS((n)<-[:PART_OF]-(c:Campaign {id: $campaign_id}))
            AND n.embedding IS NOT NULL
            RETURN n.id AS id, n.type AS type, n.title AS title
            ORDER BY n.updatedAt DESC
            LIMIT 50
            """
            params = {"campaign_id": campaign_id}
        else:
            nodes_query = """
            MATCH (n)
            WHERE n.embedding IS NOT NULL
            RETURN n.id AS id, n.type AS type, n.title AS title
            ORDER BY n.updatedAt DESC
            LIMIT 50
            """
            params = {}
        
        nodes = query(nodes_query, **params)
        if len(nodes) < 2:
            return []
        
        suggestions = []
        
        # For each node, find similar ones and suggest relationships
        for i, node in enumerate(nodes[:10]):  # Limit to 10 nodes to avoid too many comparisons
            similar_nodes = self.find_similar_to_node(node["id"], limit=3, threshold=threshold)
            
            for similar in similar_nodes:
                # Check if relationship already exists
                existing_rel_query = """
                    MATCH (a {id: $from_id})-[r]-(b {id: $to_id})
                    RETURN count(r) AS count
                """
                existing_rel = query(existing_rel_query, from_id=node["id"], to_id=similar.node_id)
                
                if existing_rel[0]["count"] == 0:  # No existing relationship
                    relationship_type = self._suggest_relationship_type(node["type"], similar.type)
                    
                    suggestions.append(RelationshipSuggestion(
                        from_id=node["id"],
                        to_id=similar.node_id,
                        from_title=node["title"],
                        to_title=similar.title,
                        similarity_score=similar.similarity_score,
                        suggested_relationship_type=relationship_type,
                        reasoning=f"Similar content ({similar.similarity_score:.2f})"
                    ))
        
        # Sort by similarity and return top suggestions
        suggestions.sort(key=lambda x: x.similarity_score, reverse=True)
        return suggestions[:10]
    
    def _suggest_relationship_type(self, type1: str, type2: str) -> str:
        """Suggest relationship type based on node types."""
        
        # Simple mapping - most relationships in D&D are just "related"
        special_cases = {
            ("Session", "NPC"): "INVOLVES",
            ("Session", "Location"): "OCCURS_IN", 
            ("Session", "Character"): "INVOLVES",
            ("NPC", "Location"): "LOCATED_IN",
            ("Character", "NPC"): "KNOWS",
        }
        
        # Check both directions
        rel_type = special_cases.get((type1, type2)) or special_cases.get((type2, type1))
        return rel_type or "RELATED_TO"  # Simple default


# Singleton instance
_vector_search_service = None

def get_vector_search_service() -> VectorSearchService:
    """Get the singleton vector search service instance."""
    global _vector_search_service
    if _vector_search_service is None:
        _vector_search_service = VectorSearchService()
    return _vector_search_service