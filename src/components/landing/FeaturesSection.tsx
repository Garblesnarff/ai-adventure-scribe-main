import {
  Globe,
  Clock,
  Brain,
  Image,
  Box,
  GitBranch,
  Database,
  BookOpen,
  Users,
  Zap,
} from 'lucide-react';
import React from 'react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface Feature {
  icon: React.ReactNode;
  title: string;
  description: string;
  gradient: string;
}

const features: Feature[] = [
  {
    icon: <Globe className="w-8 h-8" />,
    title: 'Persistent Worlds',
    description:
      'Your worlds never disappear. Every location, NPC, and story element persists across campaigns, growing richer with each adventure.',
    gradient: 'from-infinite-purple to-infinite-teal',
  },
  {
    icon: <Clock className="w-8 h-8" />,
    title: 'Generational Storytelling',
    description:
      'Watch characters age, have children, and pass down legacies. Your actions echo through centuries of in-game time.',
    gradient: 'from-infinite-gold to-infinite-purple',
  },
  {
    icon: <Brain className="w-8 h-8" />,
    title: 'AI Dungeon Master',
    description:
      'A multi-agent AI system that remembers everything, handles complex rules, and creates dynamic, personalized narratives.',
    gradient: 'from-infinite-teal to-infinite-gold',
  },
  {
    icon: <Image className="w-8 h-8" />,
    title: 'Visual Generation',
    description:
      'Real-time character portraits, location scenes, and world visualization bring your story to life with AI-generated imagery.',
    gradient: 'from-infinite-purple to-infinite-gold',
  },
  {
    icon: <Box className="w-8 h-8" />,
    title: '3D World Exploration',
    description:
      'Cinematic 3D visualization of your world with fog of war, interactive points of interest, and era evolution.',
    gradient: 'from-infinite-teal to-infinite-purple',
  },
  {
    icon: <GitBranch className="w-8 h-8" />,
    title: 'Timeline Evolution',
    description:
      'Your world progresses through different eras - medieval to steampunk to cyberpunk - based on your campaign choices.',
    gradient: 'from-infinite-gold to-infinite-teal',
  },
];

const additionalFeatures = [
  {
    icon: <Database className="w-6 h-6" />,
    title: 'Advanced Memory System',
    description: 'Hierarchical memory with intelligent summarization',
  },
  {
    icon: <BookOpen className="w-6 h-6" />,
    title: 'Fiction Generation',
    description: 'Compile your campaigns into publishable novels',
  },
  {
    icon: <Users className="w-6 h-6" />,
    title: 'Multi-Agent AI',
    description: 'Specialized AI agents for storytelling and rules',
  },
  {
    icon: <Zap className="w-6 h-6" />,
    title: 'Real-time Updates',
    description: "Dynamic world that evolves even when you're offline",
  },
];

export const FeaturesSection: React.FC = () => {
  return (
    <section id="features" className="py-24 bg-gradient-to-b from-infinite-dark to-card/5">
      <div className="max-w-7xl mx-auto px-6">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl lg:text-5xl font-bold text-foreground mb-6">
            Features That Create
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-infinite-gold to-infinite-teal ml-3">
              Legends
            </span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            Every feature is designed to build persistent, evolving worlds where your stories become
            living mythologies that span generations.
          </p>
        </div>

        {/* Main Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
          {features.map((feature, index) => (
            <Card
              key={index}
              className="group relative overflow-hidden bg-card/40 backdrop-blur-sm border-border/50 hover:border-infinite-purple/30 transition-all duration-300 hover:shadow-2xl hover:shadow-infinite-purple/10"
            >
              <div
                className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-500`}
              ></div>

              <CardHeader className="relative z-10">
                <div
                  className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${feature.gradient} p-3 mb-4 group-hover:scale-110 transition-transform duration-300`}
                >
                  <div className="text-white">{feature.icon}</div>
                </div>
                <CardTitle className="text-xl text-card-foreground group-hover:text-infinite-gold transition-colors">
                  {feature.title}
                </CardTitle>
              </CardHeader>

              <CardContent className="relative z-10">
                <CardDescription className="text-muted-foreground leading-relaxed">
                  {feature.description}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Additional Features */}
        <div className="bg-card/20 backdrop-blur-sm rounded-3xl p-8 border border-border/30">
          <h3 className="text-2xl font-bold text-center text-foreground mb-8">
            And Much More Coming Soon
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {additionalFeatures.map((feature, index) => (
              <div
                key={index}
                className="flex items-center gap-4 p-4 rounded-xl hover:bg-card/30 transition-colors"
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-infinite-purple/20 to-infinite-teal/20 flex items-center justify-center border border-infinite-purple/20">
                  <div className="text-infinite-gold">{feature.icon}</div>
                </div>
                <div>
                  <h4 className="font-semibold text-card-foreground text-sm">{feature.title}</h4>
                  <p className="text-muted-foreground text-xs">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-16">
          <div className="inline-flex items-center gap-2 px-6 py-3 bg-infinite-purple/10 border border-infinite-purple/20 rounded-full text-infinite-purple text-sm font-medium backdrop-blur-sm">
            <div className="w-2 h-2 bg-infinite-teal rounded-full animate-pulse"></div>
            <span>New features added monthly • Check our roadmap</span>
          </div>
        </div>
      </div>
    </section>
  );
};
