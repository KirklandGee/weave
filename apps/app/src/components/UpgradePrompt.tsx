'use client'

import React from 'react'
import { Zap, Crown, ArrowRight } from 'lucide-react'
import { useSubscription } from '@/lib/hooks/useSubscription'

interface UpgradePromptProps {
  feature: string
  description?: string
  ctaText?: string
}

export function UpgradePrompt({ 
  feature, 
  description = "AI features require a paid subscription to access advanced campaign management tools.",
  ctaText = "Upgrade Now"
}: UpgradePromptProps) {
  const { displayName } = useSubscription()
  
  return (
    <div className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-lg p-6 text-center">
      <div className="flex justify-center mb-4">
        <div className="p-3 bg-blue-500/20 rounded-full">
          <Crown className="w-8 h-8 text-blue-400" />
        </div>
      </div>
      
      <h3 className="text-xl font-semibold text-white mb-2">
        Unlock {feature}
      </h3>
      
      <p className="text-zinc-400 mb-4 max-w-sm mx-auto">
        {description}
      </p>
      
      <div className="bg-zinc-800/50 rounded-lg p-3 mb-4">
        <p className="text-sm text-zinc-300">
          Current Plan: <span className="font-medium text-zinc-100">{displayName}</span>
        </p>
      </div>
      
      <div className="space-y-3">
        <a
          href="/pricing"
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
        >
          <Zap className="w-4 h-4" />
          {ctaText}
          <ArrowRight className="w-4 h-4" />
        </a>
        
        <div className="text-xs text-zinc-500">
          Starting at $10/month • Cancel anytime
        </div>
      </div>
    </div>
  )
}

export function InlineUpgradePrompt({ feature }: { feature: string }) {
  return (
    <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Crown className="w-5 h-5 text-blue-400" />
        <div>
          <p className="text-sm font-medium text-white">Upgrade to access {feature}</p>
          <p className="text-xs text-zinc-400">AI features require a paid plan</p>
        </div>
      </div>
      
      <a
        href="/pricing"
        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm font-medium transition-colors"
      >
        Upgrade
      </a>
    </div>
  )
}