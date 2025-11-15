/**
 * Vision Section - Sell the Dream
 *
 * PURPOSE: Paint a vivid picture of the future AI Dungeon Master experience
 * Replaces social proof with visionary messaging about what's possible
 *
 * Enhanced with:
 * - Stagger animations for vision cards
 * - Enhanced hover effects with scale and glow
 * - Better visual hierarchy
 * - Interactive elements
 */

import { Sparkles, Heart, BookOpen } from 'lucide-react';
import React, { useState, useEffect, useRef } from 'react';

import { launchPageContent } from '@/data/launchPageContent';

export const VisionSection: React.FC = () => {
  const { vision } = launchPageContent;
  const [visibleCards, setVisibleCards] = useState<boolean[]>([false, false, false]);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry, index) => {
          if (entry.isIntersecting) {
            // Stagger the animation of cards
            setTimeout(() => {
              setVisibleCards((prev) => {
                const newVisible = [...prev];
                newVisible[index] = true;
                return newVisible;
              });
            }, index * 200); // 200ms delay between each card
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
    <section id="vision" className="relative py-24 bg-gray-900">
      <div className="max-w-7xl mx-auto px-6">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6">
            {vision.headline.split(' ').map((word, index) => (
              <span
                key={index}
                className={
                  index >= 4
                    ? 'text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-purple-400'
                    : ''
                }
              >
                {word}
                {index < vision.headline.split(' ').length - 1 ? ' ' : ''}
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
                  <p className="text-gray-300 text-lg leading-relaxed">{vision.quote}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Enhanced Vision Cards - What Makes It Special */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: Heart,
                title: 'Emotionally Intelligent',
                description:
                  'Not just smart—emotionally aware. The AI understands the feelings behind your choices, creating moments that surprise, delight, and genuinely move you.',
                gradient: 'from-purple-600/20 to-purple-800/20',
                iconBg: 'bg-purple-500/20',
                iconColor: 'text-purple-400',
                borderColor: 'border-purple-500/20',
                hoverBorder: 'hover:border-purple-500/40',
              },
              {
                icon: BookOpen,
                title: 'Cinematic Storytelling',
                description:
                  "Every session becomes a living story. Rich descriptions, vivid scenes, and narrative arcs that rival the best fantasy novels you've ever read.",
                gradient: 'from-amber-600/20 to-amber-800/20',
                iconBg: 'bg-amber-500/20',
                iconColor: 'text-amber-400',
                borderColor: 'border-amber-500/20',
                hoverBorder: 'hover:border-amber-500/40',
              },
              {
                icon: Sparkles,
                title: 'Infinitely Adaptable',
                description:
                  'No two adventures are the same. The AI learns your style, remembers your world, and creates experiences that feel personal and unique to you.',
                gradient: 'from-purple-600/20 to-amber-600/20',
                iconBg: 'bg-purple-500/20',
                iconColor: 'text-purple-400',
                borderColor: 'border-purple-500/20',
                hoverBorder: 'hover:border-purple-500/40',
              },
            ].map((card, index) => {
              const IconComponent = card.icon;
              return (
                <div
                  key={index}
                  ref={(el) => (cardRefs.current[index] = el)}
                  className={`relative group transform transition-all duration-700 ${
                    visibleCards[index] ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
                  }`}
                >
                  <div
                    className={`absolute inset-0 bg-gradient-to-br ${card.gradient} rounded-2xl blur opacity-0 group-hover:opacity-100 transition-opacity duration-500`}
                  ></div>
                  <div
                    className={`relative bg-gradient-to-br from-purple-900/40 to-gray-900/40 border ${card.borderColor} rounded-2xl p-8 backdrop-blur-sm ${card.hoverBorder} transition-all duration-500 hover:scale-105 hover:shadow-2xl`}
                  >
                    <div
                      className={`w-16 h-16 ${card.iconBg} rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-all duration-300 group-hover:rotate-3`}
                    >
                      <IconComponent className={`w-8 h-8 ${card.iconColor}`} />
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-4 group-hover:text-amber-400 transition-colors duration-300">
                      {card.title}
                    </h3>
                    <p className="text-gray-400 leading-relaxed group-hover:text-gray-300 transition-colors duration-300">
                      {card.description}
                    </p>
                  </div>
                </div>
              );
            })}
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
