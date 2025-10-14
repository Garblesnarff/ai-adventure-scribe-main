/**
 * Vision Section - Sell the Dream
 *
 * PURPOSE: Paint a vivid picture of the future AI Dungeon Master experience
 * Replaces social proof with visionary messaging about what's possible
 */

import React from 'react';
import { Sparkles, Heart, BookOpen } from 'lucide-react';
import { launchPageContent } from '@/data/launchPageContent';

export const VisionSection: React.FC = () => {
  const { vision } = launchPageContent;

  return (
    <section id="vision" className="relative py-24 bg-gray-900">
      <div className="max-w-7xl mx-auto px-6">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6">
            {vision.headline.split(' ').map((word, index) => (
              <span key={index} className={index >= 4 ? "text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-purple-400" : ""}>
                {word}{index < vision.headline.split(' ').length - 1 ? " " : ""}
                {index === 3 && <br className="hidden sm:block" />}
              </span>
            ))}
          </h2>
        </div>

        {/* Main Vision Content */}
        <div className="max-w-5xl mx-auto">
          {/* Vision Statement */}
          <div className="relative mb-16">
            <div className="absolute -left-4 top-0 hidden lg:block">
              <div className="w-1 h-full bg-gradient-to-b from-amber-400 to-purple-400 rounded-full"></div>
            </div>

            <div className="pl-0 lg:pl-8">
              <p className="text-xl sm:text-2xl text-gray-300 leading-relaxed mb-8 font-light">
                {vision.content}
              </p>

              <div className="flex items-start gap-4 p-6 bg-gradient-to-r from-purple-900/20 to-amber-900/20 border border-purple-500/20 rounded-xl">
                <Sparkles className="w-8 h-8 text-amber-400 flex-shrink-0 mt-1" />
                <div>
                  <p className="text-lg text-amber-400 font-semibold mb-2">Our Vision</p>
                  <p className="text-gray-300 text-lg leading-relaxed">
                    {vision.quote}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Vision Cards - What Makes It Special */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-600/20 to-purple-800/20 rounded-2xl blur opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative bg-gradient-to-br from-purple-900/40 to-gray-900/40 border border-purple-500/20 rounded-2xl p-8 backdrop-blur-sm hover:border-purple-500/40 transition-all duration-300">
                <div className="w-14 h-14 bg-purple-500/20 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <Heart className="w-7 h-7 text-purple-400" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-4">
                  Emotionally Intelligent
                </h3>
                <p className="text-gray-400 leading-relaxed">
                  Not just smart—emotionally aware. The AI understands the feelings behind your choices,
                  creating moments that surprise, delight, and genuinely move you.
                </p>
              </div>
            </div>

            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-br from-amber-600/20 to-amber-800/20 rounded-2xl blur opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative bg-gradient-to-br from-amber-900/40 to-gray-900/40 border border-amber-500/20 rounded-2xl p-8 backdrop-blur-sm hover:border-amber-500/40 transition-all duration-300">
                <div className="w-14 h-14 bg-amber-500/20 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <BookOpen className="w-7 h-7 text-amber-400" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-4">
                  Cinematic Storytelling
                </h3>
                <p className="text-gray-400 leading-relaxed">
                  Every session becomes a living story. Rich descriptions, vivid scenes, and narrative
                  arcs that rival the best fantasy novels you've ever read.
                </p>
              </div>
            </div>

            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-600/20 to-amber-600/20 rounded-2xl blur opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative bg-gradient-to-br from-purple-900/40 to-amber-900/40 border border-purple-500/20 rounded-2xl p-8 backdrop-blur-sm hover:border-purple-500/40 transition-all duration-300">
                <div className="w-14 h-14 bg-purple-500/20 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <Sparkles className="w-7 h-7 text-purple-400" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-4">
                  Infinitely Adaptable
                </h3>
                <p className="text-gray-400 leading-relaxed">
                  No two adventures are the same. The AI learns your style, remembers your world,
                  and creates experiences that feel personal and unique to you.
                </p>
              </div>
            </div>
          </div>

          {/* Call to Action */}
          <div className="mt-16 text-center">
            <p className="text-gray-400 text-lg mb-6">
              This is the future of solo RPGs. Be first to live it.
            </p>
            <div className="inline-flex items-center gap-2 text-amber-400 text-sm">
              <Sparkles className="w-4 h-4 animate-pulse" />
              <span>Join the beta waitlist now</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
