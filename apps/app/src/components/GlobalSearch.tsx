// src/components/GlobalSearch.tsx
import React, { useState } from 'react';
import { Search, X } from 'lucide-react';
import { Note } from '@/types/node';
import { NodeSearch } from './NodeSearch';

interface GlobalSearchProps {
  // Search functionality
  onSearch: (query: string) => Promise<Note[]>;
  onSuggestions?: () => Promise<Note[]>;
  
  // Navigation
  onNoteOpen: (note: Note) => void;
  
  // UI state
  isOpen: boolean;
  onClose: () => void;
  
  // Filtering options
  includeTypes?: string[];
}

export function GlobalSearch({
  onSearch,
  onSuggestions,
  onNoteOpen,
  isOpen,
  onClose,
  includeTypes
}: GlobalSearchProps) {
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);

  const handleNoteSelect = (note: Note) => {
    setSelectedNote(note);
  };

  const handleNoteOpen = (note: Note) => {
    onNoteOpen(note);
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'Enter' && selectedNote) {
      handleNoteOpen(selectedNote);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center pt-20 z-50">
      <div 
        className="bg-white dark:bg-zinc-900 rounded-lg shadow-xl max-w-2xl w-full mx-4"
        onKeyDown={handleKeyDown}
      >
        <div className="flex items-center justify-between p-4 border-b border-zinc-200 dark:border-zinc-700">
          <div className="flex items-center space-x-2">
            <Search size={20} className="text-zinc-400" />
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              Search Notes
            </h2>
          </div>
          <button
            title='Close Search'
            onClick={onClose}
            className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-4">
          <NodeSearch
            onSearch={onSearch}
            onSuggestions={onSuggestions ? () => onSuggestions() : undefined}
            selectedNote={selectedNote}
            onNoteSelect={handleNoteSelect}
            includeTypes={includeTypes}
            placeholder="Search all notes..."
            suggestionsTitle="Recent Notes"
            maxResults={20}
            showSuggestions={!!onSuggestions}
            className="mb-4"
          />

          {/* Action Area */}
          {selectedNote && (
            <div className="border-t border-zinc-200 dark:border-zinc-700 pt-4">
              <div className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-800 rounded-md">
                <div>
                  <div className="font-medium text-zinc-900 dark:text-zinc-100">
                    {selectedNote.title}
                  </div>
                  <div className="text-sm text-zinc-500 dark:text-zinc-400">
                    {selectedNote.type}
                    {selectedNote.hasEmbedding && (
                      <span className="ml-2" title="Has AI embeddings">🤖</span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => handleNoteOpen(selectedNote)}
                  className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-md text-sm font-medium border border-yellow-500 hover:border-yellow-400"
                >
                  Open Note
                </button>
              </div>
              <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-2 text-center">
                Press Enter to open, or Escape to close
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Hook for global search hotkey
export function useGlobalSearch() {
  const [isOpen, setIsOpen] = useState(false);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + K to open search
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return {
    isSearchOpen: isOpen,
    openSearch: () => setIsOpen(true),
    closeSearch: () => setIsOpen(false)
  };
}