'use client'

import React, { useState } from 'react'
import { ChevronRight, Settings, Folder, FolderPlus, Trash2, Edit3, GripVertical, Check, X, ArrowLeft } from 'lucide-react'
import { OnboardingPreview } from './OnboardingPreview'
import type { Campaign } from '@/contexts/AppContext'
import type { FolderTemplate } from './OnboardingWizard'
import { FolderService } from '@/lib/folders/folderService'
import { USER_ID } from '@/lib/constants'

interface FolderStructureStepProps {
  campaign: Campaign
  selectedTemplate: FolderTemplate
  availableTemplates: FolderTemplate[]
  onTemplateChange: (template: FolderTemplate) => void
  onComplete: () => void
  onSkip: () => void
}

interface EditableFolderConfig {
  id: string
  name: string
  noteTypes: string[]
  children?: EditableFolderConfig[]
  isEditing?: boolean
}

const ALL_NOTE_TYPES = [
  'Character', 'NPC', 'Location', 'Session', 'Quest', 'Event', 'Item', 'Rule', 'Lore', 'Note'
]

export function FolderStructureStep({ 
  campaign, 
  selectedTemplate, 
  availableTemplates,
  onTemplateChange, 
  onComplete, 
  onSkip 
}: FolderStructureStepProps) {
  const [isCustomizing, setIsCustomizing] = useState(false)
  const [customFolders, setCustomFolders] = useState<EditableFolderConfig[]>(
    selectedTemplate.folders.map((folder, index) => ({
      id: `folder-${index}`,
      name: folder.name,
      noteTypes: [...folder.noteTypes],
      children: folder.children?.map((child, childIndex) => ({
        id: `folder-${index}-${childIndex}`,
        name: child.name,
        noteTypes: [...child.noteTypes]
      }))
    }))
  )
  const [isCreating, setIsCreating] = useState(false)

  const handleTemplateSelect = (template: FolderTemplate) => {
    onTemplateChange(template)
    setCustomFolders(
      template.folders.map((folder, index) => ({
        id: `folder-${index}`,
        name: folder.name,
        noteTypes: [...folder.noteTypes],
        children: folder.children?.map((child, childIndex) => ({
          id: `folder-${index}-${childIndex}`,
          name: child.name,
          noteTypes: [...child.noteTypes]
        }))
      }))
    )
    setIsCustomizing(false)
  }

  const handleCreateFolders = async () => {
    setIsCreating(true)
    try {
      const folderService = new FolderService(campaign.slug, campaign.id, USER_ID)
      
      // Create folders in order
      for (const folder of customFolders) {
        // Create parent folder
        const parentFolder = await folderService.createFolder(folder.name)
        
        // Create child folders if any
        if (folder.children) {
          for (const child of folder.children) {
            await folderService.createFolder(child.name, parentFolder.id)
          }
        }
      }
      
      onComplete()
    } catch (error) {
      console.error('Failed to create folders:', error)
    } finally {
      setIsCreating(false)
    }
  }

  const addFolder = () => {
    const newFolder: EditableFolderConfig = {
      id: `folder-${Date.now()}`,
      name: 'New Folder',
      noteTypes: ['Note'],
      isEditing: true
    }
    setCustomFolders([...customFolders, newFolder])
  }

  const updateFolder = (id: string, updates: Partial<EditableFolderConfig>) => {
    setCustomFolders(folders => 
      folders.map(folder => 
        folder.id === id ? { ...folder, ...updates } : folder
      )
    )
  }

  const removeFolder = (id: string) => {
    setCustomFolders(folders => folders.filter(folder => folder.id !== id))
  }

  // Create preview template from custom folders
  const previewTemplate: FolderTemplate = {
    name: 'Custom',
    folders: customFolders.map(folder => ({
      name: folder.name,
      noteTypes: folder.noteTypes,
      children: folder.children?.map(child => ({
        name: child.name,
        noteTypes: child.noteTypes
      }))
    }))
  }

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-zinc-950 via-zinc-900 to-amber-950/20">
      {/* Header */}
      <div className="bg-gradient-to-r from-zinc-900/80 to-zinc-800/80 backdrop-blur-sm border-b border-amber-500/20 px-6 py-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold bg-gradient-to-r from-white to-amber-200 bg-clip-text text-transparent">
                Organize Your Campaign
              </h2>
              <p className="text-zinc-400 mt-2 text-lg">
                Choose how to structure your notes and content. You can always change this later.
              </p>
            </div>
            
            <div className="flex items-center space-x-4">
              <button
                onClick={onSkip}
                className="px-6 py-3 text-zinc-400 hover:text-zinc-200 transition-colors font-medium"
              >
                Skip for now
              </button>
              <button
                onClick={isCustomizing ? handleCreateFolders : handleCreateFolders}
                disabled={isCreating}
                className="flex items-center gap-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 disabled:from-zinc-600 disabled:to-zinc-700 px-8 py-3 rounded-xl text-white font-bold transition-all duration-300 shadow-lg shadow-amber-500/25 hover:shadow-amber-400/30 hover:scale-[1.02] disabled:hover:scale-100"
              >
                <Check size={20} />
                {isCreating ? 'Creating...' : 'Create Campaign Structure'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full flex">
          {/* Left Content */}
          <div className="flex-1 flex items-center justify-center px-12 py-16 overflow-y-auto">
            <div className="max-w-3xl w-full">
              
              {!isCustomizing ? (
                /* Template Selection */
                <div className="space-y-12">
                  <div className="text-center space-y-6">
                    <h3 className="text-4xl font-bold bg-gradient-to-r from-white via-amber-200 to-amber-300 bg-clip-text text-transparent">
                      Choose Your Organization Style
                    </h3>
                    <p className="text-zinc-400 text-xl max-w-2xl mx-auto leading-relaxed">
                      Pick a folder structure that matches how you think about your campaign. You can always reorganize later.
                    </p>
                  </div>

                  <div className="space-y-6">
                    {availableTemplates.map((template, index) => (
                      <div
                        key={index}
                        onClick={() => handleTemplateSelect(template)}
                        className={`group relative p-8 rounded-2xl border cursor-pointer transition-all duration-500 hover:scale-[1.02] transform-gpu ${
                          selectedTemplate.name === template.name
                            ? 'border-amber-500/70 bg-gradient-to-br from-amber-500/15 to-amber-600/10 shadow-2xl shadow-amber-500/25 ring-2 ring-amber-500/30'
                            : 'border-zinc-700/50 bg-gradient-to-br from-zinc-800/40 to-zinc-900/60 hover:border-amber-500/60 hover:shadow-2xl hover:shadow-amber-500/15 hover:from-zinc-800/60 hover:to-zinc-900/40'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-6">
                          <div className="space-y-2">
                            <h4 className="text-2xl font-bold text-white group-hover:text-amber-200 transition-colors duration-300">
                              {template.name}
                            </h4>
                            <p className="text-zinc-400 text-lg leading-relaxed max-w-lg">
                              {template.name === 'By Note Type' && 'Organize content by what type of thing it is - characters, locations, sessions, etc. Perfect for detail-oriented world builders.'}
                              {template.name === 'Story Structure' && 'Focus on narrative flow with story arcs, character development, and world-building. Great for story-driven campaigns.'}
                              {template.name === 'Flat Structure' && 'Keep everything in one list without folders. Great for smaller campaigns or those who prefer simplicity.'}
                            </p>
                          </div>
                          {selectedTemplate.name === template.name && (
                            <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-amber-600 rounded-full flex items-center justify-center shadow-lg shadow-amber-500/30">
                              <Check size={20} className="text-white" />
                            </div>
                          )}
                        </div>

                        {template.folders.length > 0 && (
                          <div className="flex flex-wrap gap-3">
                            {template.folders.slice(0, 6).map((folder, i) => (
                              <span key={i} className="px-4 py-2 bg-gradient-to-r from-zinc-700/60 to-zinc-800/60 border border-zinc-600/50 text-zinc-300 rounded-full text-sm font-medium backdrop-blur-sm">
                                {folder.name}
                              </span>
                            ))}
                            {template.folders.length > 6 && (
                              <span className="px-4 py-2 text-zinc-500 text-sm font-medium">
                                +{template.folders.length - 6} more
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  
                  <div className="text-center pt-8">
                    <button
                      onClick={() => setIsCustomizing(true)}
                      className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-zinc-800/60 to-zinc-900/60 border border-zinc-600/50 hover:border-amber-500/60 rounded-xl text-zinc-300 hover:text-amber-200 transition-all duration-300 backdrop-blur-sm hover:shadow-lg hover:shadow-amber-500/10"
                    >
                      <Settings size={20} />
                      <span className="font-medium">Customize Structure</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* Custom Folder Editor */
                <div className="space-y-8">
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => setIsCustomizing(false)}
                      className="flex items-center gap-2 px-4 py-2 text-zinc-400 hover:text-amber-300 transition-colors duration-300 hover:bg-zinc-800/50 rounded-lg"
                    >
                      <ArrowLeft size={18} />
                      <span className="font-medium">Back to Templates</span>
                    </button>
                    
                    <button
                      onClick={addFolder}
                      className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-500/20 to-amber-600/20 border border-amber-500/40 text-amber-400 hover:text-amber-300 hover:border-amber-400/60 transition-all duration-300 rounded-xl backdrop-blur-sm"
                    >
                      <FolderPlus size={18} />
                      <span className="font-medium">Add Folder</span>
                    </button>
                  </div>

                  <div className="space-y-4">
                    {customFolders.map((folder) => (
                      <div key={folder.id} className="bg-gradient-to-r from-zinc-800/50 to-zinc-900/50 border border-zinc-700/50 rounded-xl p-6 space-y-4 backdrop-blur-sm">
                        <div className="flex items-center gap-4">
                          <GripVertical size={18} className="text-zinc-500 cursor-grab hover:text-zinc-400 transition-colors" />
                          <Folder size={18} className="text-amber-500" />
                          
                          {folder.isEditing ? (
                            <div className="flex-1 flex items-center gap-3">
                              <input
                                type="text"
                                value={folder.name}
                                onChange={(e) => updateFolder(folder.id, { name: e.target.value })}
                                className="flex-1 bg-zinc-700/50 border border-zinc-600/50 rounded-lg px-4 py-2 text-white placeholder-zinc-400 focus:outline-none focus:border-amber-500/50 transition-colors backdrop-blur-sm"
                                autoFocus
                              />
                              <button
                                onClick={() => updateFolder(folder.id, { isEditing: false })}
                                className="p-2 text-green-400 hover:text-green-300 hover:bg-green-500/10 rounded-lg transition-all duration-300"
                              >
                                <Check size={18} />
                              </button>
                            </div>
                          ) : (
                            <div className="flex-1 flex items-center justify-between">
                              <span className="text-white font-semibold text-lg">{folder.name}</span>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => updateFolder(folder.id, { isEditing: true })}
                                  className="p-2 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700/50 rounded-lg transition-all duration-300"
                                >
                                  <Edit3 size={16} />
                                </button>
                                <button
                                  onClick={() => removeFolder(folder.id)}
                                  className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-all duration-300"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="ml-10">
                          <p className="text-sm text-zinc-400 mb-3 font-medium">What types of notes will go in this folder?</p>
                          <div className="flex flex-wrap gap-2">
                            {ALL_NOTE_TYPES.map(type => (
                              <label key={type} className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={folder.noteTypes.includes(type)}
                                  onChange={(e) => {
                                    const newTypes = e.target.checked
                                      ? [...folder.noteTypes, type]
                                      : folder.noteTypes.filter(t => t !== type)
                                    updateFolder(folder.id, { noteTypes: newTypes })
                                  }}
                                  className="w-4 h-4 text-amber-600 bg-zinc-700/50 border-zinc-600/50 rounded focus:ring-amber-500/50 focus:ring-2"
                                />
                                <span className="text-sm text-zinc-300 font-medium">{type}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Preview Pane */}
          <div className="w-96 bg-gradient-to-b from-zinc-900/90 to-zinc-950/90 border-l border-zinc-800/50 backdrop-blur-sm">
            <div className="h-full p-8">
              <OnboardingPreview 
                template={isCustomizing ? previewTemplate : selectedTemplate}
                className="h-full"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}