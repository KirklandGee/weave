'use client'

import React, { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { X, ChevronLeft, ChevronRight, Sparkles, Plus, Command, Users } from 'lucide-react'

interface TutorialStep {
  id: string
  title: string
  content: string
  target?: string // CSS selector for the element to highlight
  position?: 'top' | 'bottom' | 'left' | 'right'
  action?: {
    type: 'create_note' | 'open_command_palette' | 'show_relationships'
    label: string
  }
}

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to Your Campaign!',
    content: 'Your campaign has been created and organized. Let\'s take a quick tour to show you the key features that will help you manage your RPG world.',
    position: 'bottom'
  },
  {
    id: 'sidebar',
    title: 'Your Content Hub',
    content: 'This sidebar contains all your notes, organized in the folder structure you just set up. You can drag and drop notes between folders to reorganize them.',
    target: '[data-testid="left-sidebar"]',
    position: 'right'
  },
  {
    id: 'create-note',
    title: 'Create Your First Note',
    content: 'Use Cmd+Shift+N to quickly create a new note, or press Cmd+K to open the command palette and choose from templates like Character, Location, Session, and more.',
    target: '[data-testid="nav-search"]',
    position: 'bottom',
    action: {
      type: 'create_note',
      label: 'Create your first note'
    }
  },
  {
    id: 'editor',
    title: 'Rich Text Editor',
    content: 'Write your notes here with full rich text support. The editor supports markdown, lists, headers, and more. Everything saves automatically as you type.',
    target: '[data-testid="editor-area"]',
    position: 'top'
  },
  {
    id: 'relationships',
    title: 'Connect Your Ideas',
    content: 'This panel shows relationships between your notes. Connect characters to locations, link sessions to events, and build a web of interconnected ideas.',
    target: '[data-testid="relationships-panel"]',
    position: 'left'
  },
  {
    id: 'command-palette',
    title: 'Quick Access Everything',
    content: 'Press Cmd+K anytime to open the command palette. Quickly search notes, create new content, or access any feature.',
    target: '[data-testid="nav-search"]',
    position: 'bottom',
    action: {
      type: 'open_command_palette',
      label: 'Try the command palette'
    }
  },
  {
    id: 'complete',
    title: 'You\'re All Set!',
    content: 'That\'s the tour! You can access this tutorial again from the help menu. Start building your world and let the AI assistant help when you need inspiration.',
    position: 'bottom'
  }
]

interface WelcomeTutorialProps {
  isOpen: boolean
  onClose: () => void
  onStepComplete?: (stepId: string) => void
}

