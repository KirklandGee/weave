'use client'

import React, { useState, useEffect } from 'react'
import { X } from 'lucide-react'

type AddNoteModalProps = {
  isOpen: boolean
  onClose: () => void
  onCreate: (type?: string, title?: string) => void
}

const NOTE_TYPES = [
  'Note',
  'Character',
  'Location',
  'Quest',
  'Event',
  'Session',
  'NPC',
  'Item',
  'Lore',
  'Rule'
]

export function AddNoteModal({ isOpen, onClose, onCreate }: AddNoteModalProps) {
  const [title, setTitle] = useState('')
  const [selectedType, setSelectedType] = useState('Note')

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setTitle('')
      setSelectedType('Note')
    }
  }, [isOpen])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const noteTitle = title.trim() || 'Untitled'
    onCreate(selectedType, noteTitle)
    onClose()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="flex items-center justify-between p-4 border-b border-zinc-200 dark:border-zinc-700">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            Add Note
          </h2>
          <button
            title="Close"
            onClick={onClose}
            className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Title Input */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Enter note title..."
              className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-md bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              autoFocus
            />
          </div>

          {/* Note Type Selector */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Type
            </label>
            <select
              title="Select Note Type"
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-md bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
            >
              {NOTE_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          {/* Preview */}
          <div className="p-3 bg-zinc-50 dark:bg-zinc-800 rounded-md">
            <div className="text-sm text-zinc-600 dark:text-zinc-400">
              Creating: <strong>{title || 'Untitled'}</strong> ({selectedType})
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 rounded-md border border-amber-500 hover:border-amber-400"
            >
              Create Note
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}