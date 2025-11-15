/**
 * Team Section - Personal Connection
 *
 * PURPOSE: Build trust and authenticity through personal team introduction
 * Replaces testimonials with genuine founder story and passion for D&D
 */

import { Github, Linkedin, ExternalLink } from 'lucide-react';
import React from 'react';

import { Button } from '@/components/ui/button';
import { launchPageContent } from '@/data/launchPageContent';

export const TeamSection: React.FC = () => {
  const { team } = launchPageContent;

  return (
    <section className="relative py-24 bg-gray-900">
      <div className="max-w-7xl mx-auto px-6">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-4">
            {team.headline}
          </h2>
          <p className="text-xl text-gray-400 max-w-3xl mx-auto">{team.subtitle}</p>
        </div>

        {/* Team Members */}
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Team Member Info */}
            <div className="space-y-8">
              {team.members.map((member, index) => (
                <div key={index} className="relative">
                  <div className="flex items-start gap-6">
                    {/* Avatar Placeholder */}
                    <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-amber-500 rounded-full flex items-center justify-center text-white text-2xl font-bold flex-shrink-0">
                      {member.name
                        .split(' ')
                        .map((n) => n[0])
                        .join('')}
                    </div>

                    {/* Member Details */}
                    <div className="flex-1">
                      <h3 className="text-2xl font-bold text-white mb-2">{member.name}</h3>
                      <p className="text-amber-400 font-semibold mb-4">{member.role}</p>
                      <p className="text-gray-300 leading-relaxed mb-4">{member.bio}</p>

                      {/* Social Links */}
                      {member.links && (
                        <div className="flex gap-3">
                          {member.links.github && (
                            <Button
                              variant="outline"
                              size="sm"
                              asChild
                              className="border-gray-600 hover:border-purple-400 text-gray-300 hover:text-purple-300"
                            >
                              <a
                                href={member.links.github}
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label={`${member.name} on GitHub`}
                              >
                                <Github className="w-4 h-4" />
                              </a>
                            </Button>
                          )}
                          {member.links.linkedin && (
                            <Button
                              variant="outline"
                              size="sm"
                              asChild
                              className="border-gray-600 hover:border-purple-400 text-gray-300 hover:text-purple-300"
                            >
                              <a
                                href={member.links.linkedin}
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label={`${member.name} on LinkedIn`}
                              >
                                <Linkedin className="w-4 h-4" />
                              </a>
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Divider (except for last member) */}
                  {index < team.members.length - 1 && (
                    <div className="mt-8 border-t border-gray-700/50"></div>
                  )}
                </div>
              ))}
            </div>

            {/* Team Story Card */}
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-600/20 to-amber-600/20 rounded-2xl blur opacity-50"></div>
              <div className="relative bg-gradient-to-br from-gray-800/50 to-gray-900/50 border border-gray-700/50 rounded-2xl p-8 backdrop-blur-sm">
                <h3 className="text-2xl font-bold text-white mb-6">Our Story</h3>

                <div className="space-y-4 text-gray-300 leading-relaxed">
                  <p>
                    Like many of you, I've spent countless nights around gaming tables, dice in
                    hand, creating stories that become legendary memories. But I've also experienced
                    the frustration of campaigns that fizzle out when schedules don't align.
                  </p>

                  <p>
                    The AI Dungeon Master isn't just a product—it's my attempt to solve a problem
                    I've lived with as both a player and a DM. I want to create something that
                    captures the magic of tabletop RPGs while making them accessible to everyone.
                  </p>

                  <p>
                    This project combines my love for D&D with my experience as a developer to build
                    something truly special. Every feature, every line of code, comes from a genuine
                    passion for creating unforgettable adventures.
                  </p>
                </div>

                {/* Contact CTA */}
                <div className="mt-8 p-4 bg-purple-900/20 border border-purple-500/20 rounded-lg">
                  <p className="text-sm text-purple-300 mb-3">
                    Want to share your D&D stories or join the conversation?
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    asChild
                    className="border-purple-500/50 hover:border-purple-400 text-purple-300 hover:text-purple-200"
                  >
                    <a href="/contact" className="flex items-center gap-2">
                      Get in Touch
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Team Values */}
          <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center p-6 bg-gradient-to-br from-purple-900/20 to-gray-900/40 border border-purple-500/20 rounded-xl">
              <div className="w-12 h-12 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🎲</span>
              </div>
              <h4 className="text-lg font-semibold text-white mb-2">Player First</h4>
              <p className="text-sm text-gray-400">
                Every decision we make prioritizes the player experience and the magic of tabletop
                RPGs.
              </p>
            </div>

            <div className="text-center p-6 bg-gradient-to-br from-amber-900/20 to-gray-900/40 border border-amber-500/20 rounded-xl">
              <div className="w-12 h-12 bg-amber-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🚀</span>
              </div>
              <h4 className="text-lg font-semibold text-white mb-2">Innovation</h4>
              <p className="text-sm text-gray-400">
                We're pushing the boundaries of what's possible with AI and interactive
                storytelling.
              </p>
            </div>

            <div className="text-center p-6 bg-gradient-to-br from-purple-900/20 to-amber-900/20 border border-purple-500/20 rounded-xl">
              <div className="w-12 h-12 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🤝</span>
              </div>
              <h4 className="text-lg font-semibold text-white mb-2">Community</h4>
              <p className="text-sm text-gray-400">
                We're building this together with our community of beta testers and D&D enthusiasts.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
