'use client'

import { useState } from 'react'
import { Plus, Search, X } from 'lucide-react'

interface NavProps {
  campaignName: string
  onNewNote?: () => void
  onSearch?: (query: string) => void
}

export default function Nav({ campaignName, onNewNote, onSearch }: NavProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearchFocused, setIsSearchFocused] = useState(false)

  const handleSearch = (query: string) => {
    setSearchQuery(query)
    onSearch?.(query)
  }

  const clearSearch = () => {
    setSearchQuery('')
    onSearch?.('')
  }

  return (
    <nav className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-900 backdrop-blur-sm">
      {/* Campaign Name */}
      <div className="flex items-center">
        <h1 className="text-xl font-semibold text-white truncate max-w-xs">
          {campaignName}
        </h1>
      </div>

      {/* Search and Actions */}
      <div className="flex items-center gap-4">
        {/* Search Bar */}
        <div className="relative">
          <div className={`flex items-center bg-zinc-800/50 border border-zinc-700 rounded-lg px-3 py-2 transition-colors ${
            isSearchFocused ? 'border-zinc-600 bg-zinc-800' : ''
          }`}>
            <Search size={16} className="text-zinc-400 mr-2" />
            <input
              type="text"
              placeholder="Search notes..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setIsSearchFocused(false)}
              className="bg-transparent text-white placeholder-zinc-400 text-sm focus:outline-none min-w-[200px]"
            />
            {searchQuery && (
              <button
                onClick={clearSearch}
                className="ml-2 p-1 hover:bg-zinc-700 rounded transition-colors"
                aria-label="Clear search"
              >
                <X size={14} className="text-zinc-400 hover:text-zinc-200" />
              </button>
            )}
          </div>
        </div>

        {/* New Note Button */}
        <button
          onClick={onNewNote}
          className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <Plus size={16} />
          New Note
        </button>
      </div>
    </nav>
  )
}
