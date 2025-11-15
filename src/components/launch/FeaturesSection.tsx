/**
 * Features Section - Planned Features with Status
 *
 * PURPOSE: Showcase what we're building with clear development status
 * Features: Status badges, future-oriented language, transparent roadmap
 */

import {
  Brain,
  Image,
  Users,
  BookOpen,
  Mic,
  Download,
  Clock,
  CheckCircle,
  Wrench,
  Zap,
} from 'lucide-react';
import React from 'react';

import { Badge } from '@/components/ui/badge';
import { launchPageContent } from '@/data/launchPageContent';

export const FeaturesSection: React.FC = () => {
  const { features } = launchPageContent;

  /**
   * Get icon component by name
   */
  const getIcon = (iconName: string) => {
    const icons = {
      Brain,
      Image,
      Users,
      BookOpen,
      Mic,
      Download,
      Clock,
      CheckCircle,
      Wrench,
      Zap,
    };
    return icons[iconName as keyof typeof icons] || Brain;
  };

  /**
   * Get status styling
   */
  const getStatusStyling = (status: string) => {
    switch (status) {
      case 'in_development':
        return {
          badge: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
          icon: 'text-purple-400',
          bg: 'from-purple-900/40 to-gray-900/40 border-purple-500/20 hover:border-purple-500/40',
        };
      case 'beta':
        return {
          badge: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
          icon: 'text-amber-400',
          bg: 'from-amber-900/40 to-gray-900/40 border-amber-500/20 hover:border-amber-500/40',
        };
      case 'planned':
        return {
          badge: 'bg-gray-500/20 text-gray-300 border-gray-500/30',
          icon: 'text-gray-400',
          bg: 'from-gray-900/40 to-gray-800/40 border-gray-500/20 hover:border-gray-500/40',
        };
      case 'coming_soon':
        return {
          badge: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
          icon: 'text-blue-400',
          bg: 'from-blue-900/40 to-gray-900/40 border-blue-500/20 hover:border-blue-500/40',
        };
      default:
        return {
          badge: 'bg-gray-500/20 text-gray-300 border-gray-500/30',
          icon: 'text-gray-400',
          bg: 'from-gray-900/40 to-gray-800/40 border-gray-500/20 hover:border-gray-500/40',
        };
    }
  };

  /**
   * Get status label
   */
  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'in_development':
        return 'In Development';
      case 'beta':
        return 'Beta Ready';
      case 'planned':
        return 'Planned';
      case 'coming_soon':
        return 'Coming Soon';
      default:
        return 'Planned';
    }
  };

  return (
    <section className="relative py-24 bg-gradient-to-b from-gray-900 to-purple-900/30">
      <div className="max-w-7xl mx-auto px-6">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-4">
            {features.headline}
          </h2>
          <p className="text-xl text-gray-400 max-w-3xl mx-auto">{features.subtitle}</p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.features.map((feature, index) => {
            const styling = getStatusStyling(feature.status);
            const IconComponent = getIcon(feature.icon);

            return (
              <div
                key={index}
                className={`relative group bg-gradient-to-br ${styling.bg} rounded-2xl p-8 backdrop-blur-sm transition-all duration-300 hover:transform hover:scale-105`}
              >
                {/* Status Badge */}
                <div className="absolute -top-3 left-4">
                  <Badge className={`${styling.badge} border`}>
                    {getStatusLabel(feature.status)}
                  </Badge>
                </div>

                {/* Icon */}
                <div
                  className={`w-14 h-14 bg-gray-800/50 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform ${styling.icon}`}
                >
                  <IconComponent className="w-7 h-7" />
                </div>

                {/* Content */}
                <h3 className="text-2xl font-bold text-white mb-3">{feature.title}</h3>
                <p className="text-gray-400 leading-relaxed">{feature.description}</p>

                {/* Progress Indicator */}
                <div className="mt-6 flex items-center gap-2">
                  <div className="flex-1 bg-gray-800/50 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all duration-500 ${
                        feature.status === 'in_development'
                          ? 'bg-purple-400 w-3/4'
                          : feature.status === 'beta'
                            ? 'bg-amber-400 w-full'
                            : feature.status === 'planned'
                              ? 'bg-gray-400 w-1/4'
                              : 'bg-blue-400 w-1/2'
                      }`}
                    ></div>
                  </div>
                  <span className="text-xs text-gray-500">
                    {feature.status === 'in_development'
                      ? '75%'
                      : feature.status === 'beta'
                        ? '100%'
                        : feature.status === 'planned'
                          ? '25%'
                          : '50%'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Development Timeline Note */}
        <div className="mt-16 p-6 bg-gray-800/30 border border-gray-700/50 rounded-xl max-w-4xl mx-auto">
          <div className="flex items-start gap-4">
            <Clock className="w-6 h-6 text-amber-400 flex-shrink-0 mt-1" />
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">Development Timeline</h3>
              <p className="text-gray-400 leading-relaxed">
                Our beta launch focuses on the core AI storytelling experience. Advanced features
                like visual generation and voice narration will be added based on beta feedback and
                testing. All features shown are planned for full release in 2026.
              </p>
            </div>
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="mt-16 text-center">
          <p className="text-gray-400 text-lg mb-4">
            Want to influence which features we prioritize?
          </p>
          <p className="text-purple-400 font-semibold">
            Join the beta and help shape the future of AI Dungeon Master
          </p>
        </div>
      </div>
    </section>
  );
};
