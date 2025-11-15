/**
 * Footer Section - Legal & Links
 *
 * PURPOSE: Provide legal compliance, contact info, and community links
 * Features: IP disclaimers, privacy/terms links, social links, company info
 */

import { MessageCircle, ExternalLink, Heart } from 'lucide-react';
import React from 'react';

import { Button } from '@/components/ui/button';
import { launchPageContent } from '@/data/launchPageContent';

export const FooterSection: React.FC = () => {
  const { footer } = launchPageContent;

  return (
    <footer className="relative py-16 bg-gray-900 border-t border-gray-800">
      <div className="max-w-7xl mx-auto px-6">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 mb-12">
          {/* Company Info */}
          <div className="lg:col-span-2">
            <h3 className="text-2xl font-bold text-white mb-4">Infinite Realms</h3>
            <p className="text-gray-400 leading-relaxed mb-6 max-w-md">{footer.description}</p>

            {/* Legal Disclaimer */}
            <div className="p-4 bg-gray-800/30 border border-gray-700/50 rounded-lg">
              <p className="text-sm text-gray-400 leading-relaxed">
                <span className="text-amber-400 font-semibold">Legal Note:</span>{' '}
                {footer.legal.ipDisclaimer}
              </p>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-lg font-semibold text-white mb-4">Resources</h4>
            <ul className="space-y-3">
              <li>
                <a
                  href="/contact"
                  className="text-gray-400 hover:text-purple-400 transition-colors duration-200 flex items-center gap-2"
                >
                  Contact Us
                  <ExternalLink className="w-4 h-4" />
                </a>
              </li>
              <li>
                <a
                  href={footer.links.discord}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-purple-400 transition-colors duration-200 flex items-center gap-2"
                >
                  <MessageCircle className="w-4 h-4" />
                  Discord Community
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/Garblesnarff"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-purple-400 transition-colors duration-200 flex items-center gap-2"
                >
                  Development Updates
                  <ExternalLink className="w-4 h-4" />
                </a>
              </li>
            </ul>
          </div>

          {/* Legal Links */}
          <div>
            <h4 className="text-lg font-semibold text-white mb-4">Legal</h4>
            <ul className="space-y-3">
              <li>
                <a
                  href={footer.links.privacy}
                  className="text-gray-400 hover:text-purple-400 transition-colors duration-200"
                >
                  Privacy Policy
                </a>
              </li>
              <li>
                <a
                  href={footer.links.terms}
                  className="text-gray-400 hover:text-purple-400 transition-colors duration-200"
                >
                  Terms of Service
                </a>
              </li>
              <li>
                <a
                  href="/cookies"
                  className="text-gray-400 hover:text-purple-400 transition-colors duration-200"
                >
                  Cookie Policy
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Newsletter Signup */}
        <div className="border-t border-gray-800 pt-12 mb-12">
          <div className="max-w-2xl mx-auto text-center">
            <h4 className="text-xl font-semibold text-white mb-4">Stay Updated</h4>
            <p className="text-gray-400 mb-6">
              Get notified when beta access opens and receive development updates.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
              <input
                type="email"
                placeholder="your.email@example.com"
                className="flex-1 px-4 py-3 bg-gray-800/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-400 transition-colors"
              />
              <Button className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 text-white px-6 py-3 rounded-lg font-semibold transition-all duration-300">
                Subscribe
              </Button>
            </div>
            <p className="text-xs text-gray-500 mt-3">
              Unsubscribe at any time. We respect your privacy.
            </p>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-gray-800 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2 text-gray-400 text-sm">
              <span>© 2025 {footer.legal.company}. All rights reserved.</span>
            </div>

            <div className="flex items-center gap-4">
              {/* Social Links */}
              <a
                href="https://github.com/Garblesnarff/ai-adventure-scribe"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-purple-400 transition-colors duration-200"
                aria-label="View on GitHub"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                </svg>
              </a>

              <a
                href="https://discord.gg/infinite-realms"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-purple-400 transition-colors duration-200"
                aria-label="Join Discord"
              >
                <MessageCircle className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Built with Love */}
          <div className="mt-8 text-center">
            <p className="text-gray-500 text-sm flex items-center justify-center gap-2">
              <span>Built with</span>
              <Heart className="w-4 h-4 text-red-400" />
              <span>for tabletop RPG enthusiasts</span>
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};
