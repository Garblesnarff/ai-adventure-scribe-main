/**
 * Enhanced Option Selection System Types
 *
 * Provides flexible option selection for character and campaign creation
 * to make unique and interesting characters/campaigns easier to create.
 */

// Core D&D types for type safety
export type AbilityScore =
  | 'strength'
  | 'dexterity'
  | 'constitution'
  | 'intelligence'
  | 'wisdom'
  | 'charisma';
export type DamageType =
  | 'acid'
  | 'bludgeoning'
  | 'cold'
  | 'fire'
  | 'force'
  | 'lightning'
  | 'necrotic'
  | 'piercing'
  | 'poison'
  | 'psychic'
  | 'radiant'
  | 'slashing'
  | 'thunder';
export type SkillName =
  | 'Acrobatics'
  | 'Animal Handling'
  | 'Arcana'
  | 'Athletics'
  | 'Deception'
  | 'History'
  | 'Insight'
  | 'Intimidation'
  | 'Investigation'
  | 'Medicine'
  | 'Nature'
  | 'Perception'
  | 'Performance'
  | 'Persuasion'
  | 'Religion'
  | 'Sleight of Hand'
  | 'Stealth'
  | 'Survival';

// Discriminated union for option values
export type OptionType = 'single' | 'multiple' | 'number' | 'text';

type OptionValue<T extends OptionType> = T extends 'single'
  ? string
  : T extends 'multiple'
    ? string[]
    : T extends 'number'
      ? number
      : T extends 'text'
        ? string
        : never;

export interface EnhancementOption<T extends OptionType = OptionType> {
  id: string;
  name: string;
  description: string;
  category: 'character' | 'campaign';
  type: T;
  icon?: string;
  tags: string[];

  // Enhanced mechanical effects for D&D 5e
  mechanicalEffects?: {
    abilityBonus?: Partial<Record<AbilityScore, number>>;
    skillBonus?: SkillName[];
    savingThrowBonus?: Partial<Record<AbilityScore, number>>;
    traits?: string[];
    equipment?: string[];
    spells?: string[];
    languages?: string[];
    resistances?: DamageType[];
    vulnerabilities?: DamageType[];
    immunities?: DamageType[];
    expertise?: SkillName[]; // Double proficiency bonus
    proficiencyBonus?: number; // Additional proficiency bonus
    armorClassBonus?: number;
    hitPointBonus?: number;
    speedBonus?: number;
    initiative?: number;
  };

  // Enhanced campaign effects
  campaignEffects?: {
    atmosphere?: string[];
    themes?: string[];
    npcs?: string[];
    locations?: string[];
    hooks?: string[];
    worldLaws?: string[];
    factionReputation?: { factionId: string; change: number }[];
    startingGoldModifier?: number; // Multiplier for starting gold
    environmentalEffects?: string[]; // Weather, terrain effects
    culturalElements?: string[]; // Customs, traditions
    economicFactors?: string[]; // Trade, currency, scarcity
  };

  // Value constraints
  min?: number;
  max?: number;
  options?: string[];

  // Advanced dependency management
  requiresRace?: string[];
  requiresClass?: string[];
  requiresLevel?: number;
  requiresBackground?: string[];
  requiresAbilityScore?: { ability: AbilityScore; minimum: number }[];
  excludesWith?: string[];
  unlocks?: string[]; // Options this selection makes available
  mutuallyExclusiveWith?: string[]; // Can't be selected with these options

  // AI enhancement
  aiGenerated?: boolean;
  aiGenerationPrompt?: string; // Prompt for LLM generation
  contextual?: boolean;
  aiContext?: {
    useCharacterRace?: boolean;
    useCharacterClass?: boolean;
    useCharacterBackground?: boolean;
    useCampaignTheme?: boolean;
    additionalContext?: string;
  };
}

export interface OptionSelection<T extends OptionType = OptionType> {
  optionId: string;
  value: OptionValue<T>;
  customValue?: string;
  aiGenerated?: boolean;
  timestamp?: string;
}

