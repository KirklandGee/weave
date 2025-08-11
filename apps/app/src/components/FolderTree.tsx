'use client'

import React, { useState, useRef, useEffect } from 'react'
import { ChevronDown, ChevronRight, Folder, FolderOpen, Plus, AlertCircle } from 'lucide-react'
import type { Note } from '@/types/node'
import type { FolderTreeNode } from '@/lib/folders/types'

interface FolderTreeProps {
  folderTree: FolderTreeNode[]
  notes: Note[]
  activeId: string
  onSelectNote: (note: Note) => void
  onCreateFolder: (parentId?: string) => void
  onRenameFolder: (id: string, name: string) => void
  onDeleteFolder: (id: string) => void
  onMoveNote: (noteId: string, folderId: string | null) => void
  onMoveFolder?: (folderId: string, newParentId?: string) => void
  onReorderFolders?: (updates: { id: string; parentId?: string; position: number }[]) => void
  expandedFolders?: Set<string>
  onToggleFolder?: (folderId: string) => void
  draggedItem?: { id: string; type: 'note' | 'folder'; parentId?: string } | null
  onDragStart?: (item: { id: string; type: 'note' | 'folder'; parentId?: string }) => void
  onDrop?: (targetId: string, targetType: 'folder' | 'note') => void
  dragOverItem?: string | null
  onDragOver?: (id: string) => void
  onDragLeave?: () => void
  onContextMenu?: (id: string, clientX: number, clientY: number) => void
  renamingFolder?: string | null
  onSetRenamingFolder?: (folderId: string | null) => void
}


