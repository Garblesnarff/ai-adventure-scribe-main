/**
 * Personality system data for D&D 5E
 * Includes inspiration mechanics, personality guidance, and trait examples
 */

export interface PersonalityExample {
  category: 'trait' | 'ideal' | 'bond' | 'flaw';
  text: string;
  background?: string;
  theme: string;
}

export interface InspirationTrigger {
  id: string;
  name: string;
  description: string;
  example: string;
  personalityType: 'trait' | 'ideal' | 'bond' | 'flaw';
}

/**
 * Common inspiration triggers
 */
export const inspirationTriggers: InspirationTrigger[] = [
  {
    id: 'act-on-trait',
    name: 'Acting on Personality Trait',
    description:
      'Character acts in a way that clearly demonstrates their personality trait, even when it complicates the situation.',
    example:
      'A character with the trait "I speak without thinking" blurts out sensitive information at an inopportune moment.',
    personalityType: 'trait',
  },
  {
    id: 'pursue-ideal',
    name: 'Pursuing Ideals',
    description:
      'Character makes a significant choice or takes action that clearly demonstrates their ideals.',
    example:
      'A character with the ideal "Freedom" helps enslaved people escape, even at personal risk.',
    personalityType: 'ideal',
  },
  {
    id: 'protect-bond',
    name: 'Protecting Bonds',
    description:
      'Character goes out of their way to protect, help, or honor something or someone they are bonded to.',
    example: 'A character risks their life to save their hometown from destruction.',
    personalityType: 'bond',
  },
  {
    id: 'overcome-flaw',
    name: 'Overcoming Flaws',
    description: 'Character successfully resists or overcomes their flaw in a meaningful moment.',
    example:
      'A character with "I can\'t resist a pretty face" turns down a seductive but dangerous offer.',
    personalityType: 'flaw',
  },
  {
    id: 'flaw-creates-trouble',
    name: 'Flaw Creates Interesting Trouble',
    description:
      "Character's flaw creates complications that enhance the story in an entertaining way.",
    example:
      "A greedy character's attempt to steal something valuable leads the party into unexpected adventure.",
    personalityType: 'flaw',
  },
  {
    id: 'bond-drives-action',
    name: 'Bond Drives Character Action',
    description: "Character's bond motivates them to take action that moves the story forward.",
    example:
      "A character's bond to their missing sister drives them to investigate mysterious disappearances.",
    personalityType: 'bond',
  },
];

/**
 * Personality examples organized by type
 */
export const personalityExamples: PersonalityExample[] = [
  // Personality Traits
  {
    category: 'trait',
    text: "I idolize a particular hero of my faith and constantly refer to that person's deeds and example.",
    background: 'Acolyte',
    theme: 'Religious',
  },
  {
    category: 'trait',
    text: 'I can find common ground between the fiercest enemies, empathizing with them and always working toward peace.',
    background: 'Acolyte',
    theme: 'Peaceful',
  },
  {
    category: 'trait',
    text: "I don't pay attention to the risks in a situation. Never tell me the odds.",
    background: 'Criminal',
    theme: 'Reckless',
  },
  {
    category: 'trait',
    text: "The best way to get me to do something is to tell me I can't do it.",
    background: 'Criminal',
    theme: 'Rebellious',
  },
  {
    category: 'trait',
    text: 'My eloquent flattery makes everyone I talk to feel like the most wonderful and important person in the world.',
    background: 'Noble',
    theme: 'Charming',
  },
  {
    category: 'trait',
    text: 'I hide scraps of food and trinkets away in my pockets.',
    background: 'Urchin',
    theme: 'Survival',
  },

  // Ideals
  {
    category: 'ideal',
    text: 'Tradition. The ancient traditions of worship and sacrifice must be preserved and upheld.',
    background: 'Acolyte',
    theme: 'Order',
  },
  {
    category: 'ideal',
    text: 'Change. We must help bring about the changes the gods are constantly working in the world.',
    background: 'Acolyte',
    theme: 'Progress',
  },
  {
    category: 'ideal',
    text: 'Freedom. Chains are meant to be broken, as are those who would forge them.',
    background: 'Criminal',
    theme: 'Liberation',
  },
  {
    category: 'ideal',
    text: "Honor. I don't steal from others in the trade.",
    background: 'Criminal',
    theme: 'Professional',
  },
  {
    category: 'ideal',
    text: 'Responsibility. It is my duty to respect the authority of those above me, just as those below me must respect mine.',
    background: 'Noble',
    theme: 'Hierarchy',
  },
  {
    category: 'ideal',
    text: 'Community. We have to take care of each other, because no one else is going to do it.',
    background: 'Urchin',
    theme: 'Mutual Aid',
  },

  // Bonds
  {
    category: 'bond',
    text: 'I would die to recover an ancient relic of my faith that was lost long ago.',
    background: 'Acolyte',
    theme: 'Sacred Duty',
  },
  {
    category: 'bond',
    text: 'I will someday get revenge on the corrupt temple hierarchy who branded me a heretic.',
    background: 'Acolyte',
    theme: 'Vengeance',
  },
  {
    category: 'bond',
    text: "I'm trying to pay off an old debt I owe to a generous benefactor.",
    background: 'Criminal',
    theme: 'Obligation',
  },
  {
    category: 'bond',
    text: 'My family, clan, or tribe is the most important thing in my life, even when they are far from me.',
    background: 'Noble',
    theme: 'Family',
  },
  {
    category: 'bond',
    text: 'I owe my survival to another urchin who taught me to live on the streets.',
    background: 'Urchin',
    theme: 'Mentorship',
  },

  // Flaws
  {
    category: 'flaw',
    text: 'I judge others harshly, and myself even more severely.',
    background: 'Acolyte',
    theme: 'Perfectionism',
  },
  {
    category: 'flaw',
    text: "I put too much trust in those who wield power within my temple's hierarchy.",
    background: 'Acolyte',
    theme: 'Naive Trust',
  },
  {
    category: 'flaw',
    text: "When I see something valuable, I can't think about anything but how to steal it.",
    background: 'Criminal',
    theme: 'Greed',
  },
  {
    category: 'flaw',
    text: 'I have a "tell" that reveals when I\'m lying.',
    background: 'Criminal',
    theme: 'Deception Failure',
  },
  {
    category: 'flaw',
    text: 'I secretly believe that everyone is beneath me.',
    background: 'Noble',
    theme: 'Arrogance',
  },
  {
    category: 'flaw',
    text: "Gold seems like a lot of money to me, and I'll do just about anything for more of it.",
    background: 'Urchin',
    theme: 'Desperation',
  },
];

