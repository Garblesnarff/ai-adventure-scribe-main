/**
 * How It Works Section - Beta Access Journey
 *
 * PURPOSE: Simple 3-step process focused on beta access and early adoption
 * Features: Clear steps, beta positioning, waitlist integration
 */

import { ArrowRight, UserPlus, Mail, Gamepad2 } from 'lucide-react';
import React from 'react';

import { launchPageContent } from '@/data/launchPageContent';

export const HowItWorksSection: React.FC = () => {
  const { howItWorks } = launchPageContent;

  return (
    <section className="relative py-24 bg-gradient-to-b from-purple-900/30 to-gray-900">
      <div className="max-w-7xl mx-auto px-6">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-4">
            {howItWorks.headline}
          </h2>
          <p className="text-xl text-gray-400 max-w-3xl mx-auto">{howItWorks.subtitle}</p>
        </div>

        {/* Steps */}
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12">
            {howItWorks.steps.map((step, index) => (
              <div key={index} className="relative">
                {/* Step Number */}
                <div className="flex items-center justify-center w-16 h-16 bg-gradient-to-br from-amber-500 to-amber-600 rounded-full text-gray-900 text-2xl font-bold mb-6 mx-auto shadow-lg">
                  {step.step}
                </div>

                {/* Step Content */}
                <div className="text-center">
                  <h3 className="text-2xl font-bold text-white mb-4">{step.title}</h3>
                  <p className="text-gray-400 leading-relaxed">{step.description}</p>
                </div>

                {/* Arrow (except for last step) */}
                {index < howItWorks.steps.length - 1 && (
                  <div className="hidden md:block absolute -right-6 lg:-right-12 top-8">
                    <ArrowRight className="w-8 h-8 text-purple-400" />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Visual Timeline Line */}
          <div className="mt-16 relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-700/50"></div>
            </div>
            <div className="relative flex justify-center">
              <div className="flex items-center gap-4 px-6 bg-gray-900">
                <div className="w-3 h-3 bg-amber-400 rounded-full animate-pulse"></div>
                <span className="text-gray-400 text-sm">Beta Launch Process</span>
                <div className="w-3 h-3 bg-purple-400 rounded-full"></div>
              </div>
            </div>
          </div>

          {/* Beta Access Timeline */}
          <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center p-6 bg-gray-800/30 rounded-xl border border-gray-700/50">
              <div className="w-12 h-12 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <UserPlus className="w-6 h-6 text-purple-400" />
              </div>
              <h4 className="text-lg font-semibold text-white mb-2">Join Waitlist</h4>
              <p className="text-sm text-gray-400">Sign up today</p>
            </div>

            <div className="text-center p-6 bg-gray-800/30 rounded-xl border border-gray-700/50">
              <div className="w-12 h-12 bg-amber-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Mail className="w-6 h-6 text-amber-400" />
              </div>
              <h4 className="text-lg font-semibold text-white mb-2">Get Invited</h4>
              <p className="text-sm text-gray-400">Beta: Q4 2025</p>
            </div>

            <div className="text-center p-6 bg-gray-800/30 rounded-xl border border-gray-700/50">
              <div className="w-12 h-12 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Gamepad2 className="w-6 h-6 text-purple-400" />
              </div>
              <h4 className="text-lg font-semibold text-white mb-2">Start Playing</h4>
              <p className="text-sm text-gray-400">Shape the future</p>
            </div>
          </div>

          {/* Call to Action */}
          <div className="mt-16 text-center">
            <p className="text-gray-400 text-lg mb-6">Ready to begin your adventure?</p>
            <div className="inline-flex items-center gap-2 text-amber-400 text-sm">
              <ArrowRight className="w-4 h-4" />
              <span>Join the waitlist to get started</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
