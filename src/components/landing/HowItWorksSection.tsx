import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Globe, 
  User, 
  Play, 
  TrendingUp, 
  ArrowRight, 
  Sparkles,
  MapPin,
  Users
} from 'lucide-react';

interface Step {
  number: number;
  title: string;
  description: string;
  icon: React.ReactNode;
  details: string[];
  color: string;
}

const steps: Step[] = [
  {
    number: 1,
    title: "Create Your World",
    description: "Choose a genre, set the tone, and let our AI generate a unique universe tailored to your vision.",
    icon: <Globe className="w-8 h-8" />,
    details: [
      "Select from fantasy, sci-fi, modern, or mix genres",
      "AI generates initial locations and NPCs",
      "Customize world rules and magic systems"
    ],
    color: "infinite-purple"
  },
  {
    number: 2, 
    title: "Build Your Character",
    description: "Create characters with rich backstories that integrate seamlessly into your world's history.",
    icon: <User className="w-8 h-8" />,
    details: [
      "Dynamic character creation with AI suggestions",
      "Automatic backstory integration with world lore", 
      "Visual generation of character portraits"
    ],
    color: "infinite-teal"
  },
  {
    number: 3,
    title: "Start Your Campaign",
    description: "Begin your adventure with an AI Dungeon Master that adapts to your choices and remembers everything.",
    icon: <Play className="w-8 h-8" />,
    details: [
      "AI-driven storytelling responds to your actions",
      "Complex rule handling for D&D 5E and more",
      "Real-time memory of all events and decisions"
    ],
    color: "infinite-gold"
  },
  {
    number: 4,
    title: "Watch Your World Evolve",
    description: "Your choices create lasting consequences that ripple through time, building a living history.",
    icon: <TrendingUp className="w-8 h-8" />,
    details: [
      "NPCs age, have families, and remember you",
      "Political and social changes based on your actions",
      "World progresses through different technological eras"
    ],
    color: "infinite-purple"
  }
];

