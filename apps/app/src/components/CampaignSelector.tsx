'use client'

import { useState } from 'react'
import { ChevronDown, Plus, Trash2 } from 'lucide-react'
import { useCampaign } from '@/contexts/AppContext'

interface CampaignSelectorProps {
  className?: string
}

export default function CampaignSelector({ className = '' }: CampaignSelectorProps) {
  const { currentCampaign, campaigns, isLoading, switchCampaign, createCampaign, deleteCampaign } = useCampaign()
  const [isOpen, setIsOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [newCampaignTitle, setNewCampaignTitle] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  const handleCreateCampaign = async () => {
    if (!newCampaignTitle.trim()) return
    
    setIsCreating(true)
    try {
      await createCampaign(newCampaignTitle.trim())
      setNewCampaignTitle('')
      setIsOpen(false)
    } catch (error) {
      console.error('Failed to create campaign:', error)
    } finally {
      setIsCreating(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleCreateCampaign()
    } else if (e.key === 'Escape') {
      setNewCampaignTitle('')
      setIsOpen(false)
    }
  }

  const handleDeleteCampaign = async (campaignId: string) => {
    try {
      await deleteCampaign(campaignId)
      setDeleteConfirm(null)
    } catch (error) {
      console.error('Failed to delete campaign:', error)
      // Could add toast notification here
    }
  }

  if (isLoading) {
    return (
      <div className={`flex items-center ${className}`}>
        <div className="text-sm text-zinc-400">Loading campaigns...</div>
      </div>
    )
  }

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          flex items-center w-auto min-w-[16rem] max-w-[28rem] 
          bg-zinc-800/50 border border-zinc-700 rounded-lg px-4 py-2 
          hover:border-zinc-600 hover:bg-zinc-800 transition-colors text-left min-h-[2.5rem] h-10
        `}
      >
        <span className="text-white text-sm font-medium flex-1 truncate">
          {currentCampaign?.title || 'No Campaign Selected'}
        </span>
        <ChevronDown size={16} className={`text-zinc-400 transition-transform ml-2 flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-[9990]"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown */}
          <div className="absolute top-full mt-1 left-0 w-full bg-zinc-800 border border-zinc-700 rounded-lg shadow-lg z-[9999] max-h-64 overflow-y-auto">
            {/* Existing Campaigns */}
            {campaigns.map((campaign) => (
              <div key={campaign.id} className="flex items-center group hover:bg-zinc-700/30 transition-colors">
                <button
                  onClick={() => {
                    switchCampaign(campaign)
                    setIsOpen(false)
                  }}
                  className={`flex-1 text-left px-3 py-2 text-sm transition-colors ${
                    currentCampaign?.id === campaign.id
                      ? 'bg-zinc-700 text-white'
                      : 'text-zinc-300'
                  }`}
                >
                  {campaign.title}
                </button>
                
                {/* Delete button - always show for all campaigns */}
                <div className="px-2 py-2">
                    {deleteConfirm === campaign.id ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleDeleteCampaign(campaign.id)}
                          className="px-2 py-1 text-red-400 hover:text-red-300 text-xs font-medium"
                          title="Confirm delete"
                        >
                          Yes
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(null)}
                          className="px-2 py-1 text-zinc-500 hover:text-zinc-400 text-xs font-medium"
                          title="Cancel"
                        >
                          No
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setDeleteConfirm(campaign.id)
                        }}
                        className="p-1 text-zinc-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all duration-200"
                        title="Delete campaign"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                </div>
              </div>
            ))}
            
            {campaigns.length > 0 && (
              <div className="border-t border-zinc-700" />
            )}
            
            {/* Create New Campaign */}
            <div className="p-3">
              <div className="flex flex-col gap-2">
                <input
                  type="text"
                  placeholder="New campaign name..."
                  value={newCampaignTitle}
                  onChange={(e) => setNewCampaignTitle(e.target.value)}
                  onKeyDown={handleKeyPress}
                  className="w-full bg-zinc-900 border border-zinc-600 rounded px-3 py-2 text-sm text-white placeholder-zinc-400 focus:outline-none focus:border-zinc-500"
                  autoFocus
                />
                <button
                  onClick={handleCreateCampaign}
                  disabled={!newCampaignTitle.trim() || isCreating}
                  className="flex items-center justify-center gap-2 bg-amber-600 hover:bg-amber-700 disabled:bg-zinc-600 disabled:cursor-not-allowed px-3 py-2 rounded text-sm text-white transition-colors w-full"
                >
                  <Plus size={14} />
                  {isCreating ? 'Creating...' : 'Create Campaign'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}