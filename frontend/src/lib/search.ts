// src/lib/search.ts
import { getDb } from '@/lib/db/campaignDB'
import { Note } from '@/types/node'

export interface SearchOptions {
  limit?: number
  types?: string[]
  excludeIds?: string[]
  includeContent?: boolean
  useVectorSearch?: boolean
  similarityThreshold?: number
}

/**
 * Fuzzy search function (same as in useRelationships)
 * Prioritizes exact matches and starts-with matches
 */
function fuzzySearch(query: string, notes: Note[]): Note[] {
  const lowercaseQuery = query.toLowerCase()
  return notes.filter(note =>
    note.title.toLowerCase().includes(lowercaseQuery)
  ).sort((a, b) => {
    // Prioritize exact matches and starts-with matches
    const aTitle = a.title.toLowerCase()
    const bTitle = b.title.toLowerCase()

    if (aTitle.startsWith(lowercaseQuery) && !bTitle.startsWith(lowercaseQuery)) {
      return -1
    }
    if (!aTitle.startsWith(lowercaseQuery) && bTitle.startsWith(lowercaseQuery)) {
      return 1
    }

    return aTitle.localeCompare(bTitle)
  })
}

/**
 * Enhanced search function that uses fuzzy search
 * Same logic as in useRelationships hook
 */
export async function searchNotes(
  query: string,
  options: SearchOptions = {}
): Promise<Note[]> {
  if (!query.trim()) {
    return []
  }

  const {
    limit = 10,
    types = [],
    excludeIds = [],
  } = options

  try {
    const db = getDb()

    // Get all notes in campaign
    let allNotes = await db.nodes.toArray()

    // Filter by types if specified
    if (types.length > 0) {
      allNotes = allNotes.filter(note => types.includes(note.type))
    }

    // Filter out excluded IDs
    if (excludeIds.length > 0) {
      allNotes = allNotes.filter(note => !excludeIds.includes(note.id))
    }

    // Use the same fuzzy search logic as useRelationships
    const results = fuzzySearch(query, allNotes)

    return results.slice(0, limit)
  } catch (error) {
    console.error('Search failed:', error)
    return []
  }

  /**
   * Get recent notes for suggestions
   */
  // export async function getRecentNotes(limit: number = 5): Promise<Note[]> {
  //   try {
  //     const db = getDb()
  //     return await db.nodes
  //       .orderBy('updatedAt')
  //       .reverse()
  //       .limit(limit)
  //       .toArray()
  //   } catch (error) {
  //     console.error('Failed to get recent notes:', error)
  //     return []
  //   }
  // }
}