'use client'

import { Search, Command } from 'lucide-react'
import {   SignInButton,
  SignUpButton,
  SignedIn,
  SignedOut,
  UserButton,
} from '@clerk/nextjs'
import { CommandPalette, useCommandPalette } from './CommandPalette'
import { Note } from '@/types/node'

interface NavProps {
  campaignName: string
  onNewNote?: () => void
  onNavigateToNote?: (note: Note) => void
  onCreateNote?: (type?: string) => void
  onAction?: (action: string) => void
}

export default function Nav({ 
  campaignName, 
  onNavigateToNote,
  onCreateNote,
  onAction
}: NavProps) {
  const commandPalette = useCommandPalette()

  return (
    <>
      <nav className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-900 backdrop-blur-sm">
        {/* Campaign Name */}
        <div className="flex items-center">
          <h1 className="text-xl font-semibold text-white truncate max-w-xs">
            {campaignName}
          </h1>
        </div>

        {/* Search and Actions */}
        <div className="flex items-center gap-4">
          {/* Command Palette Trigger */}
          <button
            onClick={commandPalette.open}
            className="flex items-center bg-zinc-800/50 border border-zinc-700 rounded-lg px-3 py-2 hover:border-zinc-600 hover:bg-zinc-800 transition-colors group"
          >
            <Search size={16} className="text-zinc-400 mr-2" />
            <span className="text-zinc-400 text-sm min-w-[120px] text-left">
              Search notes...
            </span>
            <div className="flex items-center gap-1 ml-3 text-xs text-zinc-500">
              <Command size={12} />
              <span>K</span>
            </div>
          </button>

          {/* User Menu */}
          <div className="flex justify-end items-center gap-4">
            <SignedOut>
              <SignInButton />
              <SignUpButton>
                <button className="bg-[#6c47ff] text-white rounded-full font-medium text-sm h-10 px-4 cursor-pointer">
                  Sign Up
                </button>
              </SignUpButton>
            </SignedOut>
            <SignedIn>
              <UserButton />
            </SignedIn>
          </div>
        </div>
      </nav>

      {/* Command Palette */}
      <CommandPalette
        isOpen={commandPalette.isOpen}
        onClose={commandPalette.close}
        onNavigateToNote={onNavigateToNote}
        onCreateNote={onCreateNote}
        onAction={onAction}
      />
    </>
  )
}