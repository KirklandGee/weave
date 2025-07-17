import { useLiveQuery } from 'dexie-react-hooks'
import { getDb } from '@/lib/db/campaignDB'
import { pushPull } from '@/lib/db/sync'
import { mdToHtml } from '@/lib/md'
import { useEffect } from 'react'
import { USER_ID } from '@/lib/constants'
import { useAuthFetch } from '@/utils/authFetch.client'

export function useActiveNode(campaign: string, nodeId: string, isTyping: boolean = false) {

  const authFetch = useAuthFetch()
  const db = getDb(campaign)
  
  const node = useLiveQuery(() =>
    db.nodes.get(nodeId), [nodeId])

  // Convert markdown → html for the editor
  const htmlContent = node ? mdToHtml(node.markdown ?? '') : ''
  const title = node?.title ?? 'Untitled'

  async function updateMarkdown(md: string) {
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
  }

  // background sync (one per hook instance) - pause when typing
  useEffect(() => {
    if (isTyping) {
      return // Don't sync while typing
    }
    
    const id = setInterval(() => pushPull(authFetch, campaign), 5000)
    return () => clearInterval(id)
  }, [campaign, authFetch, isTyping])

  return { title, htmlContent, updateMarkdown }
}