export interface EnhancementPackage {
  id: string;
  name: string;
  description: string;
  category: 'character' | 'campaign';
  options: EnhancementOption[];
  selections: OptionSelection[];
  isComplete: boolean;
  recommendedFor?: {
    races?: string[];
    classes?: string[];
    backgrounds?: string[];
    campaignTypes?: string[];
  };
}

// Predefined character enhancement options
export const CHARACTER_ENHANCEMENTS: EnhancementOption[] = [
  {
    id: 'quirks',
    name: 'Character Quirks',
    description: 'Add interesting personality quirks that make your character memorable',
    category: 'character',
    type: 'multiple',
    icon: '🎭',
    tags: ['personality', 'roleplay', 'quirks'],
    options: [
      'Always speaks in rhyme when nervous',
      'Collects unusual objects obsessively',
      'Has an imaginary friend they consult',
      'Constantly adjusts their clothing',
      'Makes up elaborate backstories for strangers',
      'Talks to their weapons/tools',
      'Never removes a specific piece of jewelry',
      'Draws sketches of everything they see',
      'Counts everything they encounter',
      'Always eats food in a specific order',
    ],
    mechanicalEffects: {
      traits: ['Enhanced roleplay opportunities', 'Inspiration trigger potential'],
    },
    max: 3,
  },
  {
    id: 'ai-generated-quirk',
    name: 'AI-Generated Quirk',
    description: 'Let the AI create a unique quirk tailored to your character',
    category: 'character',
    type: 'single',
    icon: '🤖',
    tags: ['personality', 'ai-generated', 'unique'],
    aiGenerated: true,
    aiGenerationPrompt:
      'Generate a single, interesting but not debilitating personality quirk for a {characterClass} {characterRace}. The quirk should be memorable and provide roleplay opportunities without hindering gameplay.',
    aiContext: {
      useCharacterRace: true,
      useCharacterClass: true,
      useCharacterBackground: true,
    },
  },
  {
    id: 'secrets',
    name: 'Character Secrets',
    description: 'Hidden aspects of your character that add depth and story hooks',
    category: 'character',
    type: 'single',
    icon: '🤐',
    tags: ['secrets', 'backstory', 'plot'],
    options: [
      'Is secretly nobility in hiding',
      'Has a price on their head',
      'Is actually much older than they appear',
      'Possesses forbidden knowledge',
      'Is related to a major villain',
      'Has lost memories of their past',
      'Is cursed in some way',
      'Is actually from another plane/world',
      'Has a secret twin or doppelganger',
      'Was raised by a different species',
    ],
  },
  {
    id: 'combat-specialties',
    name: 'Combat Specialties',
    description: 'Unique fighting styles or tactical preferences with mechanical benefits',
    category: 'character',
    type: 'single',
    icon: '⚔️',
    tags: ['combat', 'tactics', 'style'],
    options: [
      'Dual-wielding specialist',
      'Defensive tank style',
      'Ranged sniper approach',
      'Guerrilla tactics expert',
      'Protective bodyguard style',
      'Battlefield controller',
      'Stealth assassin methods',
      'Berserker rage fighter',
    ],
    mechanicalEffects: {
      skillBonus: ['Intimidation', 'Athletics'],
      traits: ['Combat preference noted'],
      initiative: 1,
    },
  },
  {
    id: 'social-connections',
    name: 'Social Connections',
    description: 'Important relationships and network ties',
    category: 'character',
    type: 'multiple',
    icon: '🤝',
    tags: ['social', 'relationships', 'network'],
    options: [
      'Has allies in the local thieves guild',
      'Knows someone in the city guard',
      'Has contacts among merchants',
      'Connected to a secret organization',
      'Friends with local tavern keepers',
      'Has ties to noble families',
      'Knows underground information brokers',
      'Connected to religious organizations',
    ],
    mechanicalEffects: {
      skillBonus: ['Persuasion', 'Investigation'],
    },
    max: 2,
  },
  {
    id: 'personal-goals',
    name: 'Personal Goals',
    description: 'Long-term aspirations and driving motivations',
    category: 'character',
    type: 'single',
    icon: '🎯',
    tags: ['motivation', 'goals', 'drive'],
    options: [
      'Seeking revenge for a past wrong',
      'Trying to restore family honor',
      'Searching for a lost loved one',
      'Attempting to master a specific skill',
      'Working to overthrow corruption',
      'Seeking to prove themselves worthy',
      'Trying to break a family curse',
      'Pursuing forbidden knowledge',
      'Building a legacy',
      'Protecting the innocent',
    ],
  },
  {
    id: 'special-training',
    name: 'Special Training',
    description: 'Additional training or expertise gained through experience',
    category: 'character',
    type: 'single',
    icon: '🎓',
    tags: ['training', 'expertise', 'skills'],
    options: [
      'Acrobatic training',
      'Military tactics',
      'Scholarly research',
      'Survival skills',
      'Social etiquette',
      'Criminal techniques',
      'Artistic expression',
      'Religious studies',
    ],
    mechanicalEffects: {
      expertise: ['Athletics'], // Will be context-dependent
      skillBonus: ['Acrobatics'],
    },
    requiresLevel: 3,
  },
];

