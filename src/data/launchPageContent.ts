/**
 * Launch Page Content - Centralized Content Source
 *
 * PURPOSE: Single source of truth for all launch page copy and configuration
 * This ensures consistent messaging and makes updates easy across all components
 */

export interface TeamMember {
  name: string;
  role: string;
  bio: string;
  image?: string;
  links?: {
    github?: string;
    linkedin?: string;
    twitter?: string;
  };
}

export interface RoadmapPhase {
  phase: string;
  title: string;
  description: string;
  timeline: string;
  features: string[];
  status: 'current' | 'upcoming' | 'completed';
}

export interface PlannedFeature {
  title: string;
  description: string;
  status: 'in_development' | 'planned' | 'beta' | 'coming_soon';
  icon: string;
}

export interface EarlyAccessPerk {
  title: string;
  description: string;
  icon: string;
}

export interface FAQItem {
  question: string;
  answer: string;
}

export const launchPageContent = {
  // Hero Section
  hero: {
    badge: "Closed Beta - Request Early Access",
    headline: "The Legendary AI Dungeon Master is Almost Here",
    subtitle: "Be Among the First to Wield Its Power",
    description: "Your epic adventures are about to become truly cinematic. Sign up for exclusive beta access and shape the future of tabletop RPGs.",
    primaryCTA: "Request Early Access",
    secondaryCTA: "Learn More"
  },

  // Vision Section
  vision: {
    headline: "Imagine a World Where Your Stories Come to Life",
    content: `Picture this: An AI Dungeon Master that doesn't just follow rules—it creates entire worlds that react to your every decision. NPCs with memories that span across sessions, remembering that time you saved their village or betrayed their trust. Epic narratives that unfold like a living novel, where your choices create ripples that change everything.

We're building more than just a tool. We're creating a new way to experience tabletop RPGs—a cinematic adventure that adapts to your playstyle, remembers your story, and pushes the boundaries of what's possible in interactive storytelling.

This isn't about replacing human Dungeon Masters. It's about giving every adventurer the chance to experience the magic of a truly responsive, intelligent storytelling partner that never gets tired, never forgets, and always has another twist ready.`,
    quote: "The future of RPG gaming isn't coming. It's being built, one adventure at a time."
  },

  // Features Section
  features: {
    headline: "What We're Building",
    subtitle: "These features are in active development for our beta launch",
    features: [
      {
        title: "Dynamic Storytelling Engine",
        description: "An AI that adapts to your every decision, creating a truly unique narrative that evolves based on your playstyle and choices.",
        status: "in_development" as const,
        icon: "Brain"
      },
      {
        title: "Cinematic Visual Generation",
        description: "Generate breathtaking art for your characters, scenes, and worlds in real-time. Every monster, location, and hero brought to life.",
        status: "planned" as const,
        icon: "Image"
      },
      {
        title: "Living NPC Memory",
        description: "Characters with their own memories, motivations, and relationships that persist across sessions and evolve based on your interactions.",
        status: "beta" as const,
        icon: "Users"
      },
      {
        title: "Intelligent Rules Engine",
        description: "A DM that knows D&D 5E rules inside and out, handling complex mechanics while you focus on the story and roleplay.",
        status: "in_development" as const,
        icon: "BookOpen"
      },
      {
        title: "Voice Narration",
        description: "Cinematic voice acting that brings your adventures to life with professional narration and character voices.",
        status: "planned" as const,
        icon: "Mic"
      },
      {
        title: "Campaign Export",
        description: "Export your entire campaign as a beautifully formatted storybook, complete with artwork and narrative summaries.",
        status: "coming_soon" as const,
        icon: "Download"
      }
    ] as PlannedFeature[]
  },

  // How It Works Section
  howItWorks: {
    headline: "Your Journey to Epic Adventures",
    subtitle: "Three simple steps to join the beta",
    steps: [
      {
        step: "1",
        title: "Join the Waitlist",
        description: "Sign up with your email to get on our exclusive beta access list. We'll notify you as soon as spots open up."
      },
      {
        step: "2",
        title: "Get Early Access",
        description: "Once approved, you'll receive an invitation to create your account and start building your campaign world."
      },
      {
        step: "3",
        title: "Shape the Future",
        description: "Playtest new features, provide feedback, and help us build the ultimate AI Dungeon Master together."
      }
    ]
  },

  // Team Section
  team: {
    headline: "Forged by Adventurers, for Adventurers",
    subtitle: "Meet the team building the future of tabletop RPGs",
    members: [
      {
        name: "Rob McBroom",
        role: "Founder & Lead Developer",
        bio: "A lifelong D&D enthusiast and full-stack developer with a passion for creating immersive gaming experiences. Spent countless nights both playing and running campaigns, always dreaming of the perfect digital DM.",
        links: {
          github: "https://github.com/Garblesnarff",
          linkedin: "https://linkedin.com/in/robmcbroom"
        }
      }
    ] as TeamMember[]
  },

  // Launch Roadmap
  roadmap: {
    headline: "The Road to Launch",
    subtitle: "Our journey from beta to full release",
    phases: [
      {
        phase: "Phase 1",
        title: "Closed Beta",
        description: "Working with a select group of beta testers to refine core features and gather feedback on the AI Dungeon Master experience.",
        timeline: "Now - Q4 2025",
        status: "current" as const,
        features: [
          "Core AI storytelling engine",
          "Basic character and campaign creation",
          "Text-based adventure sessions",
          "Community feedback integration"
        ]
      },
      {
        phase: "Phase 2",
        title: "Open Beta",
        description: "Expanding access to all waitlist members with enhanced features and improved stability based on closed beta feedback.",
        timeline: "Q1 2026",
        status: "upcoming" as const,
        features: [
          "Visual character and scene generation",
          "Voice narration system",
          "Advanced NPC memory and relationships",
          "Campaign export functionality"
        ]
      },
      {
        phase: "Phase 3",
        title: "Public Launch",
        description: "Full release with all features, mobile apps, and ecosystem integrations for the complete AI Dungeon Master experience.",
        timeline: "Q2 2026",
        status: "upcoming" as const,
        features: [
          "Mobile and tablet applications",
          "Third-party integrations (Roll20, Discord)",
          "Advanced customization options",
          "Community marketplace"
        ]
      }
    ] as RoadmapPhase[]
  },

  // Early Access Offer
  earlyAccess: {
    headline: "Become a Founding Adventurer",
    subtitle: "Exclusive perks for our beta pioneers",
    description: "Join our closed beta and secure your place in AI Dungeon Master history with these exclusive founding member benefits:",
    perks: [
      {
        title: "Lifetime Discount",
        description: "Lock in beta pricing forever - never pay full price for your subscription",
        icon: "Crown"
      },
      {
        title: "Exclusive Badge",
        description: "Show off your founding member status with a unique in-game badge and profile flair",
        icon: "Star"
      },
      {
        title: "Early Feature Access",
        description: "Get access to new features before they're released to the general public",
        icon: "Zap"
      },
      {
        title: "Direct Influence",
        description: "Your feedback goes directly to the development team and helps shape the product",
        icon: "MessageCircle"
      }
    ] as EarlyAccessPerk[],
    disclaimer: "Limited spots available. Beta access is granted on a first-come, first-served basis to qualified applicants. Some features may be limited or unavailable during beta testing.",
    cta: "Join the Beta Waitlist"
  },

  // FAQ Section
  faq: {
    headline: "Frequently Asked Questions",
    subtitle: "Everything you need to know about our beta launch",
    items: [
      {
        question: "When will the beta be available?",
        answer: "We're currently in closed beta with a limited number of testers. Open beta is planned for Q1 2026, with full public launch in Q2 2026."
      },
      {
        question: "How much will it cost after beta?",
        answer: "Beta testers will receive a lifetime discount on their subscription. Final pricing will be announced closer to public launch, but we're targeting an affordable $15-25/month subscription."
      },
      {
        question: "What are the system requirements?",
        answer: "The AI Dungeon Master runs in your web browser and works best with modern browsers like Chrome, Firefox, or Safari. A stable internet connection is required for AI processing."
      },
      {
        question: "How can I provide feedback?",
        answer: "Beta testers will have direct access to our feedback system, community Discord, and regular developer updates. Your input will directly shape the future of the product."
      },
      {
        question: "What platforms will be supported?",
        answer: "We plan to support web browsers initially, with mobile apps (iOS/Android) and integrations with popular platforms like Roll20 planned for after launch."
      },
      {
        question: "Is my data private and secure?",
        answer: "Absolutely. We take privacy seriously and will never share your personal data or campaign content. All AI processing is handled securely, and you maintain full ownership of your campaigns."
      },
      {
        question: "What if I don't like it?",
        answer: "No hard feelings! You can cancel anytime during beta, and we'll apply any refund policies according to our terms of service."
      }
    ] as FAQItem[]
  },

  // Final CTA
  finalCTA: {
    headline: "Your Adventure Awaits",
    subtitle: "Don't Miss Out",
    description: "Spots for the closed beta are extremely limited. Join our waitlist now to secure your chance to be among the first to experience the AI Dungeon Master.",
    cta: "Request Early Access",
    urgency: "Join 500+ adventurers already on the waitlist"
  },

  // Footer
  footer: {
    description: "Building the future of tabletop RPGs, one adventure at a time.",
    links: {
      privacy: "/privacy",
      terms: "/terms",
      contact: "/contact",
      discord: "https://discord.gg/ai-dungeon-master"
    },
    legal: {
      ipDisclaimer: "AI Dungeon Master is not affiliated with Wizards of the Coast. D&D content uses SRD/OGL licensed material where applicable.",
      company: "AI Adventure Scribe"
    }
  }
};

export default launchPageContent;
