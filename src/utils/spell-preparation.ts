import { getSpellcastingInfo } from './spell-validation';

import type { Character, Spell } from '@/types/character';

import logger from '@/lib/logger';
import { spellApi } from '@/services/spellApi';

/**
 * D&D 5E Spell Preparation Utilities
 *
 * Handles the different spell preparation mechanics for various classes:
 * - Prepared Casters: Cleric, Druid, Paladin, Ranger (prepare from full list)
 * - Known Casters: Bard, Sorcerer, Warlock (limited spells known)
 * - Spellbook: Wizard (record spells in spellbook, prepare subset daily)
 * - Ritual Casting: Various classes can cast ritual spells
 */

export interface SpellPreparationInfo {
  className: string;
  preparationType: 'known' | 'prepared' | 'spellbook' | 'none';
  spellsKnown?: number;
  spellsPrepared?: number;
  maxSpellbookSpells?: number;
  ritualCasting: boolean;
  spellcastingAbility: string;
}

export interface SpellPreparationLimits {
  cantripsKnown: number;
  spellsKnown?: number;
  spellsPrepared?: number;
  maxSpellLevel: number;
  ritualSpells?: string[];
}

/**
 * Get spell preparation type for a class
 */
export function getSpellPreparationType(
  className: string,
): 'known' | 'prepared' | 'spellbook' | 'none' {
  const preparedCasters = ['cleric', 'druid', 'paladin', 'ranger'];
  const knownCasters = ['bard', 'sorcerer', 'warlock', 'eldritch knight', 'arcane trickster'];

  if (className.toLowerCase() === 'wizard') {
    return 'spellbook';
  }

  if (preparedCasters.includes(className.toLowerCase())) {
    return 'prepared';
  }

  if (knownCasters.includes(className.toLowerCase())) {
    return 'known';
  }

  return 'none';
}

/**
 * Calculate spell preparation limits for a character
 */
export function calculateSpellPreparationLimits(character: Character): SpellPreparationLimits {
  const characterClass = character.class;
  const level = character.level || 1;

  if (!characterClass?.spellcasting) {
    return {
      cantripsKnown: 0,
      maxSpellLevel: 0,
      ritualSpells: [],
    };
  }

  const spellcastingInfo = getSpellcastingInfo(characterClass, level);
  if (!spellcastingInfo) {
    return {
      cantripsKnown: 0,
      maxSpellLevel: 0,
      ritualSpells: [],
    };
  }

  const preparationType = getSpellPreparationType(characterClass.name);
  const spellcastingAbility = characterClass.spellcasting.ability;
  const abilityModifier = spellcastingAbility
    ? character.abilityScores?.[spellcastingAbility]?.modifier || 0
    : 0;

  // Calculate max spell level based on character level and class
  let maxSpellLevel = 0;
  if (characterClass.spellcasting.casterType === 'full') {
    maxSpellLevel = Math.min(9, Math.ceil(level / 2));
  } else if (characterClass.spellcasting.casterType === 'half') {
    maxSpellLevel = Math.min(5, Math.floor(level / 2));
  } else if (characterClass.spellcasting.casterType === 'third') {
    maxSpellLevel = Math.min(4, Math.floor(level / 3));
  }

  const limits: SpellPreparationLimits = {
    cantripsKnown: spellcastingInfo.cantripsKnown,
    maxSpellLevel,
  };

  if (preparationType === 'prepared') {
    // Prepared casters: Cleric, Druid, Paladin, Ranger
    // Can prepare spells equal to ability modifier + class level (minimum 1)
    limits.spellsPrepared = Math.max(1, abilityModifier + level);
  } else if (preparationType === 'known') {
    // Known casters: Bard, Sorcerer, Warlock
    // Limited number of spells known
    limits.spellsKnown = spellcastingInfo.spellsKnown;
  } else if (preparationType === 'spellbook') {
    // Wizard: Record spells in spellbook, prepare subset
    limits.spellsKnown = spellcastingInfo.spellsKnown; // Spells in spellbook
    limits.spellsPrepared = Math.max(1, abilityModifier + level); // Daily prepared
  }

  return limits;
}

/**
 * Validate spell preparation for a character
 */
