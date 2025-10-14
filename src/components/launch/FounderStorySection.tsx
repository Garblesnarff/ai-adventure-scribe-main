/**
 * Founder Story Section - Personal Connection & Trust Building
 *
 * PURPOSE: Build trust and relatability through authentic founder story
 * Shows: Rural D&D player background, AI-built development, personal passion
 */

import React from 'react';
import { Heart, Users, Lightbulb, Code, Clock } from 'lucide-react';

export const FounderStorySection: React.FC = () => {
  return (
    <section className="relative py-24 bg-gray-900">
      <div className="max-w-6xl mx-auto px-6">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6">
            Why This <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-purple-400">Exists</span>
          </h2>
          <p className="text-xl text-gray-400 max-w-3xl mx-auto">
            The personal story behind Infinite Realms – and why it matters to you
          </p>
        </div>

        {/* Main Story Content */}
        <div className="max-w-5xl mx-auto">
          {/* Story Introduction */}
          <div className="relative mb-16">
            <div className="absolute -left-4 top-0 hidden lg:block">
              <div className="w-1 h-full bg-gradient-to-b from-amber-400 to-purple-400 rounded-full"></div>
            </div>

            <div className="pl-0 lg:pl-8">
              <div className="bg-gradient-to-br from-purple-900/20 to-gray-900/20 border border-purple-500/20 rounded-2xl p-8 mb-12">
                <p className="text-xl sm:text-2xl text-gray-300 leading-relaxed font-light">
                  Like many of you, I've always loved D&D but live in a rural area where finding players is nearly impossible.
                  After too many cancelled campaigns and scheduling nightmares, I decided to build the solution I've always wanted.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
                <div className="bg-gray-800/30 border border-gray-700/50 rounded-xl p-8">
                  <div className="w-14 h-14 bg-purple-500/20 rounded-xl flex items-center justify-center mb-6">
                    <Users className="w-7 h-7 text-purple-400" />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-4">
                    The Rural Gamer Problem
                  </h3>
                  <p className="text-gray-400 leading-relaxed">
                    Rural areas + D&D passion = frustration. No gaming stores, no local groups, no way to experience the campaigns I've always dreamed of running and playing.
                  </p>
                </div>

                <div className="bg-gray-800/30 border border-gray-700/50 rounded-xl p-8">
                  <div className="w-14 h-14 bg-amber-500/20 rounded-xl flex items-center justify-center mb-6">
                    <Lightbulb className="w-7 h-7 text-amber-400" />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-4">
                    The AI Solution
                  </h3>
                  <p className="text-gray-400 leading-relaxed">
                    As someone who's not a coder, I turned to AI to help create Infinite Realms – a persistent D&D world that solves the isolation problem so many of us face.
                  </p>
                </div>
              </div>

              <div className="bg-gradient-to-r from-gray-800/50 to-gray-900/50 border border-gray-700/50 rounded-xl p-8 mb-12">
                <div className="flex items-start gap-4">
                  <Code className="w-8 h-8 text-purple-400 flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="text-xl font-bold text-white mb-3">Full-Stack AI Development</h3>
                    <p className="text-gray-300 text-lg leading-relaxed mb-4">
                      Every line of code, every feature, every design decision in Infinite Realms was built through human-AI collaboration.
                      No development team, no venture capital – just one D&D enthusiast and AI creating something extraordinary.
                    </p>
                    <p className="text-amber-400 text-base font-semibold">
                      This isn't a startup cashing in on AI trends. This is a D&D enthusiast's solution to the isolation problem.
                    </p>
                  </div>
                </div>
              </div>

              <div className="text-center mb-8">
                <div className="inline-flex items-center gap-4 p-6 bg-gradient-to-r from-purple-900/30 to-amber-900/30 border border-purple-500/30 rounded-xl">
                  <Heart className="w-8 h-8 text-red-400" />
                  <div className="text-left">
                    <p className="text-lg text-white font-semibold mb-1">
                      Built with ❤️ for tabletop RPG enthusiasts
                    </p>
                    <p className="text-gray-400">
                      If I can build this, imagine what you can create with Infinite Realms
                    </p>
                  </div>
                </div>
              </div>

              {/* Perfect For Section */}
              <div className="bg-gradient-to-r from-gray-800/40 to-gray-900/40 border border-gray-700/40 rounded-xl p-8">
                <h3 className="text-2xl font-bold text-white mb-6 text-center">
                  Perfect For...
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-purple-900/20 rounded-lg border border-purple-500/20">
                    <Users className="w-8 h-8 text-purple-400 mx-auto mb-3" />
                    <h4 className="text-white font-semibold mb-2">Rural Gamers</h4>
                    <p className="text-gray-400 text-sm">No local gaming stores or D&D groups nearby</p>
                  </div>
                  <div className="text-center p-4 bg-amber-900/20 rounded-lg border border-amber-500/20">
                    <Clock className="w-8 h-8 text-amber-400 mx-auto mb-3" />
                    <h4 className="text-white font-semibold mb-2">Solo Players</h4>
                    <p className="text-gray-400 text-sm">Want to play D&D but can't find schedules that work</p>
                  </div>
                  <div className="text-center p-4 bg-purple-900/20 rounded-lg border border-purple-500/20">
                    <Heart className="w-8 h-8 text-purple-400 mx-auto mb-3" />
                    <h4 className="text-white font-semibold mb-2">Lapsed Players</h4>
                    <p className="text-gray-400 text-sm">Miss D&D but life got in the way of regular games</p>
                  </div>
                  <div className="text-center p-4 bg-amber-900/20 rounded-lg border border-amber-500/20">
                    <Lightbulb className="w-8 h-8 text-amber-400 mx-auto mb-3" />
                    <h4 className="text-white font-semibold mb-2">DMless Groups</h4>
                    <p className="text-gray-400 text-sm">Have players but no one wants to run campaigns</p>
                  </div>
                </div>

                {/* Mobile CTA */}
                <div className="mt-8 text-center sm:hidden">
                  <p className="text-gray-300 text-lg mb-4">
                    Ready to join the first wave of AI D&D adventurers?
                  </p>
                  <button className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-gray-900 px-8 py-4 rounded-xl shadow-lg font-bold text-lg transition-all duration-300">
                    Join the Beta Waitlist
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
