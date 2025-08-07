import { useLiveQuery } from 'dexie-react-hooks'
import { getDb } from '@/lib/db/campaignDB'
import { pushPull } from '@/lib/db/sync'
import { mdToHtml } from '@/lib/md'
import { useEffect, useCallback } from 'react'
import { USER_ID } from '@/lib/constants'
import { useAuthFetch } from '@/utils/authFetch.client'
import { updateLastActivity, updateLastLocalChange, getSyncInterval, getLastActivity } from '@/lib/utils/activityTracker'

export function useActiveNode(campaign: string, nodeId: string, isTyping: boolean = false) {

  const authFetch = useAuthFetch()
  const db = getDb(campaign)
  
  const node = useLiveQuery(() =>
    db.nodes.get(nodeId), [nodeId])

  // Convert markdown → html for the editor
  const htmlContent = node ? mdToHtml(node.markdown ?? '') : ''
  const title = node?.title ?? 'Untitled'
  

  const updateMarkdown = useCallback(async (md: string) => {
    // Defensive check: ensure we have a valid nodeId before attempting to update
    if (!nodeId || !campaign) {
      console.warn('updateMarkdown called without valid nodeId or campaign')
      return
    }
    
    const ts = Date.now()

    await db.transaction('rw', db.nodes, db.changes, async () => {

      const patch = { markdown: md, updatedAt: ts }

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

  return { title, htmlContent, updateMarkdown }
}