export async function validateSpellPreparation(
  character: Character,
  preparedSpells: string[],
  knownSpells: string[] = [],
  spellbookSpells: string[] = [],
): Promise<{ valid: boolean; errors: string[]; warnings: string[] }> {
  const errors: string[] = [];
  const warnings: string[] = [];

  const limits = calculateSpellPreparationLimits(character);
  const preparationType = getSpellPreparationType(character.class?.name || '');

  if (preparationType === 'none') {
    if (preparedSpells.length > 0 || knownSpells.length > 0) {
      errors.push(`${character.class?.name} cannot prepare or know spells`);
    }
    return { valid: errors.length === 0, errors, warnings };
  }

  try {
    // Get available spells for the class
    const { spells: availableSpells } = await spellApi.getClassSpells(
      character.class?.name || '',
      character.level || 1,
    );
    const availableSpellIds = availableSpells.map((s) => s.id);

    if (preparationType === 'prepared') {
      // Validate prepared spells count
      if (limits.spellsPrepared && preparedSpells.length > limits.spellsPrepared) {
        errors.push(
          `Can only prepare ${limits.spellsPrepared} spells, but ${preparedSpells.length} are prepared`,
        );
      }

      // Validate each prepared spell is available to the class
      preparedSpells.forEach((spellId) => {
        if (!availableSpellIds.includes(spellId)) {
          errors.push(`Spell ${spellId} is not available to ${character.class?.name}`);
        }
      });
    } else if (preparationType === 'known') {
      // Validate known spells count
      if (limits.spellsKnown && knownSpells.length > limits.spellsKnown) {
        errors.push(
          `Can only know ${limits.spellsKnown} spells, but ${knownSpells.length} are known`,
        );
      }

      // Validate each known spell is available to the class
      knownSpells.forEach((spellId) => {
        if (!availableSpellIds.includes(spellId)) {
          errors.push(`Spell ${spellId} is not available to ${character.class?.name}`);
        }
      });
    } else if (preparationType === 'spellbook') {
      // Wizard: Validate spellbook and prepared spells
      if (limits.spellsKnown && spellbookSpells.length > limits.spellsKnown) {
        errors.push(
          `Spellbook can only contain ${limits.spellsKnown} spells, but ${spellbookSpells.length} are recorded`,
        );
      }

      if (limits.spellsPrepared && preparedSpells.length > limits.spellsPrepared) {
        errors.push(
          `Can only prepare ${limits.spellsPrepared} spells, but ${preparedSpells.length} are prepared`,
        );
      }

      // Prepared spells must be in spellbook
      preparedSpells.forEach((spellId) => {
        if (!spellbookSpells.includes(spellId)) {
          errors.push(`Cannot prepare spell ${spellId} - not in spellbook`);
        }
      });

      // Spellbook spells must be available to wizard
      spellbookSpells.forEach((spellId) => {
        if (!availableSpellIds.includes(spellId)) {
          errors.push(`Spell ${spellId} cannot be added to wizard spellbook`);
        }
      });
    }
  } catch (error) {
    logger.error('Failed to validate spell preparation:', error);
    errors.push('Failed to validate spell preparation - could not fetch spell data');
  }

  return { valid: errors.length === 0, errors, warnings };
}

/**
 * Get ritual spells available to a character
 */
export async function getAvailableRitualSpells(character: Character): Promise<Spell[]> {
  if (!character.class?.spellcasting?.ritualCasting) {
    return [];
  }

  try {
    const allSpells = await spellApi.getAllSpells({ ritual: true });
    const { spells: classSpells } = await spellApi.getClassSpells(
      character.class.name,
      character.level || 1,
    );

    const classSpellIds = classSpells.map((s) => s.id);

    // Filter to only ritual spells available to the class
    return allSpells.filter((spell) => spell.ritual && classSpellIds.includes(spell.id));
  } catch (error) {
    logger.error('Failed to fetch ritual spells:', error);
    return [];
  }
}

/**
 * Check if a character can cast rituals
 */
export function canCastRituals(character: Character): boolean {
  return character.class?.spellcasting?.ritualCasting || false;
}

/**
 * Get spell preparation info for UI display
 */
export function getSpellPreparationInfo(character: Character): SpellPreparationInfo {
  const characterClass = character.class;

  if (!characterClass?.spellcasting) {
    return {
      className: characterClass?.name || 'Unknown',
      preparationType: 'none',
      ritualCasting: false,
      spellcastingAbility: 'intelligence',
    };
  }

  const preparationType = getSpellPreparationType(characterClass.name);
  const limits = calculateSpellPreparationLimits(character);

  return {
    className: characterClass.name,
    preparationType,
    spellsKnown: limits.spellsKnown,
    spellsPrepared: limits.spellsPrepared,
    ritualCasting: characterClass.spellcasting.ritualCasting || false,
    spellcastingAbility: characterClass.spellcasting.ability,
  };
}
