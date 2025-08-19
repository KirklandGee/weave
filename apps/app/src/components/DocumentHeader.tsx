'use client'

import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
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
  onTitleChange: (id: string, newTitle: string) => void
  onTypeChange?: (id: string, newType: string) => void
  startEditing?: boolean
  onStartEditingHandled?: () => void
}

export default function DocumentHeader({ node, onTitleChange, onTypeChange, startEditing, onStartEditingHandled }: DocumentHeaderProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editingTitle, setEditingTitle] = useState(node.title)
  const [showTypeDropdown, setShowTypeDropdown] = useState(false)
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 })
  const dropdownRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const titleInputRef = useRef<HTMLInputElement>(null)

  // Fix: Update editingTitle when node changes
  useEffect(() => {
    setEditingTitle(node.title)
  }, [node.id, node.title])

  // Handle external editing trigger
  useEffect(() => {
    if (startEditing) {
      setIsEditing(true)
      onStartEditingHandled?.()
    }
  }, [startEditing, onStartEditingHandled])

  // Focus the input when editing starts
  useEffect(() => {
    if (isEditing && titleInputRef.current) {
      titleInputRef.current.focus()
      titleInputRef.current.select() // Select all text for easy replacement
    }
  }, [isEditing])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element
      // Check if click is outside the button and not on a dropdown item
      if (
        buttonRef.current && 
        !buttonRef.current.contains(target) &&
        !target.closest('[data-dropdown-content]')
      ) {
        setShowTypeDropdown(false)
      }
    }

    if (showTypeDropdown) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showTypeDropdown])

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

  const handleDropdownToggle = () => {
    if (!showTypeDropdown && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      setDropdownPosition({
        top: rect.bottom + 4,
        left: rect.left
      })
    }
    setShowTypeDropdown(!showTypeDropdown)
  }

  return (
    <div className="bg-zinc-900/50 backdrop-blur-sm border-b border-zinc-800/50 px-6 py-3 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
        {isEditing ? (
          <input
            ref={titleInputRef}
            title='document title'
            type="text"
            value={editingTitle}
            onChange={(e) => setEditingTitle(e.target.value)}
            onBlur={handleTitleSave}
            onKeyDown={handleKeyDown}
            className="text-zinc-100 font-medium text-lg bg-transparent border-none outline-none focus:ring-0 min-w-0"
          />
        ) : (
          <h1 
            className="text-zinc-100 font-medium text-lg truncate cursor-pointer hover:text-zinc-200 transition-colors"
            onClick={() => setIsEditing(true)}
          >
            {node.title}
          </h1>
        )}
        <div className="relative" ref={dropdownRef}>
          <button
            ref={buttonRef}
            onClick={handleDropdownToggle}
            className="text-zinc-500 text-sm font-mono hover:text-zinc-300 transition-colors px-2 py-1 rounded hover:bg-zinc-800/50"
            disabled={!onTypeChange}
          >
            {node.type}
          </button>
          {showTypeDropdown && onTypeChange && typeof window !== 'undefined' && 
            createPortal(
              <div 
                data-dropdown-content
                className="fixed bg-zinc-800 border border-zinc-600 rounded-lg shadow-2xl min-w-[120px] max-h-64 overflow-y-auto" 
                style={{ 
                  zIndex: 99999,
                  left: dropdownPosition.left + 'px',
                  top: dropdownPosition.top + 'px'
                }}
              >
                {NODE_TYPES.map((type) => (
                  <button
                    key={type}
                    onClick={() => handleTypeChange(type)}
                    className={`block w-full text-left px-3 py-2 text-sm hover:bg-zinc-700 transition-colors cursor-pointer ${
                      type === node.type ? 'text-zinc-100 bg-zinc-600' : 'text-zinc-300'
                    } ${type === NODE_TYPES[0] ? 'rounded-t-lg' : ''} ${type === NODE_TYPES[NODE_TYPES.length - 1] ? 'rounded-b-lg' : ''}`}
                  >
                    {type}
                  </button>
                ))}
              </div>,
              document.body
            )
          }
        </div>
      </div>
      <div className="flex items-center gap-2 text-zinc-500 text-sm">
        <span>Last updated {new Date(node.updatedAt).toLocaleDateString()}</span>
        <div className="w-1 h-1 bg-zinc-600 rounded-full"></div>
        <span>{node.markdown ? node.markdown.split(' ').filter(word => word.trim().length > 0).length : 0} words</span>
      </div>
    </div>
  )
}
