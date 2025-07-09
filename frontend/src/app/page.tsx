'use client'

import { useState, useEffect } from 'react'
import { useCampaignNodes } from '@/lib/hooks/useCampaignNodes'
import { useActiveNode } from '@/lib/hooks/useActiveNode'
import { createNode, deleteNode, renameNode } from '@/lib/hooks/useNodeOps'
import Sidebar from '@/components/Sidebar'
import Inspector from '@/components/Inspector'
import Nav from '@/components/Nav'
import Tiptap from '@/components/Tiptap'
import { nanoid } from 'nanoid'
import { SidebarNode } from '@/types/node'
import { CAMPAIGN_SLUG, USER_ID } from '@/lib/constants'

export default function Home({
  params,          // assuming /campaign/[title]/[nodeId] route
}: {
  params: { title: string; nodeId?: string }
}) {
  const { title: campaign } = params
  const dbNodes = useCampaignNodes()


  /* 1. local working copy that we can mutate optimistically */
  const [nodes, setNodes] = useState<SidebarNode[]>([])

  // keep DB truth, but don’t drop optimistic rows that Dexie hasn’t emitted yet
  useEffect(() => {
    setNodes(prev => {
      const byId = new Map(prev.map(n => [n.id, n]))
      dbNodes.forEach(n => byId.set(n.id, n))
      return Array.from(byId.values())
    })
  }, [dbNodes])
  /* 2. which node is open */
  const [activeId, setActiveId] = useState<string | null>(params.nodeId ?? null)

  /* set a default once nodes load */
  useEffect(() => {
    if (!activeId && nodes.length) {
      setActiveId(nodes[0].id)
    }
  }, [nodes, activeId])

  /* 3. content + updater for the active node */
  const { htmlContent, updateMarkdown } = useActiveNode(
    campaign,
    activeId ?? ''
  )

  /* create a blank node and switch to it */
  async function handleCreate() {
    const ts = Date.now()
    const id = nanoid()

    const newRow = {
      id,
      type: 'Note',
      title: 'Untitled',
      markdown: '',
      updatedAt: ts,
      createdAt: ts,
      attributes: {},
      ownerId: USER_ID,
      campaignId: CAMPAIGN_SLUG
    }
    const nodeId = await createNode(newRow);   // use the real id
    setActiveId(nodeId);
    setNodes(prev => [{ ...newRow, nodeId }, ...prev]);
  }

  async function handleDelete(node: SidebarNode) {

    await deleteNode(node.id)

    setNodes(prev => prev.filter(n => n.id !== node.id))

    setActiveId(prev =>
      prev === node.id ? (nodes.find(n => n.id !== node.id)?.id ?? null) : prev,
    )
  }

  if (!nodes.length) return <p className="p-4">Loading…</p>
  if (!activeId) return <p className="p-4">Loading…</p>
  const node = nodes.find(n => n.id === activeId)
  if (!node) return <p className="p-4">Node not found.</p>
  return (
    <div>
      <Nav
        campaignName='Storm Of Whatever'
      />
      <div className="flex h-screen bg-zinc-950">
        <Sidebar
          nodes={nodes}
          activeId={activeId}
          onSelect={node => setActiveId(node.id)}
          onCreate={handleCreate}
          onDelete={handleDelete}
          onRename={async (id, title) => {
            await renameNode(id, title)
          }}
        />

        <main className="flex-1 overflow-auto p-4">
          <Tiptap
            key={activeId}
            content={htmlContent}        // <-- plain HTML string
            onContentChange={updateMarkdown}
          />
        </main>

        <Inspector node={nodes.find(n => n.id === activeId) ?? null} />

      </div>
    </div>
  )
}