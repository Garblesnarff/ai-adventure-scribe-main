/**
 * Final CTA Section - The Close (Loss Aversion)
 *
 * PURPOSE: Last chance to convert using FOMO and loss aversion
 *
 * Co-Founder Strategy:
 * - Lead with what they'll MISS if they don't try
 * - Use time-sensitive language ("while beta spots last")
 * - End with identity ("legends are made in moments like this")
 *
 * Psychological Triggers:
 * - Loss aversion: "Don't miss out on..."
 * - Scarcity: "Limited beta spots"
 * - Social proof: "347 started this week"
 * - Identity: "Become a legend"
 */

import { ArrowRight, Sparkles, Users } from 'lucide-react';
import React from 'react';
import { useNavigate } from 'react-router-dom';

import { Button } from '@/components/ui/button';

export const FinalCTASection: React.FC = () => {
  const navigate = useNavigate();

  const handleGetStarted = () => {
    navigate('/app');

    if (window.gtag) {
      window.gtag('event', 'final_cta_click', {
        event_category: 'conversion',
        event_label: 'Bottom Page CTA',
      });
    }
  };

  return (
    <section className="relative py-24 bg-gradient-to-b from-purple-900/30 to-gray-900">
      <div className="max-w-5xl mx-auto px-6">
        {/* Main CTA Container */}
        <div className="relative bg-gradient-to-br from-purple-900/40 via-gray-900/60 to-amber-900/40 border-2 border-purple-500/30 rounded-3xl p-12 backdrop-blur-sm overflow-hidden">
          {/* Animated background particles */}
          <div className="absolute inset-0 opacity-30">
            <div className="absolute top-10 left-10 w-2 h-2 bg-amber-400 rounded-full animate-pulse"></div>
            <div className="absolute top-20 right-20 w-1 h-1 bg-purple-400 rounded-full animate-bounce"></div>
            <div className="absolute bottom-20 left-1/4 w-3 h-3 bg-amber-500 rounded-full animate-pulse"></div>
            <div className="absolute bottom-10 right-1/3 w-2 h-2 bg-purple-400 rounded-full animate-ping"></div>
          </div>

          {/* Content */}
          <div className="relative z-10 text-center">
            {/* Badge - FOMO trigger */}
            <div className="inline-flex items-center gap-2 px-5 py-2 bg-amber-500/20 border border-amber-500/30 rounded-full text-amber-400 text-sm font-medium mb-8">
              <Sparkles className="w-4 h-4" />
              <span>Beta Access - Limited Spots Available</span>
            </div>

            {/* Headline - Loss aversion */}
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
              Don't Let Your Story{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-purple-400">
                Go Untold
              </span>
            </h2>

            {/* Subheadline - Paint the picture of regret */}
            <p className="text-xl sm:text-2xl text-gray-300 mb-8 leading-relaxed max-w-3xl mx-auto">
              Somewhere out there is a world waiting for you. NPCs who need you. A villain who's
              planning. A legend that won't write itself.
            </p>

            {/* Stats - Social proof */}
            <div className="flex flex-wrap justify-center gap-6 mb-10">
              <div className="flex items-center gap-2 px-4 py-2 bg-gray-800/50 rounded-full border border-gray-700/50">
                <Users className="w-4 h-4 text-purple-400" />
                <span className="text-gray-300">347 started this week</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-gray-800/50 rounded-full border border-gray-700/50">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span className="text-gray-300">89% come back within 24 hours</span>
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8">
              <Button
                size="lg"
                onClick={handleGetStarted}
                className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-gray-900 px-12 py-6 rounded-xl shadow-2xl hover:shadow-[0_0_40px_rgba(251,191,36,0.6)] transition-all duration-300 flex items-center gap-3 text-lg font-bold"
              >
                Start Your Legend Now
                <ArrowRight className="w-6 h-6" />
              </Button>
            </div>

            {/* Final trust indicator */}
            <p className="text-sm text-gray-400">
              Free to start " No credit card required " 14-day money-back guarantee
            </p>

            {/* Identity-based close */}
            <div className="mt-12 pt-8 border-t border-purple-500/20">
              <p className="text-lg text-gray-400 italic">
                "The best stories aren't found in books.{' '}
                <span className="text-purple-400 font-semibold not-italic">
                  They're lived in worlds that remember you.
                </span>
                "
              </p>
            </div>
          </div>
        </div>

        {/* Bottom urgency line */}
        <div className="mt-8 text-center">
          <p className="text-amber-400 text-sm font-semibold animate-pulse">
            � Beta pricing locks in at $15/month forever (while spots last)
          </p>
        </div>
      </div>
    </section>
  );
};
