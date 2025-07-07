'use client'

import { useState, useEffect } from 'react'
import { useCampaignNodes } from '@/lib/hooks/useCampaignNodes'
import { useActiveNode } from '@/lib/hooks/useActiveNode'
import Sidebar from '@/components/Sidebar'
import Inspector from '@/components/Inspector'
import Tiptap from '@/components/Tiptap'

export default function Home({
  params,          // assuming /campaign/[title]/[nodeId] route
}: {
  params: { title: string; nodeId?: string }
}) {
  const { title: campaign } = params

  /* 1. all nodes for the sidebar */
  const nodes = useCampaignNodes()

  /* 2. which node is open */
  const [activeId, setActiveId] = useState<string | null>(params.nodeId ?? null)

  /* set a default once nodes load */
  useEffect(() => {
    if (!activeId && nodes.length) setActiveId(nodes[0].id)
  }, [nodes, activeId])

  /* 3. content + updater for the active node */
  const { htmlContent, updateMarkdown } = useActiveNode(
    campaign,
    activeId ?? ''
  )

  if (!nodes.length || !activeId) return <p className="p-4">Loading…</p>

  return (
    <div className="flex h-screen bg-zinc-950">
      <Sidebar
        nodes={nodes}
        activeId={activeId}
        onSelect={node => setActiveId(node.id)}
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
  )
}