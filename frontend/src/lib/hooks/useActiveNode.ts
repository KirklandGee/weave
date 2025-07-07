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
      await db.nodes.update(nodeId, { markdown: md, updatedAt: ts })
      await db.changes.add({
        op: 'update',
        nodeId,
        payload: { markdown: md, updatedAt: ts },
        ts,
      })
    })
  }

  // background sync (one per hook instance)
  useEffect(() => {
    const id = setInterval(() => pushPull(), 5000)
    return () => clearInterval(id)
  }, [campaign])

  return { htmlContent, updateMarkdown }
}