import type { Character, CharacterClass, CharacterRace, Subrace } from '@/types/character';

/**
 * Comprehensive D&D 5e character calculations utility
 * Automates all the math needed for a character sheet
 */

export interface CharacterStats {
  // Core Stats
  proficiencyBonus: number;
  hitPoints: number;
  hitDie: string;
  armorClass: number;
  initiative: number;
  speed: number;

  // Spellcasting (if applicable)
  spellSaveDC?: number;
  spellAttackBonus?: number;
  spellcastingAbility?: string;
  spellSlots?: { [level: number]: number };

  // Skills & Proficiencies
  skillModifiers: {
    [skill: string]: { modifier: number; proficient: boolean; expertise: boolean };
  };
  savingThrowModifiers: { [ability: string]: { modifier: number; proficient: boolean } };

  // Combat
  carryingCapacity: number;
  passivePerception: number;
  passiveInvestigation: number;
  passiveInsight: number;

  // Combined race/subrace data
  allTraits: string[];
  allLanguages: string[];
}

/**
 * Calculate proficiency bonus based on character level
 */
export const calculateProficiencyBonus = (level: number): number => {
  return Math.floor((level - 1) / 4) + 2;
};

/**
 * Calculate hit points based on class, level, and constitution
 */
export const calculateHitPoints = (character: Character): number => {
  const level = character.level || 1;
  const conMod = character.abilityScores?.constitution?.modifier || 0;
  const hitDie = character.class?.hitDie || 8;

  // First level gets max hit die + con mod
  // Subsequent levels get average of hit die (rounded up) + con mod
  const firstLevelHP = hitDie + conMod;
  const subsequentLevelsHP = (level - 1) * (Math.floor(hitDie / 2) + 1 + conMod);

  return Math.max(1, firstLevelHP + subsequentLevelsHP);
};

/**
 * Calculate armor class (basic calculation, can be enhanced for different armor types)
 */
export const calculateArmorClass = (character: Character): number => {
  const dexMod = character.abilityScores?.dexterity?.modifier || 0;

  // Check if character has unarmored defense feature
  const hasUnarmoredDefense =
    character.class &&
    (character.class.name.toLowerCase() === 'barbarian' ||
      character.class.name.toLowerCase() === 'monk');

  // If character has unarmored defense, calculate accordingly
  if (hasUnarmoredDefense && character.class && character.abilityScores) {
    // Import the function dynamically to avoid circular dependencies
    // For now, we'll implement the logic directly

    const baseAC = 10;

    switch (character.class.name.toLowerCase()) {
      case 'barbarian': {
        const conMod = character.abilityScores.constitution?.modifier || 0;
        return baseAC + dexMod + conMod;
      }
      case 'monk': {
        const wisMod = character.abilityScores.wisdom?.modifier || 0;
        return baseAC + dexMod + wisMod;
      }
    }
  }

  // Base AC (no armor) = 10 + Dex mod
  return 10 + dexMod;
};

/**
 * Calculate spell save DC for spellcasters
 */
export const calculateSpellSaveDC = (character: Character): number | undefined => {
  const spellcastingAbility = getSpellcastingAbility(character.class);
  if (!spellcastingAbility) return undefined;

  const abilityMod = character.abilityScores?.[spellcastingAbility]?.modifier || 0;
  const profBonus = calculateProficiencyBonus(character.level || 1);

  return 8 + profBonus + abilityMod;
};

/**
 * Calculate spell attack bonus for spellcasters
 */
export const calculateSpellAttackBonus = (character: Character): number | undefined => {
  const spellcastingAbility = getSpellcastingAbility(character.class);
  if (!spellcastingAbility) return undefined;

  const abilityMod = character.abilityScores?.[spellcastingAbility]?.modifier || 0;
  const profBonus = calculateProficiencyBonus(character.level || 1);

  return profBonus + abilityMod;
};

/**
 * Get spellcasting ability for a class
 */
export const getSpellcastingAbility = (
  characterClass: CharacterClass | null,
): keyof Character['abilityScores'] | null => {
  if (!characterClass) return null;

  const spellcastingMap: { [className: string]: keyof Character['abilityScores'] } = {
    Wizard: 'intelligence',
    Sorcerer: 'charisma',
    Warlock: 'charisma',
    Bard: 'charisma',
    Cleric: 'wisdom',
    Druid: 'wisdom',
    Paladin: 'charisma',
    Ranger: 'wisdom',
    'Eldritch Knight': 'intelligence',
    'Arcane Trickster': 'intelligence',
  };

  return spellcastingMap[characterClass.name] || null;
};

