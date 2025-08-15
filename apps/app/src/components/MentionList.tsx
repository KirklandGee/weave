import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react'
import { FileText, User, Map, Clock } from 'lucide-react'
import { Note } from '@/types/node'
import { searchNotes } from '@/lib/search'
import { useCampaign } from '@/contexts/AppContext'

interface MentionListProps {
  items: Note[]
  command: (item: Note) => void
}

export interface MentionListRef {
  onKeyDown: (event: KeyboardEvent) => boolean
}

export const MentionList = forwardRef<MentionListRef, MentionListProps>(
  ({ items, command }, ref) => {
    const [selectedIndex, setSelectedIndex] = useState(0)

    const selectItem = (index: number) => {
      const item = items[index]
      console.log('🎯 MentionList selectItem called:', { index, item: item ? { id: item.id, title: item.title } : null })
      if (item) {
        command(item)
      }
    }

    const upHandler = () => {
      setSelectedIndex((selectedIndex + items.length - 1) % items.length)
    }

    const downHandler = () => {
      setSelectedIndex((selectedIndex + 1) % items.length)
    }

    const enterHandler = () => {
      selectItem(selectedIndex)
    }

    useEffect(() => setSelectedIndex(0), [items])

    useImperativeHandle(ref, () => ({
      onKeyDown: (event: KeyboardEvent) => {
        if (event.key === 'ArrowUp') {
          upHandler()
          return true
        }

        if (event.key === 'ArrowDown') {
          downHandler()
          return true
        }

        if (event.key === 'Enter') {
          enterHandler()
          return true
        }

        return false
      },
    }))

    const getIcon = (noteType: string) => {
      switch (noteType) {
        case 'character':
          return <User size={16} className="text-zinc-400" />
        case 'location':
          return <Map size={16} className="text-zinc-400" />
        case 'session':
          return <Clock size={16} className="text-zinc-400" />
        default:
          return <FileText size={16} className="text-zinc-400" />
      }
    }

    if (items.length === 0) {
      return (
        <div className="bg-zinc-900 border border-zinc-700 rounded-lg shadow-2xl py-2 px-4 text-zinc-400 text-sm">
          No notes found
        </div>
      )
    }

    return (
      <div className="bg-zinc-900 border border-zinc-700 rounded-lg shadow-2xl py-1 max-h-80 overflow-y-auto">
        {items.map((item, index) => (
          <button
            key={item.id}
            className={`w-full px-4 py-3 flex items-center justify-between hover:bg-zinc-800 cursor-pointer transition-colors text-left ${
              index === selectedIndex ? 'bg-zinc-800' : ''
            }`}
            onClick={() => selectItem(index)}
          >
            <div className="flex items-center min-w-0 flex-1">
              <div className="mr-3 flex-shrink-0">
                {getIcon(item.type)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-white text-sm font-medium truncate">
                  {item.title}
                </div>
                <div className="text-zinc-400 text-xs truncate">
                  {item.type} • {new Date(item.updatedAt).toLocaleDateString()}
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>
    )
  }
)

MentionList.displayName = 'MentionList'

interface MentionSuggestionProps {
  query: string
  clientRect?: DOMRect
  command: (item: Note) => void
}

export function MentionSuggestion({ query, clientRect, command }: MentionSuggestionProps) {
  console.log('🎯 MentionSuggestion rendered with:', { query, hasClientRect: !!clientRect, hasCommand: !!command })
  const { currentCampaign } = useCampaign()
  const [items, setItems] = useState<Note[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    const loadItems = async () => {
      if (!currentCampaign) {
        setItems([])
        return
      }

      setIsLoading(true)
      try {
        if (!query || query.trim() === '') {
          // Show all notes when no query (just typed @)
          // Get all notes directly from database since searchNotes returns [] for empty query
          const { getDb } = await import('@/lib/db/campaignDB')
          const db = getDb(currentCampaign.slug)
          let allNotes = await db.nodes.toArray()
          
          // Filter out chat types like searchNotes does
          allNotes = allNotes.filter(note => 
            note.type !== 'ChatSession' && 
            note.type !== 'ChatMessage'
          )
          
          // Sort by title and limit
          allNotes.sort((a, b) => a.title.localeCompare(b.title))
          setItems(allNotes.slice(0, 10))
        } else {
          // Filter by query
          const results = await searchNotes(query, currentCampaign.slug, {
            limit: 10,
            excludeIds: [],
          })
          setItems(results)
        }
      } catch (error) {
        console.error('Search failed:', error)
        setItems([])
      } finally {
        setIsLoading(false)
      }
    }

    const timeoutId = setTimeout(loadItems, 150)
    return () => clearTimeout(timeoutId)
  }, [query, currentCampaign])

  const style: React.CSSProperties = {
    position: 'fixed',
    zIndex: 50,
    top: 0,
    left: 0,
  }
  
  if (clientRect && !isNaN(clientRect.bottom) && !isNaN(clientRect.left)) {
    // Ensure valid positioning values
    const top = clientRect.bottom + 8
    const left = clientRect.left
    
    style.top = Math.max(0, top)
    style.left = Math.max(0, left)
  }

  if (isLoading) {
    return (
      <div style={style} className="bg-zinc-900 border border-zinc-700 rounded-lg shadow-2xl py-2 px-4">
        <div className="text-zinc-400 text-sm flex items-center">
          <div className="w-4 h-4 border-2 border-zinc-400 border-t-white rounded-full animate-spin mr-2" />
          Searching...
        </div>
      </div>
    )
  }

  return (
    <div style={style}>
      <MentionList items={items} command={command} />
    </div>
  )
}