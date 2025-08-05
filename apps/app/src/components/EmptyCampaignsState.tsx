'use client'

import React, { useState } from 'react'
import { Plus } from 'lucide-react'
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
      <div className="max-w-md w-full mx-4 text-center space-y-6">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-white">
            Create your first campaign
          </h1>
          <p className="text-zinc-400">
            Get started by giving your campaign a name
          </p>
        </div>

        <div className="space-y-4">
          <input
            type="text"
            placeholder="Enter campaign name..."
            value={campaignTitle}
            onChange={(e) => setCampaignTitle(e.target.value)}
            onKeyDown={handleKeyPress}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white placeholder-zinc-400 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
            autoFocus
          />
          
          <button
            onClick={handleCreateCampaign}
            disabled={!campaignTitle.trim() || isCreating}
            className="w-full flex items-center justify-center gap-2 bg-amber-600 hover:bg-amber-700 disabled:bg-zinc-600 disabled:cursor-not-allowed px-4 py-3 rounded-lg text-white font-medium transition-colors"
          >
            <Plus size={20} />
            {isCreating ? 'Creating...' : 'Create Campaign'}
          </button>
        </div>
      </div>
    </div>
  )
}