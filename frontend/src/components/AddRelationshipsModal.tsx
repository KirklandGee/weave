// src/components/AddRelationshipsModal.tsx (Updated to use NodeSearch)
import React, { useState, useEffect, useMemo, useRef, forwardRef, useImperativeHandle } from 'react';
import { X } from 'lucide-react';
import { Note, RelationshipType, Relationship } from '@/types/node';
import { NodeSearch } from './NodeSearch';

type AddRelationshipModalProps = {
  isOpen: boolean;
  onClose: () => void;
  currentNote: Note;
  onAddRelationship: (targetNote: Note, relationshipType: RelationshipType) => void;
  searchNotes: (query: string) => Promise<Note[]>;
  getSimilarContentSuggestions: (noteId: string, limit: number) => Promise<Note[]>;
  existingRelationships: Relationship[];
}

const RELATIONSHIP_TYPES: { value: RelationshipType; label: string }[] = [
  { value: 'DEPICTS', label: 'Depicts' },
  { value: 'FOLLOWS', label: 'Follows' },
  { value: 'FROM', label: 'From' },
  { value: 'INVOLVES', label: 'Involves' },
  { value: 'KNOWS', label: 'Knows' },
  { value: 'LIVES_IN', label: 'Lives In' },
  { value: 'MENTIONS', label: 'Mentions' },
  { value: 'OCCURS_IN', label: 'Occurs In' },
  { value: 'PART_OF', label: 'Part Of' },
  { value: 'WITHIN', label: 'Within' },
];

export const AddRelationshipModal = forwardRef(function AddRelationshipModal({
  isOpen,
  onClose,
  currentNote,
  onAddRelationship,
  searchNotes,
  getSimilarContentSuggestions,
  existingRelationships,
}: AddRelationshipModalProps, ref) {
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [selectedRelType, setSelectedRelType] = useState<RelationshipType>('MENTIONS');

  // Ref for NodeSearch input
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Expose focusSearch method to parent
  useImperativeHandle(ref, () => ({
    focusSearch: () => {
      if (searchInputRef.current) {
        searchInputRef.current.focus();
      }
    }
  }), []);

  // Create exclusion list: current note + existing relationships
  const excludeNoteIds = useMemo(() => {
    const existingTargetIds = existingRelationships.map(rel => rel.toId);
    return [currentNote.id, ...existingTargetIds];
  }, [currentNote.id, existingRelationships]);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedNote(null);
      setSelectedRelType('MENTIONS');
    }
    // Focus the search input when modal opens
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedNote && selectedRelType) {
      onAddRelationship(selectedNote, selectedRelType);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="flex items-center justify-between p-4 border-b border-zinc-200 dark:border-zinc-700">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            Add Relationship
          </h2>
          <button
            title='Close'
            onClick={onClose}
            className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Search Component */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Search for note
            </label>
            <NodeSearch
              ref={searchInputRef}
              onSearch={searchNotes}
              onSuggestions={getSimilarContentSuggestions}
              selectedNote={selectedNote}
              onNoteSelect={setSelectedNote}
              excludeNoteIds={excludeNoteIds}
              currentNoteId={currentNote.id}
              placeholder="Start typing to search notes..."
              suggestionsTitle="Related Suggestions"
              maxResults={8}
            />
          </div>

          {/* Relationship Type Selector */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Relationship Type
            </label>
            <select
              title='Select Relationship Type'
              value={selectedRelType}
              onChange={(e) => setSelectedRelType(e.target.value as RelationshipType)}
              className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-md bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            >
              {RELATIONSHIP_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          {/* Preview */}
          {selectedNote && (
            <div className="p-3 bg-zinc-50 dark:bg-zinc-800 rounded-md">
              <div className="text-sm text-zinc-600 dark:text-zinc-400">
                <strong>{currentNote.title}</strong> {selectedRelType.toLowerCase()} <strong>{selectedNote.title}</strong>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!selectedNote}
              className="px-4 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 disabled:bg-zinc-400 disabled:cursor-not-allowed rounded-md"
            >
              Add Relationship
            </button>
          </div>
        </form>
      </div>
    </div>
  );
});