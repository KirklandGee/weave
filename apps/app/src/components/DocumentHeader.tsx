'use client'

import { useState, useEffect } from 'react'
import { Note } from '@/types/node'

const NODE_TYPES = [
  'Note',
  'Character', 
  'Location',
  'Quest',
  'Event',
  'Session',
  'NPC',
  'Item',
  'Lore',
  'Rule',
  'Campaign'
] as const

interface DocumentHeaderProps {
  node: Note
  htmlContent: string
  onTitleChange: (id: string, newTitle: string) => void
  onTypeChange?: (id: string, newType: string) => void
}

export default function DocumentHeader({ node, htmlContent, onTitleChange, onTypeChange }: DocumentHeaderProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editingTitle, setEditingTitle] = useState(node.title)
  const [showTypeDropdown, setShowTypeDropdown] = useState(false)

  // Fix: Update editingTitle when node changes
  useEffect(() => {
    setEditingTitle(node.title)
  }, [node.id, node.title])

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

  const handleTypeChange = (newType: string) => {
    if (onTypeChange && newType !== node.type) {
      onTypeChange(node.id, newType)
    }
    setShowTypeDropdown(false)
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
        <div className="relative">
          <button
            onClick={() => setShowTypeDropdown(!showTypeDropdown)}
            className="text-zinc-500 text-sm font-mono hover:text-zinc-300 transition-colors px-2 py-1 rounded hover:bg-zinc-800/50"
            disabled={!onTypeChange}
          >
            {node.type}
          </button>
          {showTypeDropdown && onTypeChange && (
            <div className="absolute top-full left-0 mt-1 bg-zinc-800 border border-zinc-700 rounded-lg shadow-lg z-10 min-w-[120px]">
              {NODE_TYPES.map((type) => (
                <button
                  key={type}
                  onClick={() => handleTypeChange(type)}
                  className={`block w-full text-left px-3 py-2 text-sm hover:bg-zinc-700 transition-colors ${
                    type === node.type ? 'text-emerald-400' : 'text-zinc-300'
                  } ${type === NODE_TYPES[0] ? 'rounded-t-lg' : ''} ${type === NODE_TYPES[NODE_TYPES.length - 1] ? 'rounded-b-lg' : ''}`}
                >
                  {type}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 text-zinc-500 text-sm">
        <span>Last updated {new Date(node.updatedAt).toLocaleDateString()}</span>
        <div className="w-1 h-1 bg-zinc-600 rounded-full"></div>
        <span>{htmlContent.split(' ').length} words</span>
      </div>
    </div>
  )
}