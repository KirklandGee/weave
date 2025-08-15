'use client'

import { useState, useEffect, useCallback } from 'react'
import { useCampaignNodes } from '@/lib/hooks/useCampaignNodes'
import { useActiveNode } from '@/lib/hooks/useActiveNode'
import { createNodeOps } from '@/lib/hooks/useNodeOps'
import { useCampaign } from '@/contexts/AppContext'
import { useTemplateGeneration } from '@/lib/hooks/useTemplateGeneration'
import LeftSidebar from '@/components/LeftSidebar'
import RightSidebar from '@/components/RightSidebar'
import Nav from '@/components/Nav'
import Tiptap from '@/components/Tiptap'
import DocumentHeader from '@/components/DocumentHeader'
import { ImportMarkdownModal } from '@/components/ImportMarkdownModal'
import EmptyCampaignsState from '@/components/EmptyCampaignsState'
import { nanoid } from 'nanoid'
import { Note } from '@/types/node'
import { USER_ID } from '@/lib/constants'
import { Allotment } from "allotment"
import "allotment/dist/style.css"
import { updateLastActivity } from '@/lib/utils/activityTracker'

export default function Home() {
  const { currentCampaign, campaigns, isLoading } = useCampaign()
  // Only load nodes if we have a campaign - this prevents loading from 'default' database
  const dbNodes = useCampaignNodes(currentCampaign?.slug)
  const nodeOps = currentCampaign ? createNodeOps(currentCampaign.slug) : null
  
  // Initialize template generation polling for the current campaign
  useTemplateGeneration(currentCampaign?.slug || '')

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
    setNodes(prevNodes => {
      // If we have dbNodes, use them as the source of truth but preserve order of optimistic updates
      const newNodes = dbNodes.filter(n => n && typeof n === 'object' && 'id' in n) as Note[]
      
      // If we have optimistic nodes that aren't in dbNodes yet, keep them at the front
      const dbNodeIds = new Set(newNodes.map(n => n.id))
      const optimisticNodes = prevNodes.filter(n => !dbNodeIds.has(n.id))
      
      // Combine optimistic nodes (at front) with db nodes, avoiding duplicates
      return [...optimisticNodes, ...newNodes]
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

  // Keyboard shortcuts will be set up after state declarations

  /* 3. typing state tracking */
  const [isTyping, setIsTyping] = useState(false)
  
  /* 4. track when a newly created note should start title editing */
  const [editingNoteTitle, setEditingNoteTitle] = useState(false)
  
  /* 5. content + updater for the active node */
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
  const handleCreateNote = useCallback(async (type?: string, title?: string) => {
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
    setEditingNoteTitle(true)
    // Add optimistically, but useLiveQuery will eventually sync and deduplicate
    setNodes(prev => {
      // Check if note already exists to prevent duplicates
      const exists = prev.some(n => n.id === nodeId)
      if (exists) return prev
      return [{ ...newRow, id: nodeId }, ...prev]
    })
  }, [nodeOps, currentCampaign, setActiveId, setEditingNoteTitle, setNodes])

  // Handle importing markdown files
  const handleImportMarkdown = async (files: File[], campaignSlug: string) => {
    if (!files.length) {
      throw new Error('No files provided')
    }

    if (!campaignSlug) {
      throw new Error('No campaign selected')
    }

    // Create node operations for the selected campaign
    const selectedNodeOps = createNodeOps(campaignSlug)

    try {
      const results = []
      const errors = []
      const createdNotes = []

      for (const file of files) {
        try {
          // Validate file type
          if (!file.name.endsWith('.md') && !file.name.endsWith('.markdown')) {
            errors.push(`${file.name}: Not a markdown file`)
            continue
          }

          // Read file content
          const content = await file.text()
          
          // Parse frontmatter (simple implementation)
          const frontmatter: Record<string, unknown> = {}
          let markdown = content
          
          if (content.startsWith('---\n')) {
            const endIndex = content.indexOf('\n---\n', 4)
            if (endIndex !== -1) {
              const frontmatterText = content.substring(4, endIndex)
              markdown = content.substring(endIndex + 5)
              
              // Simple YAML parsing for basic frontmatter
              try {
                frontmatterText.split('\n').forEach(line => {
                  const colonIndex = line.indexOf(':')
                  if (colonIndex > 0) {
                    const key = line.substring(0, colonIndex).trim()
                    const value = line.substring(colonIndex + 1).trim()
                    frontmatter[key] = value.replace(/^["']|["']$/g, '') // Remove quotes
                  }
                })
              } catch (e) {
                console.warn('Failed to parse frontmatter:', e)
              }
            }
          }

          // Extract title
          let title = file.name.replace(/\.(md|markdown)$/i, '')
          
          // Check frontmatter for title
          if (frontmatter.title) {
            title = String(frontmatter.title)
          } else {
            // Try to find H1 header
            const h1Match = markdown.match(/^#\s+(.+)/m)
            if (h1Match) {
              title = h1Match[1].trim()
            }
          }

          // Detect note type
          let noteType = 'Note'
          if (frontmatter.type && typeof frontmatter.type === 'string') {
            const validTypes = ['Note', 'Character', 'Location', 'Quest', 'Event', 'Session', 'NPC', 'Item', 'Lore', 'Rule']
            if (validTypes.includes(frontmatter.type)) {
              noteType = frontmatter.type
            }
          } else {
            // Pattern-based detection
            const contentLower = markdown.toLowerCase()
            if (contentLower.includes('character') || contentLower.includes('npc') || contentLower.includes('personality')) {
              noteType = 'Character'
            } else if (contentLower.includes('location') || contentLower.includes('place') || contentLower.includes('city')) {
              noteType = 'Location'
            } else if (contentLower.includes('quest') || contentLower.includes('mission')) {
              noteType = 'Quest'
            } else if (contentLower.includes('session') || contentLower.includes('adventure')) {
              noteType = 'Session'
            }
          }

          // Create note using the frontend's node operations
          const noteId = await selectedNodeOps.createNode({
            type: noteType,
            title: title,
            markdown: markdown,
            attributes: {
              imported_from: file.name,
              frontmatter: frontmatter,
            }
          })

          const createdNote = {
            id: noteId,
            title: title,
            type: noteType,
            markdown: markdown,
            imported_from: file.name,
            frontmatter: frontmatter
          }

          createdNotes.push(createdNote)
          results.push(createdNote)

        } catch (error) {
          console.error(`Error importing ${file.name}:`, error)
          errors.push(`${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
      }
      
      // Set first imported note as active (only if importing to current campaign)
      if (createdNotes.length > 0 && campaignSlug === currentCampaign?.slug) {
        setActiveId(createdNotes[0].id)
      }

      // Don't update local state optimistically - let the sync system handle it
      // The useEffect in useCampaignNodes will pick up the new notes from IndexedDB

      return {
        message: `Import completed. ${results.length} notes created, ${errors.length} errors.`,
        created_notes: results,
        errors: errors,
        total_files: files.length,
        successful_imports: results.length,
        failed_imports: errors.length
      }

    } catch (error) {
      console.error('Import error:', error)
      throw error
    }
  }

  // Handle other actions from command palette
  const handleAction = (action: string) => {
    switch (action) {
      case 'quick-actions':
        break
      case 'toggle-left-sidebar':
        setShowLeftSidebar(prev => !prev)
        break
      case 'toggle-right-sidebar':
        setShowRightSidebar(prev => !prev)
        break
      case 'toggle-ai-assistant':
        if (rightSidebarMode === 'ai-chat' && showRightSidebar) {
          setRightSidebarMode('relationships')
        } else {
          setShowRightSidebar(true)
          setRightSidebarMode('ai-chat')
        }
        break
      case 'add-note':
        handleCreateNote()
        break
      case 'import-markdown':
        setIsImportModalOpen(true)
        break
      default:
        console.log('Unknown action:', action)
    }
  }

  /* create a blank node and switch to it */
  async function handleCreate(type?: string, title?: string) {
    await handleCreateNote(type, title)
  }

  async function handleDelete(node: Note) {
    if (!nodeOps) return
    await nodeOps.deleteNode(node.id)
    setNodes(prev => prev.filter(n => n.id !== node.id))
    setActiveId(prev =>
      prev === node.id ? (nodes.find(n => n.id !== node.id)?.id ?? null) : prev,
    )
  }

  const [showLeftSidebar, setShowLeftSidebar] = useState(true);
  const [showRightSidebar, setShowRightSidebar] = useState(true);
  const [rightSidebarMode, setRightSidebarMode] = useState<'relationships' | 'ai-chat'>('relationships');
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey && e.shiftKey && e.key === 'n') {
        e.preventDefault()
        handleCreateNote()
      }
      if (e.metaKey && e.key === "[") {
        e.preventDefault()
        if (rightSidebarMode === 'ai-chat' && showRightSidebar) {
          setRightSidebarMode('relationships')
        } else {
          setShowRightSidebar(true)
          setRightSidebarMode('ai-chat')
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [rightSidebarMode, showRightSidebar, handleCreateNote]);

  // Handle campaigns loading state
  if (isLoading) {
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
            <Allotment.Pane minSize={180} maxSize={350} preferredSize={240}>
              <div className="bg-zinc-900 border-r border-zinc-800 h-full overflow-hidden relative">
                <LeftSidebar
                  nodes={[]}
                  activeId=""
                  onSelect={() => {}}
                  onCreate={async () => {}}
                  onDelete={() => {}}
                  isLoading={true}
                  campaignSlug=""
                  campaignId=""
                  ownerId={USER_ID}
                />
              </div>
            </Allotment.Pane>
            
            <Allotment.Pane>
              <div className="flex-1 min-w-0 relative bg-zinc-950 h-full flex items-center justify-center">
                <div className="text-zinc-400">Loading...</div>
              </div>
            </Allotment.Pane>
          </Allotment>
        </div>
      </div>
    )
  }

  // Handle no campaigns state  
  if (!isLoading && campaigns.length === 0) {
    return <EmptyCampaignsState />
  }

  // Handle campaign loading but no current campaign selected
  if (!currentCampaign) {
    return (
      <div className="h-screen bg-zinc-900 text-zinc-100 flex items-center justify-center">
        <div className="text-zinc-400">Loading campaign...</div>
      </div>
    )
  }
  
  // Show loading if we have no nodes and dbNodes is still undefined (still fetching)
  if (!nodes.length && dbNodes === undefined) {
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
            <Allotment.Pane minSize={180} maxSize={350} preferredSize={240}>
              <div className="bg-zinc-900 border-r border-zinc-800 h-full overflow-hidden relative">
                <LeftSidebar
                  nodes={[]}
                  activeId=""
                  onSelect={() => {}}
                  onCreate={async () => {}}
                  onDelete={() => {}}
                  isLoading={true}
                  campaignSlug=""
                  campaignId=""
                  ownerId={USER_ID}
                />
              </div>
            </Allotment.Pane>
            
            <Allotment.Pane>
              <div className="flex-1 min-w-0 relative bg-zinc-950 h-full flex items-center justify-center">
                <div className="text-zinc-400">Loading notes...</div>
              </div>
            </Allotment.Pane>
          </Allotment>
        </div>
      </div>
    )
  }
  
  // If we have no nodes but dbNodes is defined (finished fetching), allow empty state
  if (!nodes.length && dbNodes !== undefined) {
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
            <Allotment.Pane minSize={180} maxSize={350} preferredSize={240}>
              <div className="bg-zinc-900 border-r border-zinc-800 h-full overflow-hidden relative">
                <LeftSidebar
                  nodes={nodes}
                  activeId=""
                  onSelect={async (node) => {
                    setActiveId(node.id)
                    if (currentCampaign?.slug) {
                      await updateLastActivity(currentCampaign.slug)
                    }
                  }}
                  onCreate={handleCreate}
                  onDelete={handleDelete}
                  campaignSlug={currentCampaign?.slug || ''}
                  campaignId={currentCampaign?.id || ''}
                  ownerId={USER_ID}
                />
              </div>
            </Allotment.Pane>
            
            <Allotment.Pane>
              <div className="flex-1 min-w-0 relative bg-zinc-950 h-full flex items-center justify-center">
                <div className="text-center space-y-4">
                  <div className="text-zinc-300 text-lg">No notes found</div>
                  <button
                    onClick={() => handleCreate()}
                    className="bg-amber-600 hover:bg-amber-700 px-4 py-2 rounded-lg text-white font-medium transition-colors border-2 border-amber-500 hover:border-amber-400 relative overflow-hidden before:absolute before:inset-1 before:border before:border-dashed before:border-amber-300 before:rounded-md before:opacity-40"
                  >
                    Create your first note!
                  </button>
                </div>
              </div>
            </Allotment.Pane>
          </Allotment>
        </div>
        
        <ImportMarkdownModal
          isOpen={isImportModalOpen}
          onClose={() => setIsImportModalOpen(false)}
          onImport={handleImportMarkdown}
        />
      </div>
    )
  }
  
  if (!activeId) {
    // Set first available node as active if we have nodes but no activeId
    if (nodes.length > 0) {
      setActiveId(nodes[0].id)
    }
    return (
      <div className="h-screen bg-zinc-900 text-zinc-100 flex items-center justify-center">
        <div className="text-zinc-400">Loading...</div>
      </div>
    )
  }
  
  const node = nodes.find(n => n.id === activeId)
  if (!node) {
    return (
      <div className="h-screen bg-zinc-900 text-zinc-100 flex items-center justify-center">
        <div className="text-zinc-400">Note not found.</div>
      </div>
    )
  }
  
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
          <Allotment.Pane minSize={showLeftSidebar ? 180 : 40} maxSize={showLeftSidebar ? 350 : 40} preferredSize={showLeftSidebar ? 240 : 40}>
            <div className="bg-zinc-900 border-r border-zinc-800 h-full overflow-hidden relative">
              <div 
                className={`absolute inset-0 transition-transform duration-300 ease-out ${
                  showLeftSidebar ? 'translate-x-0' : '-translate-x-full'
                }`}
              >
                <LeftSidebar
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
                  onHide={() => setShowLeftSidebar(false)}
                  campaignSlug={currentCampaign?.slug || ''}
                  campaignId={currentCampaign?.id || ''}
                  ownerId={USER_ID}
                />
              </div>
              <div 
                className={`absolute inset-0 transition-transform duration-300 ease-out ${
                  showLeftSidebar ? 'translate-x-full' : 'translate-x-0'
                }`}
              >
                <div className="h-full flex flex-col items-center py-3 w-10">
                  <button
                    onClick={() => setShowLeftSidebar(true)}
                    className="flex items-center justify-center w-8 h-8 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 rounded-md transition-colors duration-200 mb-4"
                    title="Show left sidebar"
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
                    onTypeChange={async (id, newType) => {
                      if (nodeOps) await nodeOps.updateNodeType(id, newType)
                    }}
                    startEditing={editingNoteTitle}
                    onStartEditingHandled={() => setEditingNoteTitle(false)}
                  />
                  
                  {/* Document Content */}
                  <div className="h-[calc(100%-64px)] overflow-auto">
                    <div className="max-w-4xl mx-auto p-8">
                      <Tiptap
                        key={activeId}
                        content={htmlContent}
                        onContentChange={updateMarkdown}
                        onTypingStateChange={setIsTyping}
                        currentNodeId={activeId}
                        onNavigateToNote={handleNavigateToNote}
                      />
                    </div>
                  </div>
                  
                </div>
              </Allotment.Pane>
              
              <Allotment.Pane minSize={showRightSidebar ? 250 : 40} maxSize={showRightSidebar ? 500 : 40} preferredSize={showRightSidebar ? 320 : 40}>
                <div className="bg-zinc-900 border-l border-zinc-800 h-full overflow-hidden relative">
                  <div 
                    className={`absolute inset-0 transition-transform duration-300 ease-out ${
                      showRightSidebar ? 'translate-x-0' : 'translate-x-full'
                    }`}
                  >
                    <RightSidebar
                      node={node}
                      campaign={currentCampaign.slug}
                      activeNodeId={activeId}
                      initialMode={rightSidebarMode}
                      onModeChange={(mode) => setRightSidebarMode(mode)}
                      onNavigateToNote={async (noteId) => {
                        setActiveId(noteId);
                        if (currentCampaign?.slug) {
                          await updateLastActivity(currentCampaign.slug)
                        }
                      }}
                      onHide={() => setShowRightSidebar(false)}
                    />
                  </div>
                  <div 
                    className={`absolute inset-0 transition-transform duration-300 ease-out ${
                      showRightSidebar ? 'translate-x-full' : 'translate-x-0'
                    }`}
                  >
                    <div className="h-full flex flex-col items-center py-3 w-10">
                      <button
                        onClick={() => setShowRightSidebar(true)}
                        className="flex items-center justify-center w-8 h-8 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 rounded-md transition-colors duration-200 mb-4"
                        title="Show right sidebar"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </button>
                      <div className="flex-1 w-px bg-zinc-800"></div>
                    </div>
                  </div>
                </div>
              </Allotment.Pane>
            </Allotment>
          </Allotment.Pane>
        </Allotment>
      </div>
      
      <ImportMarkdownModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImport={handleImportMarkdown}
      />
    </div>
  )
}