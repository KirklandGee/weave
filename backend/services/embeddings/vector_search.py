from typing import List, Optional
from backend.services.neo4j import query
from backend.services.embeddings.service import get_embedding_service
from backend.models.schemas import VectorSearchResult


class VectorSearchService:
    """Service for vector-based search operations using type-specific indexes."""

    def __init__(self):
        self.embedding_service = get_embedding_service()

    def search_nodes(
        self,
        query_text: str,
        user_id: str,
        campaign_id: Optional[str] = None,
        limit: int = 10,
        threshold: float = 0.7,
    ) -> List[VectorSearchResult]:
        """Search across all node types using vector similarity."""
        # Get embedding for the query
        query_embedding = self.embedding_service.generate_embedding(query_text)
        if not query_embedding:
            return []

        all_results = []

        # Search each index type
        for search_func in [
            self._search_characters,
            self._search_locations,
            self._search_notes,
            self._search_npcs,
            self._search_sessions,
        ]:
            try:
                results = search_func(
                    query_embedding, user_id, campaign_id, limit, threshold
                )
                all_results.extend(results)
            except Exception as e:
                print(f"Error in search: {e}")
                continue

        # Sort by similarity and return top results
        all_results.sort(key=lambda x: x.similarity_score, reverse=True)
        return all_results[:limit]

    def find_similar_to_node(
        self,
        node_id: str,
        user_id: str,
        campaign_id: Optional[str] = None,
        limit: int = 5,
        threshold: float = 0.7,
    ) -> List[VectorSearchResult]:
        """Find nodes similar to a specific node."""

        # Get the target node's embedding
        target_query = """
            MATCH (n {id: $node_id})
            WHERE n.embedding IS NOT NULL
            RETURN n.embedding AS embedding
        """

        target_result = query(target_query, node_id=node_id)
        if not target_result:
            return []

        target_embedding = target_result[0]["embedding"]
        all_results = []

        # Search all index types except campaigns
        for search_func in [
            self._search_characters,
            self._search_locations,
            self._search_notes,
            self._search_npcs,
            self._search_sessions,
        ]:
            try:
                results = search_func(
                    target_embedding,
                    user_id,
                    campaign_id,
                    limit,
                    threshold,
                    exclude_id=node_id,
                )
                all_results.extend(results)
            except Exception as e:
                print(f"Error in similarity search: {e}")
                continue

        # Sort and return top results
        all_results.sort(key=lambda x: x.similarity_score, reverse=True)
        return all_results[:limit]

    def _search_campaigns(
        self,
        embedding: List[float],
        user_id: str,
        campaign_id: Optional[str] = None,
        limit: int = 10,
        threshold: float = 0.7,
        exclude_id: Optional[str] = None,
    ) -> List[VectorSearchResult]:
        """Search campaign embeddings."""
        search_query = """
        MATCH (u:User {id: $uid})
        CALL db.index.vector.queryNodes('campaign_embedding_vec_idx', $limit, $embedding)
        YIELD node AS n, score
        WHERE score >= $threshold 
        AND ($exclude_id IS NULL OR n.id <> $exclude_id)
        AND (
            (u)-[:OWNS]->(n) OR 
            (u)-[:PART_OF]->(n)
        )
        RETURN {
            node_id: n.id,
            title: n.title,
            type: n.type,
            similarity_score: score,
            markdown: n.markdown
        } AS result
        ORDER BY score DESC
        """

        results = query(
            search_query,
            embedding=embedding,
            limit=limit,
            threshold=threshold,
            exclude_id=exclude_id,
            uid=user_id,
        )
        return [VectorSearchResult(**r["result"]) for r in results]

    def _search_characters(
        self,
        embedding: List[float],
        user_id: str,
        campaign_id: Optional[str] = None,
        limit: int = 10,
        threshold: float = 0.7,
        exclude_id: Optional[str] = None,
    ) -> List[VectorSearchResult]:
        """Search character embeddings."""
        search_query = """
        MATCH (u:User {id: $uid})
        CALL db.index.vector.queryNodes('character_embedding_vec_idx', $limit, $embedding)
        YIELD node AS n, score
        WHERE score >= $threshold 
        AND ($exclude_id IS NULL OR n.id <> $exclude_id)
        
        OPTIONAL MATCH (u)-[:OWNS]->(c:Campaign {id: $cid})<-[:PART_OF]-(n)
        OPTIONAL MATCH (u)-[:PART_OF]->(n2)
        WHERE $cid IS NULL AND n2 = n
        
        WITH n, score, c, n2
        WHERE ($cid IS NOT NULL AND c IS NOT NULL) OR ($cid IS NULL AND n2 IS NOT NULL)
        
        RETURN {
            node_id: n.id,
            title: n.title,
            type: n.type,
            similarity_score: score,
            markdown: n.markdown
        } AS result
        ORDER BY score DESC
        """

        results = query(
            search_query,
            embedding=embedding,
            limit=limit,
            threshold=threshold,
            exclude_id=exclude_id,
            uid=user_id,
            cid=campaign_id,
        )
        return [VectorSearchResult(**r["result"]) for r in results]

    def _search_locations(
        self,
        embedding: List[float],
        user_id: str,
        campaign_id: Optional[str] = None,
        limit: int = 10,
        threshold: float = 0.7,
        exclude_id: Optional[str] = None,
    ) -> List[VectorSearchResult]:
        """Search location embeddings."""
        search_query = """
        MATCH (u:User {id: $uid})
        CALL db.index.vector.queryNodes('location_embedding_vec_idx', $limit, $embedding)
        YIELD node AS n, score
        WHERE score >= $threshold 
        AND ($exclude_id IS NULL OR n.id <> $exclude_id)
        
        OPTIONAL MATCH (u)-[:OWNS]->(c:Campaign {id: $cid})<-[:PART_OF]-(n)
        OPTIONAL MATCH (u)-[:PART_OF]->(n2)
        WHERE $cid IS NULL AND n2 = n
        
        WITH n, score, c, n2
        WHERE ($cid IS NOT NULL AND c IS NOT NULL) OR ($cid IS NULL AND n2 IS NOT NULL)
        
        RETURN {
            node_id: n.id,
            title: n.title,
            type: n.type,
            similarity_score: score,
            markdown: n.markdown
        } AS result
        ORDER BY score DESC
        """

        results = query(
            search_query,
            embedding=embedding,
            limit=limit,
            threshold=threshold,
            exclude_id=exclude_id,
            uid=user_id,
            cid=campaign_id,
        )
        return [VectorSearchResult(**r["result"]) for r in results]

    def _search_notes(
        self,
        embedding: List[float],
        user_id: str,
        campaign_id: Optional[str] = None,
        limit: int = 10,
        threshold: float = 0.7,
        exclude_id: Optional[str] = None,
    ) -> List[VectorSearchResult]:
        """Search note embeddings."""
        search_query = """
        MATCH (u:User {id: $uid})
        CALL db.index.vector.queryNodes('note_embedding_vec_idx', $limit, $embedding)
        YIELD node AS n, score
        WHERE score >= $threshold 
        AND ($exclude_id IS NULL OR n.id <> $exclude_id)
        
        OPTIONAL MATCH (u)-[:OWNS]->(c:Campaign {id: $cid})<-[:PART_OF]-(n)
        OPTIONAL MATCH (u)-[:PART_OF]->(n2)
        WHERE $cid IS NULL AND n2 = n
        
        WITH n, score, c, n2
        WHERE ($cid IS NOT NULL AND c IS NOT NULL) OR ($cid IS NULL AND n2 IS NOT NULL)
        
        RETURN {
            node_id: n.id,
            title: n.title,
            type: n.type,
            similarity_score: score,
            markdown: n.markdown
        } AS result
        ORDER BY score DESC
        """

        results = query(
            search_query,
            embedding=embedding,
            limit=limit,
            threshold=threshold,
            exclude_id=exclude_id,
            uid=user_id,
            cid=campaign_id,
        )
        return [VectorSearchResult(**r["result"]) for r in results]

    def _search_npcs(
        self,
        embedding: List[float],
        user_id: str,
        campaign_id: Optional[str] = None,
        limit: int = 10,
        threshold: float = 0.7,
        exclude_id: Optional[str] = None,
    ) -> List[VectorSearchResult]:
        """Search NPC embeddings."""
        search_query = """
        MATCH (u:User {id: $uid})
        CALL db.index.vector.queryNodes('npc_embedding_vec_idx', $limit, $embedding)
        YIELD node AS n, score
        WHERE score >= $threshold 
        AND ($exclude_id IS NULL OR n.id <> $exclude_id)
        
        OPTIONAL MATCH (u)-[:OWNS]->(c:Campaign {id: $cid})<-[:PART_OF]-(n)
        OPTIONAL MATCH (u)-[:PART_OF]->(n2)
        WHERE $cid IS NULL AND n2 = n
        
        WITH n, score, c, n2
        WHERE ($cid IS NOT NULL AND c IS NOT NULL) OR ($cid IS NULL AND n2 IS NOT NULL)
        
        RETURN {
            node_id: n.id,
            title: n.title,
            type: n.type,
            similarity_score: score,
            markdown: n.markdown
        } AS result
        ORDER BY score DESC
        """

        results = query(
            search_query,
            embedding=embedding,
            limit=limit,
            threshold=threshold,
            exclude_id=exclude_id,
            uid=user_id,
            cid=campaign_id,
        )
        return [VectorSearchResult(**r["result"]) for r in results]

    def _search_sessions(
        self,
        embedding: List[float],
        user_id: str,
        campaign_id: Optional[str] = None,
        limit: int = 10,
        threshold: float = 0.7,
        exclude_id: Optional[str] = None,
    ) -> List[VectorSearchResult]:
        """Search session embeddings."""
        search_query = """
        MATCH (u:User {id: $uid})
        CALL db.index.vector.queryNodes('session_embedding_vec_idx', $limit, $embedding)
        YIELD node AS n, score
        WHERE score >= $threshold 
        AND ($exclude_id IS NULL OR n.id <> $exclude_id)
        
        OPTIONAL MATCH (u)-[:OWNS]->(c:Campaign {id: $cid})<-[:PART_OF]-(n)
        OPTIONAL MATCH (u)-[:PART_OF]->(n2)
        WHERE $cid IS NULL AND n2 = n
        
        WITH n, score, c, n2
        WHERE ($cid IS NOT NULL AND c IS NOT NULL) OR ($cid IS NULL AND n2 IS NOT NULL)
        
        RETURN {
            node_id: n.id,
            title: n.title,
            type: n.type,
            similarity_score: score,
            markdown: n.markdown
        } AS result
        ORDER BY score DESC
        """

        results = query(
            search_query,
            embedding=embedding,
            limit=limit,
            threshold=threshold,
            exclude_id=exclude_id,
            uid=user_id,
            cid=campaign_id,
        )
        return [VectorSearchResult(**r["result"]) for r in results]

    def suggest_relationships(
        self, user_id: str, campaign_id: Optional[str] = None, threshold: float = 0.8
    ):
        """Suggest potential relationships between nodes based on content similarity."""
        # This method would need to be implemented based on your requirements
        # For now, returning empty list
        return []


# Singleton instance
_vector_search_service = None


def get_vector_search_service() -> VectorSearchService:
    """Get the vector search service singleton."""
    global _vector_search_service
    if _vector_search_service is None:
        _vector_search_service = VectorSearchService()
    return _vector_search_service
