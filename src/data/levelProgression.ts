import type { AbilityScores } from '@/types/character';

/**
 * D&D 5E Experience Point requirements for each level
 */
export const experienceTable: Record<number, number> = {
  1: 0,
  2: 300,
  3: 900,
  4: 2700,
  5: 6500,
  6: 14000,
  7: 23000,
  8: 34000,
  9: 48000,
  10: 64000,
  11: 85000,
  12: 100000,
  13: 120000,
  14: 140000,
  15: 165000,
  16: 195000,
  17: 225000,
  18: 265000,
  19: 305000,
  20: 355000,
};

/**
 * Proficiency bonus by character level
 */
export const proficiencyBonusTable: Record<number, number> = {
  1: 2,
  2: 2,
  3: 2,
  4: 2,
  5: 3,
  6: 3,
  7: 3,
  8: 3,
  9: 4,
  10: 4,
  11: 4,
  12: 4,
  13: 5,
  14: 5,
  15: 5,
  16: 5,
  17: 6,
  18: 6,
  19: 6,
  20: 6,
};

/**
 * Multiclassing ability score requirements
 */
export const multiclassRequirements: Record<
  string,
  { ability: keyof AbilityScores; minimum: number }
> = {
  barbarian: { ability: 'strength', minimum: 13 },
  bard: { ability: 'charisma', minimum: 13 },
  cleric: { ability: 'wisdom', minimum: 13 },
  druid: { ability: 'wisdom', minimum: 13 },
  fighter: { ability: 'strength', minimum: 13 }, // or Dexterity 13
  monk: { ability: 'dexterity', minimum: 13 }, // and Wisdom 13
  paladin: { ability: 'strength', minimum: 13 }, // and Charisma 13
  ranger: { ability: 'dexterity', minimum: 13 }, // and Wisdom 13
  rogue: { ability: 'dexterity', minimum: 13 },
  sorcerer: { ability: 'charisma', minimum: 13 },
  warlock: { ability: 'charisma', minimum: 13 },
  wizard: { ability: 'intelligence', minimum: 13 },
};

/**
 * Class features that are gained at specific levels
 */
export interface LevelFeature {
  level: number;
  featureName: string;
  description: string;
  choices?: {
    name: string;
    options: string[];
    description?: string;
  };
  abilityScoreImprovement?: boolean;
}

/**
 * Class progression tables for each class
 */
