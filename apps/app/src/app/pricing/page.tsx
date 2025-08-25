'use client'

import React from 'react'
import Image from 'next/image'
import { PricingTable } from '@clerk/nextjs'

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="container mx-auto px-6 py-16">
        {/* Logo */}
        <div className="text-center mb-8">
          <Image
            src="/weave-logo.png"
            alt="Weave AI Logo"
            width={64}
            height={64}
            className="mx-auto mb-6"
          />
          <h1 className="text-4xl font-bold mb-4">
            Choose Your Perfect Plan
          </h1>
          <p className="text-xl text-zinc-400 max-w-2xl mx-auto">
            Unlock the power of AI for your RPG campaigns. Start free and upgrade when you need more.
          </p>
        </div>
        
        {/* Clerk Pricing Table */}
        <div>
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
      </div>
    </div>
  )
}