// Predefined campaign enhancement options
export const CAMPAIGN_ENHANCEMENTS: EnhancementOption[] = [
  {
    id: 'story-hooks',
    name: 'Story Hooks',
    description: 'Engaging plot threads to weave into your campaign',
    category: 'campaign',
    type: 'multiple',
    icon: '🎣',
    tags: ['plot', 'hooks', 'story'],
    options: [
      'A mysterious benefactor funds the party',
      'Ancient prophecy involves the characters',
      'Political intrigue threatens the realm',
      'Planar rifts are opening randomly',
      'A cult is secretly infiltrating society',
      'Time itself is becoming unstable',
      'The gods have gone silent',
      'A powerful artifact has been shattered',
      'Dreams are becoming reality',
      'The dead refuse to stay buried',
    ],
    campaignEffects: {
      hooks: ['Plot thread available', 'Story complication ready'],
    },
    max: 3,
  },
  {
    id: 'world-features',
    name: 'Unique World Features',
    description: 'Special characteristics that make your world stand out',
    category: 'campaign',
    type: 'multiple',
    icon: '🌍',
    tags: ['worldbuilding', 'features', 'unique'],
    options: [
      'Magic is slowly fading from the world',
      'Technology and magic coexist',
      'The world is actually a massive ship',
      'Seasons change based on divine moods',
      'Gravity varies by location',
      'Time flows differently in certain areas',
      'The dead sometimes return as helpful spirits',
      'Dreams can become physical reality',
      'Music has magical properties',
      'Colors affect emotions and magic',
    ],
    campaignEffects: {
      atmosphere: ['Unique world element', 'Special rules consideration'],
      worldLaws: ['Modified physics', 'Altered magic rules'],
    },
    max: 2,
  },
  {
    id: 'social-dynamics',
    name: 'Social Dynamics',
    description: 'Complex relationships between groups and factions',
    category: 'campaign',
    type: 'multiple',
    icon: '⚖️',
    tags: ['politics', 'factions', 'society'],
    options: [
      'Tensions between magic users and mundane folk',
      'Economic warfare between merchant guilds',
      'Religious schism dividing the population',
      'Generational conflict over traditions',
      'Class struggle between nobles and commoners',
      'Racial tensions due to historical conflicts',
      'Competing schools of magical thought',
      'Ideological split over technology adoption',
    ],
    campaignEffects: {
      themes: ['Social conflict', 'Political complexity'],
      factionReputation: [
        { factionId: 'mages_guild', change: -1 },
        { factionId: 'common_folk', change: 1 },
      ],
    },
    max: 2,
  },
  {
    id: 'central-mystery',
    name: 'Central Mystery',
    description: 'An overarching puzzle for players to unravel',
    category: 'campaign',
    type: 'single',
    icon: '❓',
    tags: ['mystery', 'investigation', 'puzzle'],
    options: [
      'Why do people keep disappearing near the forest?',
      'What caused the ancient civilization to vanish?',
      'Who is behind the recent string of perfect crimes?',
      'Why have the animals started acting strangely?',
      'What is the true purpose of the old tower?',
      'Who is sending the cryptic messages?',
      'Why do nightmares become real in this town?',
      'What lies beneath the sealed chamber?',
      'Why do the stars seem to be moving?',
      'What happened to make the river run backwards?',
    ],
  },
  {
    id: 'ai-generated-mystery',
    name: 'AI-Generated Mystery',
    description: 'Let the AI create a unique central mystery for your campaign',
    category: 'campaign',
    type: 'single',
    icon: '🤖',
    tags: ['mystery', 'ai-generated', 'unique'],
    aiGenerated: true,
    aiGenerationPrompt:
      'Generate an intriguing central mystery for a {campaignTheme} campaign. The mystery should be solvable through investigation and provide multiple avenues for exploration.',
    aiContext: {
      useCampaignTheme: true,
      additionalContext: 'Consider the campaign setting and tone',
    },
  },
  {
    id: 'tone-modifiers',
    name: 'Tone Modifiers',
    description: 'Additional elements that shape the campaign atmosphere',
    category: 'campaign',
    type: 'multiple',
    icon: '🎨',
    tags: ['tone', 'atmosphere', 'mood'],
    options: [
      'Comedic relief moments are encouraged',
      'Horror elements lurk beneath the surface',
      'Romance subplots are welcome',
      'Moral dilemmas challenge the party',
      'Heroic moments should feel earned',
      'Unexpected plot twists keep everyone guessing',
      'Character development takes priority',
      'Epic scale conflicts drive the story',
      'Political intrigue adds complexity',
      'Environmental storytelling is emphasized',
    ],
    campaignEffects: {
      atmosphere: ['Tone guidance', 'Narrative emphasis'],
    },
    max: 4,
  },
  {
    id: 'economic-factors',
    name: 'Economic Considerations',
    description: 'How wealth, trade, and resources shape your world',
    category: 'campaign',
    type: 'multiple',
    icon: '💰',
    tags: ['economy', 'trade', 'resources'],
    options: [
      'Gold is scarce and precious',
      'Barter system dominates trade',
      'Magical items are heavily regulated',
      'Certain materials are illegal to possess',
      'Economic inequality drives conflict',
      'Trade routes are dangerous but profitable',
      'Currency varies by region',
      'Resources are controlled by guilds',
    ],
    campaignEffects: {
      economicFactors: ['Trade considerations', 'Wealth distribution'],
      startingGoldModifier: 0.75, // Less starting gold due to scarcity
    },
    max: 2,
  },
];

