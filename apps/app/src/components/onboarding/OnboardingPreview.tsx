'use client'

import React from 'react'
import { ChevronRight, ChevronDown, Folder, FileText, Users, Map, Calendar, Sparkles, Package, BookOpen, StickyNote } from 'lucide-react'
import type { FolderTemplate } from './OnboardingWizard'

interface OnboardingPreviewProps {
  template: FolderTemplate
  className?: string
}

const NOTE_TYPE_ICONS: Record<string, React.ComponentType<any>> = {
  Character: Users,
  NPC: Users,
  Location: Map,
  Session: Calendar,
  Quest: Sparkles,
  Event: Calendar,
  Item: Package,
  Rule: BookOpen,
  Lore: BookOpen,
  Note: StickyNote,
}

const SAMPLE_NOTES: Record<string, string[]> = {
  Character: ['Elara Brightblade', 'Captain Thorne'],
  NPC: ['Innkeeper Willem', 'Merchant Gilda'],
  Location: ['Moonhaven Village', 'The Dark Forest'],
  Session: ['Session 1: The Beginning', 'Session 2: Into the Woods'],
  Quest: ['Find the Lost Artifact', 'Rescue the Village'],
  Event: ['The Great Festival', 'Dragon Attack'],
  Item: ['Sword of Light', 'Healing Potion'],
  Rule: ['Combat Rules', 'Magic System'],
  Lore: ['History of the Realm', 'Ancient Prophecy'],
  Note: ['Campaign Overview', 'House Rules'],
}

function FolderPreviewItem({ 
  name, 
  noteTypes, 
  isExpanded = true, 
  depth = 0,
  children 
}: { 
  name: string
  noteTypes: string[]
  isExpanded?: boolean
  depth?: number
  children?: Array<{ name: string; noteTypes: string[] }>
}) {
  const paddingLeft = depth * 16 + 12
  
  return (
    <div className="space-y-1">
      {/* Folder */}
      <div 
        className="flex items-center py-1 px-2 text-zinc-300 hover:bg-zinc-800/50 rounded cursor-pointer transition-colors"
        style={{ paddingLeft }}
      >
        {isExpanded ? (
          <ChevronDown size={14} className="mr-1 text-zinc-500" />
        ) : (
          <ChevronRight size={14} className="mr-1 text-zinc-500" />
        )}
        <Folder size={14} className="mr-2 text-amber-500" />
        <span className="text-sm font-medium truncate">{name}</span>
        <span className="ml-auto text-xs text-zinc-500">
          {noteTypes.reduce((total, type) => total + (SAMPLE_NOTES[type]?.length || 0), 0)}
        </span>
      </div>

      {/* Sample Notes (when expanded) */}
      {isExpanded && (
        <div className="space-y-0.5">
          {noteTypes.map(type => {
            const Icon = NOTE_TYPE_ICONS[type] || FileText
            const samples = SAMPLE_NOTES[type] || []
            
            return samples.map((sampleName, index) => (
              <div 
                key={`${type}-${index}`}
                className="flex items-center py-1 px-2 text-zinc-400 hover:bg-zinc-800/30 rounded cursor-pointer transition-colors"
                style={{ paddingLeft: paddingLeft + 20 }}
              >
                <Icon size={12} className="mr-2 text-zinc-500" />
                <span className="text-xs truncate">{sampleName}</span>
              </div>
            ))
          })}
        </div>
      )}

      {/* Child Folders */}
      {isExpanded && children && (
        <div className="space-y-1">
          {children.map((child, index) => (
            <FolderPreviewItem
              key={index}
              name={child.name}
              noteTypes={child.noteTypes}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export function OnboardingPreview({ template, className = '' }: OnboardingPreviewProps) {
  const totalNotes = template.folders.reduce((total, folder) => {
    let folderTotal = folder.noteTypes.reduce((sum, type) => sum + (SAMPLE_NOTES[type]?.length || 0), 0)
    if (folder.children) {
      folderTotal += folder.children.reduce((childSum, child) => 
        childSum + child.noteTypes.reduce((typeSum, type) => typeSum + (SAMPLE_NOTES[type]?.length || 0), 0), 0
      )
    }
    return total + folderTotal
  }, 0)

  return (
    <div className={`bg-zinc-900 border border-zinc-700 rounded-lg overflow-hidden ${className}`}>
      {/* Header */}
      <div className="bg-zinc-800 px-4 py-3 border-b border-zinc-700">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-zinc-200">Campaign Structure Preview</h3>
          <span className="text-xs text-zinc-500">{totalNotes} sample notes</span>
        </div>
      </div>

      {/* Content */}
      <div className="p-2 max-h-96 overflow-y-auto">
        {template.folders.length === 0 ? (
          <div className="text-center py-8 text-zinc-500">
            <div className="space-y-2">
              <FileText size={32} className="mx-auto text-zinc-600" />
              <p className="text-sm">Flat structure - no folders</p>
              <p className="text-xs">All notes will be in the main list</p>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {template.folders.map((folder, index) => (
              <FolderPreviewItem
                key={index}
                name={folder.name}
                noteTypes={folder.noteTypes}
                children={folder.children}
              />
            ))}
            
            {/* Uncategorized Section */}
            <div className="pt-2 border-t border-zinc-800 mt-4">
              <div className="flex items-center py-1 px-2 text-zinc-400">
                <FileText size={14} className="mr-2 text-zinc-600" />
                <span className="text-sm">Uncategorized</span>
                <span className="ml-auto text-xs text-zinc-600">0</span>
              </div>
              <p className="text-xs text-zinc-600 px-2 py-1">
                Notes that don't fit in folders will appear here
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="bg-zinc-800 px-4 py-2 border-t border-zinc-700">
        <p className="text-xs text-zinc-500 text-center">
          This shows how your sidebar will look with sample content
        </p>
      </div>
    </div>
  )
}