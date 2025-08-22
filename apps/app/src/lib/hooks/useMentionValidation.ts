import { useCallback } from 'react'
import { Note } from '@/types/node'
import { getDb } from '@/lib/db/campaignDB'

interface UseMentionValidationProps {
  campaignSlug?: string
}

export function useMentionValidation({ campaignSlug }: UseMentionValidationProps) {
  // Validate that mentioned nodes still exist
  const validateMentions = useCallback(async (mentionIds: string[]): Promise<Record<string, Note | null>> => {
    if (!campaignSlug || mentionIds.length === 0) {
      return {}
    }

    try {
      const db = getDb(campaignSlug)
      const validationResults: Record<string, Note | null> = {}

      // Check each mentioned node
      for (const id of mentionIds) {
        const node = await db.nodes.get(id)
        validationResults[id] = node || null
      }

      return validationResults
    } catch (error) {
      console.error('Error validating mentions:', error)
      return {}
    }
  }, [campaignSlug])

  // Get updated titles for mentions (in case nodes were renamed)
  const getUpdatedMentionTitles = useCallback(async (mentionIds: string[]): Promise<Record<string, string>> => {
    if (!campaignSlug || mentionIds.length === 0) {
      return {}
    }

    try {
      const db = getDb(campaignSlug)
      const titleUpdates: Record<string, string> = {}

      for (const id of mentionIds) {
        const node = await db.nodes.get(id)
        if (node) {
          titleUpdates[id] = node.title
        }
      }

      return titleUpdates
    } catch (error) {
      console.error('Error getting updated mention titles:', error)
      return {}
    }
  }, [campaignSlug])

  return {
    validateMentions,
    getUpdatedMentionTitles,
  }
}