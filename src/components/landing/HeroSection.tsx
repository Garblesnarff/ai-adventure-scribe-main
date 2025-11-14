/**
 * Hero Section - High-Converting Landing Page Hook
 *
 * PURPOSE: Make visitors say "holy shit I need this NOW" in 5 seconds
 *
 * Co-Founder Approved Messaging:
 * - Option A: "Your Choices Finally Matter" (Emotional Hook) ✓ USING THIS
 * - Option B: "Can't Find a DM? Be the Legend Instead" (Pain Point)
 * - Option C: "This AI DM Just Killed a Player..." (Curiosity/Viral)
 *
 * KEY PRINCIPLE: Emotion over logic. Trigger feelings, not explain features.
 * The messaging must create immediate desire, not intellectual appreciation.
 *
 * Analytics Events:
 * - hero_cta_primary: "Start Playing" clicked
 * - hero_cta_secondary: "Watch Demo" clicked
 */

import { ArrowRight, Play, Zap, Shield, Sparkles } from 'lucide-react';
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Button } from '@/components/ui/button';

export const HeroSection: React.FC = () => {
  const navigate = useNavigate();
  const [isHoveringPrimary, setIsHoveringPrimary] = useState(false);

  /**
   * Primary CTA - Instant Play Demo
   * Opens modal with one-click demo experience (30-second promise)
   */
  const handleStartPlaying = () => {
    // TODO: Open InstantPlayDemo modal
    // For now, navigate to main app
    navigate('/app');

    // Track analytics
    if (window.gtag) {
      window.gtag('event', 'hero_cta_primary', {
        event_category: 'engagement',
        event_label: 'Start Playing in 30 Seconds',
      });
    }
  };

  /**
   * Secondary CTA - Watch Demo Video
   * Scrolls to demo video or opens video modal
   */
  const handleWatchDemo = () => {
    // TODO: Open demo video modal (30-second gameplay clip)
    // For now, scroll to benefits
    const benefitsSection = document.getElementById('benefits');
    if (benefitsSection) {
      benefitsSection.scrollIntoView({ behavior: 'smooth' });
    }

    // Track analytics
    if (window.gtag) {
      window.gtag('event', 'hero_cta_secondary', {
        event_category: 'engagement',
        event_label: 'Watch a Player Betray Their Party',
      });
    }
  };

  return (
    <section
      className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-b from-gray-900 via-purple-900 to-gray-900"
      role="banner"
    >
      {/* Dramatic Background - Dark fantasy aesthetic */}
      <div className="absolute inset-0 bg-[url('/fantasy-bg.jpg')] bg-cover bg-center opacity-20"></div>

      {/* Animated particles for depth */}
      <div className="absolute inset-0">
        <div className="absolute top-20 left-10 w-2 h-2 bg-amber-400 rounded-full opacity-60 animate-pulse"></div>
        <div className="absolute top-40 right-20 w-1 h-1 bg-purple-400 rounded-full opacity-70 animate-bounce"></div>
        <div className="absolute bottom-40 left-20 w-3 h-3 bg-amber-500 rounded-full opacity-40 animate-pulse"></div>
        <div className="absolute top-60 left-1/3 w-1 h-1 bg-purple-300 rounded-full opacity-50 animate-ping"></div>
        <div className="absolute bottom-60 right-1/4 w-2 h-2 bg-amber-400 rounded-full opacity-60 animate-bounce"></div>
      </div>

      {/* Main Content - Emotion-driven messaging */}
      <div className="relative z-10 w-full mx-auto px-4 sm:px-6 text-center">
        <div className="max-w-5xl mx-auto w-full">
          {/* Badge - Create urgency and exclusivity */}
          <div className="inline-flex items-center gap-2 px-4 sm:px-5 py-2 bg-purple-900/40 border border-purple-500/30 rounded-full text-amber-400 text-xs sm:text-sm font-medium mb-8 backdrop-blur-sm animate-fade-in max-w-full">
            <Sparkles className="w-4 h-4 flex-shrink-0" />
            <span className="text-center">Beta Access - Lock In $15/month Pricing Forever</span>
            <Zap className="w-4 h-4 text-amber-400 animate-pulse flex-shrink-0" />
          </div>

          {/* OPTION A: Emotional Hook (CO-FOUNDER APPROVED) */}
          <h1 className="font-heading text-4xl sm:text-5xl md:text-6xl lg:text-8xl font-bold text-white mb-6 leading-tight animate-fade-in-up max-w-full break-words px-2">
            Your Choices
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-purple-400 to-amber-500 animate-gradient">
              Finally Matter
            </span>
          </h1>

          {/* Subheadline - Focus on IMMEDIATE value, not future benefits */}
          <p className="text-lg sm:text-xl md:text-2xl lg:text-3xl text-gray-300 mb-10 leading-relaxed max-w-4xl mx-auto animate-fade-in-up animation-delay-100 w-full px-2">
            The AI DM that{' '}
            <span className="text-amber-400 font-semibold">remembers everything</span>, adapts to
            your playstyle, and builds a world that exists{' '}
            <span className="text-purple-400 font-semibold">only for you</span>.
          </p>

          {/* Social Proof - Immediate trust indicators */}
          <div className="flex flex-wrap justify-center gap-3 sm:gap-4 mb-10 text-sm sm:text-base animate-fade-in-up animation-delay-200 max-w-full px-2">
            <div className="flex items-center gap-2 px-4 py-2 bg-gray-800/50 rounded-full border border-gray-700/50 backdrop-blur-sm">
              <Shield className="w-4 h-4 text-green-400" />
              <span className="text-gray-300">No Scheduling</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-gray-800/50 rounded-full border border-gray-700/50 backdrop-blur-sm">
              <Shield className="w-4 h-4 text-green-400" />
              <span className="text-gray-300">No Rulebooks</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-gray-800/50 rounded-full border border-gray-700/50 backdrop-blur-sm">
              <Shield className="w-4 h-4 text-green-400" />
              <span className="text-gray-300">Play in 30 Seconds</span>
            </div>
          </div>

          {/* CTA Buttons - Identity-based messaging */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center animate-fade-in-up animation-delay-300 w-full px-2">
            {/* Primary CTA - Pulse animation on hover */}
            <Button
              size="lg"
              onClick={handleStartPlaying}
              onMouseEnter={() => setIsHoveringPrimary(true)}
              onMouseLeave={() => setIsHoveringPrimary(false)}
              className={`
                bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500
                text-gray-900 px-6 sm:px-10 py-6 rounded-xl shadow-2xl
                hover:shadow-[0_0_30px_rgba(251,191,36,0.5)]
                transition-all duration-300 flex items-center gap-2 sm:gap-3 text-base sm:text-lg font-bold
                w-full sm:w-auto max-w-full
                ${isHoveringPrimary ? 'scale-105 animate-pulse-subtle' : ''}
              `}
            >
              <span className="text-center">Start Playing in 30 Seconds</span>
              <ArrowRight className="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0" />
            </Button>

            {/* Secondary CTA - Curiosity hook */}
            <Button
              variant="outline"
              size="lg"
              onClick={handleWatchDemo}
              className="border-2 border-purple-500/50 hover:border-purple-400 text-purple-300 hover:text-purple-200 hover:bg-purple-900/30 hover:shadow-[0_0_20px_rgba(168,85,247,0.3)] px-6 sm:px-10 py-6 rounded-xl backdrop-blur-sm transition-all duration-300 flex items-center gap-2 sm:gap-3 text-base sm:text-lg font-semibold w-full sm:w-auto max-w-full"
            >
              <Play className="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0" />
              <span className="hidden sm:inline">Watch a Player Betray Their Party</span>
              <span className="sm:hidden">Watch Demo</span>
            </Button>
          </div>

          {/* Trust indicators - Real-time social proof */}
          <div className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-8 animate-fade-in-up animation-delay-400">
            <div className="text-center">
              <div className="text-5xl font-bold text-amber-400 mb-2">347</div>
              <div className="text-gray-400 text-sm">Campaigns started this week</div>
            </div>
            <div className="text-center">
              <div className="text-5xl font-bold text-purple-400 mb-2">24/7</div>
              <div className="text-gray-400 text-sm">AI Dungeon Master</div>
            </div>
            <div className="text-center">
              <div className="text-5xl font-bold text-amber-400 mb-2">∞</div>
              <div className="text-gray-400 text-sm">Your choices matter</div>
            </div>
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
        <div className="w-6 h-10 border-2 border-amber-400/50 rounded-full flex justify-center">
          <div className="w-1 h-3 bg-amber-400 rounded-full mt-2 animate-pulse"></div>
        </div>
      </div>
    </section>
  );
};
