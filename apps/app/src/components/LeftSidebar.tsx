'use client'
import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import type { Note } from '@/types/node'
import { ChevronDown, ChevronRight, Trash, Pencil, Map, Users, Calendar, AlertCircle, Folder, FileText, FolderPlus, Copy } from 'lucide-react'
import React from 'react'
import { Skeleton } from './ui/Skeleton'
import { FolderTree } from './FolderTree'
import { useFolders } from '@/lib/hooks/useFolders'

export default function LeftSidebar({
  nodes,
  activeId,
  onSelect,
  onCreate,
  onNoteCreated,
  onDelete,
  onHide,
  isLoading = false,
  campaignSlug,
  campaignId,
  ownerId,
}: {
  nodes: Note[]
  activeId: string
  onSelect: (node: Note) => void
  onCreate: (type?: string, title?: string) => Promise<void>
  onNoteCreated?: () => void
  onDelete: (node: Note) => void
  onHide?: () => void
  isLoading?: boolean
  campaignSlug: string
  campaignId: string
  ownerId: string
}) {
  
  /* ---------- folder management ---------- */
  const {
    folderTree,
    expandedFolders,
    uncategorizedNoteIds,
    isLoading: foldersLoading,
    error: folderError,
    toggleFolder,
    createFolder,
    renameFolder,
    deleteFolder,
    moveNoteToFolder,
    moveFolder,
    reorderFolders,
    refreshFolders,
  } = useFolders(campaignSlug, campaignId, ownerId)
  
  /* ---------- drag and drop state ---------- */
  const [draggedItem, setDraggedItem] = useState<{ id: string; type: 'note' | 'folder'; parentId?: string } | null>(null)
  const [dragOverItem, setDragOverItem] = useState<string | null>(null)

  /* ---------- uncategorized notes ---------- */
  const uncategorizedNotes = nodes.filter(note => uncategorizedNoteIds.includes(note.id))

  /* ---------- drag and drop handlers ---------- */
  const handleDragStart = (item: { id: string; type: 'note' | 'folder'; parentId?: string }) => {
    setDraggedItem(item)
  }

  const handleDragOver = (id: string) => {
    setDragOverItem(id)
  }

  const handleDragLeave = () => {
    setDragOverItem(null)
  }

  const handleDrop = async (targetId: string, targetType: 'folder' | 'note') => {
    if (!draggedItem) return

    setDragOverItem(null)

    try {
      if (draggedItem.type === 'note' && targetType === 'folder') {
        // Move note to folder
        await moveNoteToFolder(draggedItem.id, targetId)
      } else if (draggedItem.type === 'folder' && targetType === 'folder') {
        // Move folder to become child of target folder
        const draggedFolder = folderTree.find(f => f.folder.id === draggedItem.id)
        if (draggedFolder && draggedFolder.folder.id !== targetId) {
          // Prevent moving a folder into itself or its descendants
          const isDescendant = (folderId: string, potentialAncestorId: string): boolean => {
            const folder = folderTree.find(f => f.folder.id === folderId)
            if (!folder) return false
            if (folder.folder.parentId === potentialAncestorId) return true
            if (folder.folder.parentId) return isDescendant(folder.folder.parentId, potentialAncestorId)
            return false
          }

          if (!isDescendant(targetId, draggedItem.id)) {
            await moveFolder(draggedItem.id, targetId)
          }
        }
      }
    } catch (error) {
      console.error('Error handling drop:', error)
    }

    setDraggedItem(null)
  }

  const handleDropToRoot = async () => {
    if (!draggedItem || draggedItem.type !== 'folder') return

    setDragOverItem(null)

    try {
      // Move folder to root level (no parent)
      await moveFolder(draggedItem.id, undefined)
    } catch (error) {
      console.error('Error moving folder to root:', error)
    }

    setDraggedItem(null)
  }
  
  /* ---------- folder creation handlers ---------- */
  const handleCreateFolder = async (parentId?: string) => {
    try {
      const newFolder = await createFolder('New Folder', parentId)
      // Start renaming the newly created folder immediately
      if (newFolder && newFolder.id) {
        setRenaming(newFolder.id)
      }
    } catch (error) {
      console.error('Error creating folder:', error)
    }
  }

  /* ---------- context-menu state ---------- */
  const [contextMenu, setContextMenu] = useState<{
    id?: string  // Optional - only present when right-clicking on a specific item
    type?: 'note' | 'folder' // Type of item being right-clicked
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
    if (!contextMenu) return
    const close = () => setContextMenu(null)
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setContextMenu(null)
    window.addEventListener('click', close)
    window.addEventListener('keydown', esc)
    return () => {
      window.removeEventListener('click', close)
      window.removeEventListener('keydown', esc)
    }
  }, [contextMenu])

  /* helper: start rename then hide menu */
  const triggerRename = (id: string) => {
    setContextMenu(null)
    setRenaming(id)
  }

  /* helper: calculate menu position at exact cursor location */
  const calculateMenuPosition = (clientX: number, clientY: number) => {
    const menuWidth = 160  // Approximate menu width
    const menuHeight = 300 // Increased height estimate for better positioning
    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight
    const padding = 8 // Padding from viewport edges
    
    // Start at exact cursor position
    let left = clientX
    let top = clientY
    
    // Adjust if menu would go off right edge
    if (left + menuWidth > viewportWidth - padding) {
      left = clientX - menuWidth
    }
    
    // Adjust if menu would go off bottom edge
    if (top + menuHeight > viewportHeight - padding) {
      top = clientY - menuHeight
    }
    
    // Ensure we don't go off the left or top edges
    left = Math.max(padding, left)
    top = Math.max(padding, top)
    
    // Final bounds check to ensure menu fits in viewport
    if (left + menuWidth > viewportWidth - padding) {
      left = viewportWidth - menuWidth - padding
    }
    if (top + menuHeight > viewportHeight - padding) {
      top = viewportHeight - menuHeight - padding
    }
    
    return { left, top }
  }

  // Render loading skeleton if loading
  if (isLoading || foldersLoading) {
    return (
      <aside className="h-full flex flex-col overflow-hidden text-zinc-200">
        <div className="flex-shrink-0 p-3 border-b border-zinc-800 flex items-center justify-between">
          <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wide">Notes</h3>
          <div className="flex items-center gap-2">
            <Skeleton width="28px" height="28px" className="rounded-md" />
            <Skeleton width="28px" height="28px" className="rounded-md" />
            <Skeleton width="28px" height="28px" className="rounded-md" />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          {/* World Building Section Skeleton */}
          <section className="mb-4">
            <div className="flex w-full items-center justify-between font-semibold uppercase tracking-wide text-zinc-400 mb-2">
              <div className="flex items-center gap-2">
                <Map size={14} />
                <span className="text-xs">World Building</span>
              </div>
              <ChevronDown size={14} />
            </div>
            <div className="ml-5 space-y-1 py-1">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} height="32px" className="rounded" />
              ))}
            </div>
          </section>

          {/* Characters & NPCs Section Skeleton */}
          <section className="mb-4">
            <div className="flex w-full items-center justify-between font-semibold uppercase tracking-wide text-zinc-400 mb-2">
              <div className="flex items-center gap-2">
                <Users size={14} />
                <span className="text-xs">Characters & NPCs</span>  
              </div>
              <ChevronRight size={14} />
            </div>
          </section>

          {/* Sessions Section Skeleton */}
          <section className="mb-4">
            <div className="flex w-full items-center justify-between font-semibold uppercase tracking-wide text-zinc-400 mb-2">
              <div className="flex items-center gap-2">
                <Calendar size={14} />
                <span className="text-xs">Sessions</span>
              </div>
              <ChevronDown size={14} />
            </div>
            <div className="ml-5 space-y-1 py-1">
              {Array.from({ length: 2 }).map((_, i) => (
                <Skeleton key={i} height="32px" className="rounded" />
              ))}
            </div>
          </section>
        </div>
      </aside>
    )
  }

  return (
    <aside className="h-full flex flex-col overflow-hidden text-zinc-200">
      <div className="flex-shrink-0 p-3 border-b border-zinc-800 flex items-center justify-between">
        <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wide">Notes</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={async () => {
              await onCreate('Note', 'Untitled')
              // Refresh folders after a brief delay to update uncategorized notes
              setTimeout(refreshFolders, 150)
              onNoteCreated?.()
            }}
            className="flex items-center justify-center w-7 h-7 text-zinc-400 hover:text-blue-400 hover:bg-blue-900/20 rounded-md transition-colors group border border-dashed border-transparent hover:border-blue-500/30"
            title="Add Note (⌘N)"
          >
            <FileText size={14} />
          </button>
          <button
            onClick={() => handleCreateFolder()}
            className="flex items-center justify-center w-7 h-7 text-zinc-400 hover:text-amber-400 hover:bg-amber-900/20 rounded-md transition-colors group"
            title="New Folder"
          >
            <FolderPlus size={14} />
          </button>
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
        {/* Error Display */}
        {folderError && (
          <div className="text-red-400 text-sm mb-4 p-2 border border-red-800 rounded">
            {folderError}
          </div>
        )}

        {/* Root Level Drop Zone */}
        <div
          className={`min-h-[20px] transition-colors ${
            draggedItem?.type === 'folder' && dragOverItem === 'root'
              ? 'bg-amber-900/20 border border-dashed border-amber-500/50 rounded'
              : ''
          }`}
          onDragOver={(e) => {
            if (draggedItem?.type === 'folder') {
              e.preventDefault()
              handleDragOver('root')
            }
          }}
          onDragLeave={handleDragLeave}
          onDrop={(e) => {
            if (draggedItem?.type === 'folder') {
              e.preventDefault()
              handleDropToRoot()
            }
          }}
        />

        {/* Folder Tree */}
        <div
          onContextMenu={(e) => {
            // Only show context menu if right-clicking on empty space, not on folder/note items
            if (e.target === e.currentTarget || (e.target as HTMLElement).closest('[data-folder-item]') === null) {
              e.preventDefault()
              const position = calculateMenuPosition(e.clientX, e.clientY)
              setContextMenu({
                top: position.top,
                left: position.left,
              })
            }
          }}
        >
          <FolderTree
            folderTree={folderTree}
            notes={nodes}
            activeId={activeId}
            onSelectNote={onSelect}
            onCreateFolder={handleCreateFolder}
            onRenameFolder={renameFolder}
            onDeleteFolder={deleteFolder}
            onMoveNote={moveNoteToFolder}
            onMoveFolder={moveFolder}
            onReorderFolders={reorderFolders}
            expandedFolders={expandedFolders}
            onToggleFolder={toggleFolder}
            draggedItem={draggedItem}
            onDragStart={handleDragStart}
            onDrop={handleDrop}
            dragOverItem={dragOverItem}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onContextMenu={(id, clientX, clientY) => {
              const position = calculateMenuPosition(clientX, clientY)
              // Determine if this is a folder or note
              const isFolder = folderTree.some(folderNode => {
                const findInTree = (node: typeof folderNode): boolean => {
                  if (node.folder.id === id) return true
                  return node.children.some(findInTree)
                }
                return findInTree(folderNode)
              })
              const isNote = nodes.some(note => note.id === id)
              
              setContextMenu({
                id,
                type: isFolder ? 'folder' : (isNote ? 'note' : undefined),
                top: position.top,
                left: position.left,
              })
            }}
            renamingFolder={renaming}
            onSetRenamingFolder={setRenaming}
          />
        </div>

        {/* Uncategorized Notes */}
        {uncategorizedNotes.length > 0 && (
          <section 
            className="mt-4"
            onContextMenu={(e) => {
              if (e.target === e.currentTarget || (e.target as HTMLElement).closest('[data-note-item]') === null) {
                e.preventDefault()
                const position = calculateMenuPosition(e.clientX, e.clientY)
                setContextMenu({
                  top: position.top,
                  left: position.left,
                })
              }
            }}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <AlertCircle size={14} className="text-zinc-500" />
                <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Uncategorized
                </span>
              </div>
              <button
                onClick={() => handleCreateFolder()}
                className="p-1 hover:bg-zinc-700 rounded text-zinc-500 hover:text-amber-400"
                title="Create folder for these notes"
              >
                <Folder size={12} />
              </button>
            </div>
            <div className="ml-4 space-y-1">
              {[...uncategorizedNotes]
                .sort((a, b) => {
                  const titleA = (a.title || '').toLowerCase();
                  const titleB = (b.title || '').toLowerCase();
                  if (titleA < titleB) return -1;
                  if (titleA > titleB) return 1;
                  return 0;
                })
                .map(note => (
                  <div
                    key={note.id}
                    data-note-item
                    className={`flex items-center gap-2 py-1 px-2 rounded transition-colors cursor-pointer ${
                      note.id === activeId 
                        ? 'bg-amber-600 text-white font-medium' 
                        : 'hover:bg-zinc-800 hover:text-white text-zinc-400'
                    }`}
                    draggable
                    onDragStart={() => handleDragStart({ id: note.id, type: 'note' })}
                    onClick={() => onSelect(note)}
                    onContextMenu={e => {
                      e.preventDefault()
                      const position = calculateMenuPosition(e.clientX, e.clientY)
                      setContextMenu({
                        id: note.id,
                        type: 'note',
                        top: position.top,
                        left: position.left,
                      })
                    }}
                  >
                    {note.attributes?.generation_status === 'generating' && (
                      <div className="w-3 h-3 border border-zinc-400 border-t-amber-500 rounded-full animate-spin flex-shrink-0" />
                    )}
                    {note.attributes?.generation_status === 'error' && (
                      <AlertCircle className="w-3 h-3 text-red-500 flex-shrink-0" />
                    )}
                    <span className="truncate text-sm">{note.title}</span>
                  </div>
                ))}
            </div>
          </section>
        )}

      </div>
      


      {/* Unified Context Menu - rendered as portal at document root */}
      {contextMenu && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-[999999]"
          onClick={() => setContextMenu(null)}
          onMouseDown={e => e.stopPropagation()}
        >
          <div
            className="absolute"
            style={{
              top: `${contextMenu.top}px`,
              left: `${contextMenu.left}px`,
            }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex flex-col bg-zinc-800 border border-zinc-700 rounded-lg shadow-2xl py-1 min-w-[160px] backdrop-blur-sm"
                 style={{ filter: 'drop-shadow(0 25px 25px rgb(0 0 0 / 0.5))' }}>
            {/* Create Actions */}
            <button
              onClick={async () => {
                setContextMenu(null)
                await onCreate('Note', 'Untitled')
                // Refresh folders after a brief delay to update uncategorized notes
                setTimeout(refreshFolders, 150)
                onNoteCreated?.()
              }}
              className="flex items-center gap-2 px-3 py-2 text-sm text-blue-400 hover:bg-blue-900/30 hover:text-blue-300 transition-colors"
            >
              <FileText size={14} />
              Add Note
            </button>
            <button
              onClick={() => {
                setContextMenu(null)
                handleCreateFolder()
              }}
              className="flex items-center gap-2 px-3 py-2 text-sm text-amber-400 hover:bg-amber-900/30 hover:text-amber-300 transition-colors"
            >
              <FolderPlus size={14} />
              New Folder
            </button>
            
            {/* Item-specific actions - only show if we clicked on a specific item */}
            {contextMenu.id && (
              <>
                {/* Separator */}
                <div className="h-px bg-zinc-700 my-1 mx-2"></div>
                
                {/* Note-specific Actions */}
                {contextMenu.type === 'note' && (
                  <>
                    <button
                      onClick={() => {
                        const note = nodes.find(n => n.id === contextMenu.id)
                        if (note) {
                          // Create a duplicate with a new title
                          onCreate(note.type, `${note.title} (Copy)`)
                        }
                        setContextMenu(null)
                      }}
                      className="flex items-center gap-2 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-700 hover:text-white transition-colors"
                    >
                      <Copy size={14} />
                      Duplicate
                    </button>
                    
                    <button
                      onClick={() => triggerRename(contextMenu.id!)}
                      className="flex items-center gap-2 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-700 hover:text-white transition-colors"
                    >
                      <Pencil size={14} />
                      Rename
                    </button>
                    
                    {/* Separator */}
                    <div className="h-px bg-zinc-700 my-1 mx-2"></div>
                    
                    {/* Delete Note */}
                    <button
                      onClick={() => {
                        const note = nodes.find(n => n.id === contextMenu.id)
                        if (note) onDelete(note)
                        setContextMenu(null)
                      }}
                      className="flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-600 hover:text-white transition-colors"
                    >
                      <Trash size={14} />
                      Delete
                    </button>
                  </>
                )}
                
                {/* Folder-specific Actions */}
                {contextMenu.type === 'folder' && (
                  <>
                    <button
                      onClick={() => {
                        handleCreateFolder(contextMenu.id!)
                        setContextMenu(null)
                      }}
                      className="flex items-center gap-2 px-3 py-2 text-sm text-amber-400 hover:bg-amber-900/30 hover:text-amber-300 transition-colors"
                    >
                      <FolderPlus size={14} />
                      Add Subfolder
                    </button>
                    
                    <button
                      onClick={() => triggerRename(contextMenu.id!)}
                      className="flex items-center gap-2 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-700 hover:text-white transition-colors"
                    >
                      <Pencil size={14} />
                      Rename
                    </button>
                    
                    {/* Separator */}
                    <div className="h-px bg-zinc-700 my-1 mx-2"></div>
                    
                    {/* Delete Folder */}
                    <button
                      onClick={async () => {
                        try {
                          await deleteFolder(contextMenu.id!)
                          setContextMenu(null)
                        } catch (error) {
                          console.error('Error deleting folder:', error)
                        }
                      }}
                      className="flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-600 hover:text-white transition-colors"
                    >
                      <Trash size={14} />
                      Delete Folder
                    </button>
                  </>
                )}
              </>
            )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </aside>
  )
}