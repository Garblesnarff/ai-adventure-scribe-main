/**
 * Benefits Section - 6 Bento Box Grid with Emotional Outcomes
 *
 * PURPOSE: Show FEELINGS users will experience, NOT features they'll get
 *
 * Co-Founder Approved Benefits (Emotion-Driven):
 * 1. "Your Choices Have Consequences - For Once"
 * 2. "The AI Learns How YOU Think - And Plans Against You"
 * 3. "Build a World So Real, You'll Feel Guilty Leaving It"
 * 4. "Every Session Writes Your Personal Fantasy Novel"
 * 5. "No Scheduling. No Rulebooks. No Awkward First Sessions."
 * 6. "Play Your Way - Dark Lord, Hero, or Chaotic Wildcard"
 *
 * Design Pattern: Bento boxes (varying sizes for visual interest)
 * Messaging Rule: If it sounds like a feature list → Delete it
 */

import { Brain, Heart, BookOpen, Clock, Zap, Sword } from 'lucide-react';
import React from 'react';

export const BenefitsSection: React.FC = () => {
  return (
    <section id="benefits" className="relative py-24 bg-gray-900">
      <div className="max-w-7xl mx-auto px-6">
        {/* Section Header - Emotion hook */}
        <div className="text-center mb-16">
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-4">
            Finally, An RPG That{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-purple-400">
              Adapts to You
            </span>
          </h2>
          <p className="text-xl text-gray-400 max-w-3xl mx-auto">
            Not another campaign that forgets what you did last session. This is personal.
          </p>
        </div>

        {/* Bento Grid - Asymmetric layout for visual interest */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Benefit 1 - Large spotlight card */}
          <div className="lg:col-span-2 bg-gradient-to-br from-purple-900/40 to-gray-900/40 border border-purple-500/20 rounded-2xl p-8 backdrop-blur-sm hover:border-purple-500/40 transition-all duration-300 group">
            <div className="w-14 h-14 bg-purple-500/20 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <Brain className="w-7 h-7 text-purple-400" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-3">
              Your Choices Have Consequences - For Once
            </h3>
            <p className="text-gray-400 leading-relaxed">
              Betray an NPC? They remember. Show mercy to an enemy? They'll return the favor. Every
              decision ripples through your world, creating a story that's{' '}
              <span className="text-purple-400 font-semibold">uniquely yours</span>.
            </p>
          </div>

          {/* Benefit 2 */}
          <div className="bg-gradient-to-br from-amber-900/40 to-gray-900/40 border border-amber-500/20 rounded-2xl p-8 backdrop-blur-sm hover:border-amber-500/40 transition-all duration-300 group">
            <div className="w-14 h-14 bg-amber-500/20 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <Zap className="w-7 h-7 text-amber-400" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-3">The AI Learns How YOU Think</h3>
            <p className="text-gray-400 leading-relaxed">
              It tracks your playstyle. If you're a sneaky diplomat, NPCs start posting guards. If
              you charge into battle, enemies lay traps.{' '}
              <span className="text-amber-400 font-semibold">It adapts</span>.
            </p>
          </div>

          {/* Benefit 3 */}
          <div className="bg-gradient-to-br from-purple-900/40 to-gray-900/40 border border-purple-500/20 rounded-2xl p-8 backdrop-blur-sm hover:border-purple-500/40 transition-all duration-300 group">
            <div className="w-14 h-14 bg-purple-500/20 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <Heart className="w-7 h-7 text-purple-400" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-3">
              A World So Real, You'll Feel Guilty Leaving
            </h3>
            <p className="text-gray-400 leading-relaxed">
              NPCs with real motivations. Cities that evolve. A living world that continues even
              when you're not playing.{' '}
              <span className="text-purple-400 font-semibold">It waits for you</span>.
            </p>
          </div>

          {/* Benefit 4 - Large spotlight card */}
          <div className="lg:col-span-2 bg-gradient-to-br from-amber-900/40 to-gray-900/40 border border-amber-500/20 rounded-2xl p-8 backdrop-blur-sm hover:border-amber-500/40 transition-all duration-300 group">
            <div className="w-14 h-14 bg-amber-500/20 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <BookOpen className="w-7 h-7 text-amber-400" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-3">
              Every Session Writes Your Personal Fantasy Novel
            </h3>
            <p className="text-gray-400 leading-relaxed">
              Not bullet points. Not logs. Full narrative storytelling that captures your epic
              moments. Export your campaign as a{' '}
              <span className="text-amber-400 font-semibold">beautifully formatted story</span>{' '}
              you'll actually want to read.
            </p>
          </div>

          {/* Benefit 5 */}
          <div className="bg-gradient-to-br from-purple-900/40 to-gray-900/40 border border-purple-500/20 rounded-2xl p-8 backdrop-blur-sm hover:border-purple-500/40 transition-all duration-300 group">
            <div className="w-14 h-14 bg-purple-500/20 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <Clock className="w-7 h-7 text-purple-400" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-3">No Scheduling. No Rulebooks.</h3>
            <p className="text-gray-400 leading-relaxed">
              3 AM on a Tuesday? Your DM is ready. Don't know the difference between a d12 and a
              d20?
              <span className="text-purple-400 font-semibold"> Doesn't matter</span>. Just play.
            </p>
          </div>

          {/* Benefit 6 */}
          <div className="lg:col-span-3 bg-gradient-to-br from-amber-900/40 to-gray-900/40 border border-amber-500/20 rounded-2xl p-8 backdrop-blur-sm hover:border-amber-500/40 transition-all duration-300 group">
            <div className="w-14 h-14 bg-amber-500/20 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <Sword className="w-7 h-7 text-amber-400" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-3">
              Play Your Way - Dark Lord, Hero, or Chaotic Wildcard
            </h3>
            <p className="text-gray-400 leading-relaxed max-w-4xl">
              Want to be the villain? Go for it. The hero? Classic. The chaotic neutral wildcard who
              steals from the party? We won't judge. The AI responds to{' '}
              <span className="text-amber-400 font-semibold">who you actually are</span>, not who
              you're "supposed" to be.
            </p>
          </div>
        </div>

        {/* Bottom CTA teaser */}
        <div className="mt-16 text-center">
          <p className="text-gray-400 text-lg mb-4">
            Sound too good to be true?{' '}
            <span className="text-purple-400 font-semibold">Try it yourself.</span>
          </p>
          <div className="inline-flex items-center gap-2 text-amber-400 text-sm">
            <Zap className="w-4 h-4" />
            <span>30-second instant demo below</span>
          </div>
        </div>
      </div>
    </section>
  );
};