export const classProgressions: Record<string, LevelFeature[]> = {
  fighter: [
    { level: 1, featureName: 'Fighting Style', description: 'Choose a fighting style.' },
    { level: 1, featureName: 'Second Wind', description: 'Recover hit points as a bonus action.' },
    {
      level: 2,
      featureName: 'Action Surge',
      description: 'Take an additional action on your turn.',
    },
    { level: 3, featureName: 'Martial Archetype', description: 'Choose your martial archetype.' },
    {
      level: 4,
      featureName: 'Ability Score Improvement',
      description: 'Improve ability scores or take a feat.',
      abilityScoreImprovement: true,
    },
    {
      level: 5,
      featureName: 'Extra Attack',
      description: 'Attack twice when you take the Attack action.',
    },
    {
      level: 6,
      featureName: 'Ability Score Improvement',
      description: 'Improve ability scores or take a feat.',
      abilityScoreImprovement: true,
    },
    {
      level: 7,
      featureName: 'Martial Archetype Feature',
      description: 'Gain a feature from your chosen archetype.',
    },
    {
      level: 8,
      featureName: 'Ability Score Improvement',
      description: 'Improve ability scores or take a feat.',
      abilityScoreImprovement: true,
    },
    { level: 9, featureName: 'Indomitable', description: 'Reroll a failed saving throw.' },
    {
      level: 10,
      featureName: 'Martial Archetype Feature',
      description: 'Gain a feature from your chosen archetype.',
    },
    {
      level: 11,
      featureName: 'Extra Attack (2)',
      description: 'Attack three times when you take the Attack action.',
    },
    {
      level: 12,
      featureName: 'Ability Score Improvement',
      description: 'Improve ability scores or take a feat.',
      abilityScoreImprovement: true,
    },
  ],

  wizard: [
    { level: 1, featureName: 'Spellcasting', description: 'Cast wizard spells.' },
    {
      level: 1,
      featureName: 'Arcane Recovery',
      description: 'Recover spell slots on a short rest.',
    },
    { level: 2, featureName: 'Arcane Tradition', description: 'Choose your arcane tradition.' },
    { level: 3, featureName: '2nd-level Spells', description: 'Learn 2nd-level spells.' },
    {
      level: 4,
      featureName: 'Ability Score Improvement',
      description: 'Improve ability scores or take a feat.',
      abilityScoreImprovement: true,
    },
    { level: 5, featureName: '3rd-level Spells', description: 'Learn 3rd-level spells.' },
    {
      level: 6,
      featureName: 'Arcane Tradition Feature',
      description: 'Gain a feature from your chosen tradition.',
    },
    { level: 7, featureName: '4th-level Spells', description: 'Learn 4th-level spells.' },
    {
      level: 8,
      featureName: 'Ability Score Improvement',
      description: 'Improve ability scores or take a feat.',
      abilityScoreImprovement: true,
    },
    { level: 9, featureName: '5th-level Spells', description: 'Learn 5th-level spells.' },
    {
      level: 10,
      featureName: 'Arcane Tradition Feature',
      description: 'Gain a feature from your chosen tradition.',
    },
    { level: 11, featureName: '6th-level Spells', description: 'Learn 6th-level spells.' },
    {
      level: 12,
      featureName: 'Ability Score Improvement',
      description: 'Improve ability scores or take a feat.',
      abilityScoreImprovement: true,
    },
  ],

  rogue: [
    { level: 1, featureName: 'Expertise', description: 'Double proficiency bonus for two skills.' },
    {
      level: 1,
      featureName: 'Sneak Attack',
      description: 'Deal extra damage when you have advantage.',
    },
    { level: 1, featureName: "Thieves' Cant", description: 'Secret language of rogues.' },
    {
      level: 2,
      featureName: 'Cunning Action',
      description: 'Dash, Disengage, or Hide as bonus actions.',
    },
    { level: 3, featureName: 'Roguish Archetype', description: 'Choose your roguish archetype.' },
    {
      level: 4,
      featureName: 'Ability Score Improvement',
      description: 'Improve ability scores or take a feat.',
      abilityScoreImprovement: true,
    },
    {
      level: 5,
      featureName: 'Uncanny Dodge',
      description: 'Halve damage from one attack per turn.',
    },
    {
      level: 6,
      featureName: 'Expertise',
      description: 'Double proficiency bonus for two more skills.',
    },
    { level: 7, featureName: 'Evasion', description: 'Take no damage on successful Dex saves.' },
    {
      level: 8,
      featureName: 'Ability Score Improvement',
      description: 'Improve ability scores or take a feat.',
      abilityScoreImprovement: true,
    },
    {
      level: 9,
      featureName: 'Roguish Archetype Feature',
      description: 'Gain a feature from your chosen archetype.',
    },
    {
      level: 10,
      featureName: 'Ability Score Improvement',
      description: 'Improve ability scores or take a feat.',
      abilityScoreImprovement: true,
    },
    {
      level: 11,
      featureName: 'Reliable Talent',
      description: 'Treat d20 rolls of 9 or lower as 10 for skills.',
    },
    {
      level: 12,
      featureName: 'Ability Score Improvement',
      description: 'Improve ability scores or take a feat.',
      abilityScoreImprovement: true,
    },
  ],

  cleric: [
    { level: 1, featureName: 'Spellcasting', description: 'Cast cleric spells.' },
    { level: 1, featureName: 'Divine Domain', description: 'Choose your divine domain.' },
    {
      level: 2,
      featureName: 'Channel Divinity',
      description: 'Channel divine energy for magical effects.',
    },
    { level: 3, featureName: '2nd-level Spells', description: 'Cast 2nd-level spells.' },
    {
      level: 4,
      featureName: 'Ability Score Improvement',
      description: 'Improve ability scores or take a feat.',
      abilityScoreImprovement: true,
    },
    {
      level: 5,
      featureName: 'Destroy Undead',
      description: 'Destroy undead with Channel Divinity.',
    },
    { level: 5, featureName: '3rd-level Spells', description: 'Cast 3rd-level spells.' },
    {
      level: 6,
      featureName: 'Channel Divinity (2/rest)',
      description: 'Use Channel Divinity twice per rest.',
    },
    {
      level: 6,
      featureName: 'Divine Domain Feature',
      description: 'Gain a feature from your divine domain.',
    },
    { level: 7, featureName: '4th-level Spells', description: 'Cast 4th-level spells.' },
    {
      level: 8,
      featureName: 'Ability Score Improvement',
      description: 'Improve ability scores or take a feat.',
      abilityScoreImprovement: true,
    },
    {
      level: 8,
      featureName: 'Divine Domain Feature',
      description: 'Gain a feature from your divine domain.',
    },
    { level: 9, featureName: '5th-level Spells', description: 'Cast 5th-level spells.' },
    { level: 10, featureName: 'Divine Intervention', description: 'Ask your deity to intervene.' },
    {
      level: 11,
      featureName: 'Destroy Undead (CR 2)',
      description: 'Destroy more powerful undead.',
    },
    {
      level: 12,
      featureName: 'Ability Score Improvement',
      description: 'Improve ability scores or take a feat.',
      abilityScoreImprovement: true,
    },
  ],

  barbarian: [
    {
      level: 1,
      featureName: 'Rage',
      description: 'Enter a battle rage for bonus damage and resistance.',
    },
    {
      level: 1,
      featureName: 'Unarmored Defense',
      description: 'AC = 10 + Dex mod + Con mod when unarmored.',
    },
    {
      level: 2,
      featureName: 'Reckless Attack',
      description: 'Gain advantage on attacks but enemies have advantage on you.',
    },
    {
      level: 2,
      featureName: 'Danger Sense',
      description: 'Advantage on Dex saves against effects you can see.',
    },
    { level: 3, featureName: 'Primal Path', description: 'Choose your primal path.' },
    {
      level: 4,
      featureName: 'Ability Score Improvement',
      description: 'Improve ability scores or take a feat.',
      abilityScoreImprovement: true,
    },
    {
      level: 5,
      featureName: 'Extra Attack',
      description: 'Attack twice when you take the Attack action.',
    },
    {
      level: 5,
      featureName: 'Fast Movement',
      description: 'Speed increases by 10 feet when not wearing heavy armor.',
    },
    {
      level: 6,
      featureName: 'Primal Path Feature',
      description: 'Gain a feature from your primal path.',
    },
    {
      level: 7,
      featureName: 'Feral Instinct',
      description: "Advantage on initiative and can't be surprised while conscious.",
    },
    {
      level: 8,
      featureName: 'Ability Score Improvement',
      description: 'Improve ability scores or take a feat.',
      abilityScoreImprovement: true,
    },
    {
      level: 9,
      featureName: 'Brutal Critical (1 die)',
      description: 'Roll one additional damage die on critical hits.',
    },
    {
      level: 10,
      featureName: 'Primal Path Feature',
      description: 'Gain a feature from your primal path.',
    },
    {
      level: 11,
      featureName: 'Relentless Rage',
      description: 'Keep fighting when you drop to 0 hit points.',
    },
    {
      level: 12,
      featureName: 'Ability Score Improvement',
      description: 'Improve ability scores or take a feat.',
      abilityScoreImprovement: true,
    },
  ],
};

