import type { AbilityScores } from '@/types/character';

/**
 * Interface for metamagic options (Sorcerer feature)
 */
export interface MetamagicOption {
  id: string;
  name: string;
  description: string;
  sorceryPointCost: number;
  applicableSpellLevels?: number[]; // If undefined, applies to all spell levels
}

/**
 * Interface for spell preparation mechanics
 */
export interface SpellPreparation {
  canPrepareSpells: boolean;
  preparationMethod: 'long-rest' | 'short-rest' | 'never';
  spellsKnownFormula?: string; // e.g., "level + ability_modifier"
  maxPreparedSpells?: number;
  ritualCasting: boolean;
  ritualSpellbook?: boolean; // Can cast ritual spells from spellbook without preparing them
}

/**
 * Interface for pact magic system (Warlock)
 */
export interface PactMagicSystem {
  usePactMagic: boolean;
  pactSlotLevel: number;
  pactSlots: number;
  shortRestRecovery: boolean;
  spellsKnown: number;
  cantripsKnown: number;
}

/**
 * Enhanced spellcasting interface
 */
export interface AdvancedSpellcasting {
  ability: keyof AbilityScores;
  cantripsKnown: number;
  spellsKnown?: number;

  // Spell Preparation
  preparation: SpellPreparation;

  // Pact Magic (Warlock)
  pactMagic?: PactMagicSystem;

  // Metamagic (Sorcerer)
  metamagic?: {
    available: boolean;
    sorceryPoints: number;
    optionsKnown: number;
  };

  // Ritual Casting
  ritualCasting: boolean;

  // Spellbook (Wizard)
  spellbook?: {
    hasSpellbook: boolean;
    ritualCasting: boolean;
    learnSpellsOnLevelUp: number;
    canCopySpells: boolean;
  };
}

/**
 * Metamagic Options for Sorcerers
 */
export const metamagicOptions: MetamagicOption[] = [
  {
    id: 'careful-spell',
    name: 'Careful Spell',
    description:
      "When you cast a spell that forces other creatures to make a saving throw, you can protect some of those creatures from the spell's full force. To do so, you spend 1 sorcery point and choose a number of those creatures up to your Charisma modifier (minimum of one creature). A chosen creature automatically succeeds on its saving throw against the spell.",
    sorceryPointCost: 1,
  },
  {
    id: 'distant-spell',
    name: 'Distant Spell',
    description:
      'When you cast a spell that has a range of 5 feet or greater, you can spend 1 sorcery point to double the range of the spell. When you cast a spell that has a range of touch, you can spend 1 sorcery point to make the range of the spell 30 feet.',
    sorceryPointCost: 1,
  },
  {
    id: 'empowered-spell',
    name: 'Empowered Spell',
    description:
      'When you roll damage for a spell, you can spend 1 sorcery point to reroll a number of the damage dice up to your Charisma modifier (minimum of one). You must use the new rolls. You can use Empowered Spell even if you have already used a different Metamagic option during the casting of the spell.',
    sorceryPointCost: 1,
  },
  {
    id: 'extended-spell',
    name: 'Extended Spell',
    description:
      'When you cast a spell that has a duration of 1 minute or longer, you can spend 1 sorcery point to double its duration, to a maximum duration of 24 hours.',
    sorceryPointCost: 1,
  },
  {
    id: 'heightened-spell',
    name: 'Heightened Spell',
    description:
      'When you cast a spell that forces a creature to make a saving throw to resist its effects, you can spend 3 sorcery points to give one target of the spell disadvantage on its first saving throw made against the spell.',
    sorceryPointCost: 3,
  },
  {
    id: 'quickened-spell',
    name: 'Quickened Spell',
    description:
      'When you cast a spell that has a casting time of 1 action, you can spend 2 sorcery points to change the casting time to 1 bonus action for this casting.',
    sorceryPointCost: 2,
    applicableSpellLevels: [1, 2, 3, 4, 5, 6, 7, 8, 9],
  },
  {
    id: 'subtle-spell',
    name: 'Subtle Spell',
    description:
      'When you cast a spell, you can spend 1 sorcery point to cast it without any somatic or verbal components.',
    sorceryPointCost: 1,
  },
  {
    id: 'twinned-spell',
    name: 'Twinned Spell',
    description:
      "When you cast a spell that targets only one creature and doesn't have a range of self, you can spend a number of sorcery points equal to the spell's level to target a second creature in range with the same spell (1 sorcery point if the spell is a cantrip). To be eligible, a spell must be incapable of targeting more than one creature at the spell's current level.",
    sorceryPointCost: 1, // Variable based on spell level
  },
];