/**
 * Personality guidance for players
 */
export const personalityGuidance = {
  traits: {
    description:
      'Personality traits give your character a distinctive behavior pattern or mannerism.',
    examples: [
      'Describe how your character acts in everyday situations',
      'Think about quirks, habits, or ways of speaking',
      'Consider how others see your character',
      'Usually have 2 traits that can complement or contrast each other',
    ],
    tips: [
      'Make them specific and memorable',
      'They should be noticeable in regular social situations',
      'Think about both positive and quirky aspects',
      'Consider how they developed from your background',
    ],
  },
  ideals: {
    description: 'Ideals drive your character and determine their most important values and goals.',
    examples: [
      'What does your character believe in most strongly?',
      'What principles guide their major decisions?',
      'What would they fight or die for?',
      'What do they think the world needs more of?',
    ],
    tips: [
      'Often tied to alignment and worldview',
      'Should influence major character decisions',
      'Can create internal or external conflict',
      'May evolve through character growth',
    ],
  },
  bonds: {
    description:
      'Bonds connect your character to the world, representing people, places, or things important to them.',
    examples: [
      "Important people in your character's life",
      'Places that hold special meaning',
      'Objects of great significance',
      'Organizations or causes they serve',
    ],
    tips: [
      'Give your DM tools to involve your character in the story',
      'Should create potential adventure hooks',
      'Can become sources of strength or vulnerability',
      'Make them specific and personal',
    ],
  },
  flaws: {
    description:
      "Flaws represent your character's weaknesses, compulsions, or negative personality aspects.",
    examples: [
      'Vices, compulsions, or bad habits',
      'Fears or phobias that complicate situations',
      'Negative personality traits that cause problems',
      'Past mistakes that still haunt them',
    ],
    tips: [
      'Should create interesting complications, not just penalties',
      'Give your character room to grow and change',
      'Balance serious flaws with lighter character quirks',
      'Think about how they developed from your background',
    ],
  },
};

/**
 * Helper function to get random personality examples by category
 */
export function getRandomPersonalityExamples(
  category: PersonalityExample['category'],
  count: number = 3,
): PersonalityExample[] {
  const examples = personalityExamples.filter((example) => example.category === category);
  const shuffled = [...examples].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

/**
 * Helper function to get personality examples by background
 */
export function getPersonalityExamplesByBackground(backgroundId: string): {
  traits: PersonalityExample[];
  ideals: PersonalityExample[];
  bonds: PersonalityExample[];
  flaws: PersonalityExample[];
} {
  const backgroundExamples = personalityExamples.filter(
    (example) =>
      example.background?.toLowerCase().includes(backgroundId.toLowerCase()) ||
      backgroundId.toLowerCase().includes(example.background?.toLowerCase() || ''),
  );

  return {
    traits: backgroundExamples.filter((ex) => ex.category === 'trait'),
    ideals: backgroundExamples.filter((ex) => ex.category === 'ideal'),
    bonds: backgroundExamples.filter((ex) => ex.category === 'bond'),
    flaws: backgroundExamples.filter((ex) => ex.category === 'flaw'),
  };
}

/**
 * Helper function to get inspiration triggers by personality type
 */
export function getInspirationTriggersByType(
  personalityType: InspirationTrigger['personalityType'],
): InspirationTrigger[] {
  return inspirationTriggers.filter(
    (trigger) => trigger.personalityType === personalityType || trigger.personalityType === 'trait',
  );
}
