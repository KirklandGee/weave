'use client'

import { useState } from 'react'
import { Note } from '@/types/node'

interface DocumentHeaderProps {
  node: Note
  htmlContent: string
  onTitleChange: (id: string, newTitle: string) => void
}

export default function DocumentHeader({ node, htmlContent, onTitleChange }: DocumentHeaderProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editingTitle, setEditingTitle] = useState(node.title)

  const handleTitleSave = () => {
    if (editingTitle.trim() && editingTitle !== node.title) {
      onTitleChange(node.id, editingTitle.trim())
    }
    setIsEditing(false)
  }

  const handleTitleCancel = () => {
    setEditingTitle(node.title)
    setIsEditing(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleTitleSave()
    } else if (e.key === 'Escape') {
      handleTitleCancel()
    }
  }

  return (
    <div className="bg-zinc-900/50 backdrop-blur-sm border-b border-zinc-800/50 px-6 py-3 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
        {isEditing ? (
          <input
            title='document title'
            type="text"
            value={editingTitle}
            onChange={(e) => setEditingTitle(e.target.value)}
            onBlur={handleTitleSave}
            onKeyDown={handleKeyDown}
            className="text-zinc-100 font-medium text-lg bg-transparent border-none outline-none focus:ring-0 min-w-0"
            autoFocus
          />
        ) : (
          <h1 
            className="text-zinc-100 font-medium text-lg truncate cursor-pointer hover:text-zinc-200 transition-colors"
            onClick={() => setIsEditing(true)}
          >
            {node.title}
          </h1>
        )}
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
  )
}