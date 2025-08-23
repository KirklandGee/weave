'use client'

import React from 'react'
import { Check, Crown, Zap } from 'lucide-react'
import { useSubscription } from '@/lib/hooks/useSubscription'

const plans = [
  {
    id: 'free_user',
    name: 'Storyteller',
    price: '$0',
    period: 'forever',
    description: 'Perfect for getting started with campaign organization',
    features: [
      'Unlimited campaigns and notes',
      'Rich text editor',
      'Character sheets and NPC tracking',
      'Session planning templates',
      'Local device storage'
    ],
    limitations: [
      'No AI assistance',
      'No cloud sync',
      'No AI content generation'
    ],
    ctaText: 'Current Plan',
    ctaDisabled: true
  },
  {
    id: 'player',
    name: 'Player',
    price: '$10',
    period: 'month',
    description: 'AI-powered campaign management for active DMs',
    popular: true,
    features: [
      'Everything in Storyteller',
      '$10 monthly AI credits',
      'AI campaign assistant chat',
      'NPC and location generation',
      'Plot hook suggestions',
      'Cloud sync across devices',
      'Advanced search with AI',
      'Priority customer support'
    ],
    ctaText: 'Upgrade to Player',
    ctaDisabled: false
  },
  {
    id: 'game_master',
    name: 'Game Master',
    price: '$25',
    period: 'month',
    description: 'Maximum AI power for serious campaign creators',
    features: [
      'Everything in Player',
      '$25 monthly AI credits',
      'Bulk content generation',
      'Complex campaign arc planning',
      'Advanced AI templates',
      'Custom AI prompts',
      'Usage analytics and insights',
      'API access for integrations',
      'Early access to new features'
    ],
    ctaText: 'Upgrade to Game Master',
    ctaDisabled: false
  }
]

export default function PricingPage() {
  const { tier } = useSubscription()
  
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
        
        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan) => (
            <div 
              key={plan.id}
              className={`relative rounded-2xl p-8 border ${
                plan.popular 
                  ? 'border-blue-500 bg-gradient-to-b from-blue-500/10 to-transparent' 
                  : 'border-zinc-800 bg-zinc-900/50'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <div className="bg-blue-500 text-white px-4 py-1 rounded-full text-sm font-medium flex items-center gap-1">
                    <Crown className="w-3 h-3" />
                    Most Popular
                  </div>
                </div>
              )}
              
              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                <p className="text-zinc-400 mb-4">{plan.description}</p>
                
                <div className="mb-6">
                  <span className="text-4xl font-bold">{plan.price}</span>
                  {plan.period !== 'forever' && (
                    <span className="text-zinc-400">/{plan.period}</span>
                  )}
                </div>
                
                <button
                  className={`w-full py-3 px-6 rounded-lg font-medium transition-colors ${
                    tier === plan.id || plan.ctaDisabled
                      ? 'bg-zinc-700 text-zinc-400 cursor-not-allowed'
                      : plan.popular
                      ? 'bg-blue-600 hover:bg-blue-700 text-white'
                      : 'bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-600'
                  }`}
                  disabled={tier === plan.id || plan.ctaDisabled}
                >
                  {tier === plan.id ? 'Current Plan' : plan.ctaText}
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-3 text-green-400">What's included:</h4>
                  <ul className="space-y-2">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-start gap-3 text-sm">
                        <Check className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                        <span className="text-zinc-300">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                
                {plan.limitations && (
                  <div>
                    <h4 className="font-medium mb-3 text-zinc-500">Limitations:</h4>
                    <ul className="space-y-2">
                      {plan.limitations.map((limitation, index) => (
                        <li key={index} className="flex items-start gap-3 text-sm">
                          <div className="w-4 h-4 mt-0.5 flex-shrink-0 rounded-full bg-zinc-600" />
                          <span className="text-zinc-500">{limitation}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          ))}
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