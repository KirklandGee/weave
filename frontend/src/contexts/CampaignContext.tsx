'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useAuthFetch } from '@/utils/authFetch.client'

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
  switchCampaign: (campaign: Campaign) => void
  refreshCampaigns: () => Promise<void>
  createCampaign: (title: string) => Promise<Campaign>
}

const CampaignContext = createContext<CampaignContextType | undefined>(undefined)

interface CampaignProviderProps {
  children: ReactNode
}

export function CampaignProvider({ children }: CampaignProviderProps) {
  const [currentCampaign, setCurrentCampaign] = useState<Campaign | null>(null)
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const authFetch = useAuthFetch()

  const fetchCampaigns = async (): Promise<Campaign[]> => {
    try {
      const response = await authFetch('/api/campaign/user', {
        headers: {
          'Content-Type': 'application/json',
        },
      })
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('Campaign fetch failed:', errorText)
        throw new Error('Failed to fetch campaigns')
      }
      
      const data = await response.json()
      
      const campaigns = (data || []).map((campaign: {
        id: string
        title: string
        slug?: string
        created_at?: string
        updated_at?: string
      }) => ({
        id: campaign.id,
        title: campaign.title,
        slug: campaign.slug || campaign.id,
        createdAt: campaign.created_at ? new Date(campaign.created_at).getTime() : Date.now(),
        updatedAt: campaign.updated_at ? new Date(campaign.updated_at).getTime() : Date.now(),
      }))
      
      return campaigns
    } catch (error) {
      console.error('Error fetching campaigns:', error)
      return []
    }
  }

  const refreshCampaigns = async () => {
    setIsLoading(true)
    try {
      const fetchedCampaigns = await fetchCampaigns()
      setCampaigns(fetchedCampaigns)
      
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
  }

  const createCampaign = async (title: string): Promise<Campaign> => {
    try {
      const response = await authFetch('/api/campaign', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title, markdown: '' }),
      })
      
      if (!response.ok) {
        throw new Error('Failed to create campaign')
      }
      
      const data = await response.json()
      const newCampaign: Campaign = {
        id: data.campaign.id,
        title: data.campaign.title,
        slug: data.campaign.id, // Use ID as slug for now
        createdAt: data.campaign.created_at || Date.now(),
        updatedAt: data.campaign.updated_at || Date.now(),
      }
      
      await refreshCampaigns()
      switchCampaign(newCampaign)
      
      return newCampaign
    } catch (error) {
      console.error('Error creating campaign:', error)
      throw error
    }
  }

  useEffect(() => {
    refreshCampaigns()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <CampaignContext.Provider
      value={{
        currentCampaign,
        campaigns,
        isLoading,
        switchCampaign,
        refreshCampaigns,
        createCampaign,
      }}
    >
      {children}
    </CampaignContext.Provider>
  )
}

export function useCampaign() {
  const context = useContext(CampaignContext)
  if (context === undefined) {
    throw new Error('useCampaign must be used within a CampaignProvider')
  }
  return context
}