// src/components/CommandPalette.tsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Search, ArrowRight, Hash, FileText, User, Map, Clock, Zap, Upload } from 'lucide-react';
import { Note } from '@/types/node';
import { searchNotes } from '@/lib/search';
import { useCampaign, useTemplates } from '@/contexts/AppContext';

interface Command {
  id: string;
  label: string;
  description?: string;
  icon?: React.ReactNode;
  onExecute: () => void;
  category?: 'navigation' | 'creation' | 'action';
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateToNote?: (note: Note) => void;
  onCreateNote?: (type?: string) => void;
  onAction?: (action: string) => void;
  onTemplateSelect?: (templateName: string) => void;
}

export function CommandPalette({
  isOpen,
  onClose,
  onNavigateToNote,
  onAction,
  onTemplateSelect,
}: CommandPaletteProps) {
  const { currentCampaign } = useCampaign();
  const { templates, loading: templatesLoading } = useTemplates();
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Note[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  // Built-in commands - dynamic from templates + static actions
  const commands: Command[] = useMemo(() => {
    const templateCommands: Command[] = templates.map(template => ({
      id: `template-${template.name}`,
      label: template.name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      description: template.description,
      icon: template.metadata.category === 'character' ? <User size={16} /> :
            template.metadata.category === 'location' ? <Map size={16} /> :
            template.metadata.category === 'session' ? <Clock size={16} /> :
            <FileText size={16} />,
      onExecute: () => onTemplateSelect?.(template.name),
      category: 'creation',
    }));

    const staticCommands: Command[] = [
      {
        id: 'import-markdown',
        label: 'Import Markdown Files',
        description: 'Import notes from .md files with automatic parsing',
        icon: <Upload size={16} />,
        onExecute: () => onAction?.('import-markdown'),
        category: 'action',
      },
      {
        id: 'quick-action',
        label: 'Quick Actions',
        description: 'Open quick actions menu',
        icon: <Zap size={16} />,
        onExecute: () => onAction?.('Quick-actions'),
        category: 'action',
      },
    ];

    return [...templateCommands, ...staticCommands];
  }, [templates, onTemplateSelect, onAction]);

  // Search notes using improved search function
  const handleSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim() || !currentCampaign) {
      setSearchResults([]);
      return;
    }

    setIsLoading(true);
    try {
      const results = await searchNotes(searchQuery, currentCampaign.slug, {
        limit: 10,
        excludeIds: [], // Add any notes you want to exclude
      });
      
      setSearchResults(results);
    } catch (error) {
      console.error('Search failed:', error);
      setSearchResults([]);
    } finally {
      setIsLoading(false);
    }
  }, [currentCampaign]);

  // Handle search query changes
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (query.startsWith('/')) {
        // Command mode - don't search notes
        setSearchResults([]);
      } else {
        handleSearch(query);
      }
    }, 150);

    return () => clearTimeout(timeoutId);
  }, [query, handleSearch]);

  // Filter commands based on query
  const filteredCommands = useMemo(() => {
    if (!query.startsWith('/')) return [];
    
    const commandQuery = query.slice(1).toLowerCase();
    if (!commandQuery) return commands;
    
    return commands.filter(cmd => 
      cmd.label.toLowerCase().includes(commandQuery) ||
      cmd.description?.toLowerCase().includes(commandQuery)
    );
  }, [query, commands]);

  // Combined results for navigation
  const allResults = useMemo(() => {
    const results: Array<{ type: 'note' | 'command'; item: Note | Command }> = [];
    
    if (query.startsWith('/')) {
      filteredCommands.forEach(cmd => results.push({ type: 'command', item: cmd }));
    } else {
      searchResults.forEach(note => results.push({ type: 'note', item: note }));
    }
    
    return results;
  }, [query, filteredCommands, searchResults]);

  // Reset selection when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [allResults]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => Math.min(prev + 1, allResults.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => Math.max(prev - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          executeSelected();
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, allResults, selectedIndex, executeSelected, onClose]);

  const executeSelected = () => {
    if (allResults.length === 0) return;
    
    const selected = allResults[selectedIndex];
    if (selected.type === 'note') {
      onNavigateToNote?.(selected.item as Note);
    } else {
      (selected.item as Command).onExecute();
    }
    onClose();
  };

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      setSearchResults([]);
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Focus input when opening
  useEffect(() => {
    if (isOpen) {
      const input = document.querySelector('#command-palette-input') as HTMLInputElement;
      input?.focus();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-start justify-center pt-[20vh] z-50">
      <div className="bg-zinc-900 border border-zinc-700 rounded-lg shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
        {/* Search Input */}
        <div className="flex items-center px-4 py-3 border-b border-zinc-700">
          <Search size={18} className="text-zinc-400 mr-3" />
          <input
            id="command-palette-input"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search notes or type / for commands..."
            className="flex-1 bg-transparent text-white placeholder-zinc-400 focus:outline-none text-sm"
            autoComplete="off"
          />
          {isLoading && (
            <div className="w-4 h-4 border-2 border-zinc-400 border-t-white rounded-full animate-spin ml-2" />
          )}
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto">
          {query.startsWith('/') && !query.slice(1) && (
            <div className="px-4 py-2 text-xs text-zinc-400 border-b border-zinc-700">
              Available Commands {templatesLoading && "(Loading templates...)"}
            </div>
          )}
          
          {allResults.length === 0 && query && !isLoading ? (
            <div className="px-4 py-8 text-center text-zinc-400 text-sm">
              {query.startsWith('/') ? 'No commands found' : 'No notes found'}
            </div>
          ) : (
            allResults.map((result, index) => (
              <div
                key={result.type === 'note' ? (result.item as Note).id : (result.item as Command).id}
                className={`px-4 py-3 flex items-center justify-between hover:bg-zinc-800 cursor-pointer transition-colors ${
                  index === selectedIndex ? 'bg-zinc-800' : ''
                }`}
                onClick={executeSelected}
              >
                <div className="flex items-center min-w-0 flex-1">
                  <div className="mr-3 flex-shrink-0">
                    {result.type === 'note' ? (
                      <FileText size={16} className="text-zinc-400" />
                    ) : (
                      (result.item as Command).icon || <Hash size={16} className="text-zinc-400" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-white text-sm font-medium truncate">
                      {result.type === 'note' ? (result.item as Note).title : (result.item as Command).label}
                    </div>
                    <div className="text-zinc-400 text-xs truncate">
                      {result.type === 'note' 
                        ? `${(result.item as Note).type} • ${new Date((result.item as Note).updatedAt).toLocaleDateString()}`
                        : (result.item as Command).description
                      }
                    </div>
                  </div>
                </div>
                <ArrowRight size={14} className="text-zinc-500 ml-2 flex-shrink-0" />
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-zinc-700 text-xs text-zinc-400 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span>↑↓ Navigate</span>
            <span>↵ Select</span>
            <span>Esc Close</span>
          </div>
          <div>
            {query.startsWith('/') ? 'Command mode' : 'Search mode'}
          </div>
        </div>
      </div>
    </div>
  );
}

// Hook to manage command palette with keyboard shortcut
export function useCommandPalette() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Command+K or Ctrl+K
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return {
    isOpen,
    open: () => setIsOpen(true),
    close: () => setIsOpen(false),
    toggle: () => setIsOpen(prev => !prev),
  };
}