/**
 * Calculate spell slots for a character (simplified, full casters only)
 */
export const calculateSpellSlots = (
  character: Character,
): { [level: number]: number } | undefined => {
  const spellcastingAbility = getSpellcastingAbility(character.class);
  if (!spellcastingAbility) return undefined;

  const level = character.level || 1;

  // Full caster spell slot progression
  const fullCasterSlots: { [level: number]: number[] } = {
    1: [2], // 1st level spells
    2: [3],
    3: [4, 2], // 1st, 2nd level spells
    4: [4, 3],
    5: [4, 3, 2], // 1st, 2nd, 3rd level spells
    6: [4, 3, 3],
    7: [4, 3, 3, 1], // 1st, 2nd, 3rd, 4th level spells
    8: [4, 3, 3, 2],
    9: [4, 3, 3, 3, 1], // 1st, 2nd, 3rd, 4th, 5th level spells
    10: [4, 3, 3, 3, 2],
    11: [4, 3, 3, 3, 2, 1], // 1st-6th level spells
    12: [4, 3, 3, 3, 2, 1],
    13: [4, 3, 3, 3, 2, 1, 1], // 1st-7th level spells
    14: [4, 3, 3, 3, 2, 1, 1],
    15: [4, 3, 3, 3, 2, 1, 1, 1], // 1st-8th level spells
    16: [4, 3, 3, 3, 2, 1, 1, 1],
    17: [4, 3, 3, 3, 2, 1, 1, 1, 1], // 1st-9th level spells
    18: [4, 3, 3, 3, 3, 1, 1, 1, 1],
    19: [4, 3, 3, 3, 3, 2, 1, 1, 1],
    20: [4, 3, 3, 3, 3, 2, 2, 1, 1],
  };

  const slots = fullCasterSlots[level];
  if (!slots) return undefined;

  const spellSlots: { [level: number]: number } = {};
  slots.forEach((count: number, index: number) => {
    spellSlots[index + 1] = count;
  });

  return spellSlots;
};

/**
 * Calculate skill modifiers for all skills
 */
export const calculateSkillModifiers = (character: Character): CharacterStats['skillModifiers'] => {
  const profBonus = calculateProficiencyBonus(character.level || 1);

  const skills = {
    Acrobatics: 'dexterity',
    'Animal Handling': 'wisdom',
    Arcana: 'intelligence',
    Athletics: 'strength',
    Deception: 'charisma',
    History: 'intelligence',
    Insight: 'wisdom',
    Intimidation: 'charisma',
    Investigation: 'intelligence',
    Medicine: 'wisdom',
    Nature: 'intelligence',
    Perception: 'wisdom',
    Performance: 'charisma',
    Persuasion: 'charisma',
    Religion: 'intelligence',
    'Sleight of Hand': 'dexterity',
    Stealth: 'dexterity',
    Survival: 'wisdom',
  } as const;

  // Get class proficiencies (simplified)
  const classProficiencies = getClassSkillProficiencies(character.class);
  const raceProficiencies = getRaceSkillProficiencies(character.race, character.subrace);
  const allProficiencies = [...classProficiencies, ...raceProficiencies];

  const skillMods: CharacterStats['skillModifiers'] = {};

  Object.entries(skills).forEach(([skill, ability]) => {
    const abilityMod = character.abilityScores?.[ability]?.modifier || 0;
    const proficient = allProficiencies.includes(skill);
    const expertise = false; // Could be enhanced to track expertise

    skillMods[skill] = {
      modifier: abilityMod + (proficient ? profBonus : 0) + (expertise ? profBonus : 0),
      proficient,
      expertise,
    };
  });

  return skillMods;
};

/**
 * Get skill proficiencies for a class (simplified)
 */
