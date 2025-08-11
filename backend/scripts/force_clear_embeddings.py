#!/usr/bin/env python3
"""
Force clear ALL embeddings from the database.
This ensures no old 384-dimension embeddings remain.

Usage: python -m backend.scripts.force_clear_embeddings
"""

import os
import sys

# Add the project root to the path so we can import backend modules
project_root = os.path.dirname(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
)
sys.path.insert(0, project_root)

from backend.services.neo4j import query, verify


def force_clear_all_embeddings():
    """Forcefully clear ALL embeddings and related fields from ALL nodes."""
    try:
        print("🔄 Force clearing ALL embeddings...")
        
        # First, get a count of nodes with embeddings
        count_query = """
        MATCH (n)
        WHERE n.embedding IS NOT NULL
        RETURN count(n) as total
        """
        
        result = query(count_query)
        total_before = result[0]["total"] if result else 0
        print(f"Found {total_before} nodes with embeddings")
        
        if total_before == 0:
            print("✅ No embeddings found - database is already clean")
            return
        
        # Clear ALL embedding-related properties
        clear_query = """
        MATCH (n)
        WHERE n.embedding IS NOT NULL
        REMOVE n.embedding, n.contentHash, n.embeddedAt
        RETURN count(n) as cleared
        """
        
        result = query(clear_query)
        cleared = result[0]["cleared"] if result else 0
        
        # Verify all embeddings are gone
        verify_query = """
        MATCH (n)
        WHERE n.embedding IS NOT NULL
        RETURN count(n) as remaining
        """
        
        result = query(verify_query)
        remaining = result[0]["remaining"] if result else 0
        
        print(f"✅ Cleared embeddings from {cleared} nodes")
        print(f"✅ {remaining} nodes still have embeddings (should be 0)")
        
        if remaining > 0:
            print("⚠️ Warning: Some embeddings still remain. Manual cleanup may be needed.")
        else:
            print("🎉 All embeddings successfully cleared!")
            
    except Exception as e:
        print(f"❌ Error clearing embeddings: {e}")


def main():
    """Main function."""
    print("🚀 Force clearing all embeddings...")
    
    try:
        # Verify Neo4j connection
        print("🔗 Verifying Neo4j connection...")
        verify()
        print("✅ Neo4j connection verified")
        
        force_clear_all_embeddings()
        
    except Exception as e:
        print(f"❌ Failed: {e}")


if __name__ == "__main__":
    main()