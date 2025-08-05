# backend/services/sync_hooks.py

"""
Hooks into the sync system to trigger embedding updates when appropriate.
"""

from typing import List, Set
from backend.models.components import Change
from backend.services.embeddings.updates import get_embedding_update_service


class SyncEmbeddingHook:
    def __init__(self, sync_count_threshold: int = 10):
        """
        Initialize the sync embedding hook.

        Args:
            sync_count_threshold: Number of sync operations before checking for embedding updates
        """
        self.sync_count_threshold = sync_count_threshold
        self.sync_count = 0
        self.nodes_to_check: Set[str] = set()

    def on_sync_changes(self, changes: List[Change]) -> None:
        """Called when sync changes are processed."""

        # Track which nodes were updated
        for change in changes:
            if change.entity == "node" and change.op in ("create", "update"):
                # Check if this was a content change (title or markdown)
                payload = change.payload
                if "title" in payload or "markdown" in payload:
                    self.nodes_to_check.add(change.entityId)

        # Increment sync count
        self.sync_count += 1

        # Check if we should process embedding updates
        if self.sync_count >= self.sync_count_threshold:
            self._process_pending_embeddings()
            self.sync_count = 0

    def _process_pending_embeddings(self) -> None:
        """Process embedding updates for nodes that have changed."""
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
                print(f"   ❌ Failed to update embedding for {node_id}: {e}")

        # Clear the set
        self.nodes_to_check.clear()

    def force_check_all_pending(self) -> dict:
        """Force check all pending nodes immediately."""
        if not self.nodes_to_check:
            return {"message": "No pending nodes", "updated": 0}

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
