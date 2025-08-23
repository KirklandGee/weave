'use client'

import React from 'react'
import { Zap } from 'lucide-react'
import { PricingTable } from '@clerk/nextjs'

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="container mx-auto px-6 py-16">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold mb-4">
            Choose Your Perfect Plan
          </h1>
          <p className="text-xl text-zinc-400 max-w-2xl mx-auto">
            Unlock the power of AI for your RPG campaigns. Start free and upgrade when you need more.
          </p>
        </div>
        
        {/* Clerk Pricing Table */}
        <div className="mb-16">
          <PricingTable 
            appearance={{
              elements: {
                card: 'bg-zinc-900/50 border border-zinc-800 text-white',
                cardHeader: 'text-white',
                cardBody: 'text-zinc-300',
                cardActions: 'text-white',
                button: 'bg-blue-600 hover:bg-blue-700 text-white',
                buttonSecondary: 'bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-600',
              },
              variables: {
                colorPrimary: '#3b82f6',
                colorText: '#ffffff',
                colorTextSecondary: '#a1a1aa',
                colorBackground: '#18181b',
                colorInputBackground: '#27272a',
                colorInputText: '#ffffff',
              }
            }}
          />
        </div>
        
        {/* AI Credits Explainer */}
        <div className="mt-16 max-w-4xl mx-auto">
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-8">
            <div className="flex items-center gap-4 mb-6">
              <Zap className="w-8 h-8 text-blue-400" />
              <div>
                <h3 className="text-2xl font-bold">What are AI Credits?</h3>
                <p className="text-zinc-400">Understanding our transparent AI pricing</p>
              </div>
            </div>
            
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h4 className="font-semibold mb-3 text-green-400">How it works:</h4>
                <ul className="space-y-2 text-sm text-zinc-300">
                  <li>• AI credits = actual dollars spent on AI processing</li>
                  <li>• $10 plan = $10 worth of AI interactions per month</li>
                  <li>• $25 plan = $25 worth of AI interactions per month</li>
                  <li>• Unused credits don't roll over</li>
                  <li>• No hidden fees or surprise charges</li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-semibold mb-3 text-blue-400">What you get:</h4>
                <ul className="space-y-2 text-sm text-zinc-300">
                  <li>• $10 = ~100-200 AI chat messages</li>
                  <li>• $25 = ~250-500 AI chat messages</li>
                  <li>• NPC generation, plot suggestions</li>
                  <li>• Campaign planning assistance</li>
                  <li>• Content creation and world building</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
        
        {/* FAQ */}
        <div className="mt-16 max-w-2xl mx-auto">
          <h3 className="text-2xl font-bold text-center mb-8">Frequently Asked Questions</h3>
          
          <div className="space-y-6">
            <div>
              <h4 className="font-semibold mb-2">Can I change plans anytime?</h4>
              <p className="text-zinc-400">Yes! You can upgrade, downgrade, or cancel your subscription at any time. Changes take effect at your next billing cycle.</p>
            </div>
            
            <div>
              <h4 className="font-semibold mb-2">What happens if I go over my AI credits?</h4>
              <p className="text-zinc-400">AI features will be temporarily disabled until your next billing cycle. We'll notify you before you reach your limit.</p>
            </div>
            
            <div>
              <h4 className="font-semibold mb-2">Is there a free trial?</h4>
              <p className="text-zinc-400">The Storyteller plan is free forever! It includes all the core campaign management features without AI assistance.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}