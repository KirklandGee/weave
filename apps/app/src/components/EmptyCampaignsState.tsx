'use client'

import React, { useState } from 'react'
import { Plus, Book, Users, Calendar } from 'lucide-react'
import { useCampaign } from '@/contexts/AppContext'

export default function EmptyCampaignsState() {
  const { createCampaign } = useCampaign()
  const [isCreating, setIsCreating] = useState(false)
  const [campaignTitle, setCampaignTitle] = useState('')

  const handleCreateCampaign = async () => {
    if (!campaignTitle.trim()) return
    
    setIsCreating(true)
    try {
      await createCampaign(campaignTitle.trim())
      setCampaignTitle('')
    } catch (error) {
      console.error('Failed to create campaign:', error)
    } finally {
      setIsCreating(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleCreateCampaign()
    }
  }

  return (
    <div className="h-screen bg-zinc-900 text-zinc-100 flex items-center justify-center">
      <div className="max-w-md w-full mx-4 text-center space-y-8">
        {/* Icon */}
        <div className="flex justify-center">
          <div className="w-20 h-20 bg-zinc-800 rounded-full flex items-center justify-center">
            <Book size={40} className="text-zinc-400" />
          </div>
        </div>

        {/* Title & Description */}
        <div className="space-y-4">
          <h1 className="text-2xl font-bold text-white">
            Welcome to AI RPG Manager
          </h1>
          <p className="text-zinc-400 leading-relaxed">
            Get started by creating your first campaign. Organize your world, characters, and adventures in one place.
          </p>
        </div>

        {/* Features Preview */}
        <div className="grid grid-cols-3 gap-4 py-4">
          <div className="text-center space-y-2">
            <div className="w-10 h-10 bg-blue-900/20 rounded-lg flex items-center justify-center mx-auto">
              <Book size={20} className="text-blue-400" />
            </div>
            <div className="text-xs text-zinc-400">World Building</div>
          </div>
          <div className="text-center space-y-2">
            <div className="w-10 h-10 bg-green-900/20 rounded-lg flex items-center justify-center mx-auto">
              <Users size={20} className="text-green-400" />
            </div>
            <div className="text-xs text-zinc-400">Characters</div>
          </div>
          <div className="text-center space-y-2">
            <div className="w-10 h-10 bg-purple-900/20 rounded-lg flex items-center justify-center mx-auto">
              <Calendar size={20} className="text-purple-400" />
            </div>
            <div className="text-xs text-zinc-400">Sessions</div>
          </div>
        </div>

        {/* Create Campaign Form */}
        <div className="space-y-4">
          <input
            type="text"
            placeholder="Enter your campaign name..."
            value={campaignTitle}
            onChange={(e) => setCampaignTitle(e.target.value)}
            onKeyDown={handleKeyPress}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white placeholder-zinc-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            autoFocus
          />
          
          <button
            onClick={handleCreateCampaign}
            disabled={!campaignTitle.trim() || isCreating}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-600 disabled:cursor-not-allowed px-4 py-3 rounded-lg text-white font-medium transition-colors"
          >
            <Plus size={20} />
            {isCreating ? 'Creating Campaign...' : 'Create Your First Campaign'}
          </button>
        </div>

        {/* Help Text */}
        <div className="text-xs text-zinc-500 space-y-1">
          <p>You can create multiple campaigns and switch between them anytime.</p>
          <p>Each campaign keeps your notes, characters, and world organized separately.</p>
        </div>
      </div>
    </div>
  )
}