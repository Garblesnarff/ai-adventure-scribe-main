/**
 * Pricing Section - Behavioral Psychology Pricing
 *
 * PURPOSE: Make $15/month feel like a steal using hyperbolic discounting
 *
 * Co-Founder Approved Strategy:
 * - "Wanderer" (Free): Taste of the magic, severe limitations
 * - "Legend" ($15): Identity-based tier name ("Become a Legend" not "Upgrade")
 * - Anchor: Show $25 "value" with strikethrough to make $15 feel cheap
 * - FOMO: "Lock in $15/month pricing forever" (beta early adopter pricing)
 * - Loss Aversion: "Free tier loses progress after 7 days"
 *
 * Messaging Rule: Every word must trigger emotion (urgency, FOMO, or identity)
 */

import { Check, X, Zap, Crown, Lock } from 'lucide-react';
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Button } from '@/components/ui/button';

export const PricingSection: React.FC = () => {
  const navigate = useNavigate();
  const [hoveredTier, setHoveredTier] = useState<string | null>(null);

  const handleGetStarted = (tier: string) => {
    navigate('/app');

    if (window.gtag) {
      window.gtag('event', 'pricing_tier_selected', {
        event_category: 'conversion',
        event_label: tier,
      });
    }
  };

  return (
    <section className="relative py-24 bg-gradient-to-b from-purple-900/30 to-gray-900">
      <div className="max-w-7xl mx-auto px-6">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-4">
            Choose Your{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-purple-400">
              Destiny
            </span>
          </h2>
          <p className="text-xl text-gray-400 max-w-3xl mx-auto">
            Start free, become a legend when you're ready
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {/* Wanderer Tier (Free) - Limited taste */}
          <div
            className={`relative bg-gray-900/50 border ${
              hoveredTier === 'wanderer' ? 'border-purple-500/50' : 'border-gray-700/50'
            } rounded-2xl p-8 backdrop-blur-sm transition-all duration-300`}
            onMouseEnter={() => setHoveredTier('wanderer')}
            onMouseLeave={() => setHoveredTier(null)}
          >
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="w-6 h-6 text-purple-400" />
                <h3 className="text-2xl font-bold text-white">Wanderer</h3>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-5xl font-bold text-white">Free</span>
                <span className="text-gray-400">forever</span>
              </div>
              <p className="text-gray-400 mt-2">Get a taste of the magic</p>
            </div>

            <Button
              onClick={() => handleGetStarted('wanderer')}
              variant="outline"
              className="w-full mb-8 border-purple-500/50 hover:border-purple-400 text-purple-300 hover:text-purple-200 hover:bg-purple-900/30"
            >
              Start Your Journey
            </Button>

            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <Check className="w-5 h-5 text-purple-400 mt-0.5 flex-shrink-0" />
                <span className="text-gray-300">1 active campaign at a time</span>
              </div>
              <div className="flex items-start gap-3">
                <Check className="w-5 h-5 text-purple-400 mt-0.5 flex-shrink-0" />
                <span className="text-gray-300">10 messages per session</span>
              </div>
              <div className="flex items-start gap-3">
                <Check className="w-5 h-5 text-purple-400 mt-0.5 flex-shrink-0" />
                <span className="text-gray-300">Basic AI storytelling</span>
              </div>
              <div className="flex items-start gap-3">
                <X className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
                <span className="text-gray-400 line-through">Long-term memory (NPCs forget)</span>
              </div>
              <div className="flex items-start gap-3">
                <X className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
                <span className="text-gray-400 line-through">Voice narration</span>
              </div>
              <div className="flex items-start gap-3">
                <X className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
                <span className="text-gray-400 line-through">Export campaign as novel</span>
              </div>
            </div>

            {/* Loss Aversion Warning */}
            <div className="mt-6 p-4 bg-red-900/20 border border-red-500/20 rounded-lg">
              <p className="text-sm text-red-400">
                � Free campaigns reset after 7 days of inactivity
              </p>
            </div>
          </div>

          {/* Legend Tier ($15) - The hero tier */}
          <div
            className={`relative bg-gradient-to-br from-amber-900/40 to-purple-900/40 border-2 ${
              hoveredTier === 'legend' ? 'border-amber-400' : 'border-amber-500/50'
            } rounded-2xl p-8 backdrop-blur-sm transition-all duration-300 transform ${
              hoveredTier === 'legend' ? 'scale-105' : ''
            }`}
            onMouseEnter={() => setHoveredTier('legend')}
            onMouseLeave={() => setHoveredTier(null)}
          >
            {/* Popular Badge */}
            <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
              <div className="bg-gradient-to-r from-amber-500 to-amber-600 text-gray-900 px-6 py-1 rounded-full text-sm font-bold flex items-center gap-2">
                <Crown className="w-4 h-4" />
                MOST POPULAR
              </div>
            </div>

            <div className="mb-6 mt-4">
              <div className="flex items-center gap-2 mb-2">
                <Crown className="w-6 h-6 text-amber-400" />
                <h3 className="text-2xl font-bold text-white">Legend</h3>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl text-gray-400 line-through">$25</span>
                <span className="text-5xl font-bold text-white">$15</span>
                <span className="text-gray-400">/month</span>
              </div>
              <p className="text-amber-400 mt-2 font-semibold flex items-center gap-2">
                <Lock className="w-4 h-4" />
                Beta pricing - Lock in forever
              </p>
            </div>

            <Button
              onClick={() => handleGetStarted('legend')}
              className="w-full mb-8 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-gray-900 font-bold shadow-[0_0_20px_rgba(251,191,36,0.3)] hover:shadow-[0_0_30px_rgba(251,191,36,0.5)]"
            >
              Become a Legend
            </Button>

            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <Check className="w-5 h-5 text-amber-400 mt-0.5 flex-shrink-0" />
                <span className="text-white font-semibold">Unlimited campaigns & sessions</span>
              </div>
              <div className="flex items-start gap-3">
                <Check className="w-5 h-5 text-amber-400 mt-0.5 flex-shrink-0" />
                <span className="text-white font-semibold">Unlimited messages</span>
              </div>
              <div className="flex items-start gap-3">
                <Check className="w-5 h-5 text-amber-400 mt-0.5 flex-shrink-0" />
                <span className="text-white font-semibold">Advanced AI with long-term memory</span>
              </div>
              <div className="flex items-start gap-3">
                <Check className="w-5 h-5 text-amber-400 mt-0.5 flex-shrink-0" />
                <span className="text-white font-semibold">Cinematic voice narration</span>
              </div>
              <div className="flex items-start gap-3">
                <Check className="w-5 h-5 text-amber-400 mt-0.5 flex-shrink-0" />
                <span className="text-white font-semibold">AI-generated character images</span>
              </div>
              <div className="flex items-start gap-3">
                <Check className="w-5 h-5 text-amber-400 mt-0.5 flex-shrink-0" />
                <span className="text-white font-semibold">Export campaign as novel</span>
              </div>
              <div className="flex items-start gap-3">
                <Check className="w-5 h-5 text-amber-400 mt-0.5 flex-shrink-0" />
                <span className="text-white font-semibold">Persistent worlds (never reset)</span>
              </div>
              <div className="flex items-start gap-3">
                <Check className="w-5 h-5 text-amber-400 mt-0.5 flex-shrink-0" />
                <span className="text-white font-semibold">Priority support</span>
              </div>
            </div>

            {/* Value Proposition */}
            <div className="mt-6 p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
              <p className="text-sm text-amber-400 font-semibold">
                ( Less than 2 movie tickets. Unlimited adventures.
              </p>
            </div>
          </div>
        </div>

        {/* Bottom Trust Line */}
        <div className="mt-16 text-center">
          <p className="text-gray-400 mb-4">
            All plans include: <span className="text-purple-400">No contracts</span> "{' '}
            <span className="text-purple-400">Cancel anytime</span> "{' '}
            <span className="text-purple-400">14-day money-back guarantee</span>
          </p>
          <p className="text-sm text-gray-500">= Secure payment powered by Stripe</p>
        </div>
      </div>
    </section>
  );
};
