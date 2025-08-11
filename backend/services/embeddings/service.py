import os
import numpy as np
from typing import List
from openai import OpenAI
from backend.models.components import MarkdownNodeBase


class EmbeddingService:
    def __init__(self, model_name: str = "text-embedding-3-small"):
        """
        Initialize the embedding service.

        Args:
            model_name: Embedding model name
                - text-embedding-3-small: 1536 dimensions, good balance
                - text-embedding-3-large: 3072 dimensions, higher quality
                - all-MiniLM-L6-v2: 384 dimensions (sentence transformers fallback)
        """
        self.model_name = model_name
        
        # Initialize OpenAI client
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            raise RuntimeError("OPENAI_API_KEY environment variable not set")
        
        self.client = OpenAI(api_key=api_key)
        
        # Set dimensions based on model
        model_dimensions = {
            "text-embedding-3-small": 1536,
            "text-embedding-3-large": 3072,
            "text-embedding-ada-002": 1536,
            # Fallback for sentence transformers models
            "all-MiniLM-L6-v2": 384,
            "all-mpnet-base-v2": 768,
            "all-MiniLM-L12-v2": 384,
        }
        
        self.dimensions: int = model_dimensions.get(model_name, 1536)
        
        # Determine if we're using OpenAI or sentence transformers
        self.use_openai = model_name.startswith(("text-embedding", "ada"))
        
        if not self.use_openai:
            # Fallback to sentence transformers for local models
            try:
                from sentence_transformers import SentenceTransformer
                self.model = SentenceTransformer(model_name)
                actual_dims = self.model.get_sentence_embedding_dimension()
                if actual_dims:
                    self.dimensions = actual_dims
            except Exception as e:
                raise RuntimeError(f"Failed to load embedding model: {model_name}") from e

    def generate_embedding(self, text: str) -> list[float]:
        """Generate embedding for a single text."""

        if not text or not text.strip():
            return [0.0] * self.dimensions

        try:
            if self.use_openai:
                response = self.client.embeddings.create(
                    input=text,
                    model=self.model_name
                )
                return response.data[0].embedding
            else:
                # Fallback to sentence transformers
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
        
        try:
            if self.use_openai:
                # OpenAI supports batch embedding requests
                response = self.client.embeddings.create(
                    input=processed_texts,
                    model=self.model_name
                )
                return [data.embedding for data in response.data]
            else:
                # Fallback to sentence transformers
                embeddings = self.model.encode(processed_texts, convert_to_tensor=False)
                return embeddings.tolist()
        except Exception as e:
            print(f"Error generating batch embeddings: {e}")
            # Return zero vectors for all texts
            return [[0.0] * self.dimensions for _ in processed_texts]

    def embed_node(self, node: MarkdownNodeBase) -> MarkdownNodeBase:
        """Add embedding to a node."""
        text = node.get_embedding_text()
        embedding = self.generate_embedding(text)
        node.embedding = embedding
        return node

    def calculate_similarity(
        self, embedding1: list[float], embedding2: list[float]
    ) -> float:
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
        model_name = os.getenv("EMBEDDING_MODEL", "text-embedding-3-small")
        _embedding_service = EmbeddingService(model_name)
    return _embedding_service
