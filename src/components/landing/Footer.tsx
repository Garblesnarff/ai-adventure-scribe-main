/**
 * Footer - Newsletter, Links, Social
 *
 * PURPOSE: Final conversion opportunity + brand building
 *
 * Components:
 * - Newsletter signup (growth mechanism)
 * - Product links (Help, Pricing, FAQ)
 * - Social proof (Twitter, Discord community)
 * - Legal (Privacy, Terms)
 * - Brand tagline (reinforces identity)
 */

import { Mail, Twitter, MessageCircle, Heart } from 'lucide-react';
import React, { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export const Footer: React.FC = () => {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // TODO: Integrate with newsletter service (ConvertKit, Mailchimp, etc.)
    await new Promise((resolve) => setTimeout(resolve, 1000));

    if (window.gtag) {
      window.gtag('event', 'newsletter_signup', {
        event_category: 'engagement',
        event_label: 'Footer Newsletter',
      });
    }

    setSubmitted(true);
    setIsSubmitting(false);
  };

  return (
    <footer className="relative bg-gray-900 border-t border-gray-800">
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
          {/* Brand + Newsletter */}
          <div className="lg:col-span-2">
            <h3 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-purple-400 mb-4">
              InfiniteRealms
            </h3>
            <p className="text-gray-400 mb-6 leading-relaxed">
              Your choices finally matter. Build worlds that remember you.
            </p>

            {/* Newsletter Signup */}
            {!submitted ? (
              <form onSubmit={handleNewsletterSubmit} className="space-y-3">
                <p className="text-sm text-gray-400 font-semibold">
                  Get legendary tales in your inbox
                </p>
                <div className="flex gap-2">
                  <Input
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500"
                  />
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="bg-purple-600 hover:bg-purple-700 text-white whitespace-nowrap"
                  >
                    {isSubmitting ? '...' : 'Subscribe'}
                  </Button>
                </div>
                <p className="text-sm text-gray-500">
                  Tips, stories, and beta updates. Unsubscribe anytime.
                </p>
              </form>
            ) : (
              <div className="p-4 bg-green-900/20 border border-green-500/30 rounded-lg">
                <p className="text-green-400 font-semibold">( You're on the list!</p>
                <p className="text-sm text-gray-400 mt-1">Check your inbox for a welcome gift</p>
              </div>
            )}
          </div>

          {/* Product Links */}
          <div>
            <h4 className="text-white font-semibold mb-4">Product</h4>
            <ul className="space-y-2">
              <li>
                <a
                  href="#benefits"
                  className="text-gray-400 hover:text-purple-400 transition-colors"
                >
                  Features
                </a>
              </li>
              <li>
                <a
                  href="#pricing"
                  className="text-gray-400 hover:text-purple-400 transition-colors"
                >
                  Pricing
                </a>
              </li>
              <li>
                <a href="#faq" className="text-gray-400 hover:text-purple-400 transition-colors">
                  FAQ
                </a>
              </li>
              <li>
                <a
                  href="/roadmap"
                  className="text-gray-400 hover:text-purple-400 transition-colors"
                >
                  Roadmap
                </a>
              </li>
            </ul>
          </div>

          {/* Company Links */}
          <div>
            <h4 className="text-white font-semibold mb-4">Company</h4>
            <ul className="space-y-2">
              <li>
                <a href="/about" className="text-gray-400 hover:text-purple-400 transition-colors">
                  About
                </a>
              </li>
              <li>
                <a href="/blog" className="text-gray-400 hover:text-purple-400 transition-colors">
                  Blog
                </a>
              </li>
              <li>
                <a
                  href="/privacy"
                  className="text-gray-400 hover:text-purple-400 transition-colors"
                >
                  Privacy Policy
                </a>
              </li>
              <li>
                <a href="/terms" className="text-gray-400 hover:text-purple-400 transition-colors">
                  Terms of Service
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-gray-800">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            {/* Social Links */}
            <div className="flex items-center gap-4">
              <a
                href="https://twitter.com/infiniterealms"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 bg-gray-800 hover:bg-purple-600 rounded-full flex items-center justify-center transition-colors"
                aria-label="Twitter"
              >
                <Twitter className="w-5 h-5 text-gray-400 hover:text-white" />
              </a>
              <a
                href="https://discord.gg/infiniterealms"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 bg-gray-800 hover:bg-purple-600 rounded-full flex items-center justify-center transition-colors"
                aria-label="Discord"
              >
                <MessageCircle className="w-5 h-5 text-gray-400 hover:text-white" />
              </a>
            </div>

            {/* Copyright */}
            <div className="text-center md:text-right">
              <p className="text-gray-400 text-sm mb-2">
                � 2025 InfiniteRealms. All rights reserved.
              </p>
              <p className="text-gray-500 text-sm flex items-center justify-center md:justify-end gap-1">
                Built with <Heart className="w-3 h-3 text-red-500 fill-red-500" /> for storytellers
              </p>
            </div>
          </div>
        </div>

        {/* Brand Tagline - Identity reinforcement */}
        <div className="mt-8 text-center">
          <p className="text-gray-600 text-sm italic">
            "Legends aren't found in books. They're lived in worlds that remember you."
          </p>
        </div>
      </div>
    </footer>
  );
};
