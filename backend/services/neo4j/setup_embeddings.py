from backend.services.neo4j import query
from backend.services.embeddings.service import get_embedding_service


def create_vector_index():
    """Create vector indexes for all node types that can have embeddings."""

    embedding_service = get_embedding_service()
    dimensions = embedding_service.dimensions

    # Create separate indexes for each node type with literal strings

    # Campaign index
    try:
        query(
            """
        CREATE VECTOR INDEX campaignEmbeddings IF NOT EXISTS
        FOR (n:Campaign)
        ON n.embedding
        OPTIONS { 
          indexConfig: {
            `vector.dimensions`: $dimensions,
            `vector.similarity_function`: 'cosine'
          }
        }
        """,
            dimensions=dimensions,
        )
        print("✅ Created vector index: campaignEmbeddings")
    except Exception as e:
        print(f"❌ Error creating campaignEmbeddings: {e}")

    # Session index
    try:
        query(
            """
        CREATE VECTOR INDEX sessionEmbeddings IF NOT EXISTS
        FOR (n:Session)
        ON n.embedding
        OPTIONS { 
          indexConfig: {
            `vector.dimensions`: $dimensions,
            `vector.similarity_function`: 'cosine'
          }
        }
        """,
            dimensions=dimensions,
        )
        print("✅ Created vector index: sessionEmbeddings")
    except Exception as e:
        print(f"❌ Error creating sessionEmbeddings: {e}")

    # NPC index
    try:
        query(
            """
        CREATE VECTOR INDEX npcEmbeddings IF NOT EXISTS
        FOR (n:NPC)
        ON n.embedding
        OPTIONS { 
          indexConfig: {
            `vector.dimensions`: $dimensions,
            `vector.similarity_function`: 'cosine'
          }
        }
        """,
            dimensions=dimensions,
        )
        print("✅ Created vector index: npcEmbeddings")
    except Exception as e:
        print(f"❌ Error creating npcEmbeddings: {e}")

    # Character index
    try:
        query(
            """
        CREATE VECTOR INDEX characterEmbeddings IF NOT EXISTS
        FOR (n:Character)
        ON n.embedding
        OPTIONS { 
          indexConfig: {
            `vector.dimensions`: $dimensions,
            `vector.similarity_function`: 'cosine'
          }
        }
        """,
            dimensions=dimensions,
        )
        print("✅ Created vector index: characterEmbeddings")
    except Exception as e:
        print(f"❌ Error creating characterEmbeddings: {e}")

    # Location index
    try:
        query(
            """
        CREATE VECTOR INDEX locationEmbeddings IF NOT EXISTS
        FOR (n:Location)
        ON n.embedding
        OPTIONS { 
          indexConfig: {
            `vector.dimensions`: $dimensions,
            `vector.similarity_function`: 'cosine'
          }
        }
        """,
            dimensions=dimensions,
        )
        print("✅ Created vector index: locationEmbeddings")
    except Exception as e:
        print(f"❌ Error creating locationEmbeddings: {e}")

    # Note index
    try:
        query(
            """
        CREATE VECTOR INDEX noteEmbeddings IF NOT EXISTS
        FOR (n:Note)
        ON n.embedding
        OPTIONS { 
          indexConfig: {
            `vector.dimensions`: $dimensions,
            `vector.similarity_function`: 'cosine'
          }
        }
        """,
            dimensions=dimensions,
        )
        print("✅ Created vector index: noteEmbeddings")
    except Exception as e:
        print(f"❌ Error creating noteEmbeddings: {e}")


def check_vector_index():
    """Check the status of vector indexes."""
    try:
        result = query("SHOW VECTOR INDEXES")
        print("Vector Indexes:")
        for record in result:
            idx = record.get("record", record)
            print(
                f"  - {idx.get('name')}: {idx.get('state')} ({idx.get('populationPercent', 0)}%)"
            )
        return result
    except Exception as e:
        print(f"Error checking vector indexes: {e}")
        return []


def drop_vector_indexes():
    """Drop all vector indexes (useful for testing/rebuilding)."""
    try:
        indexes = query("SHOW VECTOR INDEXES")
        for record in indexes:
            idx = record.get("record", record)
            index_name = idx.get("name")
            if index_name and "Embeddings" in index_name:
                try:
                    query("DROP INDEX $index_name", index_name=index_name)
                    print(f"Dropped vector index: {index_name}")
                except Exception as e:
                    print(f"Error dropping index {index_name}: {e}")
    except Exception as e:
        print(f"Error listing indexes to drop: {e}")
