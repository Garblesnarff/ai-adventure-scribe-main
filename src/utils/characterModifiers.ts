/**
 * Character Modifiers Utility
 *
 * Calculates D&D 5e modifiers for dice rolls based on character stats.
 * Handles ability modifiers, proficiency bonus, and roll calculations.
 *
 * @author AI Dungeon Master Team
 */

import type { Equipment } from '@/data/equipmentOptions';
import type { Character } from '@/types/character';

import logger from '@/lib/logger';

// D&D 5e ability names
export type AbilityName =
  | 'strength'
  | 'dexterity'
  | 'constitution'
  | 'intelligence'
  | 'wisdom'
  | 'charisma';

// D&D 5e skills and their associated abilities
export const SKILL_ABILITIES: Record<string, AbilityName> = {
  // Strength
  athletics: 'strength',

  // Dexterity
  acrobatics: 'dexterity',
  'sleight of hand': 'dexterity',
  stealth: 'dexterity',

  // Intelligence
  arcana: 'intelligence',
  history: 'intelligence',
  investigation: 'intelligence',
  nature: 'intelligence',
  religion: 'intelligence',

  // Wisdom
  'animal handling': 'wisdom',
  insight: 'wisdom',
  medicine: 'wisdom',
  perception: 'wisdom',
  survival: 'wisdom',

  // Charisma
  deception: 'charisma',
  intimidation: 'charisma',
  performance: 'charisma',
  persuasion: 'charisma',
};

// Common alternate skill names
export const SKILL_ALIASES: Record<string, string> = {
  sleight: 'sleight of hand',
  animal: 'animal handling',
  handle: 'animal handling',
};

/**
 * Calculate ability modifier from ability score
 * Formula: floor((score - 10) / 2)
 */
export function calculateAbilityModifier(score: number): number {
  return Math.floor((score - 10) / 2);
}

/**
 * Calculate proficiency bonus based on character level
 * D&D 5e proficiency bonus progression
 */
export function calculateProficiencyBonus(level: number): number {
  if (level >= 17) return 6;
  if (level >= 13) return 5;
  if (level >= 9) return 4;
  if (level >= 5) return 3;
  return 2;
}

/**
 * Get ability modifier from character
 */
export function getAbilityModifier(character: Character, ability: AbilityName): number {
  const abilityScore = character.abilityScores?.[ability];
  if (!abilityScore) return 0;

  // Use pre-calculated modifier if available, otherwise calculate
  return abilityScore.modifier ?? calculateAbilityModifier(abilityScore.score);
}

/**
 * Get proficiency bonus from character
 */
export function getProficiencyBonus(character: Character): number {
  return calculateProficiencyBonus(character.level || 1);
}

/**
 * Check if character is proficient in a skill
 */
export function isSkillProficient(character: Character, skillName: string): boolean {
  const normalizedSkill = skillName.toLowerCase();
  const actualSkill = SKILL_ALIASES[normalizedSkill] || normalizedSkill;

  // Check if skill is in character's skill proficiencies
  if (character.skillProficiencies) {
    return character.skillProficiencies.some((skill) => skill.toLowerCase() === actualSkill);
  }

  return false;
}

/**
 * Check if character is proficient in a saving throw
 */
export function isSaveProficient(character: Character, ability: AbilityName): boolean {
  if (character.savingThrowProficiencies) {
    return character.savingThrowProficiencies.includes(ability);
  }

  // Fallback: check abilityScores savingThrow flag
  return character.abilityScores?.[ability]?.savingThrow || false;
}

/**
 * Calculate skill check modifier
 */
export function calculateSkillModifier(character: Character, skillName: string): number {
  const normalizedSkill = skillName.toLowerCase();
  const actualSkill = SKILL_ALIASES[normalizedSkill] || normalizedSkill;

  // Get the ability associated with this skill
  const ability = SKILL_ABILITIES[actualSkill];
  if (!ability) {
    logger.warn(`Unknown skill: ${skillName}`);
    return 0;
  }

  const abilityMod = getAbilityModifier(character, ability);
  const proficient = isSkillProficient(character, skillName);
  const proficiencyBonus = proficient ? getProficiencyBonus(character) : 0;

  return abilityMod + proficiencyBonus;
}

