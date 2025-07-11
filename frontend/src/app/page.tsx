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
import LLMChatEmbedded from '@/components/LLMChatEmbedded'
import { Allotment } from "allotment"
import "allotment/dist/style.css"

export default function Home({
  params,          // assuming /campaign/[title]/[nodeId] route
}: {
  params: { title: string; nodeId?: string }
}) {
  const { title: campaign } = params
  const dbNodes = useCampaignNodes()

  /* 1. local working copy that we can mutate optimistically */
  const [nodes, setNodes] = useState<SidebarNode[]>([])

  // keep DB truth, but don't drop optimistic rows that Dexie hasn't emitted yet
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

  const [showSidebar, setShowSidebar] = useState(true);
  const [showInspector, setShowInspector] = useState(true);

  if (!nodes.length) return <p className="p-4 text-zinc-300">Loading…</p>
  if (!activeId) return <p className="p-4 text-zinc-300">Loading…</p>
  const node = nodes.find(n => n.id === activeId)
  if (!node) return <p className="p-4 text-zinc-300">Node not found.</p>
  
  return (
    <div className="h-screen bg-zinc-900 text-zinc-100">
      <Nav campaignName='Storm Of Whatever' />
      
      <div 
        className="h-[calc(100vh-64px)] bg-zinc-950"
        style={{
          '--separator-border': '1px solid rgb(39 39 42)', // zinc-800
        } as React.CSSProperties}
      >
        <Allotment>
          {showSidebar && (
            <Allotment.Pane minSize={200} maxSize={400} preferredSize={280}>
              <div className="bg-zinc-900 border-r border-zinc-800 h-full overflow-hidden">
                <Sidebar
                  nodes={nodes}
                  activeId={activeId}
                  onSelect={node => setActiveId(node.id)}
                  onCreate={handleCreate}
                  onDelete={handleDelete}
                  onRename={async (id, title) => {
                    await renameNode(id, title)
                  }}
                  onHide={() => setShowSidebar(false)}
                />
              </div>
            </Allotment.Pane>
          )}
          
          <Allotment.Pane>
            <Allotment>
              <Allotment.Pane>
                <div className="flex-1 min-w-0 relative bg-zinc-950 h-full">
                  {/* Document Header */}
                  <div className="bg-zinc-900/50 backdrop-blur-sm border-b border-zinc-800/50 px-6 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                      <h1 className="text-zinc-100 font-medium text-lg truncate">
                        {node.title}
                      </h1>
                      <span className="text-zinc-500 text-sm font-mono">
                        {node.type}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-zinc-500 text-sm">
                      <span>Last updated {new Date(node.updatedAt).toLocaleDateString()}</span>
                      <div className="w-1 h-1 bg-zinc-600 rounded-full"></div>
                      <span>{htmlContent.split(' ').length} words</span>
                    </div>
                  </div>
                  
                  {/* Document Content */}
                  <div className="h-[calc(100%-64px)] overflow-auto">
                    <div className="max-w-4xl mx-auto p-8">
                      <Tiptap
                        key={activeId}
                        content={htmlContent}
                        onContentChange={updateMarkdown}
                      />
                    </div>
                  </div>
                  
                  <LLMChatEmbedded
                    campaign={CAMPAIGN_SLUG}
                    activeNodeId={activeId}
                  />
                  
                  {/* Sidebar Toggle */}
                  {!showSidebar && (
                    <button
                      onClick={() => setShowSidebar(true)}
                      className="absolute left-2 top-20 z-20 bg-zinc-800/90 backdrop-blur-sm text-zinc-300 px-2 py-1 rounded hover:bg-zinc-700 hover:text-white transition-colors"
                      aria-label="Show sidebar"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M3 6h18M3 12h18M3 18h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                      </svg>
                    </button>
                  )}
                  
                  {/* Inspector Toggle */}
                  {!showInspector && (
                    <button
                      onClick={() => setShowInspector(true)}
                      className="absolute right-2 top-20 z-20 bg-zinc-800/90 backdrop-blur-sm text-zinc-300 px-2 py-1 rounded hover:bg-zinc-700 hover:text-white transition-colors"
                      aria-label="Show inspector"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 16v-4M12 8h.01M22 12c0 5.523-4.477 10-10 10S2 17.523 2 12 6.477 2 12 2s10 4.477 10 10z" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                      </svg>
                    </button>
                  )}
                </div>
              </Allotment.Pane>
              
              {showInspector && (
                <Allotment.Pane minSize={250} maxSize={500} preferredSize={320}>
                  <div className="bg-zinc-900 border-l border-zinc-800 h-full overflow-hidden">
                    <Inspector
                      node={node}
                      onNavigateToNote={(noteId) => {
                        setActiveId(noteId);
                      }}
                      onHide={() => setShowInspector(false)}
                    />
                  </div>
                </Allotment.Pane>
              )}
            </Allotment>
          </Allotment.Pane>
        </Allotment>
      </div>
    </div>
  )
}