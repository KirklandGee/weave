import { useState, useCallback } from 'react';
import { SuggestedAction, ActionType, ActionPreviewState } from '@/types/agent';
import { createNodeOps } from '@/lib/hooks/useNodeOps';
import { getDb } from '@/lib/db/campaignDB';
import { useCampaign } from '@/contexts/AppContext';

export function useActionPreview(
  campaignSlug: string, 
  onNavigateToNote: (noteId: string) => void
) {
  const [previewState, setPreviewState] = useState<ActionPreviewState | null>(null);
  const [isProcessingAction, setIsProcessingAction] = useState(false);
  const { refreshFolders } = useCampaign();
  const nodeOps = createNodeOps(campaignSlug);
  const db = getDb(campaignSlug);

  // Apply action as preview (optimistic update)
  const previewAction = useCallback(async (action: SuggestedAction) => {
    if (isProcessingAction) return;
    
    setIsProcessingAction(true);
    
    try {
      let targetNodeId: string;
      let originalContent: string | undefined;
      let originalTitle: string | undefined;

      switch (action.type) {
        case ActionType.CREATE_NOTE:
          // Create the note
          targetNodeId = await nodeOps.createNode({
            type: action.node_type,
            title: action.title,
            markdown: action.content,
          });
          // Refresh folders to show the new note in sidebar
          refreshFolders();
          // Navigate to the newly created note
          onNavigateToNote(targetNodeId);
          break;

        case ActionType.UPDATE_NOTE:
          if (!action.target_id) {
            throw new Error('target_id required for update_note action');
          }
          targetNodeId = action.target_id;
          
          // Store original state
          const existingNode = await db.nodes.get(targetNodeId);
          if (existingNode) {
            originalContent = existingNode.markdown;
            originalTitle = existingNode.title;
          }
          
          // Navigate to target note first
          onNavigateToNote(targetNodeId);
          
          // Apply the update
          await nodeOps.renameNode(targetNodeId, action.title);
          await db.nodes.update(targetNodeId, { 
            markdown: action.content,
            updatedAt: Date.now()
          });
          break;

        case ActionType.APPEND_TO_NOTE:
          if (!action.target_id) {
            throw new Error('target_id required for append_to_note action');
          }
          targetNodeId = action.target_id;
          
          // Store original state
          const existingAppendNode = await db.nodes.get(targetNodeId);
          if (existingAppendNode) {
            originalContent = existingAppendNode.markdown;
            originalTitle = existingAppendNode.title;
          }
          
          // Navigate to target note first
          onNavigateToNote(targetNodeId);
          
          // Append content
          const newContent = originalContent ? 
            originalContent + '\n\n' + action.content : 
            action.content;
          
          await db.nodes.update(targetNodeId, {
            markdown: newContent,
            updatedAt: Date.now()
          });
          break;

        default:
          throw new Error(`Unknown action type: ${action.type}`);
      }

      // Set preview state
      setPreviewState({
        action,
        originalContent,
        originalTitle,
        isPreviewActive: true,
        targetNodeId,
      });

    } catch (error) {
      console.error('Failed to preview action:', error);
      throw error;
    } finally {
      setIsProcessingAction(false);
    }
  }, [nodeOps, db, onNavigateToNote, isProcessingAction, refreshFolders]);

  // Approve the current preview (commit changes)
  const approveAction = useCallback(async () => {
    if (!previewState) return;
    
    // For create_note, there's nothing additional to do - the note is already created
    // For update_note and append_to_note, the changes are already applied
    // We just need to clear the preview state to "commit" the changes
    
    setPreviewState(null);
    
    // The changes are already persisted in Dexie, so this effectively commits them
    console.log('Action approved and committed:', previewState.action.type);
  }, [previewState]);

  // Reject the current preview (revert changes)
  const rejectAction = useCallback(async () => {
    if (!previewState) return;
    
    try {
      const { action, originalContent, originalTitle, targetNodeId } = previewState;
      
      switch (action.type) {
        case ActionType.CREATE_NOTE:
          // Delete the created note
          await nodeOps.deleteNode(targetNodeId);
          // Refresh folders to remove the note from sidebar
          refreshFolders();
          break;

        case ActionType.UPDATE_NOTE:
          // Revert to original state
          if (originalTitle !== undefined) {
            await nodeOps.renameNode(targetNodeId, originalTitle);
          }
          if (originalContent !== undefined) {
            await db.nodes.update(targetNodeId, {
              markdown: originalContent,
              updatedAt: Date.now()
            });
          }
          break;

        case ActionType.APPEND_TO_NOTE:
          // Revert to original content
          if (originalContent !== undefined) {
            await db.nodes.update(targetNodeId, {
              markdown: originalContent,
              updatedAt: Date.now()
            });
          }
          break;
      }
      
      setPreviewState(null);
      console.log('Action rejected and reverted:', action.type);
      
    } catch (error) {
      console.error('Failed to revert action:', error);
      throw error;
    }
  }, [previewState, nodeOps, db, refreshFolders]);

  // Clear preview state without changes (for cleanup)
  const clearPreview = useCallback(() => {
    setPreviewState(null);
  }, []);

  return {
    previewState,
    isProcessingAction,
    previewAction,
    approveAction,
    rejectAction,
    clearPreview,
  };
}