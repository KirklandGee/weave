"""
Script to set up vector indexes and generate initial embeddings for seed data.
Run this after seeding your database.

Usage: python -m backend.scripts.setup_embeddings
"""

import asyncio
import sys
import os

# Add the project root to the path so we can import backend modules
project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, project_root)

from backend.services.neo4j import query, verify
from backend.services.neo4j.setup_embeddings import create_vector_index, check_vector_index
from backend.services.embeddings.service import get_embedding_service


async def setup_vector_index():
    """Create the vector index."""
    print("🔧 Setting up vector index...")
    try:
        create_vector_index()
        print("✅ Vector index created successfully")
        
        # Check index status
        print("\n📊 Index status:")
        check_vector_index()
        
    except Exception as e:
        print(f"❌ Error setting up vector index: {e}")
        return False
    
    return True


async def generate_initial_embeddings():
    """Generate embeddings for all existing nodes."""
    print("\n🤖 Generating embeddings for all nodes...")
    
    try:
        # Get all nodes that don't have embeddings yet
        nodes_query = """
        MATCH (n)
        WHERE n.title IS NOT NULL 
        AND n.embedding IS NULL
        AND (n:Campaign OR n:Session OR n:NPC OR n:Character OR n:Location OR n:Note)
        RETURN n.id AS id, n.title AS title, n.markdown AS markdown, labels(n)[0] AS type
        ORDER BY n.createdAt DESC
        """
        
        nodes = query(nodes_query)
        
        if not nodes:
            print("✅ No nodes need embeddings")
            return True
        
        print(f"📝 Found {len(nodes)} nodes to embed...")
        
        embedding_service = get_embedding_service()
        success_count = 0
        error_count = 0
        
        for i, node in enumerate(nodes):
            try:
                # Generate embedding
                text_to_embed = f"{node['title']}\n{node['markdown'] or ''}"
                embedding = embedding_service.generate_embedding(text_to_embed)
                
                # Generate content hash
                import hashlib
                content_hash = hashlib.md5(text_to_embed.encode()).hexdigest()
                
                # Store embedding
                update_query = """
                MATCH (n {id: $node_id})
                SET n.embedding = $embedding, 
                    n.embeddedAt = int(datetime.now().timestamp() * 1000)
                    n.contentHash = $content_hash
                """
                query(update_query, node_id=node['id'], embedding=embedding, content_hash=content_hash)
                
                success_count += 1
                
                # Progress indicator
                if (i + 1) % 10 == 0:
                    print(f"   Processed {i + 1}/{len(nodes)} nodes...")
                
            except Exception as e:
                print(f"❌ Error embedding node {node['id']} ({node['title']}): {e}")
                error_count += 1
                continue
        
        print(f"\n✅ Embedding complete!")
        print(f"   ✅ Success: {success_count}")
        print(f"   ❌ Errors: {error_count}")
        
        return error_count == 0
        
    except Exception as e:
        print(f"❌ Fatal error during embedding generation: {e}")
        return False


async def main():
    """Main setup function."""
    print("🚀 Starting embedding setup for AI RPG Manager...")
    
    try:
        # Verify Neo4j connection
        print("🔗 Verifying Neo4j connection...")
        verify()
        print("✅ Neo4j connection verified")
        
        # Set up vector index
        if not await setup_vector_index():
            print("❌ Failed to set up vector index. Aborting.")
            return
        
        # Wait a moment for index to be ready
        print("\n⏳ Waiting for index to be ready...")
        await asyncio.sleep(2)
        
        # Generate initial embeddings
        if not await generate_initial_embeddings():
            print("⚠️  Some embeddings failed, but continuing...")
        
        print("\n🎉 Setup complete! Your database is ready for vector search.")
        
    except Exception as e:
        print(f"❌ Setup failed: {e}")


if __name__ == "__main__":
    asyncio.run(main())