'use client'

import React, { useState } from 'react'
import { CampaignCreationStep } from './CampaignCreationStep'
import { FolderStructureStep } from './FolderStructureStep'
import { useCampaign } from '@/contexts/AppContext'
import type { Campaign } from '@/contexts/AppContext'

type OnboardingStep = 'campaign' | 'folders' | 'complete'

export interface FolderTemplate {
  name: string
  folders: Array<{
    name: string
    noteTypes: string[]
    children?: Array<{
      name: string
      noteTypes: string[]
    }>
  }>
}

const FOLDER_TEMPLATES: FolderTemplate[] = [
  {
    name: 'By Note Type',
    folders: [
      { name: 'Characters', noteTypes: ['Character', 'NPC'] },
      { name: 'Locations', noteTypes: ['Location'] },
      { name: 'Sessions', noteTypes: ['Session'] },
      { name: 'World Building', noteTypes: ['Lore'] },
      { name: 'Quests & Events', noteTypes: ['Quest', 'Event'] },
      { name: 'Items & Rules', noteTypes: ['Item', 'Rule'] },
      { name: 'General Notes', noteTypes: ['Note'] },
    ],
  },
  {
    name: 'Story Structure',
    folders: [
      { name: 'Characters', noteTypes: ['Character', 'NPC'] },
      { name: 'Locations', noteTypes: ['Location'] },
      { 
        name: 'Story', 
        noteTypes: ['Session', 'Quest', 'Event'],
        children: [
          { name: 'Current Arc', noteTypes: ['Session', 'Quest', 'Event'] },
          { name: 'Future Plans', noteTypes: ['Quest', 'Event'] },
          { name: 'Past Events', noteTypes: ['Session', 'Event'] },
        ]
      },
      { name: 'World & Lore', noteTypes: ['Lore', 'Rule'] },
      { name: 'Items & Equipment', noteTypes: ['Item'] },
      { name: 'Miscellaneous', noteTypes: ['Note'] },
    ],
  },
  {
    name: 'Flat Structure',
    folders: [],
  },
]

export default function OnboardingWizard() {
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('campaign')
  const [createdCampaign, setCreatedCampaign] = useState<Campaign | null>(null)
  const [selectedTemplate, setSelectedTemplate] = useState<FolderTemplate>(FOLDER_TEMPLATES[0])
  const { createCampaign, switchCampaign } = useCampaign()

  const handleCampaignCreated = async (campaignTitle: string) => {
    try {
      // Create campaign without auto-switching so we can continue with onboarding
      const campaign = await createCampaign(campaignTitle, false)
      setCreatedCampaign(campaign)
      setCurrentStep('folders')
    } catch (error) {
      console.error('Failed to create campaign:', error)
      throw error
    }
  }

  const handleFolderSetupComplete = () => {
    // Switch to the newly created campaign now that onboarding is complete
    if (createdCampaign) {
      switchCampaign(createdCampaign)
    }
    setCurrentStep('complete')
    // The main app will load, completing the onboarding
  }

  const handleSkipFolderSetup = () => {
    // Switch to the newly created campaign even if they skip folder setup
    if (createdCampaign) {
      switchCampaign(createdCampaign)
    }
    setCurrentStep('complete')
  }

  // When step is 'complete', return null to let the main app take over
  if (currentStep === 'complete') {
    return null
  }

  return (
    <div className="h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-amber-950/20 text-zinc-100">
      {/* Progress Indicator */}
      <div className="absolute top-8 left-1/2 transform -translate-x-1/2 z-10">
        <div className="flex items-center space-x-6">
          <div className={`flex items-center space-x-3 transition-all duration-300 ${
            currentStep === 'campaign' ? 'text-amber-400' : 'text-zinc-400'
          }`}>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center border-2 font-bold transition-all duration-300 ${
              currentStep === 'campaign' 
                ? 'border-amber-400 bg-amber-400 text-zinc-900 shadow-lg shadow-amber-400/30' 
                : currentStep === 'folders' 
                ? 'border-amber-400 bg-zinc-900 text-amber-400'
                : 'border-zinc-600 bg-zinc-900 text-zinc-400'
            }`}>
              1
            </div>
            <span className="font-semibold">Campaign</span>
          </div>
          
          <div className={`w-16 h-1 rounded-full transition-all duration-300 ${
            currentStep === 'folders' ? 'bg-gradient-to-r from-amber-400 to-amber-500' : 'bg-zinc-600'
          }`} />
          
          <div className={`flex items-center space-x-3 transition-all duration-300 ${
            currentStep === 'folders' ? 'text-amber-400' : 'text-zinc-400'
          }`}>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center border-2 font-bold transition-all duration-300 ${
              currentStep === 'folders' 
                ? 'border-amber-400 bg-amber-400 text-zinc-900 shadow-lg shadow-amber-400/30' 
                : 'border-zinc-600 bg-zinc-900 text-zinc-400'
            }`}>
              2
            </div>
            <span className="font-semibold">Setup</span>
          </div>
        </div>
      </div>

      {/* Step Content */}
      <div className="h-full">
        {currentStep === 'campaign' && (
          <CampaignCreationStep 
            onCampaignCreated={handleCampaignCreated}
          />
        )}
        
        {currentStep === 'folders' && createdCampaign && (
          <FolderStructureStep
            campaign={createdCampaign}
            selectedTemplate={selectedTemplate}
            onTemplateChange={setSelectedTemplate}
            onComplete={handleFolderSetupComplete}
            onSkip={handleSkipFolderSetup}
            availableTemplates={FOLDER_TEMPLATES}
          />
        )}
      </div>
    </div>
  )
}