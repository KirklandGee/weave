'use client'

import { useState, useEffect } from 'react'
import { useCampaignNodes } from '@/lib/hooks/useCampaignNodes'
import { useActiveNode } from '@/lib/hooks/useActiveNode'
import { createNodeOps } from '@/lib/hooks/useNodeOps'
import { useCampaign } from '@/contexts/CampaignContext'
import Sidebar from '@/components/Sidebar'
import Inspector from '@/components/Inspector'
import Nav from '@/components/Nav'
import Tiptap from '@/components/Tiptap'
import DocumentHeader from '@/components/DocumentHeader'
import { AddNoteModal } from '@/components/AddNoteModal'
import { nanoid } from 'nanoid'
import { Note } from '@/types/node'
import { USER_ID } from '@/lib/constants'
import LLMChatEmbedded from '@/components/LLMChatEmbedded'
import { Allotment } from "allotment"
import "allotment/dist/style.css"

export default function Home() {
  const { currentCampaign } = useCampaign()
  // Only load nodes if we have a campaign - this prevents loading from 'default' database
  const dbNodes = useCampaignNodes(currentCampaign?.slug)
  const nodeOps = currentCampaign ? createNodeOps(currentCampaign.slug) : null

  /* 1. local working copy that we can mutate optimistically */
  const [nodes, setNodes] = useState<Note[]>([])

  // keep DB truth, but don't drop optimistic rows that Dexie hasn't emitted yet
  useEffect(() => {
    if (!dbNodes) {
      // If dbNodes is undefined, clear the nodes
      setNodes([])
      return
    }
    
    // For campaign switches, replace entirely. For same campaign, merge optimistically.
    setNodes(() => {
      // If we have dbNodes, use them as the source of truth
      const newNodes = dbNodes.filter(n => n && typeof n === 'object' && 'id' in n)
      return newNodes
    })
  }, [dbNodes])

  // Clear state when campaign changes
  useEffect(() => {
    setNodes([])
    setActiveId(null)
  }, [currentCampaign?.id])
  
  /* 2. which node is open */
  const [activeId, setActiveId] = useState<string | null>(null)

  /* set a default once nodes load */
  useEffect(() => {
    if (!activeId && nodes.length) {
      setActiveId(nodes[0].id)
    }
  }, [nodes, activeId])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey && e.key === 'n') {
        e.preventDefault()
        setIsAddModalOpen(true)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  /* 3. typing state tracking */
  const [isTyping, setIsTyping] = useState(false)
  
  /* 4. content + updater for the active node */
  const { htmlContent, updateMarkdown } = useActiveNode(
    currentCampaign?.slug ?? '',
    activeId ?? '',
    isTyping
  )

  // Handle navigation to a note from command palette
  const handleNavigateToNote = (note: Note) => {
    setActiveId(note.id)
  }

  // Handle creating new notes from command palette  
  const handleCreateNote = async (type?: string, title?: string) => {
    const ts = Date.now()
    const id = nanoid()

    const newRow = {
      id,
      type: type || 'Note', // Use the specified type or default to 'Note'
      title: title || 'Untitled',
      markdown: '',
      updatedAt: ts,
      createdAt: ts,
      attributes: {},
      ownerId: USER_ID,
      campaignId: currentCampaign?.id || null,
    campaignIds: currentCampaign ? [currentCampaign.id] : []
    }
    
    if (!nodeOps) return
    const nodeId = await nodeOps.createNode(newRow)
    setActiveId(nodeId)
    setNodes(prev => [{ ...newRow, id: nodeId }, ...prev])
  }

  // Handle other actions from command palette
  const handleAction = (action: string) => {
    switch (action) {
      case 'quick-actions':
        console.log('Opening quick actions')
        break
      case 'toggle-sidebar':
        setShowSidebar(prev => !prev)
        break
      case 'toggle-inspector':
        setShowInspector(prev => !prev)
        break
      case 'add-note':
        setIsAddModalOpen(true)
        break
      default:
        console.log('Unknown action:', action)
    }
  }

  /* create a blank node and switch to it */
  async function handleCreate(type?: string, title?: string) {
    const ts = Date.now()
    const id = nanoid()

    const newRow = {
      id,
      type: type || 'Note',
      title: title || 'Untitled',
      markdown: '',
      updatedAt: ts,
      createdAt: ts,
      attributes: {},
      ownerId: USER_ID,
      campaignId: currentCampaign?.id || null,
      campaignIds: currentCampaign ? [currentCampaign.id] : []
    }
    if (!nodeOps) return
    const nodeId = await nodeOps.createNode(newRow);   // use the real id
    setActiveId(nodeId);
    setNodes(prev => [{ ...newRow, id: nodeId }, ...prev]);
  }

  async function handleDelete(node: Note) {
    if (!nodeOps) return
    await nodeOps.deleteNode(node.id)
    setNodes(prev => prev.filter(n => n.id !== node.id))
    setActiveId(prev =>
      prev === node.id ? (nodes.find(n => n.id !== node.id)?.id ?? null) : prev,
    )
  }

  const [showSidebar, setShowSidebar] = useState(true);
  const [showInspector, setShowInspector] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  if (!currentCampaign) return <p className="p-4 text-zinc-300">Loading campaigns…</p>
  
  // Show loading if we have no nodes and dbNodes is still undefined (still fetching)
  if (!nodes.length && dbNodes === undefined) return <p className="p-4 text-zinc-300">Loading nodes…</p>
  
  // If we have no nodes but dbNodes is defined (finished fetching), allow empty state
  if (!nodes.length && dbNodes !== undefined) {
    return <p className="p-4 text-zinc-300">No nodes found. Create your first note!</p>
  }
  
  if (!activeId) return <p className="p-4 text-zinc-300">Loading active node…</p>
  const node = nodes.find(n => n.id === activeId)
  if (!node) return <p className="p-4 text-zinc-300">Node not found.</p>
  
  return (
    <div className="h-screen bg-zinc-900 text-zinc-100">
    <Nav 
      onNavigateToNote={handleNavigateToNote}
      onCreateNote={handleCreateNote}
      onAction={handleAction}
    />      
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
                    if (nodeOps) await nodeOps.renameNode(id, title)
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
                  <DocumentHeader
                    node={node}
                    htmlContent={htmlContent}
                    onTitleChange={async (id, title) => {
                      if (nodeOps) await nodeOps.renameNode(id, title)
                    }}
                  />
                  
                  {/* Document Content */}
                  <div className="h-[calc(100%-64px)] overflow-auto">
                    <div className="max-w-4xl mx-auto p-8">
                      <Tiptap
                        key={activeId}
                        content={htmlContent}
                        onContentChange={updateMarkdown}
                        onTypingStateChange={setIsTyping}
                      />
                    </div>
                  </div>
                  
                  <LLMChatEmbedded
                    campaign={currentCampaign.slug}
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
      
      <AddNoteModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onCreate={handleCreateNote}
      />
    </div>
  )
}