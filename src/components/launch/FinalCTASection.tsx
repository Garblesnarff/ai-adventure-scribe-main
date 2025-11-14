/**
 * Final CTA Section - Waitlist Urgency
 *
 * PURPOSE: Create final urgency and exclusivity for beta waitlist signup
 * Features: Scarcity messaging, social proof, clear next steps
 */

import { ArrowRight, Users, Clock, Zap } from 'lucide-react';
import React, { useState } from 'react';

import { WaitlistForm } from './WaitlistForm';

import { Button } from '@/components/ui/button';
import { launchPageContent } from '@/data/launchPageContent';

export const FinalCTASection: React.FC = () => {
  const { finalCTA } = launchPageContent;
  const [showForm, setShowForm] = useState(false);

  /**
   * Handle CTA click
   */
  const handleGetAccess = () => {
    setShowForm(true);

    // Track analytics
    if (window.gtag) {
      window.gtag('event', 'final_cta_click', {
        event_category: 'conversion',
        event_label: 'Final CTA - Request Early Access',
      });
    }
  };

  return (
    <section className="relative py-24 bg-gradient-to-b from-purple-900/30 to-gray-900">
      <div className="max-w-6xl mx-auto px-6">
        {/* Main CTA Content */}
        <div className="text-center mb-16">
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6">
            {finalCTA.headline}
          </h2>
          <p className="text-xl sm:text-2xl text-gray-300 mb-8 max-w-4xl mx-auto">
            {finalCTA.subtitle}
          </p>
          <p className="text-lg text-gray-400 max-w-3xl mx-auto leading-relaxed">
            {finalCTA.description}
          </p>
        </div>

        {/* CTA Buttons */}
        <div className="text-center mb-16">
          {!showForm ? (
            <div className="space-y-6">
              <Button
                size="lg"
                onClick={handleGetAccess}
                className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-gray-900 px-12 py-6 rounded-xl shadow-2xl hover:shadow-[0_0_40px_rgba(251,191,36,0.5)] transition-all duration-300 flex items-center gap-4 text-xl font-bold mx-auto hover:scale-105"
              >
                <span>{finalCTA.cta}</span>
                <ArrowRight className="w-7 h-7" />
              </Button>

              <p className="text-gray-400 text-lg">Be among the first pioneers shaping AI D&D</p>
            </div>
          ) : (
            <div className="max-w-2xl mx-auto">
              <div className="mb-6 text-center">
                <h3 className="text-2xl font-bold text-white mb-2">Join the Beta Waitlist</h3>
                <p className="text-gray-400">Secure your early access to the AI Dungeon Master</p>
              </div>
              <WaitlistForm variant="section" />
            </div>
          )}
        </div>

        {/* Social Proof & Urgency */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          <div className="text-center p-8 bg-gray-800/30 border border-gray-700/50 rounded-xl">
            <div className="w-16 h-16 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-purple-400" />
            </div>
            <div className="text-3xl font-bold text-amber-400 mb-2">First</div>
            <div className="text-gray-400">Mover Advantage</div>
          </div>

          <div className="text-center p-8 bg-gray-800/30 border border-gray-700/50 rounded-xl">
            <div className="w-16 h-16 bg-amber-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Clock className="w-8 h-8 text-amber-400" />
            </div>
            <div className="text-3xl font-bold text-purple-400 mb-2">Q4 2025</div>
            <div className="text-gray-400">Beta Launch Target</div>
          </div>

          <div className="text-center p-8 bg-gray-800/30 border border-gray-700/50 rounded-xl">
            <div className="w-16 h-16 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Zap className="w-8 h-8 text-purple-400" />
            </div>
            <div className="text-3xl font-bold text-amber-400 mb-2">Exclusive</div>
            <div className="text-gray-400">Early Access</div>
          </div>
        </div>

        {/* What Happens Next */}
        <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 border border-gray-700/50 rounded-2xl p-8 backdrop-blur-sm">
          <h3 className="text-2xl font-bold text-white mb-8 text-center">
            What Happens After You Join?
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4 text-white font-bold text-lg">
                1
              </div>
              <h4 className="text-lg font-semibold text-white mb-2">Email Confirmation</h4>
              <p className="text-gray-400 text-sm">
                You'll receive a confirmation email with your waitlist number and next steps.
              </p>
            </div>

            <div className="text-center">
              <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-amber-600 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-900 font-bold text-lg">
                2
              </div>
              <h4 className="text-lg font-semibold text-white mb-2">Beta Invitations</h4>
              <p className="text-gray-400 text-sm">
                We'll send beta invitations on a first-come, first-served basis as spots open up.
              </p>
            </div>

            <div className="text-center">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4 text-white font-bold text-lg">
                3
              </div>
              <h4 className="text-lg font-semibold text-white mb-2">Early Access</h4>
              <p className="text-gray-400 text-sm">
                Get early access to new features and direct influence on product development.
              </p>
            </div>
          </div>
        </div>

        {/* Final Urgency Message */}
        <div className="mt-16 text-center p-8 bg-gradient-to-r from-amber-900/20 to-purple-900/20 border border-amber-500/20 rounded-xl">
          <p className="text-amber-400 text-lg font-semibold mb-2">⏰ Limited Time Opportunity</p>
          <p className="text-gray-300 text-base">
            Beta access is extremely limited. The earlier you join our waitlist, the sooner you'll
            get access to the AI Dungeon Master and secure your founding member perks.
          </p>
        </div>
      </div>
    </section>
  );
};