/**
 * Calculate saving throw modifier
 */
export function calculateSaveModifier(character: Character, ability: AbilityName): number {
  const abilityMod = getAbilityModifier(character, ability);
  const proficient = isSaveProficient(character, ability);
  const proficiencyBonus = proficient ? getProficiencyBonus(character) : 0;

  return abilityMod + proficiencyBonus;
}

/**
 * Calculate attack roll modifier.
 * This function now considers weapon properties like 'finesse'.
 * @param character The character making the attack.
 * @param weapon The weapon being used (optional). If not provided, defaults to an unarmed strike (strength).
 * @returns The total attack modifier.
 */
export function calculateAttackModifier(character: Character, weapon?: Equipment | null): number {
  let abilityMod: number;
  const proficiencyBonus = getProficiencyBonus(character); // Assume proficiency with the weapon

  const strMod = getAbilityModifier(character, 'strength');
  const dexMod = getAbilityModifier(character, 'dexterity');

  if (weapon) {
    const isFinesse = weapon.weaponProperties?.finesse;
    const isRanged = !!weapon.range;

    if (isFinesse) {
      // Use the higher of DEX or STR for finesse weapons
      abilityMod = Math.max(strMod, dexMod);
    } else if (isRanged) {
      // Use DEX for ranged weapons
      abilityMod = dexMod;
    } else {
      // Use STR for non-finesse melee weapons
      abilityMod = strMod;
    }
  } else {
    // Default to STR for unarmed strikes or unspecified melee attacks
    abilityMod = strMod;
  }

  return abilityMod + proficiencyBonus;
}

/**
 * Calculate initiative modifier
 */
export function calculateInitiativeModifier(character: Character): number {
  return getAbilityModifier(character, 'dexterity');
}

/**
 * Generate dice formula with character modifiers
 */
export function generateDiceFormula(
  diceType: number = 20,
  diceCount: number = 1,
  modifier: number = 0,
): string {
  const modifierStr = modifier >= 0 ? `+${modifier}` : `${modifier}`;
  return `${diceCount}d${diceType}${modifier !== 0 ? modifierStr : ''}`;
}

/**
 * Create a complete roll request with character modifiers
 */
export interface RollCalculation {
  formula: string;
  baseModifier: number;
  abilityModifier: number;
  proficiencyBonus: number;
  totalModifier: number;
  isProficient: boolean;
  ability?: AbilityName;
  breakdown: string[];
}

/**
 * Calculate roll with character modifiers and breakdown
 */
