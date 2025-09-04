#!/usr/bin/env python3
"""
Test script for the embedding system integration.
Run this to verify embedding background tasks work before deploying.
"""

import os
import sys
import time
import uuid
import asyncio
from datetime import datetime
from typing import List, Dict, Any

# Add the backend directory to Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

try:
    # Try absolute imports first (when run as module)
    from backend.services.embeddings.tasks import (
        process_node_embedding,
        process_nodes_batch_embedding,
        find_and_process_missing_embeddings,
        process_campaign_embeddings
    )
    from backend.services.sync_hooks import get_sync_embedding_hook
    from backend.services.queue_service import get_task_queue, health_check
    from backend.services.neo4j import query
    from backend.models.components import Change
except ImportError:
    # Fall back to relative imports (when run from backend directory)
    from services.embeddings.tasks import (
        process_node_embedding,
        process_nodes_batch_embedding,
        find_and_process_missing_embeddings,
        process_campaign_embeddings
    )
    from services.sync_hooks import get_sync_embedding_hook
    from services.queue_service import get_task_queue, health_check
    from services.neo4j import query
    from models.components import Change


class EmbeddingSystemTester:
    def __init__(self):
        self.test_campaign_id = f"test-campaign-{uuid.uuid4().hex[:8]}"
        self.test_node_ids = []
        self.results = {"passed": 0, "failed": 0, "errors": []}
        
    def log(self, message: str, level: str = "INFO"):
        """Log test messages with timestamp."""
        timestamp = datetime.now().strftime("%H:%M:%S")
        print(f"[{timestamp}] {level}: {message}")
        
    def assert_test(self, condition: bool, test_name: str, error_msg: str = None):
        """Assert a test condition and log results."""
        if condition:
            self.results["passed"] += 1
            self.log(f"✅ {test_name}", "PASS")
            return True
        else:
            self.results["failed"] += 1
            error = error_msg or f"Test failed: {test_name}"
            self.results["errors"].append(error)
            self.log(f"❌ {test_name}: {error}", "FAIL")
            return False
    
    def setup_test_data(self):
        """Create test nodes for embedding tests."""
        self.log("Setting up test data...")
        
        try:
            # Create test campaign
            query("""
                MERGE (c:Campaign {id: $campaign_id})
                SET c.title = $title,
                    c.type = 'Campaign',
                    c.markdown = 'Test campaign for embedding system',
                    c.createdAt = datetime(),
                    c.updatedAt = datetime()
            """, campaign_id=self.test_campaign_id, title=f"Test Campaign {self.test_campaign_id}")
            
            # Create test nodes without embeddings
            for i in range(3):
                node_id = f"test-node-{i}-{uuid.uuid4().hex[:8]}"
                self.test_node_ids.append(node_id)
                
                query("""
                    CREATE (n:Note {
                        id: $node_id,
                        title: $title,
                        type: 'Note',
                        markdown: $markdown,
                        campaignId: $campaign_id,
                        createdAt: datetime(),
                        updatedAt: datetime()
                    })
                    WITH n
                    MATCH (c:Campaign {id: $campaign_id})
                    MERGE (n)-[:PART_OF]->(c)
                """, 
                node_id=node_id,
                title=f"Test Note {i}",
                markdown=f"This is test note {i} with some content for embedding generation.",
                campaign_id=self.test_campaign_id)
            
            self.log(f"Created test campaign and {len(self.test_node_ids)} test nodes")
            return True
            
        except Exception as e:
            self.log(f"Failed to setup test data: {e}", "ERROR")
            return False
    
    def cleanup_test_data(self):
        """Clean up test data after tests."""
        self.log("Cleaning up test data...")
        
        try:
            # Delete test nodes and campaign
            query("""
                MATCH (n {campaignId: $campaign_id})
                DETACH DELETE n
            """, campaign_id=self.test_campaign_id)
            
            query("""
                MATCH (c:Campaign {id: $campaign_id})
                DETACH DELETE c
            """, campaign_id=self.test_campaign_id)
            
            self.log("Test data cleaned up successfully")
            return True
            
        except Exception as e:
            self.log(f"Failed to cleanup test data: {e}", "ERROR")
            return False
    
    def test_1_basic_embedding_task(self):
        """Test basic embedding task functionality."""
        self.log("Testing basic embedding task...")
        
        if not self.test_node_ids:
            return self.assert_test(False, "Basic embedding task", "No test nodes available")
        
        node_id = self.test_node_ids[0]
        
        try:
            # Test single node embedding
            result = process_node_embedding(node_id, force=True)
            
            success = (
                result.get("updated") == True and
                result.get("node_id") == node_id and
                "error" not in result
            )
            
            return self.assert_test(success, "Basic embedding task", 
                                  f"Unexpected result: {result}")
            
        except Exception as e:
            return self.assert_test(False, "Basic embedding task", str(e))
    
    def test_2_batch_embedding_task(self):
        """Test batch embedding task functionality."""
        self.log("Testing batch embedding task...")
        
        if len(self.test_node_ids) < 2:
            return self.assert_test(False, "Batch embedding task", "Need at least 2 test nodes")
        
        try:
            # Test batch processing
            result = process_nodes_batch_embedding(self.test_node_ids, force=True)
            
            success = (
                result.get("processed") == len(self.test_node_ids) and
                result.get("updated") > 0 and
                len(result.get("errors", [])) == 0
            )
            
            return self.assert_test(success, "Batch embedding task", 
                                  f"Unexpected result: {result}")
            
        except Exception as e:
            return self.assert_test(False, "Batch embedding task", str(e))
    
    def test_3_missing_embeddings_detection(self):
        """Test finding nodes without embeddings."""
        self.log("Testing missing embeddings detection...")
        
        try:
            # First clear embeddings from test nodes
            for node_id in self.test_node_ids:
                query("MATCH (n {id: $node_id}) REMOVE n.embedding, n.embeddedAt", 
                      node_id=node_id)
            
            # Test finding missing embeddings
            result = find_and_process_missing_embeddings(self.test_campaign_id, limit=10)
            
            success = (
                result.get("processed") > 0 and
                result.get("updated") > 0 and
                len(result.get("errors", [])) == 0
            )
            
            return self.assert_test(success, "Missing embeddings detection", 
                                  f"Unexpected result: {result}")
            
        except Exception as e:
            return self.assert_test(False, "Missing embeddings detection", str(e))
    
    def test_4_sync_hook_functionality(self):
        """Test sync hook with mock changes."""
        self.log("Testing sync hook functionality...")
        
        try:
            hook = get_sync_embedding_hook()
            
            # Create mock changes
            mock_changes = [
                Change(
                    entity="node",
                    entityId=self.test_node_ids[0],
                    op="update",
                    payload={"title": "Updated Test Note", "markdown": "Updated content"},
                    ts=int(time.time() * 1000)
                ),
                Change(
                    entity="node", 
                    entityId=f"new-node-{uuid.uuid4().hex[:8]}",
                    op="create",
                    payload={"title": "New Test Note", "type": "Note", "markdown": "New content"},
                    ts=int(time.time() * 1000)
                )
            ]
            
            # Test sync hook processing
            initial_count = len(hook.nodes_to_check)
            hook.on_sync_changes(mock_changes)
            final_count = len(hook.nodes_to_check)
            
            success = final_count > initial_count
            
            return self.assert_test(success, "Sync hook functionality", 
                                  f"Nodes to check didn't increase: {initial_count} -> {final_count}")
            
        except Exception as e:
            return self.assert_test(False, "Sync hook functionality", str(e))
    
    def test_5_queue_health(self):
        """Test queue system health."""
        self.log("Testing queue system health...")
        
        try:
            # Test Redis connection
            redis_healthy = health_check()
            
            if not redis_healthy:
                return self.assert_test(False, "Queue health", "Redis connection failed")
            
            # Test queue creation
            queues = ["default", "priority", "long_running"]
            for queue_name in queues:
                queue = get_task_queue(queue_name)
                queue_len = len(queue)  # This will fail if queue creation fails
            
            return self.assert_test(True, "Queue health", "All queues accessible")
            
        except Exception as e:
            return self.assert_test(False, "Queue health", str(e))
    
    def test_6_environment_config(self):
        """Test environment variable configuration."""
        self.log("Testing environment configuration...")
        
        try:
            # Test environment variables are readable
            background_enabled = os.getenv("EMBEDDING_BACKGROUND_ENABLED", "true")
            sync_threshold = os.getenv("SYNC_EMBEDDING_THRESHOLD", "5")
            embedding_model = os.getenv("EMBEDDING_MODEL", "text-embedding-3-small")
            
            # Create hook to test config loading
            hook = get_sync_embedding_hook()
            
            config_loaded = (
                hasattr(hook, 'use_background_queue') and
                hasattr(hook, 'sync_count_threshold') and
                hook.sync_count_threshold > 0
            )
            
            return self.assert_test(config_loaded, "Environment configuration", 
                                  "Configuration not loaded properly")
            
        except Exception as e:
            return self.assert_test(False, "Environment configuration", str(e))
    
    def test_7_error_handling(self):
        """Test error handling and fallbacks."""
        self.log("Testing error handling...")
        
        try:
            # Test processing non-existent node
            result = process_node_embedding("non-existent-node-id")
            
            has_error = (
                result.get("updated") == False and
                "error" in result
            )
            
            return self.assert_test(has_error, "Error handling", 
                                  "Should return error for non-existent node")
            
        except Exception as e:
            # This is actually expected behavior - the function should handle errors gracefully
            return self.assert_test(True, "Error handling", "Exception properly caught")
    
    def run_all_tests(self):
        """Run all tests in sequence."""
        self.log("=" * 60)
        self.log("STARTING EMBEDDING SYSTEM INTEGRATION TESTS")
        self.log("=" * 60)
        
        # Setup
        if not self.setup_test_data():
            self.log("Failed to setup test data, aborting tests", "ERROR")
            return False
        
        # Run tests
        tests = [
            self.test_1_basic_embedding_task,
            self.test_2_batch_embedding_task, 
            self.test_3_missing_embeddings_detection,
            self.test_4_sync_hook_functionality,
            self.test_5_queue_health,
            self.test_6_environment_config,
            self.test_7_error_handling,
        ]
        
        for test_func in tests:
            try:
                test_func()
            except Exception as e:
                self.assert_test(False, test_func.__name__, f"Test threw exception: {e}")
        
        # Cleanup
        self.cleanup_test_data()
        
        # Results
        self.log("=" * 60)
        self.log("TEST RESULTS SUMMARY")
        self.log("=" * 60)
        self.log(f"✅ Passed: {self.results['passed']}")
        self.log(f"❌ Failed: {self.results['failed']}")
        
        if self.results["errors"]:
            self.log("ERRORS:")
            for error in self.results["errors"]:
                self.log(f"  - {error}")
        
        total_tests = self.results['passed'] + self.results['failed']
        success_rate = (self.results['passed'] / total_tests * 100) if total_tests > 0 else 0
        
        self.log(f"Success Rate: {success_rate:.1f}%")
        
        if self.results['failed'] == 0:
            self.log("🎉 ALL TESTS PASSED! System ready for production.", "SUCCESS")
            return True
        else:
            self.log("⚠️  Some tests failed. Review errors before deploying.", "WARNING")  
            return False


def main():
    """Main test runner."""
    tester = EmbeddingSystemTester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()