export function FolderTree({
  folderTree,
  notes,
  activeId,
  onSelectNote,
  onCreateFolder,
  onRenameFolder,
  // onReorderFolders,
  expandedFolders = new Set(),
  onToggleFolder,
  draggedItem,
  onDragStart,
  onDrop,
  dragOverItem,
  onDragOver,
  onDragLeave,
  onContextMenu,
  renamingFolder: externalRenamingFolder,
  onSetRenamingFolder,
}: FolderTreeProps) {
  const [internalRenamingFolder, setInternalRenamingFolder] = useState<string | null>(null)
  
  // Use external renaming state if provided, otherwise use internal state
  const renamingFolder = externalRenamingFolder !== undefined ? externalRenamingFolder : internalRenamingFolder
  const setRenamingFolder = onSetRenamingFolder || setInternalRenamingFolder
  const renameInput = useRef<HTMLInputElement | null>(null)

  const notesById = new Map(notes.map(note => [note.id, note]))

  // Focus rename input when it appears
  useEffect(() => {
    if (renamingFolder && renameInput.current) {
      renameInput.current.focus()
    }
  }, [renamingFolder])

  // Close rename on escape
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setRenamingFolder(null)
      }
    }
    if (renamingFolder) {
      window.addEventListener('keydown', handleEsc)
    }
    return () => {
      window.removeEventListener('keydown', handleEsc)
    }
  }, [renamingFolder, setRenamingFolder])

  const handleFolderRename = (folderId: string, newName: string) => {
    if (newName.trim() && newName.trim() !== folderTree.find(f => f.folder.id === folderId)?.folder.name) {
      onRenameFolder(folderId, newName.trim())
    }
    setRenamingFolder(null)
  }

  const renderFolderNode = (node: FolderTreeNode) => {
    const isExpanded = expandedFolders.has(node.folder.id)
    const isDraggedOver = dragOverItem === node.folder.id
    const isDragged = draggedItem?.id === node.folder.id && draggedItem?.type === 'folder'

    return (
      <div key={node.folder.id} className="select-none">
        {/* Folder Row */}
        <div
          data-folder-item
          className={`flex items-center gap-1 py-1 px-2 rounded transition-colors group cursor-pointer ${
            isDraggedOver ? 'border-2 border-amber-400 border-dashed bg-amber-900/20' : ''
          } ${isDragged ? 'opacity-50' : ''}`}
          style={{ marginLeft: `${node.depth * 16}px` }}
          draggable
          onDragStart={() => onDragStart?.({ id: node.folder.id, type: 'folder', parentId: node.folder.parentId })}
          onDragOver={(e) => {
            e.preventDefault()
            onDragOver?.(node.folder.id)
          }}
          onDragLeave={onDragLeave}
          onDrop={(e) => {
            e.preventDefault()
            onDrop?.(node.folder.id, 'folder')
          }}
          onContextMenu={(e) => {
            e.preventDefault()
            onContextMenu?.(node.folder.id, e.clientX, e.clientY)
          }}
        >
          {/* Expand/Collapse Button */}
          <button
            className="p-1 hover:bg-zinc-700 rounded text-zinc-400 hover:text-zinc-200"
            onClick={() => onToggleFolder?.(node.folder.id)}
          >
            {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          </button>

          {/* Folder Icon */}
          {isExpanded ? (
            <FolderOpen size={14} className="text-amber-400 flex-shrink-0" />
          ) : (
            <Folder size={14} className="text-amber-400 flex-shrink-0" />
          )}

          {/* Folder Name */}
          {renamingFolder === node.folder.id ? (
            <input
              ref={renameInput}
              defaultValue={node.folder.name}
              className="flex-1 bg-zinc-800 text-white px-1 py-0.5 text-sm rounded border border-zinc-600 focus:border-amber-500 outline-none"
              onBlur={(e) => handleFolderRename(node.folder.id, e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleFolderRename(node.folder.id, e.currentTarget.value)
                } else if (e.key === 'Escape') {
                  setRenamingFolder(null)
                }
              }}
            />
          ) : (
            <span className="flex-1 text-sm text-zinc-300 truncate">
              {node.folder.name}
            </span>
          )}

          {/* Add Subfolder Button */}
          <button
            className="opacity-0 group-hover:opacity-100 p-1 hover:bg-zinc-700 rounded text-zinc-400 hover:text-amber-400 transition-opacity"
            onClick={(e) => {
              e.stopPropagation()
              onCreateFolder(node.folder.id)
            }}
            title="Add subfolder"
          >
            <Plus size={12} />
          </button>
        </div>

        {/* Folder Contents */}
        {isExpanded && (
          <div className="ml-4">
            {/* Child Folders */}
            {node.children.map(child => renderFolderNode(child))}

            {/* Notes in Folder */}
            {node.notes.map(noteId => {
              const note = notesById.get(noteId)
              if (!note) return null

              const isActive = note.id === activeId
              const isNoteDragged = draggedItem?.id === note.id && draggedItem?.type === 'note'
              const isNoteOver = dragOverItem === note.id

              return (
                <div
                  key={note.id}
                  data-folder-item
                  className={`flex items-center gap-2 py-1 px-2 ml-4 rounded transition-colors cursor-pointer ${
                    isActive ? 'bg-amber-600 text-white font-medium' : 'hover:bg-zinc-800 hover:text-white text-zinc-300'
                  } ${isNoteOver ? 'border-2 border-amber-400 border-dashed' : ''} ${
                    isNoteDragged ? 'opacity-50' : ''
                  }`}
                  draggable
                  onDragStart={() => onDragStart?.({ id: note.id, type: 'note', parentId: node.folder.id })}
                  onDragOver={(e) => {
                    e.preventDefault()
                    onDragOver?.(note.id)
                  }}
                  onDragLeave={onDragLeave}
                  onDrop={(e) => {
                    e.preventDefault()
                    onDrop?.(note.id, 'note')
                  }}
                  onClick={() => onSelectNote(note)}
                  onContextMenu={(e) => {
                    e.preventDefault()
                    onContextMenu?.(note.id, e.clientX, e.clientY)
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
              )
            })}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-1">
      {folderTree.map(node => renderFolderNode(node))}
    </div>
  )
}