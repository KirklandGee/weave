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
import { updateLastActivity } from '@/lib/utils/activityTracker'

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
      if (e.metaKey && e.shiftKey && e.key === 'n') {
        e.preventDefault()
        setIsAddModalOpen(true)
      }
      if (e.metaKey && e.key === "[") {
        e.preventDefault()
        setShowAiAssistant(prev => !prev)
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
  const handleNavigateToNote = async (note: Note) => {
    setActiveId(note.id)
    if (currentCampaign?.slug) {
      await updateLastActivity(currentCampaign.slug)
    }
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
      case 'toggle-ai-assistant':
        setShowAiAssistant(prev => !prev)
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
  const [showAiAssistant, setShowAiAssistant] = useState(false);
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
    <div className="h-screen bg-zinc-900 text-zinc-100 sticky">
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
          <Allotment.Pane minSize={showSidebar ? 180 : 40} maxSize={showSidebar ? 350 : 40} preferredSize={showSidebar ? 240 : 40}>
            <div className="bg-zinc-900 border-r border-zinc-800 h-full overflow-hidden relative">
              <div 
                className={`absolute inset-0 transition-transform duration-300 ease-out ${
                  showSidebar ? 'translate-x-0' : '-translate-x-full'
                }`}
              >
                <Sidebar
                  nodes={nodes}
                  activeId={activeId}
                  onSelect={async (node) => {
                    setActiveId(node.id)
                    if (currentCampaign?.slug) {
                      await updateLastActivity(currentCampaign.slug)
                    }
                  }}
                  onCreate={handleCreate}
                  onDelete={handleDelete}
                  onRename={async (id, title) => {
                    if (nodeOps) await nodeOps.renameNode(id, title)
                  }}
                  onHide={() => setShowSidebar(false)}
                  onToggleAiAssistant={() => setShowAiAssistant(prev => !prev)}
                />
              </div>
              <div 
                className={`absolute inset-0 transition-transform duration-300 ease-out ${
                  showSidebar ? 'translate-x-full' : 'translate-x-0'
                }`}
              >
                <div className="h-full flex flex-col items-center py-3 w-10">
                  <button
                    onClick={() => setShowSidebar(true)}
                    className="flex items-center justify-center w-8 h-8 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 rounded-md transition-colors duration-200 mb-4"
                    title="Show sidebar"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                  <div className="flex-1 w-px bg-zinc-800"></div>
                </div>
              </div>
            </div>
          </Allotment.Pane>
          
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
                    isOpen={showAiAssistant}
                    onToggle={() => setShowAiAssistant(prev => !prev)}
                  />
                  
                  
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
                      onNavigateToNote={async (noteId) => {
                        setActiveId(noteId);
                        if (currentCampaign?.slug) {
                          await updateLastActivity(currentCampaign.slug)
                        }
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