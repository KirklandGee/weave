'use client'

import React from 'react'
import { Protect } from '@clerk/nextjs'
import { UpgradePrompt, InlineUpgradePrompt } from './UpgradePrompt'

interface AIFeatureProtectionProps {
  children: React.ReactNode
  feature?: string
  fallbackType?: 'inline' | 'full' | 'none'
  fallback?: React.ReactNode
}

/**
 * Wrapper component that protects AI features with Clerk's subscription plans.
 * Automatically handles fallbacks for free users.
 */
export function AIFeatureProtection({ 
  children, 
  feature = "AI Features",
  fallbackType = 'inline',
  fallback
}: AIFeatureProtectionProps) {
  // Custom fallback takes precedence
  if (fallback) {
    return (
      <Protect plan="player" fallback={fallback}>
        {children}
      </Protect>
    )
  }

  // No fallback - completely hide for free users
  if (fallbackType === 'none') {
    return (
      <Protect plan="player" fallback={null}>
        {children}
      </Protect>
    )
  }

  // Full upgrade prompt
  if (fallbackType === 'full') {
    return (
      <Protect 
        plan="player" 
        fallback={<UpgradePrompt feature={feature} />}
      >
        {children}
      </Protect>
    )
  }

  // Default: Inline upgrade prompt
  return (
    <Protect 
      plan="player" 
      fallback={<InlineUpgradePrompt feature={feature} />}
    >
      {children}
    </Protect>
  )
}

/**
 * Specific wrapper for Game Master tier features
 */
export function GameMasterFeatureProtection({ 
  children, 
  feature = "Game Master Features",
  fallbackType = 'inline',
  fallback
}: AIFeatureProtectionProps) {
  // Custom fallback takes precedence
  if (fallback) {
    return (
      <Protect plan="game_master" fallback={fallback}>
        {children}
      </Protect>
    )
  }

  // No fallback - completely hide for non-game-master users
  if (fallbackType === 'none') {
    return (
      <Protect plan="game_master" fallback={null}>
        {children}
      </Protect>
    )
  }

  // Full upgrade prompt
  if (fallbackType === 'full') {
    return (
      <Protect 
        plan="game_master" 
        fallback={<UpgradePrompt feature={feature} />}
      >
        {children}
      </Protect>
    )
  }

  // Default: Inline upgrade prompt with Game Master messaging
  return (
    <Protect 
      plan="game_master" 
      fallback={
        <InlineUpgradePrompt 
          feature={`${feature} (Game Master Plan Required)`} 
        />
      }
    >
      {children}
    </Protect>
  )
}