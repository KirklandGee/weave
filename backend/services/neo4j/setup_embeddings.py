from backend.services.neo4j import query
from backend.services.embeddings.service import get_embedding_service


def create_vector_index():
    """Create vector indexes for all node types that can have embeddings."""
    print("🗑️  Dropping existing vector indexes...")
    drop_vector_indexes()
    
    print("🔧 Creating new vector indexes...")

    embedding_service = get_embedding_service()
    dimensions = embedding_service.dimensions

    # Create separate indexes for each node type with literal strings

    # Campaign index
    try:
        query(
            """
        CREATE VECTOR INDEX campaignEmbeddings
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
        CREATE VECTOR INDEX sessionEmbeddings
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
        CREATE VECTOR INDEX npcEmbeddings
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
        CREATE VECTOR INDEX characterEmbeddings
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
        CREATE VECTOR INDEX locationEmbeddings
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
        CREATE VECTOR INDEX noteEmbeddings
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
            if index_name and ("Embeddings" in index_name or "_vec_idx" in index_name):
                try:
                    query(f"DROP INDEX {index_name}")
                    print(f"Dropped vector index: {index_name}")
                except Exception as e:
                    print(f"Error dropping index {index_name}: {e}")
    except Exception as e:
        print(f"Error listing indexes to drop: {e}")


def clear_all_embeddings():
    """Clear all existing embeddings and content hashes from the database."""
    try:
        result = query(
            """
            MATCH (n)
            WHERE n.embedding IS NOT NULL
            SET n.embedding = NULL, 
                n.contentHash = NULL,
                n.embeddedAt = NULL
            RETURN count(n) as cleared
            """
        )
        
        if result:
            count = result[0].get("cleared", 0)
            print(f"Cleared embeddings from {count} nodes")
        else:
            print("No embeddings found to clear")
    except Exception as e:
        print(f"Error clearing embeddings: {e}")


def migrate_to_new_dimensions():
    """Complete migration process: drop indexes, clear embeddings, recreate indexes."""
    print("🔄 Starting migration to new embedding dimensions...")
    
    # Step 1: Drop existing vector indexes
    print("\n1. Dropping existing vector indexes...")
    drop_vector_indexes()
    
    # Step 2: Clear all existing embeddings
    print("\n2. Clearing existing embeddings...")
    clear_all_embeddings()
    
    # Step 3: Recreate indexes with new dimensions
    print("\n3. Creating new vector indexes...")
    create_vector_index()
    
    print("\n✅ Migration completed successfully!")
