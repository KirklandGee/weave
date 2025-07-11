import React, { useState, useEffect, useMemo } from 'react';
import { X, Search } from 'lucide-react';
import { SidebarNode as Note, RelationshipType, Relationship } from '@/types/node';

type AddRelationshipModalProps = {
  isOpen: boolean;
  onClose: () => void;
  currentNote: Note;
  onAddRelationship: (targetNote: Note, relationshipType: RelationshipType) => void;
  searchNotes: (query: string) => Promise<Note[]>;
  getTwoHopSuggestions: (noteId: string) => Promise<Note[]>;
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

export function AddRelationshipModal({
  isOpen,
  onClose,
  currentNote,
  onAddRelationship,
  searchNotes,
  getTwoHopSuggestions,
  existingRelationships,
}: AddRelationshipModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [selectedRelType, setSelectedRelType] = useState<RelationshipType>('MENTIONS');
  const [searchResults, setSearchResults] = useState<Note[]>([]);
  const [twoHopSuggestions, setTwoHopSuggestions] = useState<Note[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Filter out notes that already have relationships to avoid duplicates
  const existingTargetIds = useMemo(() => {
    return new Set(existingRelationships.map(rel => rel.toId));
  }, [existingRelationships]);

  const filteredSearchResults = useMemo(() => {
    return searchResults.filter(note => 
      note.id !== currentNote.id && !existingTargetIds.has(note.id)
    );
  }, [searchResults, currentNote.id, existingTargetIds]);

  const filteredTwoHopSuggestions = useMemo(() => {
    return twoHopSuggestions.filter(note => 
      note.id !== currentNote.id && !existingTargetIds.has(note.id)
    );
  }, [twoHopSuggestions, currentNote.id, existingTargetIds]);

  // Handle search
  useEffect(() => {
    if (searchQuery.trim()) {
      setIsLoading(true);
      searchNotes(searchQuery)
        .then(setSearchResults)
        .finally(() => setIsLoading(false));
    } else {
      setSearchResults([]);
    }
  }, [searchQuery, searchNotes]);

  // Load 2-hop suggestions on open
  useEffect(() => {
    if (isOpen) {
      getTwoHopSuggestions(currentNote.id).then(setTwoHopSuggestions);
    }
  }, [isOpen, currentNote.id, getTwoHopSuggestions]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
      setSelectedNote(null);
      setSelectedRelType('MENTIONS');
      setSearchResults([]);
      setTwoHopSuggestions([]);
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedNote && selectedRelType) {
      onAddRelationship(selectedNote, selectedRelType);
      onClose();
    }
  };

  const handleNoteSelect = (note: Note) => {
    setSelectedNote(note);
    setSearchQuery(note.title);
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
            title='Relate'
            onClick={onClose}
            className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Search Input */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Search for note
            </label>
            <div className="relative">
              <Search size={16} className="absolute left-3 top-3 text-zinc-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Start typing to search..."
                className="w-full pl-10 pr-4 py-2 border border-zinc-300 dark:border-zinc-600 rounded-md bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              />
              {isLoading && (
                <div className="absolute right-3 top-3">
                  <div className="w-4 h-4 border-2 border-zinc-300 border-t-purple-500 rounded-full animate-spin"></div>
                </div>
              )}
            </div>
          </div>

          {/* Search Results */}
          {searchQuery && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Search Results
              </h3>
              <div className="max-h-32 overflow-y-auto space-y-1">
                {filteredSearchResults.map((note) => (
                  <button
                    key={note.id}
                    type="button"
                    onClick={() => handleNoteSelect(note)}
                    className={`w-full text-left px-3 py-2 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 ${
                      selectedNote?.id === note.id
                        ? 'bg-purple-100 dark:bg-purple-900 text-purple-900 dark:text-purple-100'
                        : 'text-zinc-900 dark:text-zinc-100'
                    }`}
                  >
                    <div className="font-medium">{note.title}</div>
                    <div className="text-xs text-zinc-500 dark:text-zinc-400">
                      {note.type}
                    </div>
                  </button>
                ))}
                {filteredSearchResults.length === 0 && !isLoading && (
                  <div className="text-sm text-zinc-500 dark:text-zinc-400 px-3 py-2">
                    No results found
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 2-Hop Suggestions */}
          {!searchQuery && filteredTwoHopSuggestions.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Related Suggestions
              </h3>
              <div className="max-h-32 overflow-y-auto space-y-1">
                {filteredTwoHopSuggestions.map((note) => (
                  <button
                    key={note.id}
                    type="button"
                    onClick={() => handleNoteSelect(note)}
                    className={`w-full text-left px-3 py-2 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 ${
                      selectedNote?.id === note.id
                        ? 'bg-purple-100 dark:bg-purple-900 text-purple-900 dark:text-purple-100'
                        : 'text-zinc-900 dark:text-zinc-100'
                    }`}
                  >
                    <div className="font-medium">{note.title}</div>
                    <div className="text-xs text-zinc-500 dark:text-zinc-400">
                      {note.type}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

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
}