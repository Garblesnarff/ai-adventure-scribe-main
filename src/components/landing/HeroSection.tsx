import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight, Play, Sparkles, Globe, Clock } from 'lucide-react';

export const HeroSection: React.FC = () => {
  const navigate = useNavigate();

  const handleStartStory = () => {
    navigate('/');
  };

  const handleWatchDemo = () => {
    const featuresSection = document.getElementById('features');
    if (featuresSection) {
      featuresSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section 
      className="relative min-h-screen flex items-center justify-center overflow-hidden"
      style={{
        backgroundImage: 'url(/parchment-bg.png)', // Fantasy parchment texture
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed', // Subtle parallax effect, responsive
      }}
      role="banner" // Accessibility
    >
      {/* Overlay for readability: semi-transparent dark purple gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-black/40 via-infinite-purple/30 to-black/50"></div>

      {/* Animated Background Elements - Keep but adjust opacity for new bg */}
      <div className="absolute inset-0">
        {/* Floating particles - reduce opacity slightly for texture cohesion */}
        <div className="absolute top-20 left-10 w-2 h-2 bg-infinite-gold rounded-full opacity-40 animate-pulse"></div>
        <div className="absolute top-40 right-20 w-1 h-1 bg-infinite-teal rounded-full opacity-60 animate-bounce"></div>
        <div className="absolute bottom-40 left-20 w-3 h-3 bg-infinite-purple rounded-full opacity-30 animate-pulse"></div>
        <div className="absolute top-60 left-1/3 w-1 h-1 bg-infinite-gold rounded-full opacity-50 animate-ping"></div>
        <div className="absolute bottom-60 right-1/4 w-2 h-2 bg-infinite-teal rounded-full opacity-40 animate-bounce"></div>

        {/* Reduced cosmic grid for parchment theme */}
        <div className="absolute inset-0 opacity-5">
          <div className="w-full h-full bg-gradient-to-br from-purple-500/10 to-blue-500/10"></div>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 text-center">
        <div className="max-w-4xl mx-auto">
          {/* Badge - unchanged */}
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-infinite-purple/20 border border-infinite-purple/30 rounded-full text-infinite-gold text-sm font-medium mb-8 backdrop-blur-sm">
            <Sparkles className="w-4 h-4" />
            <span>Persistent AI Storytelling Platform</span>
            <div className="w-2 h-2 bg-infinite-teal rounded-full animate-pulse"></div>
          </div>

          {/* Main Headline - Apply font-heading, increase size slightly */}
          <h1 className="font-heading text-6xl lg:text-8xl font-bold text-foreground mb-6 leading-tight">
            Your World,
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-infinite-gold via-infinite-teal to-infinite-purple">
              Your Story,
            </span>
            <br />
            Forever
          </h1>

          {/* Subtitle - Increase to 18px+ equivalent */}
          <p className="text-2xl lg:text-3xl text-muted-foreground mb-8 leading-relaxed max-w-3xl mx-auto">
            Create persistent worlds that evolve across generations. Build campaigns, characters, and stories that live forever in your own personal universe.
          </p>

          {/* Key Value Props - unchanged, but ensure contrast */}
          <div className="flex flex-wrap justify-center gap-6 mb-12 text-base"> {/* Bumped from text-sm */}
            <div className="flex items-center gap-2 px-4 py-2 bg-card/20 rounded-full border border-border/30 backdrop-blur-sm">
              <Globe className="w-4 h-4 text-infinite-teal" />
              <span className="text-foreground/90">Infinite Worlds</span> {/* Higher contrast */}
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-card/20 rounded-full border border-border/30 backdrop-blur-sm">
              <Clock className="w-4 h-4 text-infinite-gold" />
              <span className="text-foreground/90">Generational Stories</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-card/20 rounded-full border border-border/30 backdrop-blur-sm">
              <Sparkles className="w-4 h-4 text-infinite-purple" />
              <span className="text-foreground/90">AI-Powered</span>
            </div>
          </div>

          {/* CTA Buttons - Consistent styling with glow hover */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button
              size="lg"
              onClick={handleStartStory}
              className="bg-gradient-to-r from-infinite-purple to-infinite-teal hover:from-infinite-purple/90 hover:to-infinite-teal/90 text-white px-8 py-4 rounded-xl shadow-lg hover:shadow-[0_0_20px_rgba(107,70,193,0.3)] transition-all duration-300 flex items-center gap-3 text-lg font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-infinite-purple" // Added glow and focus
            >
              Start Your Infinite Story
              <ArrowRight className="w-5 h-5" />
            </Button>

            <Button
              variant="outline"
              size="lg"
              onClick={handleWatchDemo}
              className="border-2 border-infinite-gold/50 hover:border-infinite-gold text-infinite-gold hover:bg-infinite-gold/10 hover:shadow-[0_0_15px_rgba(245,158,11,0.2)] px-8 py-4 rounded-xl backdrop-blur-sm transition-all duration-300 flex items-center gap-3 text-lg font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-infinite-gold" // Consistent glow/focus
            >
              <Play className="w-5 h-5" />
              Watch Demo
            </Button>
          </div>

          {/* Stats - unchanged, but bumped sizes */}
          <div className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="text-4xl font-bold text-infinite-gold mb-2">∞</div> {/* Slight increase */}
              <div className="text-foreground/80">Possible Stories</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-infinite-teal mb-2">24/7</div>
              <div className="text-foreground/80">AI Dungeon Master</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-infinite-purple mb-2">100%</div>
              <div className="text-foreground/80">Your Universe</div>
            </div>
          </div>
        </div>
      </div>

      {/* Scroll indicator - unchanged */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
        <div className="w-6 h-10 border-2 border-infinite-gold/50 rounded-full flex justify-center">
          <div className="w-1 h-3 bg-infinite-gold rounded-full mt-2 animate-pulse"></div>
        </div>
      </div>
    </section>
  );
};
