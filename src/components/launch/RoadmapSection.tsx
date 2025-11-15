/**
 * Roadmap Section - Clear Beta Phases
 *
 * PURPOSE: Show transparent development timeline with clear phases and timelines
 * Features: Visual roadmap, status indicators, feature lists per phase
 */

import { CheckCircle, Clock, ArrowRight, Calendar } from 'lucide-react';
import React from 'react';

import { Badge } from '@/components/ui/badge';
import { launchPageContent } from '@/data/launchPageContent';

export const RoadmapSection: React.FC = () => {
  const { roadmap } = launchPageContent;

  /**
   * Get status styling for phases
   */
  const getPhaseStyling = (status: string) => {
    switch (status) {
      case 'current':
        return {
          badge: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
          icon: 'text-amber-400',
          bg: 'from-amber-900/40 to-gray-900/40 border-amber-500/20',
          glow: 'shadow-[0_0_20px_rgba(251,191,36,0.2)]',
        };
      case 'upcoming':
        return {
          badge: 'bg-gray-500/20 text-gray-300 border-gray-500/30',
          icon: 'text-gray-400',
          bg: 'from-gray-900/40 to-gray-800/40 border-gray-500/20',
          glow: '',
        };
      case 'completed':
        return {
          badge: 'bg-green-500/20 text-green-300 border-green-500/30',
          icon: 'text-green-400',
          bg: 'from-green-900/40 to-gray-900/40 border-green-500/20',
          glow: '',
        };
      default:
        return {
          badge: 'bg-gray-500/20 text-gray-300 border-gray-500/30',
          icon: 'text-gray-400',
          bg: 'from-gray-900/40 to-gray-800/40 border-gray-500/20',
          glow: '',
        };
    }
  };

  return (
    <section className="relative py-24 bg-gradient-to-b from-gray-900 to-purple-900/30">
      <div className="max-w-7xl mx-auto px-6">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-4">
            {roadmap.headline}
          </h2>
          <p className="text-xl text-gray-400 max-w-3xl mx-auto">{roadmap.subtitle}</p>
        </div>

        {/* Roadmap */}
        <div className="max-w-6xl mx-auto">
          <div className="space-y-8">
            {roadmap.phases.map((phase, index) => {
              const styling = getPhaseStyling(phase.status);

              return (
                <div key={index} className="relative">
                  {/* Timeline Line */}
                  {index < roadmap.phases.length - 1 && (
                    <div className="absolute left-8 top-16 w-0.5 h-16 bg-gradient-to-b from-purple-400 to-transparent hidden lg:block"></div>
                  )}

                  {/* Phase Card */}
                  <div
                    className={`relative bg-gradient-to-br ${styling.bg} rounded-2xl p-8 backdrop-blur-sm border transition-all duration-300 ${styling.glow}`}
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center gap-6">
                      {/* Phase Header */}
                      <div className="flex items-center gap-4">
                        {/* Phase Number */}
                        <div
                          className={`w-16 h-16 rounded-full flex items-center justify-center text-gray-900 text-xl font-bold ${phase.status === 'current' ? 'bg-gradient-to-br from-amber-400 to-amber-600' : 'bg-gray-600'}`}
                        >
                          {phase.phase}
                        </div>

                        {/* Phase Info */}
                        <div>
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-2xl font-bold text-white">{phase.title}</h3>
                            <Badge className={`${styling.badge} border`}>
                              {phase.status === 'current' && (
                                <>
                                  <Clock className="w-3 h-3 mr-1" />
                                  Current
                                </>
                              )}
                              {phase.status === 'upcoming' && 'Upcoming'}
                              {phase.status === 'completed' && (
                                <>
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                  Completed
                                </>
                              )}
                            </Badge>
                          </div>
                          <p className="text-gray-400 mb-2">{phase.description}</p>
                          <div className="flex items-center gap-2 text-sm text-gray-500">
                            <Calendar className="w-4 h-4" />
                            <span>{phase.timeline}</span>
                          </div>
                        </div>
                      </div>

                      {/* Features List */}
                      <div className="flex-1 lg:ml-8">
                        <h4 className="text-lg font-semibold text-white mb-4">Key Features</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {phase.features.map((feature, featureIndex) => (
                            <div key={featureIndex} className="flex items-center gap-2">
                              <div className={`w-2 h-2 rounded-full ${styling.icon}`}></div>
                              <span className="text-gray-300 text-sm">{feature}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Progress Indicator */}
          <div className="mt-16">
            <div className="max-w-2xl mx-auto">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm text-gray-400">Progress to Launch</span>
                <span className="text-sm text-amber-400 font-semibold">Phase 1 of 3</span>
              </div>
              <div className="w-full bg-gray-800/50 rounded-full h-3">
                <div className="bg-gradient-to-r from-amber-400 to-purple-400 h-3 rounded-full w-1/3 transition-all duration-500"></div>
              </div>
              <div className="flex justify-between mt-2 text-xs text-gray-500">
                <span>Closed Beta</span>
                <span>Open Beta</span>
                <span>Public Launch</span>
              </div>
            </div>
          </div>

          {/* Timeline Note */}
          <div className="mt-16 p-6 bg-gray-800/30 border border-gray-700/50 rounded-xl">
            <div className="flex items-start gap-4">
              <Clock className="w-6 h-6 text-amber-400 flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">Timeline Updates</h3>
                <p className="text-gray-400 leading-relaxed">
                  Our roadmap is flexible and will evolve based on beta feedback and technical
                  requirements. Major updates will be communicated to our beta community first, with
                  public updates shared regularly on our development blog.
                </p>
              </div>
            </div>
          </div>

          {/* Call to Action */}
          <div className="mt-16 text-center">
            <p className="text-gray-400 text-lg mb-4">Want to influence our roadmap?</p>
            <p className="text-purple-400 font-semibold">
              Join the beta and help us prioritize features
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};
