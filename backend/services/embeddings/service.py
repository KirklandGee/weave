import os
from sentence_transformers import SentenceTransformer
import numpy as np
from backend.models.components import MarkdownNodeBase


class EmbeddingService:
    def __init__(self, model_name: str = "all-MiniLM-L6-v2"):
        """
        Initialize the embedding service.

        Args:
            model_name: SentenceTransformers model name
                - all-MiniLM-L6-v2: 384 dimensions, good balance
                - all-mpnet-base-v2: 768 dimensions, higher quality
        """
        self.model_name = model_name

        fallback_dimensions = {
            "all-MiniLM-L6-v2": 384,
            "all-mpnet-base-v2": 768,
            "all-MiniLM-L12-v2": 384,
        }

        try:
            self.model = SentenceTransformer(model_name)
            dimensions_result = self.model.get_sentence_embedding_dimension()

            self.dimensions: int = (
                dimensions_result
                if dimensions_result is not None
                else fallback_dimensions.get(model_name, 384)
            )

        except Exception as e:
            print(f"Error loading model: {model_name}: {e}")

            self.dimensions = fallback_dimensions.get(model_name, 384)
            raise RuntimeError(f"Failed to load embedding model: {model_name}") from e

    def generate_embedding(self, text: str) -> list[float]:
        """Generate embedding for a single text."""

        if not text or not text.strip():
            return [0.0] * self.dimensions

        try:
            embedding = self.model.encode(text, convert_to_tensor=False)
            return embedding.tolist()
        except Exception as e:
            print(f"Error generating embedding for text: {e}")
            # Return zero vector on error
            return [0.0] * self.dimensions

    def generate_embeddings_batch(self, texts: list[str]) -> list[list[float]]:
        """Generate embeddings for multiple texts efficiently."""

        if not texts: 
          return []

        processed_texts = [text if text and text.strip() else " " for text in texts]
        embeddings = self.model.encode(processed_texts, convert_to_tensor=False)
        return embeddings.tolist()

    def embed_node(self, node: MarkdownNodeBase) -> MarkdownNodeBase:
          """Add embedding to a node."""
          text = node.get_embedding_text()
          embedding = self.generate_embedding(text)
          node.embedding = embedding
          return node
    def calculate_similarity(self, embedding1: list[float], embedding2: list[float]) -> float:
        """Calculate cosine similarity between two embeddings."""
        if not embedding1 or not embedding2:
            return 0.0
            
        # Convert to numpy arrays
        a = np.array(embedding1)
        b = np.array(embedding2)
        
        # Calculate cosine similarity
        cos_sim = np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b))
        return float(cos_sim)

# Use as a singleton instance
_embedding_service = None

def get_embedding_service() -> EmbeddingService:
    """Get the singleton embedding service instance."""
    global _embedding_service
    if _embedding_service is None:
        model_name = os.getenv("EMBEDDING_MODEL", "all-MiniLM-L6-v2")
        _embedding_service = EmbeddingService(model_name)
    return _embedding_service