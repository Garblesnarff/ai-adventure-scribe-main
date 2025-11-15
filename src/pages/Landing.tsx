/**
 * Landing Page - High-Converting SaaS Landing Page
 *
 * Purpose: Convert visitors into beta users through emotion-driven messaging
 * Structure: Hero → Social Proof → Benefits → How It Works → Pricing → Testimonials → FAQ → Final CTA → Footer
 *
 * Key Principles (Co-Founder Approved):
 * - Emotion over logic (trigger feelings, not features)
 * - Immediate gratification (30-second instant demo)
 * - Loss aversion (FOMO triggers throughout)
 * - Social proof (real moments, not generic praise)
 * - Identity-based messaging ("Become a Legend" not "Upgrade")
 *
 * Messaging Rule: Every sentence must create urgency, FOMO, curiosity, or emotional resonance.
 * If it sounds like a LinkedIn post → Delete it. If it gives you chills → Ship it.
 */

import { BenefitsSection } from '@/components/landing/BenefitsSection';
import { FAQSection } from '@/components/landing/FAQSection';
import { FinalCTASection } from '@/components/landing/FinalCTASection';
import { Footer } from '@/components/landing/Footer';
import { HeroSection } from '@/components/landing/HeroSection';
import { HowItWorksSection } from '@/components/landing/HowItWorksSection';
import { PricingSection } from '@/components/landing/PricingSection';
import { SocialProofBanner } from '@/components/landing/SocialProofBanner';
import { TestimonialsSection } from '@/components/landing/TestimonialsSection';

/**
 * Main Landing Page Component
 *
 * Analytics Events Tracked:
 * - page_view: Landing page loaded
 * - hero_cta_click: Primary CTA clicked
 * - demo_start: Instant demo initiated
 * - section_view: User scrolled to section
 * - pricing_click: Pricing plan selected
 * - signup: User created account
 */
const Landing: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-purple-900 to-gray-900 overflow-x-hidden">
      {/* Hero Section - The Hook (30-second promise) */}
      <HeroSection />

      {/* Social Proof Banner - Trust Indicators */}
      <SocialProofBanner />

      {/* Benefits Section - Emotional Outcomes (NOT features) */}
      <BenefitsSection />

      {/* How It Works - Outcome Focused (3 simple steps) */}
      <HowItWorksSection />

      {/* Pricing Section - Behavioral Psychology ($15 "Legend" tier) */}
      <PricingSection />

      {/* Testimonials - Specific Moments (NOT generic praise) */}
      <TestimonialsSection />

      {/* FAQ - Turn Objections Into Desires */}
      <FAQSection />

      {/* Final CTA - The Close (loss aversion messaging) */}
      <FinalCTASection />

      {/* Footer - Newsletter, Links, Social */}
      <Footer />
    </div>
  );
};

export default Landing;
