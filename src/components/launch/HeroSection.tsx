/**
 * Hero Section - Launch Page Hook
 *
 * PURPOSE: Create immediate desire for the AI Dungeon Master with beta positioning
 * Features: Waitlist CTA, beta urgency, visionary messaging
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowRight, Sparkles, Zap, Clock } from 'lucide-react';
import { WaitlistForm } from './WaitlistForm';
import { launchPageContent } from '@/data/launchPageContent';

export const HeroSection: React.FC = () => {
  const [showForm, setShowForm] = useState(false);
  const { hero } = launchPageContent;

  /**
   * Handle primary CTA click
   */
  const handleGetStarted = () => {
    setShowForm(true);

    // Track analytics
    if (window.gtag) {
      window.gtag('event', 'hero_cta_click', {
        event_category: 'engagement',
        event_label: 'Request Early Access'
      });
    }
  };

  /**
   * Handle secondary CTA click
   */
  const handleLearnMore = () => {
    // Scroll to vision section
    const visionSection = document.getElementById('vision');
    if (visionSection) {
      visionSection.scrollIntoView({ behavior: 'smooth' });
    }

    // Track analytics
    if (window.gtag) {
      window.gtag('event', 'hero_secondary_cta', {
        event_category: 'engagement',
        event_label: 'Learn More'
      });
    }
  };

  return (
    <section
      className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-b from-gray-900 via-purple-900 to-gray-900"
      role="banner"
    >
      {/* Animated background particles */}
      <div className="absolute inset-0">
        <div className="absolute top-20 left-10 w-2 h-2 bg-amber-400 rounded-full opacity-60 animate-pulse"></div>
        <div className="absolute top-40 right-20 w-1 h-1 bg-purple-400 rounded-full opacity-70 animate-bounce"></div>
        <div className="absolute bottom-40 left-20 w-3 h-3 bg-amber-500 rounded-full opacity-40 animate-pulse"></div>
        <div className="absolute top-60 left-1/3 w-1 h-1 bg-purple-300 rounded-full opacity-50 animate-ping"></div>
        <div className="absolute bottom-60 right-1/4 w-2 h-2 bg-amber-400 rounded-full opacity-60 animate-bounce"></div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 w-full mx-auto px-4 sm:px-6 text-center">
        <div className="max-w-5xl mx-auto w-full">
          {/* Beta Badge */}
          <div className="inline-flex items-center gap-2 px-4 sm:px-5 py-2 bg-purple-900/40 border border-purple-500/30 rounded-full text-amber-400 text-xs sm:text-sm font-medium mb-8 backdrop-blur-sm animate-fade-in">
            <Clock className="w-4 h-4 flex-shrink-0" />
            <span>{hero.badge}</span>
            <Sparkles className="w-4 h-4 text-amber-400 animate-pulse flex-shrink-0" />
          </div>

          {/* Main Headline */}
          <h1 className="font-heading text-4xl sm:text-5xl md:text-6xl lg:text-8xl font-bold text-white mb-6 leading-tight animate-fade-in-up">
            {hero.headline.split(' ').map((word, index) => (
              <span key={index} className={index >= 2 ? "text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-purple-400 to-amber-500 animate-gradient" : ""}>
                {word}{index < hero.headline.split(' ').length - 1 ? " " : ""}
                {index === 1 && <br className="hidden sm:block" />}
              </span>
            ))}
          </h1>

          {/* Subtitle */}
          <p className="text-lg sm:text-xl md:text-2xl lg:text-3xl text-gray-300 mb-6 leading-relaxed max-w-4xl mx-auto animate-fade-in-up animation-delay-100">
            {hero.subtitle}
          </p>

          {/* Description */}
          <p className="text-base sm:text-lg text-gray-400 mb-10 max-w-3xl mx-auto leading-relaxed animate-fade-in-up animation-delay-200">
            {hero.description}
          </p>

          {/* Beta Stats */}
          <div className="flex flex-wrap justify-center gap-3 sm:gap-4 mb-12 text-sm sm:text-base animate-fade-in-up animation-delay-300">
            <div className="flex items-center gap-2 px-4 py-2 bg-gray-800/50 rounded-full border border-gray-700/50 backdrop-blur-sm">
              <Zap className="w-4 h-4 text-green-400" />
              <span className="text-gray-300">Core AI Engine Built</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-gray-800/50 rounded-full border border-gray-700/50 backdrop-blur-sm">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span className="text-gray-300">Visual Generation Coming</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-gray-800/50 rounded-full border border-gray-700/50 backdrop-blur-sm">
              <Clock className="w-4 h-4 text-purple-400" />
              <span className="text-gray-300">Beta: Q4 2025</span>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="animate-fade-in-up animation-delay-400">
            {!showForm ? (
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center max-w-lg mx-auto">
                <Button
                  size="lg"
                  onClick={handleGetStarted}
                  className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-gray-900 px-8 py-6 rounded-xl shadow-2xl hover:shadow-[0_0_30px_rgba(251,191,36,0.5)] transition-all duration-300 flex items-center gap-3 text-lg font-bold w-full sm:w-auto"
                >
                  <span>{hero.primaryCTA}</span>
                  <ArrowRight className="w-6 h-6" />
                </Button>

                <Button
                  variant="outline"
                  size="lg"
                  onClick={handleLearnMore}
                  className="border-2 border-purple-500/50 hover:border-purple-400 text-purple-300 hover:text-purple-200 hover:bg-purple-900/30 px-8 py-6 rounded-xl backdrop-blur-sm transition-all duration-300 flex items-center gap-3 text-lg font-semibold w-full sm:w-auto"
                >
                  {hero.secondaryCTA}
                </Button>
              </div>
            ) : (
              <div className="max-w-md mx-auto">
                <div className="mb-4 text-center">
                  <h3 className="text-xl font-semibold text-white mb-2">Join the Beta Waitlist</h3>
                  <p className="text-gray-400 text-sm">Get early access to the AI Dungeon Master</p>
                </div>
                <WaitlistForm variant="hero" />
              </div>
            )}
          </div>

          {/* Waitlist Counter */}
          <div className="mt-16 animate-fade-in-up animation-delay-500">
            <p className="text-gray-400 text-sm">
              Join <span className="text-purple-400 font-semibold">500+ adventurers</span> already on the waitlist
            </p>
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
