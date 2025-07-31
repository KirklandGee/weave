// src/components/NodeSearch.tsx
import React, { useState, useEffect, useMemo, forwardRef, useImperativeHandle, useRef } from 'react';
import { Search } from 'lucide-react';
import { Note } from '@/types/node';

export interface SearchResult extends Note {
  score?: number;
  matchType?: 'vector' | 'fuzzy' | 'exact';
}

interface NodeSearchProps {
  // Core search functionality
  onSearch: (query: string) => Promise<Note[]>;
  onSuggestions?: (noteId: string, limit: number) => Promise<Note[]>;
  
  // Selection handling
  selectedNote?: Note | null;
  onNoteSelect: (note: Note) => void;
  
  // Filtering
  excludeNoteIds?: string[];
  includeTypes?: string[];
  
  // UI customization
  placeholder?: string;
  maxResults?: number;
  showSuggestions?: boolean;
  suggestionsTitle?: string;
  className?: string;
  
  // Current context (for filtering and suggestions)
  currentNoteId?: string;
}

export const NodeSearch = forwardRef<HTMLInputElement, NodeSearchProps>(function NodeSearch({
  onSearch,
  onSuggestions,
  selectedNote,
  onNoteSelect,
  excludeNoteIds = [],
  includeTypes,
  placeholder = "Start typing to search...",
  maxResults = 10,
  showSuggestions = true,
  suggestionsTitle = "Suggestions",
  className = "",
  currentNoteId
}, ref) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Note[]>([]);
  const [suggestions, setSuggestions] = useState<Note[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useImperativeHandle(ref, () => inputRef.current as HTMLInputElement, []);

  // Filter results based on props
  const filteredSearchResults = useMemo(() => {
    let results = searchResults.filter(note => 
      !excludeNoteIds.includes(note.id)
    );
    
    if (includeTypes) {
      results = results.filter(note => includeTypes.includes(note.type));
    }
    
    return results.slice(0, maxResults);
  }, [searchResults, excludeNoteIds, includeTypes, maxResults]);

  const filteredSuggestions = useMemo(() => {
    let results = suggestions.filter(note => 
      !excludeNoteIds.includes(note.id)
    );
    
    if (includeTypes) {
      results = results.filter(note => includeTypes.includes(note.type));
    }
    
    return results.slice(0, maxResults);
  }, [suggestions, excludeNoteIds, includeTypes, maxResults]);

  // Handle search
  useEffect(() => {
    if (searchQuery.trim()) {
      setIsLoading(true);
      onSearch(searchQuery)
        .then(setSearchResults)
        .catch(err => {
          console.error('Search failed:', err);
          setSearchResults([]);
        })
        .finally(() => setIsLoading(false));
    } else {
      setSearchResults([]);
    }
  }, [searchQuery, onSearch]);

  // Load suggestions when component mounts or currentNoteId changes
  useEffect(() => {
    if (showSuggestions && onSuggestions && currentNoteId) {
      onSuggestions(currentNoteId, 5)
        .then(setSuggestions)
        .catch(err => {
          console.error('Failed to load suggestions:', err);
          setSuggestions([]);
        });
    }
  }, [showSuggestions, onSuggestions, currentNoteId]);

  // Update search query when selectedNote changes (for controlled usage)
  useEffect(() => {
    if (selectedNote) {
      setSearchQuery(selectedNote.title);
    }
  }, [selectedNote]);

  const handleNoteClick = (note: Note) => {
    onNoteSelect(note);
    setSearchQuery(note.title);
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Search Input */}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-3 text-zinc-400" />
        <input
          ref={inputRef}
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={placeholder}
          className="w-full pl-10 pr-4 py-2 border border-zinc-300 dark:border-zinc-600 rounded-md bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
        />
        {isLoading && (
          <div className="absolute right-3 top-3">
            <div className="w-4 h-4 border-2 border-zinc-300 border-t-yellow-500 rounded-full animate-spin"></div>
          </div>
        )}
        {searchQuery && !isLoading && (
          <button
            onClick={clearSearch}
            className="absolute right-3 top-3 text-zinc-400 hover:text-zinc-600"
          >
            ×
          </button>
        )}
      </div>

      {/* Search Results */}
      {searchQuery && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Search Results
          </h3>
          <div className="max-h-48 overflow-y-auto space-y-1">
            {filteredSearchResults.map((note) => (
              <SearchResultItem
                key={note.id}
                note={note}
                isSelected={selectedNote?.id === note.id}
                onClick={() => handleNoteClick(note)}
              />
            ))}
            {filteredSearchResults.length === 0 && !isLoading && (
              <div className="text-sm text-zinc-500 dark:text-zinc-400 px-3 py-2">
                No results found
              </div>
            )}
          </div>
        </div>
      )}

      {/* Suggestions */}
      {!searchQuery && showSuggestions && filteredSuggestions.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            {suggestionsTitle}
          </h3>
          <div className="max-h-48 overflow-y-auto space-y-1">
            {filteredSuggestions.map((note) => (
              <SearchResultItem
                key={note.id}
                note={note}
                isSelected={selectedNote?.id === note.id}
                onClick={() => handleNoteClick(note)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
});

// Reusable result item component
interface SearchResultItemProps {
  note: Note;
  isSelected?: boolean;
  onClick: () => void;
  showScore?: boolean;
  score?: number;
  matchType?: 'vector' | 'fuzzy' | 'exact';
}

function SearchResultItem({ 
  note, 
  isSelected = false, 
  onClick, 
  showScore = false, 
  score, 
  matchType 
}: SearchResultItemProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left px-3 py-2 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors ${
        isSelected
          ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-900 dark:text-yellow-100'
          : 'text-zinc-900 dark:text-zinc-100'
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <div className="font-medium truncate">{note.title}</div>
          <div className="text-xs text-zinc-500 dark:text-zinc-400">
            {note.type}
            {note.hasEmbedding && (
              <span className="ml-2">🤖</span>
            )}
          </div>
        </div>
        {showScore && score !== undefined && (
          <div className="text-xs text-zinc-400 ml-2">
            {matchType === 'vector' && '🤖'}
            {matchType === 'fuzzy' && '🔍'}
            {matchType === 'exact' && '📝'}
            {Math.round(score * 100)}%
          </div>
        )}
      </div>
    </button>
  );
}