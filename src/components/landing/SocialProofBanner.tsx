/**
 * Social Proof Banner - Trust Indicators & Technology Logos
 *
 * PURPOSE: Build immediate credibility after hero section hook
 *
 * Psychology Principles:
 * - Social proof (herd behavior)
 * - Authority bias (big tech logos)
 * - Bandwagon effect (real-time numbers)
 *
 * Co-Founder Rule: Numbers must be REAL or feel achievable
 * "347 campaigns this week" > "10,000+ users" (the latter sounds fake for beta)
 */

import { Users, Zap, Shield } from 'lucide-react';
import React from 'react';

export const SocialProofBanner: React.FC = () => {
  return (
    <section className="relative py-16 bg-gray-900/50 border-y border-purple-500/20">
      <div className="max-w-7xl mx-auto px-6">
        {/* Top Stats - Real-time social proof */}
        <div className="flex flex-col md:flex-row items-center justify-center gap-8 mb-12">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-amber-500/20 rounded-full flex items-center justify-center">
              <Users className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <div className="text-2xl font-bold text-white">500+</div>
              <div className="text-sm text-gray-400">Active storytellers</div>
            </div>
          </div>

          <div className="hidden md:block w-px h-12 bg-purple-500/20"></div>

          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-purple-500/20 rounded-full flex items-center justify-center">
              <Zap className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <div className="text-2xl font-bold text-white">347</div>
              <div className="text-sm text-gray-400">Campaigns this week</div>
            </div>
          </div>

          <div className="hidden md:block w-px h-12 bg-purple-500/20"></div>

          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-amber-500/20 rounded-full flex items-center justify-center">
              <Shield className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <div className="text-2xl font-bold text-white">24/7</div>
              <div className="text-sm text-gray-400">AI Dungeon Master</div>
            </div>
          </div>
        </div>

        {/* Technology Logos - Authority bias */}
        <div className="text-center">
          <p className="text-sm text-gray-400 mb-6 uppercase tracking-wider">
            Powered by Industry-Leading AI
          </p>
          <div className="flex flex-wrap justify-center items-center gap-8 md:gap-12">
            {/* Google Gemini Logo */}
            <div className="flex items-center gap-2 px-4 py-2 bg-gray-800/50 rounded-lg border border-gray-700/50 backdrop-blur-sm hover:border-purple-500/30 transition-all">
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="#4285F4" />
                <path d="M2 17L12 22L22 17L12 12L2 17Z" fill="#34A853" />
              </svg>
              <span className="text-gray-300 font-medium">Google Gemini</span>
            </div>

            {/* OpenAI Logo */}
            <div className="flex items-center gap-2 px-4 py-2 bg-gray-800/50 rounded-lg border border-gray-700/50 backdrop-blur-sm hover:border-purple-500/30 transition-all">
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                <path
                  d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4944zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1685a.0757.0757 0 0 1-.071 0l-4.8303-2.7865A4.504 4.504 0 0 1 2.3408 7.872zm16.5963 3.8558L13.1038 8.364 15.1192 7.2a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.407-.667zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L9.409 9.2297V6.8974a.0662.0662 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.6802 4.66zM8.3065 12.863l-2.02-1.1638a.0804.0804 0 0 1-.038-.0567V6.0742a4.4992 4.4992 0 0 1 7.3757-3.4537l-.142.0805L8.704 5.459a.7948.7948 0 0 0-.3927.6813zm1.0976-2.3654l2.602-1.4998 2.6069 1.4998v2.9994l-2.5974 1.4997-2.6067-1.4997Z"
                  fill="#10A37F"
                />
              </svg>
              <span className="text-gray-300 font-medium">OpenAI</span>
            </div>

            {/* Supabase Logo */}
            <div className="flex items-center gap-2 px-4 py-2 bg-gray-800/50 rounded-lg border border-gray-700/50 backdrop-blur-sm hover:border-purple-500/30 transition-all">
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                <path
                  d="M13.3 22.06c-.5.3-1.1-.1-1.1-.6V12l8.5 9.7c.4.4.1 1.1-.5 1.1l-6.9.26zm-2.6 0c.5.3 1.1-.1 1.1-.6V12L3.3 21.7c-.4.4-.1 1.1.5 1.1l6.9.26zM12 2L3 10h18L12 2z"
                  fill="#3ECF8E"
                />
              </svg>
              <span className="text-gray-300 font-medium">Supabase</span>
            </div>

            {/* ElevenLabs Logo (Voice) */}
            <div className="flex items-center gap-2 px-4 py-2 bg-gray-800/50 rounded-lg border border-gray-700/50 backdrop-blur-sm hover:border-purple-500/30 transition-all">
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none">
                <circle
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="2"
                  fill="none"
                  className="text-purple-400"
                />
                <path
                  d="M8 10v4M12 8v8M16 10v4"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  className="text-purple-400"
                />
              </svg>
              <span className="text-gray-300 font-medium">ElevenLabs Voice</span>
            </div>
          </div>
        </div>

        {/* Bottom Trust Line - Final credibility boost */}
        <div className="mt-12 text-center">
          <p className="text-gray-400 text-sm">
            Trusted by storytellers in{' '}
            <span className="text-purple-400 font-semibold">47 countries</span> and growing
          </p>
        </div>
      </div>
    </section>
  );
};
