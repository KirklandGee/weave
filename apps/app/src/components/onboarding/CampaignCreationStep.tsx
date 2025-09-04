'use client'

import React, { useState } from 'react'
import { Plus, Sparkles } from 'lucide-react'

interface CampaignCreationStepProps {
  onCampaignCreated: (campaignTitle: string) => Promise<void>
}

export function CampaignCreationStep({ onCampaignCreated }: CampaignCreationStepProps) {
  const [campaignTitle, setCampaignTitle] = useState('')
  const [isCreating, setIsCreating] = useState(false)

  const handleCreateCampaign = async () => {
    if (!campaignTitle.trim()) return
    
    setIsCreating(true)
    try {
      await onCampaignCreated(campaignTitle.trim())
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
    <div className="h-full bg-gradient-to-br from-zinc-950 via-zinc-900 to-amber-950/20 flex items-center justify-center px-4">
      <div className="max-w-4xl w-full mx-auto text-center space-y-12">
        {/* Header */}
        <div className="space-y-6">
          <div className="flex items-center justify-center mb-8">
            <div className="w-20 h-20 bg-gradient-to-br from-amber-400 to-amber-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-amber-500/25">
              <Sparkles className="w-10 h-10 text-white" />
            </div>
          </div>
          
          <div className="space-y-4">
            <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-white via-amber-100 to-amber-200 bg-clip-text text-transparent">
              Welcome to AI RPG Manager
            </h1>
            
            <p className="text-xl md:text-2xl text-zinc-400 leading-relaxed max-w-3xl mx-auto">
              Let's create your first campaign! A campaign is your complete RPG world—
              characters, locations, sessions, and all the stories that connect them.
            </p>
          </div>
        </div>

        {/* Features Preview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="group bg-gradient-to-b from-zinc-800/80 to-zinc-900/80 backdrop-blur-sm rounded-2xl p-8 border border-zinc-700/50 hover:border-amber-500/50 transition-all duration-300 hover:shadow-2xl hover:shadow-amber-500/10">
            <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg shadow-blue-500/25">
              <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H4zm0 2h12v8H4V6z" clipRule="evenodd" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-white mb-3 group-hover:text-amber-200 transition-colors">Organize Everything</h3>
            <p className="text-zinc-400 leading-relaxed">
              Keep characters, locations, sessions, and lore organized in folders that make sense to you.
            </p>
          </div>
          
          <div className="group bg-gradient-to-b from-zinc-800/80 to-zinc-900/80 backdrop-blur-sm rounded-2xl p-8 border border-zinc-700/50 hover:border-amber-500/50 transition-all duration-300 hover:shadow-2xl hover:shadow-amber-500/10">
            <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg shadow-green-500/25">
              <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z" clipRule="evenodd" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-white mb-3 group-hover:text-amber-200 transition-colors">Connect Ideas</h3>
            <p className="text-zinc-400 leading-relaxed">
              Link characters to locations, sessions to events. Build a web of relationships that brings your world to life.
            </p>
          </div>
          
          <div className="group bg-gradient-to-b from-zinc-800/80 to-zinc-900/80 backdrop-blur-sm rounded-2xl p-8 border border-zinc-700/50 hover:border-amber-500/50 transition-all duration-300 hover:shadow-2xl hover:shadow-amber-500/10">
            <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-violet-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg shadow-purple-500/25">
              <Sparkles className="w-7 h-7 text-white" />
            </div>
            <h3 className="text-xl font-bold text-white mb-3 group-hover:text-amber-200 transition-colors">AI Assistance</h3>
            <p className="text-zinc-400 leading-relaxed">
              Get help with world-building, character development, and story ideas from our built-in AI assistant.
            </p>
          </div>
        </div>

        {/* Campaign Creation Form */}
        <div className="space-y-8">
          <div className="max-w-lg mx-auto space-y-6">
            <input
              type="text"
              placeholder="Enter your campaign name..."
              value={campaignTitle}
              onChange={(e) => setCampaignTitle(e.target.value)}
              onKeyDown={handleKeyPress}
              className="w-full bg-gradient-to-r from-zinc-900/50 to-zinc-800/50 backdrop-blur-sm border border-amber-500/30 rounded-2xl px-6 py-5 text-white placeholder-zinc-400 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/30 focus:shadow-lg focus:shadow-amber-400/10 text-xl transition-all duration-300"
              autoFocus
            />
            
            <button
              onClick={handleCreateCampaign}
              disabled={!campaignTitle.trim() || isCreating}
              className="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 disabled:from-zinc-600 disabled:to-zinc-700 disabled:cursor-not-allowed px-8 py-5 rounded-2xl text-white font-bold transition-all duration-300 text-xl shadow-2xl shadow-amber-500/25 hover:shadow-amber-400/30 hover:scale-[1.02] disabled:hover:scale-100 disabled:shadow-none"
            >
              <Plus size={28} />
              {isCreating ? 'Creating Campaign...' : 'Continue to Setup'}
            </button>
          </div>

          <p className="text-zinc-400 text-base max-w-xl mx-auto">
            Don't worry, you can change this later. Next, we'll help you organize your campaign structure.
          </p>
        </div>
      </div>
    </div>
  )
}