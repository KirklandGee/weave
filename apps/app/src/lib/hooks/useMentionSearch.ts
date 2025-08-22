import { useCallback } from 'react'
import { Note } from '@/types/node'
import { searchNotes } from '@/lib/search'

interface UseMentionSearchProps {
  campaignSlug?: string
  currentNodeId?: string
}

export function useMentionSearch({ 
  campaignSlug, 
  currentNodeId
}: UseMentionSearchProps) {
  
  // Create a direct search function for mentions (no debouncing needed, Tiptap handles it)
  const searchForMentions = useCallback(async (query: string): Promise<Note[]> => {
    if (!campaignSlug || !query.trim() || query.length < 1) {
      return []
    }

    try {
      const results = await searchNotes(query, campaignSlug, {
        limit: 10,
        excludeIds: currentNodeId ? [currentNodeId] : [],
        // Exclude chat-related types from mentions
        types: undefined, // Let searchNotes handle the filtering
      })

      return results
    } catch (error) {
      console.error('Error searching nodes for mentions:', error)
      return []
    }
  }, [campaignSlug, currentNodeId])

  return {
    searchForMentions,
  }
}