/**
 * Spellcasting progression tables for different classes
 */
export const spellcastingProgression = {
  fullCaster: {
    1: { cantrips: 3, spells: [2, 0, 0, 0, 0, 0, 0, 0, 0] },
    2: { cantrips: 3, spells: [3, 0, 0, 0, 0, 0, 0, 0, 0] },
    3: { cantrips: 3, spells: [4, 2, 0, 0, 0, 0, 0, 0, 0] },
    4: { cantrips: 4, spells: [4, 3, 0, 0, 0, 0, 0, 0, 0] },
    5: { cantrips: 4, spells: [4, 3, 2, 0, 0, 0, 0, 0, 0] },
    6: { cantrips: 4, spells: [4, 3, 3, 0, 0, 0, 0, 0, 0] },
    7: { cantrips: 4, spells: [4, 3, 3, 1, 0, 0, 0, 0, 0] },
    8: { cantrips: 4, spells: [4, 3, 3, 2, 0, 0, 0, 0, 0] },
    9: { cantrips: 4, spells: [4, 3, 3, 3, 1, 0, 0, 0, 0] },
    10: { cantrips: 5, spells: [4, 3, 3, 3, 2, 0, 0, 0, 0] },
    11: { cantrips: 5, spells: [4, 3, 3, 3, 2, 1, 0, 0, 0] },
    12: { cantrips: 5, spells: [4, 3, 3, 3, 2, 1, 0, 0, 0] },
    13: { cantrips: 5, spells: [4, 3, 3, 3, 2, 1, 1, 0, 0] },
    14: { cantrips: 5, spells: [4, 3, 3, 3, 2, 1, 1, 0, 0] },
    15: { cantrips: 5, spells: [4, 3, 3, 3, 2, 1, 1, 1, 0] },
    16: { cantrips: 5, spells: [4, 3, 3, 3, 2, 1, 1, 1, 0] },
    17: { cantrips: 5, spells: [4, 3, 3, 3, 2, 1, 1, 1, 1] },
    18: { cantrips: 5, spells: [4, 3, 3, 3, 3, 1, 1, 1, 1] },
    19: { cantrips: 5, spells: [4, 3, 3, 3, 3, 2, 1, 1, 1] },
    20: { cantrips: 5, spells: [4, 3, 3, 3, 3, 2, 2, 1, 1] },
  },
  halfCaster: {
    2: { cantrips: 0, spells: [2, 0, 0, 0, 0] },
    3: { cantrips: 0, spells: [3, 0, 0, 0, 0] },
    4: { cantrips: 0, spells: [3, 0, 0, 0, 0] },
    5: { cantrips: 0, spells: [4, 2, 0, 0, 0] },
    6: { cantrips: 0, spells: [4, 2, 0, 0, 0] },
    7: { cantrips: 0, spells: [4, 3, 0, 0, 0] },
    8: { cantrips: 0, spells: [4, 3, 0, 0, 0] },
    9: { cantrips: 0, spells: [4, 3, 2, 0, 0] },
    10: { cantrips: 0, spells: [4, 3, 2, 0, 0] },
    11: { cantrips: 0, spells: [4, 3, 3, 0, 0] },
    12: { cantrips: 0, spells: [4, 3, 3, 0, 0] },
    13: { cantrips: 0, spells: [4, 3, 3, 1, 0] },
    14: { cantrips: 0, spells: [4, 3, 3, 1, 0] },
    15: { cantrips: 0, spells: [4, 3, 3, 2, 0] },
    16: { cantrips: 0, spells: [4, 3, 3, 2, 0] },
    17: { cantrips: 0, spells: [4, 3, 3, 3, 1] },
    18: { cantrips: 0, spells: [4, 3, 3, 3, 1] },
    19: { cantrips: 0, spells: [4, 3, 3, 3, 2] },
    20: { cantrips: 0, spells: [4, 3, 3, 3, 2] },
  },
  pactMagic: {
    1: { cantrips: 2, pactSlots: 1, pactSlotLevel: 1, spellsKnown: 2 },
    2: { cantrips: 2, pactSlots: 2, pactSlotLevel: 1, spellsKnown: 3 },
    3: { cantrips: 2, pactSlots: 2, pactSlotLevel: 2, spellsKnown: 4 },
    4: { cantrips: 3, pactSlots: 2, pactSlotLevel: 2, spellsKnown: 5 },
    5: { cantrips: 3, pactSlots: 2, pactSlotLevel: 3, spellsKnown: 6 },
    6: { cantrips: 3, pactSlots: 2, pactSlotLevel: 3, spellsKnown: 7 },
    7: { cantrips: 3, pactSlots: 2, pactSlotLevel: 4, spellsKnown: 8 },
    8: { cantrips: 3, pactSlots: 2, pactSlotLevel: 4, spellsKnown: 9 },
    9: { cantrips: 3, pactSlots: 2, pactSlotLevel: 5, spellsKnown: 10 },
    10: { cantrips: 4, pactSlots: 2, pactSlotLevel: 5, spellsKnown: 10 },
    11: { cantrips: 4, pactSlots: 3, pactSlotLevel: 5, spellsKnown: 11 },
    12: { cantrips: 4, pactSlots: 3, pactSlotLevel: 5, spellsKnown: 11 },
    13: { cantrips: 4, pactSlots: 3, pactSlotLevel: 5, spellsKnown: 12 },
    14: { cantrips: 4, pactSlots: 3, pactSlotLevel: 5, spellsKnown: 12 },
    15: { cantrips: 4, pactSlots: 3, pactSlotLevel: 5, spellsKnown: 13 },
    16: { cantrips: 4, pactSlots: 3, pactSlotLevel: 5, spellsKnown: 13 },
    17: { cantrips: 4, pactSlots: 4, pactSlotLevel: 5, spellsKnown: 14 },
    18: { cantrips: 4, pactSlots: 4, pactSlotLevel: 5, spellsKnown: 14 },
    19: { cantrips: 4, pactSlots: 4, pactSlotLevel: 5, spellsKnown: 15 },
    20: { cantrips: 4, pactSlots: 4, pactSlotLevel: 5, spellsKnown: 15 },
  },
};