/**
 * Multiclassing proficiencies gained
 */
export const multiclassProficiencies: Record<
  string,
  {
    armor?: string[];
    weapons?: string[];
    tools?: string[];
    skillChoices?: string[];
    numSkillChoices?: number;
  }
> = {
  barbarian: {
    armor: ['Shields'],
    weapons: ['Simple weapons', 'Martial weapons'],
  },
  bard: {
    armor: ['Light armor'],
    weapons: ['Simple weapons', 'Hand crossbows', 'Longswords', 'Rapiers', 'Shortswords'],
    tools: ['One musical instrument of your choice'],
    skillChoices: ['Any'],
    numSkillChoices: 1,
  },
  cleric: {
    armor: ['Light armor', 'Medium armor', 'Shields'],
    weapons: ['Simple weapons'],
  },
  druid: {
    armor: ['Light armor', 'Medium armor', 'Shields (non-metal)'],
    weapons: [
      'Clubs',
      'Daggers',
      'Darts',
      'Javelins',
      'Maces',
      'Quarterstaffs',
      'Scimitars',
      'Sickles',
      'Slings',
      'Spears',
    ],
  },
  fighter: {
    armor: ['Light armor', 'Medium armor', 'Heavy armor', 'Shields'],
    weapons: ['Simple weapons', 'Martial weapons'],
  },
  monk: {
    weapons: ['Simple weapons', 'Shortswords'],
  },
  paladin: {
    armor: ['Light armor', 'Medium armor', 'Heavy armor', 'Shields'],
    weapons: ['Simple weapons', 'Martial weapons'],
  },
  ranger: {
    armor: ['Light armor', 'Medium armor', 'Shields'],
    weapons: ['Simple weapons', 'Martial weapons'],
    skillChoices: [
      'Animal Handling',
      'Athletics',
      'Insight',
      'Investigation',
      'Nature',
      'Perception',
      'Stealth',
      'Survival',
    ],
    numSkillChoices: 1,
  },
  rogue: {
    armor: ['Light armor'],
    weapons: ['Simple weapons', 'Hand crossbows', 'Longswords', 'Rapiers', 'Shortswords'],
    tools: ["Thieves' tools"],
    skillChoices: [
      'Acrobatics',
      'Athletics',
      'Deception',
      'Insight',
      'Intimidation',
      'Investigation',
      'Perception',
      'Performance',
      'Persuasion',
      'Sleight of Hand',
      'Stealth',
    ],
    numSkillChoices: 1,
  },
  sorcerer: {
    weapons: ['Daggers', 'Darts', 'Slings', 'Quarterstaffs', 'Light crossbows'],
  },
  warlock: {
    armor: ['Light armor'],
    weapons: ['Simple weapons'],
  },
  wizard: {
    weapons: ['Daggers', 'Darts', 'Slings', 'Quarterstaffs', 'Light crossbows'],
  },
};

