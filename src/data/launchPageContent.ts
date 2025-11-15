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
    badge: 'Closed Beta: Q4 2025 – Be Among the First',
    headline: 'No DM? No Schedule? Your Living D&D World Awaits',
    subtitle:
      'Play solo or async with an AI Dungeon Master that remembers every choice, evolves NPCs, and crafts cinematic stories tailored to you.',
    description:
      'Tired of campaigns fizzling out? Infinite Realms creates persistent worlds where your actions ripple forever—no prep, no waiting, just epic adventures on your time.',
    primaryCTA: 'Claim Your Beta Spot – Be First',
    secondaryCTA: 'Dive into the Vision',
  },

  // Vision Section
  vision: {
    headline: 'A Persistent World That Remembers You – And Evolves With Every Choice',
    content: `Frustrated by campaigns that die from scheduling hell or forgetful AIs? Infinite Realms is your always-on Dungeon Master: persistent NPCs with memories, cinematic narratives that adapt to your style, and emotional depth that makes every session feel alive.

We're building more than just a tool. We're creating a new way to experience tabletop RPGs—a cinematic adventure that adapts to your playstyle, remembers your story, and pushes the boundaries of what's possible in interactive storytelling.

This isn't about replacing human Dungeon Masters. It's about giving every adventurer the chance to experience the magic of a truly responsive, intelligent storytelling partner that never gets tired, never forgets, and always has another twist ready.`,
    quote:
      'Build your legend in a world that waits for you – with characters who remember, react, and grow, turning solo play into an epic saga.',
  },

  // Features Section
  features: {
    headline: "What We're Building",
    subtitle: 'These features are in active development for our beta launch',
    features: [
      {
        title: 'Stories That Remember You',
        description:
          "Every choice creates ripples that last forever. Save a village and they'll erect statues in your honor. Betray an ally and face the consequences sessions later.",
        status: 'in_development' as const,
        icon: 'Brain',
      },
      {
        title: 'Living Fantasy Worlds',
        description:
          'Watch your adventures come alive with cinematic visuals. Every shadowy tavern, ancient ruin, and mythical creature rendered in stunning detail.',
        status: 'planned' as const,
        icon: 'Image',
      },
      {
        title: 'NPCs With Real Memory',
        description:
          'Build relationships that evolve like real friendships. NPCs remember your heroic sacrifices, your betrayals, and your moments of kindness - creating emotional depth that surprises you.',
        status: 'beta' as const,
        icon: 'Users',
      },
      {
        title: 'Seamless D&D Rules',
        description:
          'Never worry about complex rules again. Focus on the story and roleplay while the AI handles mechanics, spell interactions, and combat calculations perfectly.',
        status: 'in_development' as const,
        icon: 'BookOpen',
      },
      {
        title: 'Immersive Voice Acting',
        description:
          'Hear your adventures come alive with professional narration. Distinct character voices bring NPCs to life, making every tavern tale and epic battle feel cinematic.',
        status: 'planned' as const,
        icon: 'Mic',
      },
      {
        title: 'Your Campaign as a Book',
        description:
          'Transform your entire adventure into a beautiful storybook. Share your legend with friends, complete with artwork, maps, and narrative summaries of your greatest moments.',
        status: 'coming_soon' as const,
        icon: 'Download',
      },
    ] as PlannedFeature[],
  },

  // How It Works Section
  howItWorks: {
    headline: 'Your Journey to Epic Adventures',
    subtitle: 'Three simple steps to join the beta',
    steps: [
      {
        step: '1',
        title: 'Join the Waitlist',
        description:
          "Sign up with your email to get on our exclusive beta access list. We'll notify you as soon as spots open up.",
      },
      {
        step: '2',
        title: 'Get Early Access',
        description:
          "Once approved, you'll receive an invitation to create your account and start building your campaign world.",
      },
      {
        step: '3',
        title: 'Shape the Future',
        description:
          'Playtest new features, provide feedback, and help us build the ultimate AI Dungeon Master together.',
      },
    ],
  },

  // Team Section
  team: {
    headline: 'Forged by Adventurers, for Adventurers',
    subtitle: 'Meet the team building the future of tabletop RPGs',
    members: [
      {
        name: 'Rob McBroom',
        role: 'Founder & Lead Developer',
        bio: 'A lifelong D&D enthusiast and full-stack developer with a passion for creating immersive gaming experiences. Spent countless nights both playing and running campaigns, always dreaming of the perfect digital DM.',
        links: {
          github: 'https://github.com/Garblesnarff',
          linkedin: 'https://linkedin.com/in/robmcbroom',
        },
      },
    ] as TeamMember[],
  },

  // Launch Roadmap
  roadmap: {
    headline: 'The Road to Launch',
    subtitle: 'Our journey from beta to full release',
    phases: [
      {
        phase: 'Phase 1',
        title: 'Closed Beta',
        description:
          'Working with a select group of beta testers to refine core features and gather feedback on the AI Dungeon Master experience.',
        timeline: 'Now - Q4 2025',
        status: 'current' as const,
        features: [
          'Core AI storytelling engine',
          'Basic character and campaign creation',
          'Text-based adventure sessions',
          'Community feedback integration',
        ],
      },
      {
        phase: 'Phase 2',
        title: 'Open Beta',
        description:
          'Expanding access to all waitlist members with enhanced features and improved stability based on closed beta feedback.',
        timeline: 'Q1 2026',
        status: 'upcoming' as const,
        features: [
          'Visual character and scene generation',
          'Voice narration system',
          'Advanced NPC memory and relationships',
          'Campaign export functionality',
        ],
      },
      {
        phase: 'Phase 3',
        title: 'Public Launch',
        description:
          'Full release with all features, mobile apps, and ecosystem integrations for the complete AI Dungeon Master experience.',
        timeline: 'Q2 2026',
        status: 'upcoming' as const,
        features: [
          'Mobile and tablet applications',
          'Third-party integrations (Roll20, Discord)',
          'Advanced customization options',
          'Community marketplace',
        ],
      },
    ] as RoadmapPhase[],
  },

  // Early Access Offer
  earlyAccess: {
    headline: 'Be a Founding Adventurer – Shape the Living World',
    subtitle: 'Get exclusive perks for helping build the AI DM that ends scheduling hell.',
    description:
      'Join our closed beta and secure your place in AI Dungeon Master history with these exclusive founding member benefits. Cancel anytime during beta - no hard feelings.',
    perks: [
      {
        title: 'Personalized NPC in Launch',
        description:
          'Tie to rebuilt campaigns - get a custom NPC that remembers your beta adventures',
        icon: 'Crown',
      },
      {
        title: 'Early Voice Pack Access',
        description: 'Via ElevenLabs integration - be first to experience cinematic narration',
        icon: 'Star',
      },
      {
        title: 'Early Feature Access',
        description: "Get access to new features before they're released to the general public",
        icon: 'Zap',
      },
      {
        title: 'Direct Influence',
        description:
          'Your feedback goes directly to the development team and helps shape the product',
        icon: 'MessageCircle',
      },
    ] as EarlyAccessPerk[],
    disclaimer: 'Beta focuses on core persistence – bugs mean you influence fixes directly.',
    cta: 'Secure First Access',
  },

  // FAQ Section
  faq: {
    headline: 'Frequently Asked Questions',
    subtitle: 'Everything you need to know about our beta launch',
    items: [
      {
        question: 'How does it solve scheduling issues?',
        answer:
          'Play solo or async – your world persists, so pick up anytime without coordinating groups.',
      },
      {
        question: 'Will NPCs really remember?',
        answer:
          "Yes, unlike other AIs. Example: Steal from a merchant? He'll spread rumors, affecting future encounters.",
      },
      {
        question: 'Do I need D&D experience?',
        answer:
          'No. AI handles rules; you focus on choices. Great for lapsed players craving immersion without prep.',
      },
      {
        question: "What's the beta like?",
        answer: 'Core persistent storytelling. Test and shape features like emotional NPCs.',
      },
      {
        question: 'What are the system requirements?',
        answer:
          'The AI Dungeon Master runs in your web browser and works best with modern browsers like Chrome, Firefox, or Safari. A stable internet connection is required for AI processing.',
      },
      {
        question: 'Is my data private and secure?',
        answer:
          'Absolutely. We take privacy seriously and will never share your personal data or campaign content. All AI processing is handled securely, and you maintain full ownership of your campaigns.',
      },
      {
        question: "What if I don't like it?",
        answer:
          "No hard feelings! You can cancel anytime during beta, and we'll apply any refund policies according to our terms of service.",
      },
    ] as FAQItem[],
  },

  // Final CTA
  finalCTA: {
    headline: 'Your Adventure Awaits',
    subtitle: "Don't Miss Out",
    description:
      'Spots for the closed beta are extremely limited. Join our waitlist now to secure your chance to be among the first to experience the AI Dungeon Master.',
    cta: 'Request Early Access',
    urgency: 'Join 500+ adventurers already on the waitlist',
  },

  // Footer
  footer: {
    description:
      'Building Infinite Realms - where every choice shapes destiny and legends are forged in the fires of imagination.',
    links: {
      privacy: '/privacy',
      terms: '/terms',
      contact: '/contact',
      discord: 'https://discord.gg/infinite-realms',
    },
    legal: {
      ipDisclaimer:
        'Infinite Realms is not affiliated with Wizards of the Coast. D&D content uses SRD/OGL licensed material where applicable.',
      company: 'AI Adventure Scribe',
    },
  },
};

export default launchPageContent;
