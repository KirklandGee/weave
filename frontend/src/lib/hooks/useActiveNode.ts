import { useLiveQuery } from 'dexie-react-hooks'
import { getDb } from '@/lib/db/campaignDB'
import { pushPull } from '@/lib/db/sync'
import { mdToHtml } from '@/lib/md'
import { useEffect } from 'react'
import { USER_ID, CAMPAIGN_SLUG } from '@/lib/constants'
import { useAuthFetch } from '@/utils/authFetch.client'

export function useActiveNode(campaign: string, nodeId: string) {

  const authFetch = useAuthFetch()
  const db = getDb()
  
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
          campaignId: CAMPAIGN_SLUG
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

  // background sync (one per hook instance)
  useEffect(() => {
    const id = setInterval(() => pushPull(authFetch), 5000)
    return () => clearInterval(id)
  }, [campaign, authFetch])

  return { title, htmlContent, updateMarkdown }
}