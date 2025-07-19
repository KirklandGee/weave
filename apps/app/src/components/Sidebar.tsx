'use client'
import { useState, useEffect, useRef } from 'react'
import type { Note } from '@/types/node'
import { ChevronDown, ChevronRight, Trash, Pencil, Plus, Map, Users, Calendar, MessageSquare, AlertCircle } from 'lucide-react'
import React from 'react'
import { AddNoteModal } from './AddNoteModal'

export default function Sidebar({
  nodes,
  activeId,
  onSelect,
  onCreate,
  onDelete,
  onRename,
  onHide,
  onToggleAiAssistant,
  onReorder,
  customOrdering = {},
}: {
  nodes: Note[]
  activeId: string
  onSelect: (node: Note) => void
  onCreate: (type?: string, title?: string) => void
  onDelete: (node: Note) => void
  onRename: (id: string, title: string) => void
  onHide?: () => void
  onToggleAiAssistant?: () => void
  onReorder?: (sectionName: string, orderedIds: string[]) => void
  customOrdering?: Record<string, string[]>
}) {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  
  /* ---------- drag and drop state ---------- */
  const [draggedItem, setDraggedItem] = useState<{ id: string; section: string } | null>(null)
  const [dragOverItem, setDragOverItem] = useState<string | null>(null)

  /* ---------- group + accordion state ---------- */
  // Define section groupings
  const sections = {
    'World Building': {
      icon: Map,
      types: ['Location', 'Quest', 'Event', 'Lore', 'Rule', 'Item', 'Note']
    },
    'Characters & NPCs': {
      icon: Users,
      types: ['Character', 'NPC']
    },
    'Sessions': {
      icon: Calendar,
      types: ['Session']
    }
  }

  // Group nodes by section and apply custom ordering or sort alphabetically
  const grouped = Object.entries(sections).reduce((acc, [sectionName, section]) => {
    const sectionNodes = nodes.filter(n => section.types.includes(n.type))
    
    // Apply custom ordering if it exists for this section
    if (customOrdering[sectionName]) {
      const customOrder = customOrdering[sectionName]
      const orderedNodes: Note[] = []
      const unorderedNodes: Note[] = []
      
      // First, add nodes in custom order
      for (const nodeId of customOrder) {
        const node = sectionNodes.find(n => n.id === nodeId)
        if (node) orderedNodes.push(node)
      }
      
      // Then add any new nodes that aren't in the custom order (alphabetically)
      for (const node of sectionNodes) {
        if (!customOrder.includes(node.id)) {
          unorderedNodes.push(node)
        }
      }
      unorderedNodes.sort((a, b) => a.title.localeCompare(b.title))
      
      acc[sectionName] = [...orderedNodes, ...unorderedNodes]
    } else {
      // Sort alphabetically by title if no custom ordering
      acc[sectionName] = sectionNodes.sort((a, b) => a.title.localeCompare(b.title))
    }
    
    return acc
  }, {} as Record<string, Note[]>)

  /* ---------- drag and drop handlers ---------- */
  const handleDragStart = (e: React.DragEvent, noteId: string, sectionName: string) => {
    setDraggedItem({ id: noteId, section: sectionName })
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent, noteId: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverItem(noteId)
  }

  const handleDragLeave = () => {
    setDragOverItem(null)
  }

  const handleDrop = (e: React.DragEvent, targetNoteId: string, sectionName: string) => {
    e.preventDefault()
    setDragOverItem(null)
    
    if (!draggedItem || draggedItem.section !== sectionName) {
      setDraggedItem(null)
      return
    }

    const sectionNodes = grouped[sectionName]
    const draggedIndex = sectionNodes.findIndex(n => n.id === draggedItem.id)
    const targetIndex = sectionNodes.findIndex(n => n.id === targetNoteId)
    
    if (draggedIndex === -1 || targetIndex === -1 || draggedIndex === targetIndex) {
      setDraggedItem(null)
      return
    }

    // Reorder the nodes
    const newOrder = [...sectionNodes]
    const [draggedNode] = newOrder.splice(draggedIndex, 1)
    newOrder.splice(targetIndex, 0, draggedNode)
    
    // Call the onReorder callback with the new order
    if (onReorder) {
      onReorder(sectionName, newOrder.map(n => n.id))
    }
    
    setDraggedItem(null)
  }
  
  const [open, setOpen] = useState<Record<string, boolean>>({'Sessions': true})

  /* ---------- context-menu state ---------- */
  const [menu, setMenu] = useState<{
    id: string
    top: number
    left: number
  } | null>(null)

  /* ---------- rename-inline state ---------- */
  const [renaming, setRenaming] = useState<string | null>(null)
  const renameInput = useRef<HTMLInputElement | null>(null)

  /* focus the rename input when it appears */
  useEffect(() => {
    if (renaming && renameInput.current) renameInput.current.focus()
  }, [renaming])

  /* close menu on escape / outside click */
  useEffect(() => {
    if (!menu) return
    const close = () => setMenu(null)
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setMenu(null)
    window.addEventListener('click', close)
    window.addEventListener('keydown', esc)
    return () => {
      window.removeEventListener('click', close)
      window.removeEventListener('keydown', esc)
    }
  }, [menu])

  /* helper: start rename then hide menu */
  const triggerRename = (id: string) => {
    setMenu(null)
    setRenaming(id)
  }

  return (
    <aside className="h-full flex flex-col overflow-hidden text-zinc-200">
      <div className="flex-shrink-0 p-3 border-b border-zinc-800 flex items-center justify-between">
        <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wide">Notes</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center justify-center w-7 h-7 text-zinc-400 hover:text-blue-400 hover:bg-blue-900/20 rounded-md transition-colors group"
            title="Add Note (⌘N)"
          >
            <Plus size={14} />
          </button>
          {onToggleAiAssistant && (
            <button
              onClick={onToggleAiAssistant}
              className="flex items-center justify-center w-7 h-7 text-zinc-400 hover:text-green-400 hover:bg-green-900/20 rounded-md transition-colors group"
              title="AI Assistant (⌘⇧T)"
            >
              <MessageSquare size={14} />
            </button>
          )}
          {onHide && (
            <button
              onClick={onHide}
              className="text-zinc-500 hover:text-zinc-300 transition-colors p-1 rounded hover:bg-zinc-800"
              aria-label="Hide sidebar"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {Object.entries(grouped).map(([sectionName, list]) => {
          const isOpen = open[sectionName] ?? false
          const section = sections[sectionName as keyof typeof sections]
          const IconComponent = section.icon
          return (
            <section key={sectionName} className="mb-4">
              <button
                onClick={() => setOpen(o => ({ ...o, [sectionName]: !isOpen }))}
                className="flex w-full items-center justify-between font-semibold uppercase tracking-wide text-zinc-400 hover:text-zinc-100 transition-colors mb-2"
              >
                <div className="flex items-center gap-2">
                  <IconComponent size={14} />
                  <span className="text-xs">{sectionName}</span>
                </div>
                {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </button>

              <div 
                className={`overflow-hidden transition-all duration-300 ease-out ${
                  isOpen ? 'max-h-screen opacity-100' : 'max-h-0 opacity-0'
                }`}
                style={{
                  maxHeight: isOpen ? `${list.length * 2.5}rem` : '0'
                }}
              >
                <ul className="ml-5 space-y-1 py-1">
                  {list.map(n => (
                    <li key={n.id} className="relative">
                      {/* ---------- normal / rename view ---------- */}
                      {renaming === n.id ? (
                        <input
                          aria-label='Rename note'
                          ref={renameInput}
                          defaultValue={n.title}
                          className="w-full rounded bg-zinc-800 px-2 py-1 text-sm text-white outline-none border border-zinc-600 focus:border-blue-500"
                          onBlur={e => {
                            const v = e.currentTarget.value.trim()
                            if (v && v !== n.title) onRename(n.id, v)
                            setRenaming(null)
                          }}
                          onKeyDown={e => {
                            if (e.key === 'Enter') e.currentTarget.blur()
                            if (e.key === 'Escape') {
                              e.preventDefault()
                              setRenaming(null)
                            }
                          }}
                        />
                      ) : (
                        <button
                          draggable
                          onDragStart={(e) => handleDragStart(e, n.id, sectionName)}
                          onDragOver={(e) => handleDragOver(e, n.id)}
                          onDragLeave={handleDragLeave}
                          onDrop={(e) => handleDrop(e, n.id, sectionName)}
                          onClick={() => onSelect(n)}
                          onContextMenu={e => {
                            e.preventDefault()
                            setMenu({
                              id: n.id,
                              top: e.clientY,
                              left: e.clientX,
                            })
                          }}
                          className={`w-full truncate text-left text-sm px-2 py-1 rounded transition-colors flex items-center gap-2 cursor-move ${
                            n.id === activeId 
                              ? 'bg-blue-600 text-white font-medium' 
                              : 'hover:bg-zinc-800 hover:text-white'
                          } ${
                            dragOverItem === n.id ? 'border-2 border-blue-400 border-dashed' : ''
                          } ${
                            draggedItem?.id === n.id ? 'opacity-50' : ''
                          }`}
                        >
                          {n.attributes?.generation_status === 'generating' && (
                            <div className="w-3 h-3 border border-zinc-400 border-t-blue-500 rounded-full animate-spin flex-shrink-0" />
                          )}
                          {n.attributes?.generation_status === 'error' && (
                            <AlertCircle className="w-3 h-3 text-red-500 flex-shrink-0" />
                          )}
                          <span className="truncate">{n.title}</span>
                        </button>
                      )}

                      {/* ---------- pop-up menu ---------- */}
                      {menu && menu.id === n.id && (
                        <div
                          className="fixed z-50"
                          style={{
                            top: `${menu.top}px`,
                            left: `${menu.left}px`,
                          }}
                          /* stop both click & mousedown so outside-click
                             handler won't run before our buttons */
                          onMouseDown={e => e.stopPropagation()}
                          onClick={e => e.stopPropagation()}
                        >
                          <div className="flex flex-col bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl py-1 min-w-[120px]">
                            {/* rename */}
                            <button
                              onClick={() => triggerRename(n.id)}
                              className="flex items-center gap-2 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-700 hover:text-white transition-colors"
                            >
                              <Pencil size={14} />
                              Rename
                            </button>
                            {/* delete */}
                            <button
                              onClick={() => {
                                onDelete(n)
                                setMenu(null)
                              }}
                              className="flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-600 hover:text-white transition-colors"
                            >
                              <Trash size={14} />
                              Delete
                            </button>
                          </div>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
              
              {/* Show active note when category is collapsed */}
              {!isOpen && list.some(n => n.id === activeId) && (
                <div className="ml-5 space-y-1 py-1">
                  {list.filter(n => n.id === activeId).map(n => (
                    <div key={`collapsed-${n.id}`} className="relative">
                      {renaming === n.id ? (
                        <input
                          aria-label='Rename note'
                          ref={renameInput}
                          defaultValue={n.title}
                          className="w-full rounded bg-zinc-800 px-2 py-1 text-sm text-white outline-none border border-zinc-600 focus:border-blue-500"
                          onBlur={e => {
                            const v = e.currentTarget.value.trim()
                            if (v && v !== n.title) onRename(n.id, v)
                            setRenaming(null)
                          }}
                          onKeyDown={e => {
                            if (e.key === 'Enter') e.currentTarget.blur()
                            if (e.key === 'Escape') {
                              e.preventDefault()
                              setRenaming(null)
                            }
                          }}
                        />
                      ) : (
                        <button
                          draggable
                          onDragStart={(e) => handleDragStart(e, n.id, sectionName)}
                          onDragOver={(e) => handleDragOver(e, n.id)}
                          onDragLeave={handleDragLeave}
                          onDrop={(e) => handleDrop(e, n.id, sectionName)}
                          onClick={() => onSelect(n)}
                          onContextMenu={e => {
                            e.preventDefault()
                            setMenu({
                              id: n.id,
                              top: e.clientY,
                              left: e.clientX,
                            })
                          }}
                          className={`w-full truncate text-left text-sm px-2 py-1 rounded transition-colors flex items-center gap-2 cursor-move ${
                            n.id === activeId 
                              ? 'bg-blue-600 text-white font-medium' 
                              : 'hover:bg-zinc-800 hover:text-white'
                          } ${
                            dragOverItem === n.id ? 'border-2 border-blue-400 border-dashed' : ''
                          } ${
                            draggedItem?.id === n.id ? 'opacity-50' : ''
                          }`}
                        >
                          {n.attributes?.generation_status === 'generating' && (
                            <div className="w-3 h-3 border border-zinc-400 border-t-blue-500 rounded-full animate-spin flex-shrink-0" />
                          )}
                          {n.attributes?.generation_status === 'error' && (
                            <AlertCircle className="w-3 h-3 text-red-500 flex-shrink-0" />
                          )}
                          <span className="truncate">{n.title}</span>
                        </button>
                      )}

                      {/* Context menu for collapsed active note */}
                      {menu && menu.id === n.id && (
                        <div
                          className="fixed z-50"
                          style={{
                            top: `${menu.top}px`,
                            left: `${menu.left}px`,
                          }}
                          onMouseDown={e => e.stopPropagation()}
                          onClick={e => e.stopPropagation()}
                        >
                          <div className="flex flex-col bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl py-1 min-w-[120px]">
                            <button
                              onClick={() => triggerRename(n.id)}
                              className="flex items-center gap-2 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-700 hover:text-white transition-colors"
                            >
                              <Pencil size={14} />
                              Rename
                            </button>
                            <button
                              onClick={() => {
                                onDelete(n)
                                setMenu(null)
                              }}
                              className="flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-600 hover:text-white transition-colors"
                            >
                              <Trash size={14} />
                              Delete
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>
          )
        })}
      </div>
      
      <AddNoteModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onCreate={(type, title) => {
          onCreate(type, title)
          setIsAddModalOpen(false)
        }}
      />
    </aside>
  )
}