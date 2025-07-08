import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/lib/db/campaignDB'
import { pushPull } from '@/lib/db/sync'
import { mdToHtml } from '@/lib/md'
import { useEffect } from 'react'

export function useActiveNode(campaign: string, nodeId: string) {
  const node = useLiveQuery(() =>
    db.nodes.get(nodeId), [nodeId])

  // Convert markdown → html for the editor
  const htmlContent = node ? mdToHtml(node.markdown ?? '') : ''

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
          attributes: {}
        })
      
      await db.changes.add({
        op: 'update',
        nodeId,
        payload: patch,
        ts,
      })
    } else {
      await db.changes.add({
        op: 'create',
        nodeId,
        payload: patch,
        ts,
      })
    }
    })
  }

  // background sync (one per hook instance)
  useEffect(() => {
    const id = setInterval(() => pushPull(), 5000)
    return () => clearInterval(id)
  }, [campaign])

  return { htmlContent, updateMarkdown }
}