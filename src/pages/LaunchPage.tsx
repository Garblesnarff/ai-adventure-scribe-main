/**
 * Launch Page - Beta Launch Landing Page
 *
 * PURPOSE: Convert visitors into beta waitlist signups through visionary messaging
 * Structure: Hero → Vision → Features → How It Works → Team → Roadmap → Early Access → FAQ → Final CTA → Footer
 *
 * Key Principles:
 * - Future-oriented messaging (beta, planned features, roadmap)
 * - Transparent progress metrics instead of vanity numbers
 * - Clear beta positioning with waitlist mentality
 * - Legal compliance and accessibility
 */

import React, { useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { HeroSection } from '@/components/launch/HeroSection';
import { VisionSection } from '@/components/launch/VisionSection';
import { FeaturesSection } from '@/components/launch/FeaturesSection';
import { HowItWorksSection } from '@/components/launch/HowItWorksSection';
import { TeamSection } from '@/components/launch/TeamSection';
import { RoadmapSection } from '@/components/launch/RoadmapSection';
import { EarlyAccessSection } from '@/components/launch/EarlyAccessSection';
import { FAQSection } from '@/components/launch/FAQSection';
import { FinalCTASection } from '@/components/launch/FinalCTASection';
import { FooterSection } from '@/components/launch/FooterSection';

/**
 * Main Launch Page Component
 *
 * Features:
 * - SEO and OpenGraph meta tags
 * - Analytics tracking setup
 * - Accessibility compliance
 * - Performance optimizations
 */
const LaunchPage: React.FC = () => {
  useEffect(() => {
    // Track page view
    if (window.gtag) {
      window.gtag('event', 'page_view', {
        page_title: 'AI Dungeon Master - Beta Launch',
        page_location: window.location.href
      });
    }
  }, []);

  return (
    <>
      {/* SEO and Meta Tags */}
      <Helmet>
        <title>AI Dungeon Master - Beta Launch | Join the Future of Tabletop RPGs</title>
        <meta
          name="description"
          content="Be among the first to experience the legendary AI Dungeon Master. Join our closed beta and shape the future of tabletop RPGs with cinematic adventures that adapt to your every decision."
        />
        <meta name="keywords" content="AI Dungeon Master, D&D AI, tabletop RPG, beta launch, fantasy gaming" />
        <meta name="robots" content="index, follow" />

        {/* OpenGraph Tags */}
        <meta property="og:title" content="AI Dungeon Master - Beta Launch | Join the Future of Tabletop RPGs" />
        <meta property="og:description" content="Be among the first to experience the legendary AI Dungeon Master. Join our closed beta and shape the future of tabletop RPGs." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://ai-dungeon-master.com/launch" />
        <meta property="og:image" content="https://ai-dungeon-master.com/og-launch-image.jpg" />

        {/* Twitter Card Tags */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="AI Dungeon Master - Beta Launch" />
        <meta name="twitter:description" content="Join the closed beta for the legendary AI Dungeon Master. Shape the future of tabletop RPGs." />
        <meta name="twitter:image" content="https://ai-dungeon-master.com/twitter-launch-card.jpg" />

        {/* Canonical URL */}
        <link rel="canonical" href="https://ai-dungeon-master.com/launch" />
      </Helmet>

      <div className="min-h-screen bg-gradient-to-b from-gray-900 via-purple-900 to-gray-900 overflow-x-hidden">
        {/* Hero Section - The Hook */}
        <HeroSection />

        {/* Vision Section - Sell the Dream */}
        <VisionSection />

        {/* Features Section - What We're Building */}
        <FeaturesSection />

        {/* How It Works - Beta Journey */}
        <HowItWorksSection />

        {/* Team Section - Personal Connection */}
        <TeamSection />

        {/* Roadmap Section - Clear Beta Phases */}
        <RoadmapSection />

        {/* Early Access Section - Founding Adventurer Perks */}
        <EarlyAccessSection />

        {/* FAQ Section - Launch-Focused Questions */}
        <FAQSection />

        {/* Final CTA Section - Waitlist Urgency */}
        <FinalCTASection />

        {/* Footer Section - Legal & Links */}
        <FooterSection />
      </div>
    </>
  );
};

export default LaunchPage;
