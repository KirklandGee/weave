import React, { useState, useEffect, useCallback } from 'react';
import { Plus, ArrowRight, X } from 'lucide-react';
import { AddRelationshipModal } from './AddRelationshipsModal';
import { useRelationships } from '../lib/hooks/useRelationships';
import { Note as Note, RelationshipType } from '@/types/node';
import { searchNotes } from '@/lib/search';
import { useCampaign } from '@/contexts/CampaignContext';

type RelationshipsSectionProps = {
  currentNote: Note;
  // Optional: function to navigate to a note
  onNavigateToNote?: (noteId: string) => void;
}

const RELATIONSHIP_TYPE_COLORS: Record<RelationshipType, string> = {
  'DEPICTS': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  'FOLLOWS': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  'FROM': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  'INVOLVES': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  'KNOWS': 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200',
  'LIVES_IN': 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
  'MENTIONS': 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
  'OCCURS_IN': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  'PART_OF': 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200',
  'WITHIN': 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200',
};

export function RelationshipsSection({
  currentNote,
  onNavigateToNote,
}: RelationshipsSectionProps) {
  const { currentCampaign } = useCampaign();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isRemoving, setIsRemoving] = useState<string | null>(null);

  const {
    relationships,
    isLoading,
    getSimilarContentSuggestions,
    addRelationship,
    removeRelationship,
    loadRelationships,
  } = useRelationships({
    currentNote,
  });

  // Load relationships when component mounts or note changes
  useEffect(() => {
    loadRelationships();
  }, [loadRelationships]);

  const handleAddRelationship = async (targetNote: Note, relationshipType: RelationshipType) => {
    try {
      await addRelationship(targetNote, relationshipType);
      setIsModalOpen(false);
    } catch (error) {
      console.error('Failed to add relationship:', error);
      // You might want to show a toast notification here
    }
  };

  const handleRemoveRelationship = async (relationshipId: string) => {
    setIsRemoving(relationshipId);
    try {
      await removeRelationship(relationshipId);
    } catch (error) {
      console.error('Failed to remove relationship:', error);
      // You might want to show a toast notification here
    } finally {
      setIsRemoving(null);
    }
  };

  const handleNoteClick = (noteId: string) => {
    if (onNavigateToNote) {
      onNavigateToNote(noteId);
    }
  };

  // Create campaign-aware search function
  const campaignSearchNotes = useCallback(async (query: string) => {
    if (!currentCampaign) {
      return [];
    }
    return searchNotes(query, currentCampaign.slug);
  }, [currentCampaign]);

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Relationships
        </h3>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-1 px-2 py-1 text-xs text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-md transition-colors"
        >
          <Plus size={12} />
          Add
        </button>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-4">
          <div className="w-5 h-5 border-2 border-zinc-300 border-t-purple-500 rounded-full animate-spin"></div>
        </div>
      )}

      {/* Relationships List - Split into Outgoing and Incoming */}
      {!isLoading && (
        <div className="space-y-4">
          {/* Outgoing Relationships */}
          <div>
            <h4 className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">Outgoing Relationships</h4>
            <div className="space-y-2">
              {relationships.filter(r => currentNote.id === r.fromId).length === 0 ? (
                <div className="text-xs text-zinc-500 dark:text-zinc-400 py-2">None</div>
              ) : (
                relationships.filter(r => currentNote.id === r.fromId).map((relationship) => {
                  const otherNoteId = relationship.toId;
                  const otherNoteTitle = relationship.toTitle;
                  return (
                    <div
                      key={relationship.id}
                      className="group flex items-center justify-between p-2 bg-zinc-50 dark:bg-zinc-800/50 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${RELATIONSHIP_TYPE_COLORS[relationship.relType]}`}>{relationship.relType.replace('_', ' ')}</span>
                        <ArrowRight size={12} className="text-zinc-400 flex-shrink-0" />
                        <button
                          onClick={() => handleNoteClick(otherNoteId)}
                          className="text-sm text-zinc-900 dark:text-zinc-100 hover:text-purple-600 dark:hover:text-purple-400 transition-colors truncate"
                          title={otherNoteTitle}
                        >
                          {otherNoteTitle}
                        </button>
                      </div>
                      <button
                        onClick={() => handleRemoveRelationship(relationship.id)}
                        disabled={isRemoving === relationship.id}
                        className="opacity-0 group-hover:opacity-100 p-1 text-zinc-400 hover:text-red-500 transition-all"
                        title="Remove relationship"
                      >
                        {isRemoving === relationship.id ? (
                          <div className="w-3 h-3 border border-zinc-300 border-t-red-500 rounded-full animate-spin"></div>
                        ) : (
                          <X size={12} />
                        )}
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
          {/* Incoming Relationships */}
          <div>
            <h4 className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">Incoming Relationships</h4>
            <div className="space-y-2">
              {relationships.filter(r => currentNote.id === r.toId).length === 0 ? (
                <div className="text-xs text-zinc-500 dark:text-zinc-400 py-2">None</div>
              ) : (
                relationships.filter(r => currentNote.id === r.toId).map((relationship) => {
                  const otherNoteId = relationship.fromId;
                  const otherNoteTitle = relationship.fromTitle;
                  return (
                    <div
                      key={relationship.id}
                      className="group flex items-center justify-between p-2 bg-zinc-50 dark:bg-zinc-800/50 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${RELATIONSHIP_TYPE_COLORS[relationship.relType]}`}>{relationship.relType.replace('_', ' ')}</span>
                        <ArrowRight size={12} className="text-zinc-400 flex-shrink-0 rotate-180" />
                        <button
                          onClick={() => handleNoteClick(otherNoteId)}
                          className="text-sm text-zinc-900 dark:text-zinc-100 hover:text-purple-600 dark:hover:text-purple-400 transition-colors truncate"
                          title={otherNoteTitle}
                        >
                          {otherNoteTitle}
                        </button>
                      </div>
                      <button
                        onClick={() => handleRemoveRelationship(relationship.id)}
                        disabled={isRemoving === relationship.id}
                        className="opacity-0 group-hover:opacity-100 p-1 text-zinc-400 hover:text-red-500 transition-all"
                        title="Remove relationship"
                      >
                        {isRemoving === relationship.id ? (
                          <div className="w-3 h-3 border border-zinc-300 border-t-red-500 rounded-full animate-spin"></div>
                        ) : (
                          <X size={12} />
                        )}
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add Relationship Modal */}
      <AddRelationshipModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        currentNote={currentNote}
        onAddRelationship={handleAddRelationship}
        searchNotes={campaignSearchNotes}
        getSimilarContentSuggestions={getSimilarContentSuggestions}
        existingRelationships={relationships}
      />
    </div>
  );
}