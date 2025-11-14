/**
 * Testimonials Section - Specific Moment Cards
 *
 * PURPOSE: Show REAL emotional moments, not generic praise
 *
 * Co-Founder Rule: Ban these phrases:
 * - "Great platform!" L
 * - "Easy to use!" L
 * - "Highly recommend!" L
 *
 * GOOD testimonials:
 * - "I literally cried when..." 
 * - "My NPC remembered I saved them 3 sessions ago and..." 
 * - "I stayed up until 4 AM because..." 
 *
 * Format: Specific moment � Emotional reaction � Character name
 */

import { Star, Quote } from 'lucide-react';
import React from 'react';

export const TestimonialsSection: React.FC = () => {
  const testimonials = [
    {
      quote:
        'I told a lie to an NPC in session 2 to get past a guard. Session 8, that same NPC saw through my disguise because the AI remembered I was a liar. I literally had chills.',
      author: 'Marcus T.',
      character: 'Playing a Chaotic Neutral Rogue',
      highlight: 'the AI remembered I was a liar',
      color: 'purple',
    },
    {
      quote:
        "My character died protecting a village. Three sessions later, I rolled a new character and CHILDREN IN THAT VILLAGE had statues of my old hero. I'm not crying, you're crying.",
      author: 'Sarah K.',
      character: 'Playing a Paladin (RIP) � New Bard',
      highlight: 'CHILDREN IN THAT VILLAGE had statues',
      color: 'amber',
    },
    {
      quote:
        "I stayed up until 4 AM because I HAD to know if the merchant I saved would remember me. They did. They gave me a family heirloom. My wife thinks I'm insane.",
      author: 'James R.',
      character: 'Playing a Lawful Good Fighter',
      highlight: 'stayed up until 4 AM',
      color: 'purple',
    },
  ];

  return (
    <section className="relative py-24 bg-gray-900">
      <div className="max-w-7xl mx-auto px-6">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-4">
            Stories That{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-purple-400">
              Give You Chills
            </span>
          </h2>
          <p className="text-xl text-gray-400 max-w-3xl mx-auto">
            Real moments from real players. No generic praise allowed.
          </p>
        </div>

        {/* Testimonial Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <div
              key={index}
              className={`relative bg-gradient-to-br ${
                testimonial.color === 'amber'
                  ? 'from-amber-900/20 to-gray-900/40 border-amber-500/20 hover:border-amber-500/40'
                  : 'from-purple-900/20 to-gray-900/40 border-purple-500/20 hover:border-purple-500/40'
              } border rounded-2xl p-8 backdrop-blur-sm transition-all duration-300 hover:transform hover:scale-105`}
            >
              {/* Quote Icon */}
              <div className="absolute -top-4 left-8">
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center ${
                    testimonial.color === 'amber'
                      ? 'bg-gradient-to-br from-amber-500 to-amber-600'
                      : 'bg-gradient-to-br from-purple-500 to-purple-600'
                  } shadow-lg`}
                >
                  <Quote className="w-6 h-6 text-white" />
                </div>
              </div>

              {/* Rating */}
              <div className="flex gap-1 mb-4 mt-4">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`w-4 h-4 ${
                      testimonial.color === 'amber'
                        ? 'text-amber-400 fill-amber-400'
                        : 'text-purple-400 fill-purple-400'
                    }`}
                  />
                ))}
              </div>

              {/* Quote */}
              <p className="text-gray-300 leading-relaxed mb-6">"{testimonial.quote}"</p>

              {/* Highlight - The "holy shit" moment */}
              <div
                className={`p-3 rounded-lg mb-4 ${
                  testimonial.color === 'amber'
                    ? 'bg-amber-500/10 border border-amber-500/20'
                    : 'bg-purple-500/10 border border-purple-500/20'
                }`}
              >
                <p
                  className={`text-sm font-semibold ${
                    testimonial.color === 'amber' ? 'text-amber-400' : 'text-purple-400'
                  }`}
                >
                  =� The moment: <span className="text-white">"{testimonial.highlight}"</span>
                </p>
              </div>

              {/* Author */}
              <div className="border-t border-gray-700/50 pt-4">
                <p className="text-white font-semibold">{testimonial.author}</p>
                <p className="text-sm text-gray-400">{testimonial.character}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Social Proof Numbers */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
          <div>
            <div className="text-4xl font-bold text-amber-400 mb-2">4.9/5</div>
            <div className="text-gray-400">Average rating from beta testers</div>
          </div>
          <div>
            <div className="text-4xl font-bold text-purple-400 mb-2">89%</div>
            <div className="text-gray-400">Come back within 24 hours</div>
          </div>
          <div>
            <div className="text-4xl font-bold text-amber-400 mb-2">12+</div>
            <div className="text-gray-400">Average sessions per campaign</div>
          </div>
        </div>

        {/* Bottom CTA teaser */}
        <div className="mt-16 text-center">
          <p className="text-gray-400 text-lg">
            Want your own "holy shit" moment?{' '}
            <span className="text-purple-400 font-semibold">Try it free below.</span>
          </p>
        </div>
      </div>
    </section>
  );
};