export function calculateRollWithBreakdown(
  character: Character,
  rollType: 'attack' | 'save' | 'check' | 'skill' | 'initiative',
  ability?: AbilityName,
  skillName?: string,
): RollCalculation {
  let abilityMod = 0;
  let proficiencyBonus = 0;
  let isProficient = false;
  let usedAbility: AbilityName | undefined = ability;
  const breakdown: string[] = ['1d20'];

  switch (rollType) {
    case 'attack':
      // Default to strength for melee attacks
      usedAbility = ability || 'strength';
      abilityMod = getAbilityModifier(character, usedAbility);
      proficiencyBonus = getProficiencyBonus(character); // Assume weapon proficiency
      isProficient = true;
      breakdown.push(
        `${usedAbility.slice(0, 3).toUpperCase()} ${abilityMod >= 0 ? '+' : ''}${abilityMod}`,
      );
      breakdown.push(`Prof +${proficiencyBonus}`);
      break;

    case 'save':
      if (!ability) throw new Error('Ability required for saving throw');
      usedAbility = ability;
      abilityMod = getAbilityModifier(character, ability);
      isProficient = isSaveProficient(character, ability);
      proficiencyBonus = isProficient ? getProficiencyBonus(character) : 0;
      breakdown.push(
        `${ability.slice(0, 3).toUpperCase()} ${abilityMod >= 0 ? '+' : ''}${abilityMod}`,
      );
      if (isProficient) breakdown.push(`Prof +${proficiencyBonus}`);
      break;

    case 'check':
      if (!ability) throw new Error('Ability required for ability check');
      usedAbility = ability;
      abilityMod = getAbilityModifier(character, ability);
      // Ability checks generally don't add proficiency unless it's a skill
      breakdown.push(
        `${ability.slice(0, 3).toUpperCase()} ${abilityMod >= 0 ? '+' : ''}${abilityMod}`,
      );
      break;

    case 'skill': {
      if (!skillName) throw new Error('Skill name required for skill check');
      const skillAbility =
        SKILL_ABILITIES[skillName.toLowerCase()] ||
        SKILL_ALIASES[SKILL_ALIASES[skillName.toLowerCase()]];
      if (!skillAbility) throw new Error(`Unknown skill: ${skillName}`);

      usedAbility = skillAbility;
      abilityMod = getAbilityModifier(character, skillAbility);
      isProficient = isSkillProficient(character, skillName);
      proficiencyBonus = isProficient ? getProficiencyBonus(character) : 0;
      breakdown.push(
        `${skillAbility.slice(0, 3).toUpperCase()} ${abilityMod >= 0 ? '+' : ''}${abilityMod}`,
      );
      if (isProficient) breakdown.push(`Prof +${proficiencyBonus}`);
      break;
    }

    case 'initiative':
      usedAbility = 'dexterity';
      abilityMod = getAbilityModifier(character, 'dexterity');
      breakdown.push(`DEX ${abilityMod >= 0 ? '+' : ''}${abilityMod}`);
      break;
  }

  const totalModifier = abilityMod + proficiencyBonus;
  const formula = generateDiceFormula(20, 1, totalModifier);

  return {
    formula,
    baseModifier: 0, // For d20 rolls, base is always 0
    abilityModifier: abilityMod,
    proficiencyBonus,
    totalModifier,
    isProficient,
    ability: usedAbility,
    breakdown,
  };
}

/**
 * Parse ability name from various formats
 */
export function parseAbilityName(input: string): AbilityName | null {
  const normalized = input.toLowerCase().trim();

  const abilityMap: Record<string, AbilityName> = {
    str: 'strength',
    strength: 'strength',
    dex: 'dexterity',
    dexterity: 'dexterity',
    con: 'constitution',
    constitution: 'constitution',
    int: 'intelligence',
    intelligence: 'intelligence',
    wis: 'wisdom',
    wisdom: 'wisdom',
    cha: 'charisma',
    charisma: 'charisma',
  };

  return abilityMap[normalized] || null;
}

/**
 * Get character summary for AI context
 */
export function getCharacterStatsForAI(character: Character): string {
  const stats = character.abilityScores;
  if (!stats) return 'No ability scores available';

  const profBonus = getProficiencyBonus(character);

  return `Level ${character.level} ${character.race?.name || 'Unknown'} ${character.class?.name || 'Unknown'}
Ability Scores: STR ${stats.strength?.score}(${stats.strength?.modifier >= 0 ? '+' : ''}${stats.strength?.modifier}), DEX ${stats.dexterity?.score}(${stats.dexterity?.modifier >= 0 ? '+' : ''}${stats.dexterity?.modifier}), CON ${stats.constitution?.score}(${stats.constitution?.modifier >= 0 ? '+' : ''}${stats.constitution?.modifier}), INT ${stats.intelligence?.score}(${stats.intelligence?.modifier >= 0 ? '+' : ''}${stats.intelligence?.modifier}), WIS ${stats.wisdom?.score}(${stats.wisdom?.modifier >= 0 ? '+' : ''}${stats.wisdom?.modifier}), CHA ${stats.charisma?.score}(${stats.charisma?.modifier >= 0 ? '+' : ''}${stats.charisma?.modifier})
Proficiency Bonus: +${profBonus}`;
}