export const HowItWorksSection: React.FC = () => {
  const navigate = useNavigate();

  const handleCreateWorld = () => {
    navigate('/');
  };
  return (
    <section className="py-24 bg-gradient-to-b from-card/5 to-infinite-dark/50 relative overflow-hidden">
      {/* Background elements */}
      <div className="absolute inset-0">
        <div className="absolute top-20 left-10 w-64 h-64 bg-infinite-purple/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-infinite-teal/5 rounded-full blur-3xl"></div>
      </div>

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        {/* Section Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-infinite-gold/10 border border-infinite-gold/20 rounded-full text-infinite-gold text-sm font-medium mb-6">
            <Sparkles className="w-4 h-4" />
            <span>Simple to Start, Infinite to Explore</span>
          </div>
          
          <h2 className="text-4xl lg:text-5xl font-bold text-foreground mb-6">
            How
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-infinite-gold via-infinite-teal to-infinite-purple ml-3">
              InfiniteRealms
            </span>
            <br />
            Works
          </h2>
          
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            From world creation to generational storytelling, experience the future of AI-powered adventures in four simple steps.
          </p>
        </div>

        {/* Steps */}
        <div className="space-y-12">
          {steps.map((step, index) => (
            <div key={index} className={`flex flex-col ${index % 2 === 0 ? 'lg:flex-row' : 'lg:flex-row-reverse'} gap-12 items-center`}>
              {/* Content */}
              <div className="flex-1 space-y-6">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-full bg-${step.color}/20 border-2 border-${step.color}/30 flex items-center justify-center font-bold text-${step.color} text-xl`}>
                    {step.number}
                  </div>
                  <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br from-${step.color}/20 to-${step.color}/10 p-4 border border-${step.color}/20`}>
                    <div className={`text-${step.color}`}>
                      {step.icon}
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-3xl font-bold text-foreground mb-4">{step.title}</h3>
                  <p className="text-lg text-muted-foreground leading-relaxed mb-6">
                    {step.description}
                  </p>
                  
                  <ul className="space-y-3">
                    {step.details.map((detail, detailIndex) => (
                      <li key={detailIndex} className="flex items-center gap-3">
                        <div className={`w-2 h-2 bg-${step.color} rounded-full`}></div>
                        <span className="text-muted-foreground">{detail}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Visual */}
              <div className="flex-1">
                <Card className="bg-card/40 backdrop-blur-sm border-border/50 overflow-hidden">
                  <CardContent className="p-8">
                    <div className="aspect-video bg-gradient-to-br from-infinite-dark/80 to-card/20 rounded-xl flex items-center justify-center border border-border/30">
                      {/* Step-specific illustrations */}
                      {step.number === 1 && (
                        <div className="text-center space-y-4">
                          <Globe className="w-16 h-16 text-infinite-purple mx-auto" />
                          <div className="space-y-2">
                            <div className="flex justify-center gap-2">
                              <MapPin className="w-4 h-4 text-infinite-teal" />
                              <span className="text-sm text-muted-foreground">Mystical Forest</span>
                            </div>
                            <div className="flex justify-center gap-2">
                              <MapPin className="w-4 h-4 text-infinite-gold" />
                              <span className="text-sm text-muted-foreground">Ancient Library</span>
                            </div>
                            <div className="flex justify-center gap-2">
                              <MapPin className="w-4 h-4 text-infinite-purple" />
                              <span className="text-sm text-muted-foreground">Dragon's Peak</span>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {step.number === 2 && (
                        <div className="text-center space-y-4">
                          <User className="w-16 h-16 text-infinite-teal mx-auto" />
                          <div className="space-y-2">
                            <div className="text-sm font-medium text-card-foreground">Elara Moonwhisper</div>
                            <div className="text-xs text-muted-foreground">Elven Wizard • Age 127</div>
                            <div className="text-xs text-infinite-teal">Backstory integrated with Ancient Library</div>
                          </div>
                        </div>
                      )}
                      
                      {step.number === 3 && (
                        <div className="text-center space-y-4">
                          <Play className="w-16 h-16 text-infinite-gold mx-auto" />
                          <div className="space-y-2 text-xs text-muted-foreground max-w-64">
                            <div className="bg-card/50 p-3 rounded text-left">
                              "You enter the mystical forest. Ancient trees whisper secrets..."
                            </div>
                            <div className="bg-infinite-gold/10 p-3 rounded text-left">
                              "I search for magical herbs near the old oak."
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {step.number === 4 && (
                        <div className="text-center space-y-4">
                          <TrendingUp className="w-16 h-16 text-infinite-purple mx-auto" />
                          <div className="space-y-2">
                            <div className="text-sm text-card-foreground">50 Years Later...</div>
                            <div className="flex justify-center gap-4 text-xs">
                              <div className="bg-infinite-purple/20 p-2 rounded">
                                <Users className="w-4 h-4 text-infinite-purple mx-auto" />
                                <div className="text-infinite-purple">New NPCs</div>
                              </div>
                              <div className="bg-infinite-teal/20 p-2 rounded">
                                <MapPin className="w-4 h-4 text-infinite-teal mx-auto" />
                                <div className="text-infinite-teal">Evolved Cities</div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="text-center mt-20">
          <div className="bg-gradient-to-r from-infinite-purple/10 via-transparent to-infinite-teal/10 p-12 rounded-3xl border border-border/30 backdrop-blur-sm">
            <h3 className="text-3xl font-bold text-foreground mb-4">
              Ready to Build Your Universe?
            </h3>
            <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">
              Join thousands of storytellers creating infinite worlds. Your adventure begins with a single step.
            </p>
            <Button
              size="lg"
              onClick={handleCreateWorld}
              className="bg-gradient-to-r from-infinite-purple to-infinite-teal hover:from-infinite-purple/90 hover:to-infinite-teal/90 text-white px-8 py-4 rounded-xl shadow-2xl hover:shadow-infinite-purple/25 transition-all duration-300 flex items-center gap-3 text-lg font-semibold mx-auto cursor-pointer"
            >
              Create Your First World
              <ArrowRight className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};