export function WelcomeTutorial({ isOpen, onClose, onStepComplete }: WelcomeTutorialProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 })
  const overlayRef = useRef<HTMLDivElement>(null)

  const step = TUTORIAL_STEPS[currentStep]
  const isLastStep = currentStep === TUTORIAL_STEPS.length - 1
  const isFirstStep = currentStep === 0

  useEffect(() => {
    if (!isOpen) return

    const updatePosition = () => {
      if (!step.target) {
        // Center the tooltip if no target
        setTooltipPosition({
          x: window.innerWidth / 2,
          y: window.innerHeight / 2
        })
        return
      }

      const targetElement = document.querySelector(step.target)
      if (!targetElement) return

      const rect = targetElement.getBoundingClientRect()
      const { position = 'bottom' } = step

      let x = rect.left + rect.width / 2
      let y = rect.top + rect.height / 2

      switch (position) {
        case 'top':
          y = rect.top - 20
          break
        case 'bottom':
          y = rect.bottom + 20
          break
        case 'left':
          x = rect.left - 20
          y = rect.top + rect.height / 2
          break
        case 'right':
          x = rect.right + 20
          y = rect.top + rect.height / 2
          break
      }

      setTooltipPosition({ x, y })
    }

    updatePosition()
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition)

    return () => {
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition)
    }
  }, [step, isOpen])

  const handleNext = () => {
    if (onStepComplete) {
      onStepComplete(step.id)
    }

    if (isLastStep) {
      onClose()
    } else {
      setCurrentStep(prev => prev + 1)
    }
  }

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1)
    }
  }

  const handleSkip = () => {
    onClose()
  }

  const handleAction = () => {
    if (!step.action) return

    switch (step.action.type) {
      case 'create_note':
        // Use Cmd+Shift+N to create a new note directly
        const createEvent = new KeyboardEvent('keydown', {
          key: 'N',
          metaKey: true,
          shiftKey: true,
          bubbles: true
        })
        document.dispatchEvent(createEvent)
        break
      case 'open_command_palette':
        // Use Cmd+K to open command palette
        const cmdKEvent = new KeyboardEvent('keydown', {
          key: 'k',
          metaKey: true,
          bubbles: true
        })
        document.dispatchEvent(cmdKEvent)
        break
      case 'show_relationships':
        // Focus on relationships panel
        const relationshipsPanel = document.querySelector('[data-testid="relationships-panel"]')
        if (relationshipsPanel) {
          relationshipsPanel.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }
        break
    }

    // Advance to next step after action
    setTimeout(() => {
      handleNext()
    }, 500)
  }

  if (!isOpen) return null

  const tooltipContent = (
    <>
      {/* Backdrop overlay */}
      <div 
        ref={overlayRef}
        className="fixed inset-0 bg-black/60 z-[9998]"
        onClick={handleSkip}
      />

      {/* Highlight overlay for target element */}
      {step.target && (
        <div className="fixed inset-0 pointer-events-none z-[9999]">
          {/* This creates a "spotlight" effect on the target element */}
          <div 
            className="absolute border-2 border-amber-400 rounded-lg shadow-lg"
            style={{
              ...(() => {
                const element = document.querySelector(step.target!)
                if (!element) return {}
                const rect = element.getBoundingClientRect()
                return {
                  left: rect.left - 4,
                  top: rect.top - 4,
                  width: rect.width + 8,
                  height: rect.height + 8,
                }
              })()
            }}
          />
        </div>
      )}

      {/* Tutorial tooltip */}
      <div 
        className="fixed z-[10000] pointer-events-auto"
        style={{
          left: Math.max(20, Math.min(tooltipPosition.x - 200, window.innerWidth - 420)),
          top: Math.max(20, Math.min(tooltipPosition.y - 100, window.innerHeight - 220))
        }}
      >
        <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-2xl border border-zinc-200 dark:border-zinc-700 w-96 p-6">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                {step.title}
              </h3>
            </div>
            <button
              onClick={handleSkip}
              className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
            >
              <X size={18} />
            </button>
          </div>

          {/* Content */}
          <p className="text-zinc-600 dark:text-zinc-300 mb-6 leading-relaxed">
            {step.content}
          </p>

          {/* Action Button */}
          {step.action && (
            <div className="mb-4">
              <button
                onClick={handleAction}
                className="w-full flex items-center justify-center gap-2 bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                {step.action.type === 'create_note' && <Plus size={16} />}
                {step.action.type === 'open_command_palette' && <Command size={16} />}
                {step.action.type === 'show_relationships' && <Users size={16} />}
                {step.action.label}
              </button>
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {TUTORIAL_STEPS.map((_, index) => (
                <div
                  key={index}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    index === currentStep 
                      ? 'bg-amber-500' 
                      : index < currentStep 
                      ? 'bg-amber-300' 
                      : 'bg-zinc-300 dark:bg-zinc-600'
                  }`}
                />
              ))}
            </div>

            <div className="flex items-center gap-2">
              {!isFirstStep && (
                <button
                  onClick={handlePrevious}
                  className="flex items-center gap-1 px-3 py-1 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors"
                >
                  <ChevronLeft size={16} />
                  Back
                </button>
              )}

              <button
                onClick={step.action ? undefined : handleNext}
                disabled={!!step.action}
                className="flex items-center gap-1 px-4 py-2 bg-zinc-100 dark:bg-zinc-700 hover:bg-zinc-200 dark:hover:bg-zinc-600 disabled:opacity-50 disabled:cursor-not-allowed text-zinc-900 dark:text-zinc-100 rounded transition-colors"
              >
                {isLastStep ? 'Finish' : 'Next'}
                {!isLastStep && <ChevronRight size={16} />}
              </button>
            </div>
          </div>

          {/* Step counter */}
          <div className="text-center mt-3 text-xs text-zinc-500">
            Step {currentStep + 1} of {TUTORIAL_STEPS.length}
          </div>
        </div>
      </div>
    </>
  )

  return typeof document !== 'undefined' 
    ? createPortal(tooltipContent, document.body)
    : null
}