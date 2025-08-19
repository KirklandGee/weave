import { useLiveQuery } from 'dexie-react-hooks'
import { getDb } from '@/lib/db/campaignDB'
import { pushPull } from '@/lib/db/sync'
import { mdToHtml } from '@/lib/md'
import { useEffect, useCallback } from 'react'
import { USER_ID } from '@/lib/constants'
import { useAuthFetch } from '@/utils/authFetch.client'
import { updateLastActivity, updateLastLocalChange, getSyncInterval, getLastActivity } from '@/lib/utils/activityTracker'
import { Editor } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import { Markdown } from '@kirklandgee/tiptap-markdown'

// Helper function to convert Tiptap JSON to markdown
function jsonToMarkdown(json: object): string {
  try {
    // Create a temporary editor instance to convert JSON to markdown
    const tempEditor = new Editor({
      extensions: [
        StarterKit,
        Markdown.configure({
          html: false,
          tightLists: true,
          bulletListMarker: '-',
          linkify: false,
          breaks: false,
        })
      ],
      content: json,
    })
    
    const markdown = tempEditor.storage.markdown.getMarkdown()
    tempEditor.destroy()
    return markdown
  } catch (error) {
    console.error('Failed to convert JSON to markdown:', error)
    return ''
  }
}

export function useActiveNode(campaign: string, nodeId: string, isTyping: boolean = false) {

  const authFetch = useAuthFetch()
  const db = getDb(campaign)
  
  const node = useLiveQuery(() =>
    db.nodes.get(nodeId), [nodeId])

  // Return editorJson if available, otherwise convert markdown → html for the editor
  const editorContent = node?.editorJson || null
  const htmlContent = node && !node.editorJson ? mdToHtml(node.markdown ?? '') : ''
  const title = node?.title ?? 'Untitled'
  
  // Migration: If we have a node with markdown but no editorJson, create editorJson from markdown
  useEffect(() => {
    if (node && node.markdown && !node.editorJson && nodeId && campaign) {
      // Convert existing markdown to JSON format for future use
      try {
        const tempEditor = new Editor({
          extensions: [
            StarterKit,
            Markdown.configure({
              html: true,
              tightLists: true,
              bulletListMarker: '-',
              linkify: false,
              breaks: false,
            })
          ],
          content: node.markdown,
        })
        
        const editorJson = tempEditor.getJSON()
        tempEditor.destroy()
        
        // Update the node with the JSON version
        db.nodes.update(nodeId, { editorJson }).catch(error => {
          console.error('Failed to migrate node to JSON format:', error)
        })
      } catch (error) {
        console.error('Failed to convert markdown to JSON during migration:', error)
      }
    }
  }, [node, nodeId, campaign, db])
  

  const updateContent = useCallback(async (editorJson: object) => {
    // Defensive check: ensure we have a valid nodeId before attempted to update
    if (!nodeId || !campaign) {
      console.warn('updateContent called without valid nodeId or campaign')
      return
    }
    
    // Generate markdown from JSON using tiptap-markdown
    const markdown = jsonToMarkdown(editorJson)
    
    const ts = Date.now()

    await db.transaction('rw', db.nodes, db.changes, async () => {

      const patch = { 
        markdown, 
        editorJson,
        updatedAt: ts 
      }

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

  return { title, htmlContent, editorContent, updateMarkdown, updateContent }
}