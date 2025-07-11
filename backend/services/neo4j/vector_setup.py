# backend/services/neo4j/vector_setup.py

from backend.services.neo4j import query
from backend.services.embeddings.service import get_embedding_service

def create_vector_index():
    """Create a single vector index for all node types that can have embeddings."""
    
    embedding_service = get_embedding_service()
    dimensions = embedding_service.dimensions
    
    # Single index for ALL nodes with embeddings
    create_query = """
    CREATE VECTOR INDEX allNodesEmbeddings IF NOT EXISTS
    FOR (n:Campaign|Session|NPC|Character|Location|Note)
    ON n.embedding
    OPTIONS { 
      indexConfig: {
        `vector.dimensions`: $dimensions,
        `vector.similarity_function`: 'cosine'
      }
    }
    """
    
    params = {"dimensions": dimensions}
    
    try:
        query(create_query, **params)
        print("✅ Created unified vector index: allNodesEmbeddings")
    except Exception as e:
        print(f"❌ Error creating vector index: {e}")

def check_vector_index():
    """Check the status of the vector index."""
    try:
        result = query("SHOW VECTOR INDEXES")
        print("Vector Index:")
        for record in result:
            idx = record.get('record', record)
            print(f"  - {idx.get('name')}: {idx.get('state')} ({idx.get('populationPercent', 0)}%)")
        return result
    except Exception as e:
        print(f"Error checking vector index: {e}")
        return []

def drop_vector_index():
    """Drop the vector index (useful for testing/rebuilding)."""
    try:
        query("DROP INDEX allNodesEmbeddings IF EXISTS")
        print("Dropped vector index: allNodesEmbeddings")
    except Exception as e:
        print(f"Error dropping index: {e}")


# Simplified version for your constraints.cql file:
VECTOR_INDEX_CYPHER = """
// Single vector index for all node types (384 dimensions for all-MiniLM-L6-v2)
CREATE VECTOR INDEX allNodesEmbeddings IF NOT EXISTS
FOR (n:Campaign|Session|NPC|Character|Location|Note)
ON n.embedding
OPTIONS { 
  indexConfig: {
    `vector.dimensions`: 384,
    `vector.similarity_function`: 'cosine'
  }
};
"""