// Helper functions for option validation
export function validateOptionSelection<T extends OptionType>(
  option: EnhancementOption<T>,
  selection: OptionSelection<T>,
): boolean {
  switch (option.type) {
    case 'multiple': {
      const values = selection.value as string[];
      return (
        Array.isArray(values) &&
        values.length <= (option.max || Infinity) &&
        values.every((v) => option.options?.includes(v))
      );
    }
    case 'single': {
      return (
        typeof selection.value === 'string' &&
        (option.options?.includes(selection.value as string) ?? true)
      );
    }
    case 'number': {
      const num = selection.value as number;
      return typeof num === 'number' && num >= (option.min || 0) && num <= (option.max || Infinity);
    }
    case 'text':
      return typeof selection.value === 'string';
    default:
      return false;
  }
}

export function checkOptionAvailability(
  option: EnhancementOption,
  character?: any,
  campaign?: any,
  selectedOptions: string[] = [],
): boolean {
  // Check level requirements
  if (option.requiresLevel && character?.level < option.requiresLevel) {
    return false;
  }

  // Check race requirements
  if (option.requiresRace && !option.requiresRace.includes(character?.race?.id)) {
    return false;
  }

  // Check class requirements
  if (option.requiresClass && !option.requiresClass.includes(character?.class?.id)) {
    return false;
  }

  // Check ability score requirements
  if (option.requiresAbilityScore) {
    for (const req of option.requiresAbilityScore) {
      const score = character?.abilityScores?.[req.ability]?.score || 0;
      if (score < req.minimum) {
        return false;
      }
    }
  }

  // Check exclusions
  if (option.excludesWith?.some((id) => selectedOptions.includes(id))) {
    return false;
  }

  // Check mutual exclusions
  if (option.mutuallyExclusiveWith?.some((id) => selectedOptions.includes(id))) {
    return false;
  }

  return true;
}
