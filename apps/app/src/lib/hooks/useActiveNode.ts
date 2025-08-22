import { useLiveQuery } from 'dexie-react-hooks'
import { getDb } from '@/lib/db/campaignDB'
import { pushPull } from '@/lib/db/sync'
import { useEffect, useCallback } from 'react'
import { USER_ID } from '@/lib/constants'
import { useAuthFetch } from '@/utils/authFetch.client'
import { updateLastActivity, updateLastLocalChange, getSyncInterval, getLastActivity } from '@/lib/utils/activityTracker'
// Imports removed - no longer creating temporary editors


// Helper function to convert Tiptap JSON to markdown (fallback only)  
// Note: This should rarely be used now that we pass markdown from the main editor
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function jsonToMarkdown(json: any): string {
  console.log('[jsonToMarkdown] Fallback called - this indicates the main editor markdown extraction failed')
  
  try {
    // Try to manually extract text content and convert mentions
    return extractTextFromJson(json)
  } catch (error) {
    console.error('Failed to convert JSON to markdown, returning empty string:', error)
    return ''
  }
}

// Simple text extraction that handles mentions gracefully
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractTextFromJson(node: any): string {
  if (!node || typeof node !== 'object') return ''
  
  if (node.type === 'text') {
    return node.text || ''
  }
  
  if (node.type === 'mention') {
    return `@${node.attrs?.label || node.attrs?.id || 'unknown'}`
  }
  
  if (node.content && Array.isArray(node.content)) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return node.content.map((child: any) => extractTextFromJson(child)).join('')
  }
  
  // For paragraph, doc, etc., just extract content
  if (node.content) {
    return extractTextFromJson(node.content)
  }
  
  return ''
}

export function useActiveNode(campaign: string, nodeId: string, isTyping: boolean = false) {

  const authFetch = useAuthFetch()
  const db = getDb(campaign)
  
  const node = useLiveQuery(() =>
    db.nodes.get(nodeId), [nodeId])

  // Return editorJson for the editor (JSON-first approach)
  const editorContent = node?.editorJson || null
  const title = node?.title ?? 'Untitled'
  
  // Track migration status to help with loading states
  const isMigrating = !!(node && node.markdown && !node.editorJson)
  
  // Migration: If we have a node with markdown but no editorJson, create editorJson from markdown
  useEffect(() => {
    if (node && node.markdown && !node.editorJson && nodeId && campaign) {
      console.log('[useActiveNode] Migrating node from markdown to JSON:', nodeId)
      // For now, skip migration of nodes with markdown to avoid losing mentions
      // Instead, create a basic JSON structure
      const basicJson = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: node.markdown || 'Migrated content - please re-edit'
              }
            ]
          }
        ]
      }
      
      console.log('[useActiveNode] Creating basic JSON structure for migration')
      db.nodes.update(nodeId, { editorJson: basicJson }).catch(error => {
        console.error('Failed to migrate node to JSON format:', error)
      })
    }
  }, [node, nodeId, campaign, db])
  

  const updateContent = useCallback(async (editorJson: object, providedMarkdown?: string) => {
    // console.log('[useActiveNode] updateContent called for nodeId:', nodeId, 'editorJson:', editorJson)
    
    // Defensive check: ensure we have a valid nodeId before attempted to update
    if (!nodeId || !campaign) {
      console.warn('updateContent called without valid nodeId or campaign')
      return
    }
    
    // Use provided markdown if available, otherwise fallback to generating it
    const markdown = providedMarkdown || jsonToMarkdown(editorJson)
    console.log('[useActiveNode] Markdown source:', providedMarkdown ? 'provided' : 'generated (FALLBACK)', 'length:', markdown.length)
    if (!providedMarkdown) {
      console.warn('[useActiveNode] Had to generate markdown - this should rarely happen and may cause mention issues!')
    }
    
    const ts = Date.now()

    // console.log('[useActiveNode] Starting database transaction')
    await db.transaction('rw', db.nodes, db.changes, async () => {

      const patch = { 
        markdown, 
        editorJson,
        updatedAt: ts 
      }

      const touched = await db.nodes.update(nodeId, patch)
      // console.log('[useActiveNode] Updated rows:', touched)

      if (touched === 0) {
        console.log('[useActiveNode] No existing node found, creating new one')
        await db.nodes.put({
          id: nodeId,
          createdAt: ts,
          title: 'Untitled',
          ...patch,
          type: 'Note',
          attributes: {},
          ownerId: USER_ID,
          campaignId: campaign,
          campaignIds: [campaign]
        })
      
      await db.changes.add({
        op: 'update',
        entityId: nodeId,
        entity: 'node',
        payload: patch,
        ts,
      })
    } else {
      await db.changes.add({
        op: 'update',
        entityId: nodeId,
        entity: 'node',
        payload: patch,
        ts,
      })
    }
    })
    
    // console.log('[useActiveNode] Database transaction completed successfully')

    // Track user activity and local changes
    await updateLastActivity(campaign)
    await updateLastLocalChange(campaign)
  }, [db, nodeId, campaign])

  // Backward compatibility function for markdown-only updates
  const updateMarkdown = useCallback(async (md: string) => {
    // For backward compatibility, just update markdown without JSON
    const ts = Date.now()
    const patch = { markdown: md, updatedAt: ts }
    
    await db.transaction('rw', db.nodes, db.changes, async () => {
      const touched = await db.nodes.update(nodeId, patch)
      if (touched === 0) {
        await db.nodes.put({
          id: nodeId,
          createdAt: ts,
          title: 'Untitled',
          ...patch,
          type: 'Note',
          attributes: {},
          ownerId: USER_ID,
          campaignId: campaign,
          campaignIds: [campaign]
        })
      }
      await db.changes.add({
        op: 'update',
        entityId: nodeId,
        entity: 'node',
        payload: patch,
        ts,
      })
    })
    await updateLastActivity(campaign)
    await updateLastLocalChange(campaign)
  }, [db, nodeId, campaign])

  // background sync with adaptive intervals - pause when typing
  useEffect(() => {
    if (isTyping) {
      return // Don't sync while typing
    }
    
    let timeoutId: NodeJS.Timeout
    
    const scheduleNextSync = async () => {
      const lastActivity = await getLastActivity(campaign)
      const interval = getSyncInterval(lastActivity)
      
      timeoutId = setTimeout(async () => {
        await pushPull(authFetch, campaign)
        scheduleNextSync() // Schedule the next sync
      }, interval)
    }
    
    scheduleNextSync()
    
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
    }
  }, [campaign, authFetch, isTyping])

  return { title, editorContent, updateMarkdown, updateContent, isMigrating }
}