/**
 * Helper functions
 */
export const getSpellSlotsByLevel = (characterClass: string, level: number): number[] => {
  if (characterClass.toLowerCase() === 'warlock') {
    return []; // Warlocks use Pact Magic, not regular spell slots
  }

  const isHalfCaster = ['paladin', 'ranger'].includes(characterClass.toLowerCase());
  const progression = isHalfCaster
    ? spellcastingProgression.halfCaster
    : spellcastingProgression.fullCaster;

  return progression[level as keyof typeof progression]?.spells || [];
};

export const getPactMagicProgression = (level: number) => {
  return spellcastingProgression.pactMagic[level as keyof typeof spellcastingProgression.pactMagic];
};

export const calculateSpellsKnown = (
  characterClass: string,
  level: number,
  abilityModifier: number,
): number => {
  const className = characterClass.toLowerCase();

  switch (className) {
    case 'bard':
    case 'ranger':
    case 'sorcerer':
    case 'warlock':
      // These classes have a fixed spells known progression
      return 0; // Should be looked up in class-specific tables

    case 'cleric':
    case 'druid':
    case 'paladin':
      // Prepare spells = level + ability modifier
      return Math.max(1, level + abilityModifier);

    case 'wizard':
      // Wizards learn spells in spellbook, prepare level + int modifier
      return Math.max(1, level + abilityModifier);

    default:
      return 0;
  }
};

export const canCastRituals = (characterClass: string): boolean => {
  return ['bard', 'cleric', 'druid', 'wizard', 'warlock'].includes(characterClass.toLowerCase());
};

export const hasPactMagic = (characterClass: string): boolean => {
  return characterClass.toLowerCase() === 'warlock';
};

export const hasMetamagic = (characterClass: string, level: number): boolean => {
  return characterClass.toLowerCase() === 'sorcerer' && level >= 3;
};

export const getSorceryPoints = (level: number): number => {
  return Math.max(0, level);
};

export const getMetamagicOptionsKnown = (level: number): number => {
  if (level < 3) return 0;
  if (level < 10) return 2;
  if (level < 17) return 3;
  return 4;
};
