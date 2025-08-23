'use client'

import { useAuth } from '@clerk/nextjs'

export type SubscriptionTier = 'free_user' | 'player' | 'game_master'

export interface SubscriptionInfo {
  tier: SubscriptionTier
  hasAIAccess: boolean
  monthlyCredits: number
  displayName: string
}

/**
 * Hook to get user's subscription information based on Clerk plans
 * Plan IDs: free_user ($0), player ($10), game_master ($25)
 */
export function useSubscription(): SubscriptionInfo {
  const { has } = useAuth()
  
  // Check for paid plans
  const hasPlayer = has?.({ plan: 'player' }) ?? false
  const hasGameMaster = has?.({ plan: 'game_master' }) ?? false
  
  // Determine tier based on plan hierarchy
  const tier: SubscriptionTier = hasGameMaster 
    ? 'game_master' 
    : hasPlayer 
      ? 'player' 
      : 'free_user'
  
  // AI access for any paid plan
  const hasAIAccess = hasPlayer || hasGameMaster
  
  // Monthly AI credits based on tier
  const monthlyCredits = hasGameMaster ? 25 : hasPlayer ? 10 : 0
  
  // Display names for UI
  const displayName = {
    'game_master': 'Game Master',
    'player': 'Player', 
    'free_user': 'Storyteller'
  }[tier]
  
  return {
    tier,
    hasAIAccess,
    monthlyCredits,
    displayName
  }
}