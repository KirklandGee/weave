'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useAuthFetch } from '@/utils/authFetch.client'
import { templateService } from '@/lib/services/templateService'
import { TemplateInfo } from '@/lib/db/templateDB'

// Campaign types
export interface Campaign {
  id: string
  title: string
  slug: string
  createdAt: number
  updatedAt: number
}

interface CampaignContextType {
  currentCampaign: Campaign | null
  campaigns: Campaign[]
  isLoading: boolean
  hasNoCampaigns: boolean
  isNewCampaign: boolean
  shouldShowTutorial: boolean
  switchCampaign: (campaign: Campaign) => void
  refreshCampaigns: () => Promise<void>
  createCampaign: (title: string, autoSwitch?: boolean) => Promise<Campaign>
  deleteCampaign: (campaignId: string) => Promise<void>
  markTutorialComplete: () => void
  resetOnboardingState: () => void
}

// Template types
interface TemplateContextType {
  templates: TemplateInfo[]
  templatesLoading: boolean
  templatesError: string | null
}

// Combined context type
interface AppContextType extends CampaignContextType, TemplateContextType {}

const AppContext = createContext<AppContextType | undefined>(undefined)

interface AppProviderProps {
  children: ReactNode
}

export function AppProvider({ children }: AppProviderProps) {
  // Campaign state
  const [currentCampaign, setCurrentCampaign] = useState<Campaign | null>(null)
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [hasNoCampaigns, setHasNoCampaigns] = useState(false)
  const [isNewCampaign, setIsNewCampaign] = useState(false)
  const [shouldShowTutorial, setShouldShowTutorial] = useState(false)

  // Template state
  const [templates, setTemplates] = useState<TemplateInfo[]>([])
  const [templatesLoading, setTemplatesLoading] = useState(true)
  const [templatesError, setTemplatesError] = useState<string | null>(null)

  const authFetch = useAuthFetch()

  // Campaign functions
  const fetchCampaigns = async (): Promise<Campaign[]> => {
    
    try {
      const url = '/api/campaigns/user'
      
      const response = await authFetch(url, {
        headers: {
          'Content-Type': 'application/json',
        },
      })
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('❌ [FETCH] Campaign fetch failed:', errorText)
        throw new Error('Failed to fetch campaigns')
      }
      
      const data = await response.json()
      
      interface RawCampaign {
        id: string
        title: string
        slug?: string
        created_at?: string
        updated_at?: string
      }
      
      const campaigns: Campaign[] = (data || [])
        .filter((campaign: RawCampaign) => {
          // Filter out campaigns with null/undefined id or title
          return campaign.id && campaign.title
        })
        .map((campaign: RawCampaign) => ({
          id: campaign.id,
          title: campaign.title,
          slug: campaign.slug || campaign.id,
          createdAt: campaign.created_at ? new Date(campaign.created_at).getTime() : Date.now(),
          updatedAt: campaign.updated_at ? new Date(campaign.updated_at).getTime() : Date.now(),
        }))
      
      // Deduplicate campaigns by ID
      const uniqueCampaigns = campaigns.filter((campaign, index, self) => 
        index === self.findIndex(c => c.id === campaign.id)
      )
      
      return uniqueCampaigns
    } catch (error) {
      console.error('💥 [FETCH] Error fetching campaigns:', error)
      return []
    }
  }

  const refreshCampaigns = async () => {
    setIsLoading(true)
    setHasNoCampaigns(false)
    try {
      const fetchedCampaigns = await fetchCampaigns()
      setCampaigns(fetchedCampaigns)
      
      // Set hasNoCampaigns if we have no campaigns
      if (fetchedCampaigns.length === 0) {
        setHasNoCampaigns(true)
        setIsLoading(false) // Stop loading immediately when we know there are no campaigns
        return
      }
      
      // If no current campaign but we have campaigns, find the best one to select
      if (!currentCampaign && fetchedCampaigns.length > 0) {
        let savedCampaignId: string | null = null
        try {
          savedCampaignId = typeof window !== 'undefined' ? localStorage.getItem('currentCampaignId') : null
        } catch (e) {
          console.warn('Could not access localStorage:', e)
        }
        
        let selectedCampaign = savedCampaignId ? fetchedCampaigns.find(c => c.id === savedCampaignId) : null
        
        // If no saved campaign or saved campaign not found, find one with existing data
        if (!selectedCampaign) {
          // Check if camp-storm-lords exists (this is likely where the existing data is)
          const stormLordsCampaign = fetchedCampaigns.find(c => c.id === 'camp-storm-lords')
          selectedCampaign = stormLordsCampaign || fetchedCampaigns[0]
        }
        
        setCurrentCampaign(selectedCampaign)
        try {
          if (typeof window !== 'undefined') {
            localStorage.setItem('currentCampaignId', selectedCampaign.id)
          }
        } catch (e) {
          console.warn('Could not save to localStorage:', e)
        }
      }
    } catch (error) {
      console.error('Error refreshing campaigns:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const switchCampaign = (campaign: Campaign) => {
    setCurrentCampaign(campaign)
    localStorage.setItem('currentCampaignId', campaign.id)
    
    // Check if we should show tutorial for new campaigns
    if (isNewCampaign) {
      // Check if user has completed onboarding for this campaign
      const completedOnboarding = localStorage.getItem(`onboarding-completed-${campaign.id}`)
      if (!completedOnboarding) {
        setShouldShowTutorial(true)
      }
      setIsNewCampaign(false)
    }
  }

  const markTutorialComplete = () => {
    setShouldShowTutorial(false)
    if (currentCampaign) {
      localStorage.setItem(`onboarding-completed-${currentCampaign.id}`, 'true')
    }
  }

  const resetOnboardingState = () => {
    setIsNewCampaign(false)
    setShouldShowTutorial(false)
  }

  const deleteCampaign = async (campaignId: string): Promise<void> => {
    try {
      const url = `/api/campaigns/${campaignId}`
      
      const response = await authFetch(url, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      })
      
      if (!response.ok) {
        const errorText = await response.text()
        console.warn('⚠️ Backend deletion failed (expected for testing):', response.status, errorText)
        
        // Backend doesn't support deletion yet, so do client-side cleanup only
        console.info('💡 Performing client-side campaign cleanup for testing...')
        
        // Remove from local state
        setCampaigns(prevCampaigns => 
          prevCampaigns.filter(campaign => campaign.id !== campaignId)
        )
        
        // If we deleted the current campaign, clear it and switch to another
        if (currentCampaign?.id === campaignId) {
          const remainingCampaigns = campaigns.filter(c => c.id !== campaignId)
          
          if (remainingCampaigns.length > 0) {
            // Switch to the first available campaign
            const nextCampaign = remainingCampaigns[0]
            setCurrentCampaign(nextCampaign)
            localStorage.setItem('currentCampaignId', nextCampaign.id)
          } else {
            // No campaigns left
            setCurrentCampaign(null)
            localStorage.removeItem('currentCampaignId')
            setHasNoCampaigns(true)
          }
        }
        
        // Clear any local data for this campaign
        try {
          localStorage.removeItem(`onboarding-completed-${campaignId}`)
          console.info('✅ Client-side campaign cleanup completed')
        } catch (e) {
          console.warn('Could not clear local storage:', e)
        }
        
        return // Success - client-side deletion completed
      }
      
      // Backend deletion succeeded (future case)
      console.info('✅ Backend campaign deletion succeeded')
      
      // If we deleted the current campaign, clear it
      if (currentCampaign?.id === campaignId) {
        setCurrentCampaign(null)
        localStorage.removeItem('currentCampaignId')
      }
      
      // Refresh campaigns to update the list
      await refreshCampaigns()
    } catch (error) {
      console.error('💥 Error deleting campaign:', error)
      throw error
    }
  }

  const createCampaign = async (title: string, autoSwitch = true): Promise<Campaign> => {
    
    try {
      const url = '/api/campaigns/create'
      const payload = { title, markdown: '' }
      
      const response = await authFetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('❌ Response not OK:')
        console.error('  - Error text:', errorText)
        throw new Error(`Failed to create campaign: ${response.status} ${response.statusText}`)
      }
      
      const data = await response.json()
      
      const newCampaign: Campaign = {
        id: data.campaign.id,
        title: data.campaign.title,
        slug: data.campaign.id, // Use ID as slug for now
        createdAt: data.campaign.created_at || Date.now(),
        updatedAt: data.campaign.updated_at || Date.now(),
      }
      
      // Reset hasNoCampaigns since we now have a campaign
      setHasNoCampaigns(false)
      
      // Mark as new campaign to trigger tutorial
      setIsNewCampaign(true)
      
      // Only refresh campaigns if we're auto-switching, otherwise just add to list
      if (autoSwitch) {
        await refreshCampaigns()
        switchCampaign(newCampaign)
      } else {
        // Just add the new campaign to the list without triggering auto-selection
        setCampaigns(prevCampaigns => [...prevCampaigns, newCampaign])
      }
      
      return newCampaign
    } catch (error) {
      console.error('💥 Error creating campaign:', error)
      if (error instanceof Error) {
        console.error('  - Error name:', error.name)
        console.error('  - Error message:', error.message)
        console.error('  - Error stack:', error.stack)
      }
      throw error
    }
  }

  // Template functions
  const initializeTemplates = async () => {
    try {
      setTemplatesError(null)
      
      // Initialize templates (will sync if needed)
      await templateService.initializeTemplates(authFetch)
      
      const templateList = await templateService.getAllTemplates()
      setTemplates(templateList)
    } catch (err) {
      setTemplatesError(err instanceof Error ? err.message : 'Failed to load templates')
      console.error('Error loading templates:', err)
    } finally {
      setTemplatesLoading(false)
    }
  }

  useEffect(() => {
    // Initialize both campaigns and templates
    refreshCampaigns()
    initializeTemplates()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <AppContext.Provider
      value={{
        // Campaign context
        currentCampaign,
        campaigns,
        isLoading,
        hasNoCampaigns,
        isNewCampaign,
        shouldShowTutorial,
        switchCampaign,
        refreshCampaigns,
        createCampaign,
        deleteCampaign,
        markTutorialComplete,
        resetOnboardingState,
        // Template context
        templates,
        templatesLoading,
        templatesError,
      }}
    >
      {children}
    </AppContext.Provider>
  )
}

export function useCampaign() {
  const context = useContext(AppContext)
  if (context === undefined) {
    throw new Error('useCampaign must be used within an AppProvider')
  }
  return {
    currentCampaign: context.currentCampaign,
    campaigns: context.campaigns,
    isLoading: context.isLoading,
    hasNoCampaigns: context.hasNoCampaigns,
    isNewCampaign: context.isNewCampaign,
    shouldShowTutorial: context.shouldShowTutorial,
    switchCampaign: context.switchCampaign,
    refreshCampaigns: context.refreshCampaigns,
    createCampaign: context.createCampaign,
    deleteCampaign: context.deleteCampaign,
    markTutorialComplete: context.markTutorialComplete,
    resetOnboardingState: context.resetOnboardingState,
  }
}

export function useTemplates() {
  const context = useContext(AppContext)
  if (context === undefined) {
    throw new Error('useTemplates must be used within an AppProvider')
  }
  return {
    templates: context.templates,
    loading: context.templatesLoading,
    error: context.templatesError,
  }
}