/**
 * Helper functions for level advancement
 */

export function getExperienceForLevel(level: number): number {
  return experienceTable[level] || 0;
}

export function getLevelFromExperience(experience: number): number {
  for (let level = 20; level >= 1; level--) {
    if (experience >= experienceTable[level]) {
      return level;
    }
  }
  return 1;
}

export function getProficiencyBonus(level: number): number {
  return proficiencyBonusTable[Math.min(20, Math.max(1, level))] || 2;
}

export function canMulticlass(
  currentClass: string,
  targetClass: string,
  abilityScores: Record<keyof AbilityScores, { score: number; modifier: number }>,
): { canMulticlass: boolean; requirements: string[] } {
  const requirements: string[] = [];
  let canMulticlass = true;

  // Check current class requirements (to multiclass OUT of current class)
  const currentReq = multiclassRequirements[currentClass.toLowerCase()];
  if (currentReq) {
    const currentAbility = abilityScores[currentReq.ability];
    if (currentAbility.score < currentReq.minimum) {
      requirements.push(`${currentClass}: ${currentReq.ability} ${currentReq.minimum}+`);
      canMulticlass = false;
    }
  }

  // Check target class requirements (to multiclass INTO target class)
  const targetReq = multiclassRequirements[targetClass.toLowerCase()];
  if (targetReq) {
    const targetAbility = abilityScores[targetReq.ability];
    if (targetAbility.score < targetReq.minimum) {
      requirements.push(`${targetClass}: ${targetReq.ability} ${targetReq.minimum}+`);
      canMulticlass = false;
    }
  }

  // Special cases for classes with multiple requirements
  if (targetClass.toLowerCase() === 'monk') {
    const wisdom = abilityScores.wisdom;
    if (wisdom.score < 13) {
      requirements.push(`Monk: Wisdom 13+`);
      canMulticlass = false;
    }
  }

  if (targetClass.toLowerCase() === 'paladin') {
    const charisma = abilityScores.charisma;
    if (charisma.score < 13) {
      requirements.push(`Paladin: Charisma 13+`);
      canMulticlass = false;
    }
  }

  if (targetClass.toLowerCase() === 'ranger') {
    const wisdom = abilityScores.wisdom;
    if (wisdom.score < 13) {
      requirements.push(`Ranger: Wisdom 13+`);
      canMulticlass = false;
    }
  }

  return { canMulticlass, requirements };
}

export function getClassFeaturesForLevel(className: string, level: number): LevelFeature[] {
  const classProgression = classProgressions[className.toLowerCase()] || [];
  return classProgression.filter((feature) => feature.level === level);
}

export function getAllClassFeaturesUpToLevel(className: string, level: number): LevelFeature[] {
  const classProgression = classProgressions[className.toLowerCase()] || [];
  return classProgression.filter((feature) => feature.level <= level);
}

export function getMulticlassProficiencies(className: string) {
  return multiclassProficiencies[className.toLowerCase()] || {};
}
