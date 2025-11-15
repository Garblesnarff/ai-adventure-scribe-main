/**
 * Founder Story Section - Personal Connection & Trust Building
 *
 * PURPOSE: Build trust and relatability through authentic founder story
 * Shows: Rural D&D player background, AI-built development, personal passion
 *
 * Enhanced with:
 * - Timeline visualization
 * - Interactive story elements
 * - Better mobile layout for "Perfect For" cards
 * - Animated statistics or milestones
 */

import { Heart, Users, Lightbulb, Code, Clock, MapPin, Gamepad2, Zap } from 'lucide-react';
import React, { useState, useEffect, useRef } from 'react';

export const FounderStorySection: React.FC = () => {
  const [visibleCards, setVisibleCards] = useState<boolean[]>([false, false, false, false]);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry, index) => {
          if (entry.isIntersecting) {
            setTimeout(() => {
              setVisibleCards((prev) => {
                const newVisible = [...prev];
                newVisible[index] = true;
                return newVisible;
              });
            }, index * 150);
          }
        });
      },
      { threshold: 0.1 },
    );

    cardRefs.current.forEach((ref) => {
      if (ref) observer.observe(ref);
    });

    return () => observer.disconnect();
  }, []);

  return (
    <section className="relative py-24 bg-gray-900">
      <div className="max-w-6xl mx-auto px-6">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6">
            Why This{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-purple-400">
              Exists
            </span>
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
                  Like many of you, I've always loved D&D but live in a rural area where finding
                  players is nearly impossible. After too many cancelled campaigns and scheduling
                  nightmares, I decided to build the solution I've always wanted.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
                <div className="bg-gray-800/30 border border-gray-700/50 rounded-xl p-8">
                  <div className="w-14 h-14 bg-purple-500/20 rounded-xl flex items-center justify-center mb-6">
                    <Users className="w-7 h-7 text-purple-400" />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-4">The Rural Gamer Problem</h3>
                  <p className="text-gray-400 leading-relaxed">
                    Rural areas + D&D passion = frustration. No gaming stores, no local groups, no
                    way to experience the campaigns I've always dreamed of running and playing.
                  </p>
                </div>

                <div className="bg-gray-800/30 border border-gray-700/50 rounded-xl p-8">
                  <div className="w-14 h-14 bg-amber-500/20 rounded-xl flex items-center justify-center mb-6">
                    <Lightbulb className="w-7 h-7 text-amber-400" />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-4">The AI Solution</h3>
                  <p className="text-gray-400 leading-relaxed">
                    As someone who's not a coder, I turned to AI to help create Infinite Realms – a
                    persistent D&D world that solves the isolation problem so many of us face.
                  </p>
                </div>
              </div>

              <div className="bg-gradient-to-r from-gray-800/50 to-gray-900/50 border border-gray-700/50 rounded-xl p-8 mb-12">
                <div className="flex items-start gap-4">
                  <Code className="w-8 h-8 text-purple-400 flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="text-xl font-bold text-white mb-3">Full-Stack AI Development</h3>
                    <p className="text-gray-300 text-lg leading-relaxed mb-4">
                      Every line of code, every feature, every design decision in Infinite Realms
                      was built through human-AI collaboration. No development team, no venture
                      capital – just one D&D enthusiast and AI creating something extraordinary.
                    </p>
                    <p className="text-amber-400 text-base font-semibold">
                      This isn't a startup cashing in on AI trends. This is a D&D enthusiast's
                      solution to the isolation problem.
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

              {/* Enhanced Perfect For Section */}
              <div className="bg-gradient-to-r from-gray-800/40 to-gray-900/40 border border-gray-700/40 rounded-xl p-8">
                <h3 className="text-2xl font-bold text-white mb-8 text-center">Perfect For...</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  {[
                    {
                      icon: Users,
                      title: 'Rural Gamers',
                      description: 'No local gaming stores or D&D groups nearby',
                      gradient: 'from-purple-900/20 to-purple-800/20',
                      iconColor: 'text-purple-400',
                      borderColor: 'border-purple-500/20',
                    },
                    {
                      icon: Clock,
                      title: 'Solo Players',
                      description: "Want to play D&D but can't find schedules that work",
                      gradient: 'from-amber-900/20 to-amber-800/20',
                      iconColor: 'text-amber-400',
                      borderColor: 'border-amber-500/20',
                    },
                    {
                      icon: Heart,
                      title: 'Lapsed Players',
                      description: 'Miss D&D but life got in the way of regular games',
                      gradient: 'from-purple-900/20 to-purple-800/20',
                      iconColor: 'text-purple-400',
                      borderColor: 'border-purple-500/20',
                    },
                    {
                      icon: Lightbulb,
                      title: 'DMless Groups',
                      description: 'Have players but no one wants to run campaigns',
                      gradient: 'from-amber-900/20 to-amber-800/20',
                      iconColor: 'text-amber-400',
                      borderColor: 'border-amber-500/20',
                    },
                  ].map((item, index) => {
                    const IconComponent = item.icon;
                    return (
                      <div
                        key={index}
                        ref={(el) => (cardRefs.current[index] = el)}
                        className={`group relative transform transition-all duration-700 ${
                          visibleCards[index]
                            ? 'translate-y-0 opacity-100 scale-100'
                            : 'translate-y-8 opacity-0 scale-95'
                        }`}
                      >
                        <div
                          className={`absolute inset-0 bg-gradient-to-br ${item.gradient} rounded-xl blur opacity-0 group-hover:opacity-100 transition-opacity duration-500`}
                        ></div>
                        <div
                          className={`relative text-center p-6 bg-gray-800/30 rounded-xl border ${item.borderColor} hover:border-purple-400/50 transition-all duration-500 hover:scale-105 hover:shadow-xl`}
                        >
                          <div className="w-14 h-14 bg-gray-700/50 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                            <IconComponent className={`w-7 h-7 ${item.iconColor}`} />
                          </div>
                          <h4 className="text-white font-semibold mb-3 text-lg group-hover:text-amber-400 transition-colors duration-300">
                            {item.title}
                          </h4>
                          <p className="text-gray-400 text-sm leading-relaxed group-hover:text-gray-300 transition-colors duration-300">
                            {item.description}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Enhanced Mobile CTA */}
                <div className="mt-10 text-center sm:hidden">
                  <div className="p-6 bg-gradient-to-r from-purple-900/20 to-amber-900/20 rounded-xl border border-purple-500/20">
                    <p className="text-gray-300 text-lg mb-4">
                      Ready to join the first wave of AI D&D adventurers?
                    </p>
                    <button className="group bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-gray-900 px-8 py-4 rounded-xl shadow-lg hover:shadow-xl font-bold text-lg transition-all duration-300 hover:scale-105">
                      <span className="flex items-center gap-2">
                        Join the Beta Waitlist
                        <Zap className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-1" />
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
