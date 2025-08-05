# backend/services/sync_hooks.py

"""
Hooks into the sync system to trigger embedding updates when appropriate.
"""

import os
import logging
from typing import List, Set
try:
    from backend.models.components import Change
    from backend.services.embeddings.updates import get_embedding_update_service
    from backend.services.queue_service import get_task_queue
except ImportError:
    from models.components import Change
    from services.embeddings.updates import get_embedding_update_service
    from services.queue_service import get_task_queue

logger = logging.getLogger(__name__)


class SyncEmbeddingHook:
    def __init__(self, sync_count_threshold: int = None):
        """
        Initialize the sync embedding hook.

        Args:
            sync_count_threshold: Number of sync operations before checking for embedding updates.
                                 If None, uses environment variable SYNC_EMBEDDING_THRESHOLD (default: 5)
        """
        self.sync_count_threshold = sync_count_threshold or int(os.getenv("SYNC_EMBEDDING_THRESHOLD", "5"))
        self.sync_count = 0
        self.nodes_to_check: Set[str] = set()
        self.use_background_queue = os.getenv("EMBEDDING_BACKGROUND_ENABLED", "true").lower() == "true"

    def on_sync_changes(self, changes: List[Change]) -> None:
        """Called when sync changes are processed."""

        # Track which nodes were updated
        for change in changes:
            if change.entity == "node" and change.op in ("create", "update"):
                # Check if this was a content change (title or markdown) or new node
                payload = change.payload
                if change.op == "create" or "title" in payload or "markdown" in payload:
                    self.nodes_to_check.add(change.entityId)
                    logger.debug(f"Added node {change.entityId} to embedding check queue (op: {change.op})")

        # Increment sync count
        self.sync_count += 1

        # Check if we should process embedding updates
        if self.sync_count >= self.sync_count_threshold:
            if self.use_background_queue:
                self._queue_pending_embeddings()
            else:
                self._process_pending_embeddings_sync()
            self.sync_count = 0

    def _queue_pending_embeddings(self) -> None:
        """Queue embedding updates as background tasks."""
        if not self.nodes_to_check:
            return

        try:
            try:
                from backend.services.embeddings.tasks import process_nodes_batch_embedding
            except ImportError:
                from services.embeddings.tasks import process_nodes_batch_embedding
            
            queue = get_task_queue("default")  # Use default queue for embedding tasks
            node_list = list(self.nodes_to_check)
            
            # Queue the batch processing task
            task = queue.enqueue(
                process_nodes_batch_embedding,
                node_list,
                force=False,  # Don't force re-embedding, use smart updates
                job_timeout='5m'  # 5 minute timeout for embedding tasks
            )
            
            logger.info(f"Queued embedding task for {len(node_list)} nodes (task ID: {task.id})")
            
        except Exception as e:
            logger.error(f"Failed to queue embedding tasks: {e}")
            # Fallback to synchronous processing
            self._process_pending_embeddings_sync()
            return
        
        # Clear the set after queueing
        self.nodes_to_check.clear()

    def _process_pending_embeddings_sync(self) -> None:
        """Process embedding updates synchronously (fallback method)."""
        if not self.nodes_to_check:
            return

        update_service = get_embedding_update_service()
        updated_count = 0

        # Process each node
        for node_id in self.nodes_to_check:
            try:
                result = update_service.update_node_embedding(node_id)
                if result.get("updated"):
                    updated_count += 1
            except Exception as e:
                logger.error(f"Failed to update embedding for {node_id}: {e}")

        logger.info(f"Processed {updated_count} embedding updates synchronously")
        
        # Clear the set
        self.nodes_to_check.clear()

    def force_check_all_pending(self) -> dict:
        """Force check all pending nodes immediately."""
        if not self.nodes_to_check:
            return {"message": "No pending nodes", "updated": 0}

        if self.use_background_queue:
            try:
                try:
                    from backend.services.embeddings.tasks import process_nodes_batch_embedding
                except ImportError:
                    from services.embeddings.tasks import process_nodes_batch_embedding
                
                queue = get_task_queue("priority")  # Use priority queue for manual triggers
                node_list = list(self.nodes_to_check)
                
                task = queue.enqueue(
                    process_nodes_batch_embedding,
                    node_list,
                    force=True,  # Force re-embedding when manually triggered
                    job_timeout='10m'
                )
                
                self.nodes_to_check.clear()
                self.sync_count = 0
                
                return {
                    "message": f"Queued {len(node_list)} nodes for forced embedding check",
                    "task_id": task.id,
                    "queued": len(node_list)
                }
            except Exception as e:
                logger.error(f"Failed to queue forced embedding check: {e}")
                # Fall through to synchronous processing

        # Synchronous processing (fallback or when background queue disabled)
        update_service = get_embedding_update_service()
        updated_count = 0
        errors = []

        for node_id in self.nodes_to_check:
            try:
                result = update_service.update_node_embedding(node_id)
                if result.get("updated"):
                    updated_count += 1
            except Exception as e:
                errors.append(f"{node_id}: {str(e)}")

        self.nodes_to_check.clear()
        self.sync_count = 0

        return {
            "message": f"Force-checked all pending nodes",
            "updated": updated_count,
            "errors": errors,
        }


# Singleton instance
_sync_embedding_hook = None


def get_sync_embedding_hook() -> SyncEmbeddingHook:
    """Get the singleton sync embedding hook instance."""
    global _sync_embedding_hook
    if _sync_embedding_hook is None:
        _sync_embedding_hook = SyncEmbeddingHook()
    return _sync_embedding_hook