export const getClassSkillProficiencies = (characterClass: CharacterClass | null): string[] => {
  if (!characterClass) return [];

  const classProficiencies: { [className: string]: string[] } = {
    Fighter: [
      'Acrobatics',
      'Animal Handling',
      'Athletics',
      'History',
      'Insight',
      'Intimidation',
      'Perception',
      'Survival',
    ],
    Wizard: ['Arcana', 'History', 'Insight', 'Investigation', 'Medicine', 'Religion'],
    Rogue: [
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
    Cleric: ['History', 'Insight', 'Medicine', 'Persuasion', 'Religion'],
  };

  return classProficiencies[characterClass.name] || [];
};

/**
 * Get skill proficiencies for a race and subrace (combined)
 */
export const getRaceSkillProficiencies = (
  characterRace: CharacterRace | null,
  characterSubrace: Subrace | null,
): string[] => {
  if (!characterRace) return [];

  // Base race proficiencies
  const raceProficiencies: { [raceName: string]: string[] } = {
    'Half-Elf': ['Deception', 'Persuasion'], // Player choice, simplified
    'Human (Variant)': ['Insight'], // Player choice, simplified
  };

  // Subrace-specific proficiencies
  const subraceProficiencies: { [subraceName: string]: string[] } = {
    'Wood Elf': ['Stealth'], // Mask of the Wild implies stealth proficiency
    'Lightfoot Halfling': ['Stealth'], // Naturally Stealthy
    // Add more as needed for other subraces
  };

  const baseProfs = raceProficiencies[characterRace.name] || [];
  const subraceProfs = characterSubrace ? subraceProficiencies[characterSubrace.name] || [] : [];

  // Combine and remove duplicates
  return [...new Set([...baseProfs, ...subraceProfs])];
};

/**
 * Calculate saving throw modifiers
 */
export const calculateSavingThrowModifiers = (
  character: Character,
): CharacterStats['savingThrowModifiers'] => {
  const profBonus = calculateProficiencyBonus(character.level || 1);
  const classProficiencies = getClassSavingThrowProficiencies(character.class);

  const savingThrows: CharacterStats['savingThrowModifiers'] = {};

  if (character.abilityScores) {
    Object.entries(character.abilityScores).forEach(([ability, data]) => {
      const proficient = classProficiencies.includes(ability);
      savingThrows[ability] = {
        modifier: data.modifier + (proficient ? profBonus : 0),
        proficient,
      };
    });
  }

  return savingThrows;
};

/**
 * Get saving throw proficiencies for a class
 */
export const getClassSavingThrowProficiencies = (
  characterClass: CharacterClass | null,
): string[] => {
  if (!characterClass) return [];

  const classSavingThrows: { [className: string]: string[] } = {
    Fighter: ['strength', 'constitution'],
    Wizard: ['intelligence', 'wisdom'],
    Rogue: ['dexterity', 'intelligence'],
    Cleric: ['wisdom', 'charisma'],
  };

  return classSavingThrows[characterClass.name] || [];
};

/**
 * Calculate carrying capacity
 */
export const calculateCarryingCapacity = (character: Character): number => {
  return (character.abilityScores?.strength?.score || 10) * 15;
};

/**
 * Calculate passive perception
 */
export const calculatePassivePerception = (character: Character): number => {
  const skillMods = calculateSkillModifiers(character);
  return 10 + (skillMods['Perception']?.modifier || 0);
};

/**
 * Calculate all character stats at once
 */
export const calculateAllCharacterStats = (character: Character): CharacterStats => {
  const spellcastingAbility = getSpellcastingAbility(character.class);

  // Combined traits from race and subrace
  const allTraits = [...(character.race?.traits || []), ...(character.subrace?.traits || [])];

  // Combined languages from race and subrace (remove duplicates)
  const allLanguages = [
    ...new Set([...(character.race?.languages || []), ...(character.subrace?.languages || [])]),
  ];

  const skillMods = calculateSkillModifiers(character);

  return {
    proficiencyBonus: calculateProficiencyBonus(character.level || 1),
    hitPoints: calculateHitPoints(character),
    hitDie: `1d${character.class?.hitDie || 8}`,
    armorClass: calculateArmorClass(character),
    initiative: character.abilityScores?.dexterity?.modifier || 0,
    speed: character.subrace?.speed || character.race?.speed || 30,

    spellSaveDC: calculateSpellSaveDC(character),
    spellAttackBonus: calculateSpellAttackBonus(character),
    spellcastingAbility: spellcastingAbility || undefined,
    spellSlots: calculateSpellSlots(character),

    skillModifiers: skillMods,
    savingThrowModifiers: calculateSavingThrowModifiers(character),

    carryingCapacity: calculateCarryingCapacity(character),
    passivePerception: calculatePassivePerception(character),
    passiveInvestigation: 10 + (skillMods['Investigation']?.modifier || 0),
    passiveInsight: 10 + (skillMods['Insight']?.modifier || 0),

    // Additional combined data for future use
    allTraits,
    allLanguages,
  };
};
