/**
 * How It Works Section - 3 Outcome-Focused Steps
 *
 * PURPOSE: Show how EASY it is to get the outcomes they want
 *
 * Co-Founder Rule: Focus on the RESULT of each step, not the mechanics
 * BAD: "Step 1: Create an account"
 * GOOD: "Step 1: Become a legend in 30 seconds"
 *
 * Messaging Pattern: Step → Outcome → Emotional payoff
 */

import { Sparkles, Zap, Rocket } from 'lucide-react';
import React from 'react';

export const HowItWorksSection: React.FC = () => {
  const steps = [
    {
      number: '01',
      icon: Sparkles,
      title: 'Pick Your Destiny in 30 Seconds',
      description:
        'Choose your vibe: Dark fantasy? Cyberpunk heist? Steampunk mystery? The AI builds your world instantly.',
      outcome: 'No character sheets. No 2-hour setup. Just play.',
      color: 'amber',
    },
    {
      number: '02',
      icon: Zap,
      title: 'Make a Choice That Actually Matters',
      description:
        'Save the merchant or pocket the gold? The AI remembers. NPCs react. Your world shifts.',
      outcome: 'Every decision creates ripples you will feel 10 sessions later.',
      color: 'purple',
    },
    {
      number: '03',
      icon: Rocket,
      title: 'Watch Your Legend Grow',
      description:
        'The AI tracks everything. Your reputation spreads. Cities evolve. Your story becomes a living, breathing world.',
      outcome: 'Come back weeks later - your world remembers who you are.',
      color: 'amber',
    },
  ];

  return (
    <section className="relative py-24 bg-gradient-to-b from-gray-900 to-purple-900/30">
      <div className="max-w-7xl mx-auto px-6">
        {/* Section Header */}
        <div className="text-center mb-20">
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-4">
            Start Playing in{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-purple-400">
              3 Simple Steps
            </span>
          </h2>
          <p className="text-xl text-gray-400 max-w-3xl mx-auto">
            No rulebooks. No scheduling. No experience needed. Just pure adventure.
          </p>
        </div>

        {/* Steps - Visual journey */}
        <div className="relative">
          {/* Connecting line - desktop only */}
          <div className="hidden lg:block absolute top-24 left-0 right-0 h-0.5 bg-gradient-to-r from-amber-500/20 via-purple-500/20 to-amber-500/20"></div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 lg:gap-8">
            {steps.map((step, index) => (
              <div key={index} className="relative">
                {/* Step card */}
                <div className="relative bg-gray-900/50 border border-gray-700/50 rounded-2xl p-8 backdrop-blur-sm hover:border-purple-500/30 transition-all duration-300 group">
                  {/* Step number badge */}
                  <div
                    className={`absolute -top-6 left-8 w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg ${
                      step.color === 'amber'
                        ? 'bg-gradient-to-br from-amber-500 to-amber-600 text-gray-900'
                        : 'bg-gradient-to-br from-purple-500 to-purple-600 text-white'
                    } shadow-lg`}
                  >
                    {step.number}
                  </div>

                  {/* Icon */}
                  <div
                    className={`w-16 h-16 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform ${
                      step.color === 'amber' ? 'bg-amber-500/20' : 'bg-purple-500/20'
                    }`}
                  >
                    <step.icon
                      className={`w-8 h-8 ${
                        step.color === 'amber' ? 'text-amber-400' : 'text-purple-400'
                      }`}
                    />
                  </div>

                  {/* Content */}
                  <h3 className="text-2xl font-bold text-white mb-4">{step.title}</h3>
                  <p className="text-gray-400 mb-4 leading-relaxed">{step.description}</p>

                  {/* Outcome - The emotional payoff */}
                  <div
                    className={`pt-4 border-t ${
                      step.color === 'amber' ? 'border-amber-500/20' : 'border-purple-500/20'
                    }`}
                  >
                    <p
                      className={`font-semibold ${
                        step.color === 'amber' ? 'text-amber-400' : 'text-purple-400'
                      }`}
                    >
                      ✨ {step.outcome}
                    </p>
                  </div>
                </div>

                {/* Arrow connector - desktop only */}
                {index < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-24 -right-4 z-10">
                    <div className="w-8 h-8 bg-purple-500/20 rounded-full flex items-center justify-center">
                      <svg
                        className="w-4 h-4 text-purple-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="mt-20 text-center">
          <div className="inline-flex flex-col items-center gap-4 px-8 py-6 bg-gradient-to-br from-purple-900/40 to-amber-900/40 border border-purple-500/30 rounded-2xl backdrop-blur-sm">
            <p className="text-xl text-white font-semibold">That is it. Seriously.</p>
            <p className="text-gray-400 max-w-2xl">
              No 50-page player handbooks. No "Session Zero." No awkward icebreakers. Just you, your
              choices, and an AI that brings your world to life.
            </p>
            <div className="flex items-center gap-2 text-amber-400 text-sm mt-2">
              <Zap className="w-4 h-4" />
              <span>Most players send their first message in under 60 seconds</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
