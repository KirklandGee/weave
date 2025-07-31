'use client'

import { useState } from 'react'
import { Search, Command, Activity } from 'lucide-react'
import {   SignInButton,
  SignUpButton,
  SignedIn,
  SignedOut,
  UserButton,
} from '@clerk/nextjs'
import { CommandPalette, useCommandPalette } from './CommandPalette'
import CampaignSelector from './CampaignSelector'
import UsageModal from './UsageModal'
import { Note } from '@/types/node'

interface NavProps {
  onNewNote?: () => void
  onNavigateToNote?: (note: Note) => void
  onCreateNote?: (type?: string) => void
  onAction?: (action: string) => void
}

export default function Nav({ 
  onNavigateToNote,
  onCreateNote,
  onAction
}: NavProps) {
  const commandPalette = useCommandPalette()
  const [showUsageModal, setShowUsageModal] = useState(false)

  return (
    <>
      <nav className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-900 backdrop-blur-sm relative z-50">
        {/* Campaign Selector */}
        <div className="flex items-center">
          <div className="inline-flex min-w-0 w-auto">
            <CampaignSelector />
          </div>
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
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowUsageModal(true)}
                  className="flex items-center gap-2 px-3 py-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
                  title="View usage"
                >
                  <Activity className="w-4 h-4" />
                  <span className="text-sm">Usage</span>
                </button>
                <UserButton />
              </div>
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

      {/* Usage Modal */}
      <UsageModal
        isOpen={showUsageModal}
        onClose={() => setShowUsageModal(false)}
      />
    </>
  )
}