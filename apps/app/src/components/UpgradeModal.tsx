'use client'

import { X, Crown, Zap, ArrowRight } from 'lucide-react'
import { useSubscription } from '@/lib/hooks/useSubscription'

interface UpgradeModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function UpgradeModal({ isOpen, onClose }: UpgradeModalProps) {
  const { displayName } = useSubscription()

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg max-w-md w-full overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <Crown className="w-5 h-5 text-blue-400" />
            <h2 className="text-xl font-semibold text-white">Upgrade Your Plan</h2>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-blue-500/20 rounded-full">
                <Crown className="w-8 h-8 text-blue-400" />
              </div>
            </div>
            
            <h3 className="text-xl font-semibold text-white mb-2">
              Unlock Premium Features
            </h3>
            
            <p className="text-zinc-400 mb-4">
              Get unlimited AI-powered campaign management tools and advanced features.
            </p>
            
            <div className="bg-zinc-800/50 rounded-lg p-3 mb-6">
              <p className="text-sm text-zinc-300">
                Current Plan: <span className="font-medium text-zinc-100">{displayName}</span>
              </p>
            </div>
            
            <div className="space-y-4">
              <a
                href="/pricing"
                className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors w-full justify-center"
              >
                <Zap className="w-4 h-4" />
                Upgrade Now
                <ArrowRight className="w-4 h-4" />
              </a>
              
              <div className="text-xs text-zinc-500">
                Starting at $10/month • Cancel anytime
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}