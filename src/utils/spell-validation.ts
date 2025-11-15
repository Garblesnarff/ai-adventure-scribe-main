import type { CharacterClass, Character, Subrace } from '@/types/character';

import { getClassSpells } from '@/data/spellOptions';
import logger from '@/lib/logger';
import { spellApi, SpellProgression, type MulticlassCalculation } from '@/services/spellApi';
import { Spell } from '@/types/character';

/**
 * D&D 5E Spell Validation System
 *
 * Comprehensive validation system that enforces D&D 5E spellcasting rules:
 * - Class spell list restrictions
 * - Spell count limits by class and level
 * - Known vs prepared spell mechanics
 * - Racial bonus spell handling
 * - Spellbook mechanics for Wizards
 * - Domain/patron spell bonuses
 */

export interface SpellValidationError {
  type:
    | 'INVALID_SPELL'
    | 'COUNT_MISMATCH'
    | 'ABILITY_REQUIREMENT'
    | 'RACIAL_RESTRICTION'
    | 'LEVEL_REQUIREMENT';
  message: string;
  spellId?: string;
  expected?: number;
  actual?: number;
}

export interface SpellValidationResult {
  valid: boolean;
  errors: SpellValidationError[];
  warnings: string[];
}

export interface SpellcastingInfo {
  cantripsKnown: number;
  spellsKnown?: number; // For known casters like Bard, Sorcerer, Warlock
  spellsPrepared?: number; // For prepared casters like Cleric, Druid, Paladin, Ranger
  hasSpellbook?: boolean; // For Wizards
  isPactMagic?: boolean; // For Warlocks
  ritualCasting?: boolean;
  spellcastingAbility: 'intelligence' | 'wisdom' | 'charisma';
}

/**
 * Get complete spellcasting information for a class at level 1
 */
export function getSpellcastingInfo(
  characterClass: CharacterClass,
  level: number = 1,
): SpellcastingInfo | null {
  if (!characterClass.spellcasting) {
    return null;
  }

  const spellcasting = characterClass.spellcasting;

  // Level 1 spell counts by class following D&D 5E rules
  const levelOneSpellcasting: Record<string, Partial<SpellcastingInfo>> = {
    Wizard: {
      cantripsKnown: 3,
      spellsKnown: 6, // In spellbook
      hasSpellbook: true,
      ritualCasting: true,
      spellcastingAbility: 'intelligence',
    },
    Cleric: {
      cantripsKnown: 3,
      spellsPrepared: 1, // Wis mod + level (minimum 1)
      ritualCasting: true,
      spellcastingAbility: 'wisdom',
    },
    Bard: {
      cantripsKnown: 2,
      spellsKnown: 4,
      ritualCasting: false,
      spellcastingAbility: 'charisma',
    },
    Druid: {
      cantripsKnown: 2,
      spellsPrepared: 1, // Wis mod + level (minimum 1)
      ritualCasting: true,
      spellcastingAbility: 'wisdom',
    },
    Sorcerer: {
      cantripsKnown: 4,
      spellsKnown: 2,
      ritualCasting: false,
      spellcastingAbility: 'charisma',
    },
    Warlock: {
      cantripsKnown: 2,
      spellsKnown: 2,
      isPactMagic: true,
      ritualCasting: false,
      spellcastingAbility: 'charisma',
    },
    Paladin: {
      cantripsKnown: 0, // No spellcasting at level 1
      spellsKnown: 0,
      spellcastingAbility: 'charisma',
    },
    Ranger: {
      cantripsKnown: 0, // No spellcasting at level 1
      spellsKnown: 0,
      spellcastingAbility: 'wisdom',
    },
  };

  const classInfo = levelOneSpellcasting[characterClass.name];
  if (!classInfo) {
    return null;
  }

  return {
    cantripsKnown: classInfo.cantripsKnown || 0,
    spellsKnown: classInfo.spellsKnown,
    spellsPrepared: classInfo.spellsPrepared,
    hasSpellbook: classInfo.hasSpellbook || false,
    isPactMagic: classInfo.isPactMagic || false,
    ritualCasting: classInfo.ritualCasting || false,
    spellcastingAbility: classInfo.spellcastingAbility || spellcasting.ability,
  };
}

/**
 * Get racial bonus spells for a character
 */
export function getRacialSpells(
  race: string,
  subrace?: Subrace,
): { cantrips: string[]; spells: string[]; bonusCantrips: number; bonusCantripSource?: string } {
  // Default empty response
  const result = {
    cantrips: [] as string[],
    spells: [] as string[],
    bonusCantrips: 0,
    bonusCantripSource: undefined as string | undefined,
  };

  // Get spells from subrace data if available
  if (subrace) {
    if (subrace.cantrips) {
      result.cantrips = [...subrace.cantrips];
    }
    if (subrace.spells) {
      result.spells = [...subrace.spells];
    }
    if (subrace.bonusCantrip) {
      result.bonusCantrips = subrace.bonusCantrip.count;
      result.bonusCantripSource = subrace.bonusCantrip.source;
    }
  }

  // Fallback to hardcoded mapping for backwards compatibility
  const racialSpells: Record<
    string,
    { cantrips: string[]; spells: string[]; bonusCantrips?: number; bonusCantripSource?: string }
  > = {
    'High Elf': {
      cantrips: [],
      spells: [],
      bonusCantrips: 1,
      bonusCantripSource: 'wizard',
    },
    Drow: {
      cantrips: ['dancing-lights'],
      spells: [], // Gets Faerie Fire and Darkness at higher levels
    },
    'Forest Gnome': {
      cantrips: ['minor-illusion'],
      spells: [],
    },
    Tiefling: {
      cantrips: ['thaumaturgy'],
      spells: [], // Gets Hellish Rebuke at 3rd level, Darkness at 5th level
    },
  };

  // Check subrace first, then race for fallback
  const subraceKey = subrace?.name;
  if (subraceKey && racialSpells[subraceKey]) {
    const fallback = racialSpells[subraceKey];
    if (result.cantrips.length === 0 && fallback.cantrips) {
      result.cantrips = [...fallback.cantrips];
    }
    if (result.spells.length === 0 && fallback.spells) {
      result.spells = [...fallback.spells];
    }
    if (result.bonusCantrips === 0 && fallback.bonusCantrips) {
      result.bonusCantrips = fallback.bonusCantrips;
      result.bonusCantripSource = fallback.bonusCantripSource;
    }
  } else if (racialSpells[race]) {
    const fallback = racialSpells[race];
    if (result.cantrips.length === 0 && fallback.cantrips) {
      result.cantrips = [...fallback.cantrips];
    }
    if (result.spells.length === 0 && fallback.spells) {
      result.spells = [...fallback.spells];
    }
    if (result.bonusCantrips === 0 && fallback.bonusCantrips) {
      result.bonusCantrips = fallback.bonusCantrips;
      result.bonusCantripSource = fallback.bonusCantripSource;
    }
  }

  return result;
}

/**
 * Validate spell selection for a character
 */
export function validateSpellSelection(
  character: Character | null,
  selectedCantrips: string[] = [],
  selectedSpells: string[] = [],
): SpellValidationResult {
  // Normalize potentially bad inputs
  const cantrips = Array.isArray(selectedCantrips) ? selectedCantrips : [];
  const spells = Array.isArray(selectedSpells) ? selectedSpells : [];

  const errors: SpellValidationError[] = [];
  const warnings: string[] = [];

  // Handle null or missing character
  if (!character) {
    if (cantrips.length > 0 || spells.length > 0) {
      errors.push({
        type: 'LEVEL_REQUIREMENT',
        message: 'Cannot validate spells without a character',
      });
    }
    return { valid: errors.length === 0, errors, warnings };
  }

  // Early return for non-spellcasters - but check racial spells first
  if (!character.class?.spellcasting) {
    const racialSpells = getRacialSpells(
      character.race?.name || '',
      character.subrace || undefined,
    );
    const hasRacialSpells = racialSpells.cantrips.length > 0 || racialSpells.bonusCantrips > 0;

    if (!hasRacialSpells && (cantrips.length > 0 || spells.length > 0)) {
      errors.push({
        type: 'LEVEL_REQUIREMENT',
        message: `${character.class?.name} is not a spellcasting class at level 1`,
      });
    } else if (hasRacialSpells) {
      // Validate only racial spells for non-spellcasters
      const expectedRacialCantrips = racialSpells.cantrips.length + racialSpells.bonusCantrips;

      if (cantrips.length !== expectedRacialCantrips) {
        errors.push({
          type: 'COUNT_MISMATCH',
          message: `Expected ${expectedRacialCantrips} racial cantrips, but got ${cantrips.length}`,
          expected: expectedRacialCantrips,
          actual: cantrips.length,
        });
      }

      // Validate racial cantrips
      cantrips.forEach((cantripId) => {
        const isRacialCantrip = racialSpells.cantrips.includes(cantripId);
        let isValidBonusCantrip = false;

        if (racialSpells.bonusCantrips > 0 && racialSpells.bonusCantripSource) {
          if (racialSpells.bonusCantripSource === 'wizard') {
            // For validation during character creation, we'll use a simplified approach
            // This will need to be updated to use async API calls in the future
            // For now, we'll assume any cantrip ID is valid if it's from the wizard source
            isValidBonusCantrip = true; // Placeholder - will be replaced with API validation
          }
        }

        if (!isRacialCantrip && !isValidBonusCantrip) {
          errors.push({
            type: 'INVALID_SPELL',
            message: `${cantripId} is not a valid racial cantrip for ${character.race?.name}`,
            spellId: cantripId,
          });
        }
      });

      if (spells.length > 0) {
        errors.push({
          type: 'LEVEL_REQUIREMENT',
          message: `${character.class?.name} cannot cast spells at level ${character.level || 1}`,
        });
      }
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  // Now check if this is a spellcaster at this level
  const spellcastingInfo = getSpellcastingInfo(character.class, character.level || 1);
  if (
    !spellcastingInfo ||
    (spellcastingInfo.cantripsKnown === 0 && spellcastingInfo.spellsKnown === 0)
  ) {
    // This should not happen since we handled non-spellcasters above
    return { valid: errors.length === 0, errors, warnings };
  }

  // Local availability from static spell data for deterministic validation
  const classLists = getClassSpells(character.class.name);
  const availableCantripIds: string[] = classLists.cantrips.map((s) => s.id);
  const availableSpellIds: string[] = classLists.spells.map((s) => s.id);

  // Get racial bonus spells
  const racialSpells = getRacialSpells(character.race?.name || '', character.subrace || undefined);

  // Validate cantrip count
  const expectedCantrips = spellcastingInfo.cantripsKnown;
  const racialCantripsCount = racialSpells.cantrips.length + racialSpells.bonusCantrips;
  const totalExpectedCantrips = expectedCantrips + racialCantripsCount;

  if (cantrips.length !== totalExpectedCantrips) {
    errors.push({
      type: 'COUNT_MISMATCH',
      message: `Expected ${totalExpectedCantrips} cantrips (${expectedCantrips} class + ${racialCantripsCount} racial), but got ${cantrips.length}`,
      expected: totalExpectedCantrips,
      actual: cantrips.length,
    });
  }

  // Validate each selected cantrip against class list and racial allowances
  let bonusRemaining = racialSpells.bonusCantrips || 0;
  const bonusSource = racialSpells.bonusCantripSource;
  const bonusAllowedIds =
    bonusSource === 'wizard' ? getClassSpells('Wizard').cantrips.map((s) => s.id) : [];

  cantrips.forEach((cantripId) => {
    const isRacialFixed = racialSpells.cantrips.includes(cantripId);
    const isClassCantrip = availableCantripIds.includes(cantripId);
    if (isRacialFixed || isClassCantrip) return;

    if (bonusRemaining > 0 && bonusAllowedIds.includes(cantripId)) {
      bonusRemaining -= 1;
      return;
    }

    errors.push({
      type: 'INVALID_SPELL',
      message: `${cantripId} is not available as a cantrip for ${character.class?.name}`,
      spellId: cantripId,
    });
  });

  // Validate spell count
  if (spellcastingInfo.spellsKnown !== undefined && spellcastingInfo.spellsKnown > 0) {
    const expectedSpells = spellcastingInfo.spellsKnown;
    if (spells.length !== expectedSpells) {
      errors.push({
        type: 'COUNT_MISMATCH',
        message: `Expected ${expectedSpells} spells known, but got ${spells.length}`,
        expected: expectedSpells,
        actual: spells.length,
      });
    }
  }

  // Validate each selected spell against class list
  spells.forEach((spellId) => {
    if (!availableSpellIds.includes(spellId)) {
      errors.push({
        type: 'INVALID_SPELL',
        message: `${spellId} is not available as a 1st level spell for ${character.class.name}`,
        spellId,
      });
    }
  });

  // Add helpful warnings
  if (spellcastingInfo.hasSpellbook) {
    warnings.push(
      'As a Wizard, these spells will be recorded in your spellbook. You can prepare spells equal to your Intelligence modifier + 1 (minimum 1) each day.',
    );
  }

  if (spellcastingInfo.isPactMagic) {
    warnings.push('As a Warlock, you use Pact Magic. Your spell slots recharge on a short rest.');
  }

  if (spellcastingInfo.ritualCasting) {
    warnings.push(
      'Your class can cast spells as rituals if they have the ritual tag, without expending a spell slot.',
    );
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate spell selection during character creation
 */
export function validateCharacterSpellSelection(character: Character): SpellValidationResult {
  return validateSpellSelection(character, character.cantrips || [], character.knownSpells || []);
}

/**
 * Get maximum spell counts for a character class
 */
export function getMaxSpellCounts(
  characterClass: CharacterClass,
  level: number = 1,
): { cantrips: number; spells: number } {
  const spellcastingInfo = getSpellcastingInfo(characterClass, level);

  if (!spellcastingInfo) {
    return { cantrips: 0, spells: 0 };
  }

  return {
    cantrips: spellcastingInfo.cantripsKnown,
    spells: spellcastingInfo.spellsKnown || spellcastingInfo.spellsPrepared || 0,
  };
}

/**
 * Checks if a spell is valid for a character's class by calling a placeholder API endpoint.
 * This function is intended to be used in asynchronous validation flows.
 * @param spellId The ID of the spell to validate.
 * @param characterClass The name of the character's class.
 * @returns A promise that resolves to true if the spell is valid, false otherwise.
 */
export function isSpellValidForClass(
  spellId: string,
  characterClass: string | CharacterClass,
  isCantrip?: boolean,
): boolean {
  try {
    const className = typeof characterClass === 'string' ? characterClass : characterClass?.name;
    if (!className || !spellId) return false;

    const { cantrips, spells } = getClassSpells(className);
    if (isCantrip === true) {
      return cantrips.some((s) => s.id === spellId);
    }
    if (isCantrip === false) {
      return spells.some((s) => s.id === spellId);
    }
    // If not specified, check both
    return cantrips.some((s) => s.id === spellId) || spells.some((s) => s.id === spellId);
  } catch (error) {
    logger.error('[SpellValidation] Local class spell validation failed:', error);
    return false;
  }
}

// Async variant retained for future backend integration
export const isSpellValidForClassAsync = async (
  spellId: string,
  characterClass: string,
): Promise<boolean> => {
  try {
    const response = await fetch(`/api/spells/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ spellId, characterClass }),
    });

    if (!response.ok) {
      logger.error(
        `Spell validation API call failed for ${spellId}/${characterClass}:`,
        response.statusText,
      );
      return false;
    }
    const result = await response.json();
    return result?.isValid || false;
  } catch (error) {
    logger.error(`Error during spell validation API call for ${spellId}/${characterClass}:`, error);
    return false;
  }
};

/**
 * Calculate multiclass caster level for spell slot determination
 */
export async function calculateMulticlassCasterLevel(
  classLevels: { className: string; level: number }[],
): Promise<MulticlassCalculation> {
  try {
    return await spellApi.calculateMulticlassCasterLevel(classLevels);
  } catch (error) {
    logger.error('Failed to calculate multiclass caster level:', error);
    return {
      totalCasterLevel: 0,
      spellSlots: null,
      pactMagicSlots: null,
    };
  }
}

/**
 * Get enhanced spellcasting information that supports multiclassing
 */
export async function getEnhancedSpellcastingInfo(
  character: Character,
): Promise<(SpellcastingInfo & { multiclassInfo?: MulticlassCalculation }) | null> {
  const baseInfo = getSpellcastingInfo(character.class, character.level || 1);

  if (!baseInfo) {
    return baseInfo;
  }

  // Check if character has multiple classes
  if (character.classLevels && character.classLevels.length > 1) {
    const multiclassInfo = await calculateMulticlassCasterLevel(character.classLevels);
    return {
      ...baseInfo,
      multiclassInfo,
    };
  }

  return baseInfo;
}

/**
 * Validate multiclass spell selection for a character
 */
export async function validateMulticlassSpellSelection(
  character: Character,
  selectedCantrips: string[] = [],
  selectedSpells: string[] = [],
): Promise<SpellValidationResult> {
  // Use enhanced validation for multiclass characters
  if (character.classLevels && character.classLevels.length > 1) {
    const errors: SpellValidationError[] = [];
    const warnings: string[] = [];

    try {
      const enhancedInfo = await getEnhancedSpellcastingInfo(character);

      if (enhancedInfo.multiclassInfo) {
        warnings.push(`Multiclass caster level: ${enhancedInfo.multiclassInfo.totalCasterLevel}`);

        if (enhancedInfo.multiclassInfo.pactMagicSlots) {
          warnings.push('Pact Magic slots are separate from regular spell slots.');
        }
      }
    } catch (error) {
      logger.error('Failed to validate multiclass spells:', error);
      errors.push({
        type: 'LEVEL_REQUIREMENT',
        message: 'Failed to calculate multiclass spell requirements',
      });
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  // Fall back to regular validation for single-class characters
  return validateSpellSelection(character, selectedCantrips, selectedSpells);
}

/**
 * Async version of validateSpellSelection that validates against API data
 */
export async function validateSpellSelectionAsync(
  character: Character | null,
  selectedCantrips: string[] = [],
  selectedSpells: string[] = [],
  availableCantripIds: string[] = [],
  availableSpellIds: string[] = [],
): Promise<SpellValidationResult> {
  // Normalize potentially bad inputs
  const cantrips = Array.isArray(selectedCantrips) ? selectedCantrips : [];
  const spells = Array.isArray(selectedSpells) ? selectedSpells : [];

  const errors: SpellValidationError[] = [];
  const warnings: string[] = [];

  // Handle null or missing character
  if (!character) {
    if (cantrips.length > 0 || spells.length > 0) {
      errors.push({
        type: 'LEVEL_REQUIREMENT',
        message: 'Cannot validate spells without a character',
      });
    }
    return { valid: errors.length === 0, errors, warnings };
  }

  // Early return for non-spellcasters - but check racial spells first
  if (!character.class?.spellcasting) {
    const racialSpells = getRacialSpells(
      character.race?.name || '',
      character.subrace || undefined,
    );
    const hasRacialSpells = racialSpells.cantrips.length > 0 || racialSpells.bonusCantrips > 0;

    if (!hasRacialSpells && (cantrips.length > 0 || spells.length > 0)) {
      errors.push({
        type: 'LEVEL_REQUIREMENT',
        message: `${character.class?.name} is not a spellcasting class at level 1`,
      });
    } else if (hasRacialSpells) {
      // Validate only racial spells for non-spellcasters
      const expectedRacialCantrips = racialSpells.cantrips.length + racialSpells.bonusCantrips;

      if (cantrips.length !== expectedRacialCantrips) {
        errors.push({
          type: 'COUNT_MISMATCH',
          message: `Expected ${expectedRacialCantrips} racial cantrips, but got ${cantrips.length}`,
          expected: expectedRacialCantrips,
          actual: cantrips.length,
        });
      }

      // Validate racial cantrips against available list
      cantrips.forEach((cantripId) => {
        const isRacialCantrip = racialSpells.cantrips.includes(cantripId);
        let isValidBonusCantrip = false;

        if (racialSpells.bonusCantrips > 0 && racialSpells.bonusCantripSource === 'wizard') {
          // Validate against available cantrips if we have the data
          isValidBonusCantrip =
            availableCantripIds.length === 0 || availableCantripIds.includes(cantripId);
        }

        if (!isRacialCantrip && !isValidBonusCantrip) {
          errors.push({
            type: 'INVALID_SPELL',
            message: `${cantripId} is not a valid racial cantrip for ${character.race?.name}`,
            spellId: cantripId,
          });
        }
      });

      if (spells.length > 0) {
        errors.push({
          type: 'LEVEL_REQUIREMENT',
          message: `${character.class?.name} cannot cast spells at level ${character.level || 1}`,
        });
      }
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  // Now check if this is a spellcaster at this level
  const spellcastingInfo = getSpellcastingInfo(character.class, character.level || 1);
  if (
    !spellcastingInfo ||
    (spellcastingInfo.cantripsKnown === 0 && spellcastingInfo.spellsKnown === 0)
  ) {
    return { valid: errors.length === 0, errors, warnings };
  }

  // Get racial bonus spells
  const racialSpells = getRacialSpells(character.race?.name || '', character.subrace || undefined);

  // Validate cantrip count
  const expectedCantrips = spellcastingInfo.cantripsKnown;
  const racialCantripsCount = racialSpells.cantrips.length + racialSpells.bonusCantrips;
  const totalExpectedCantrips = expectedCantrips + racialCantripsCount;

  if (cantrips.length !== totalExpectedCantrips) {
    errors.push({
      type: 'COUNT_MISMATCH',
      message: `Expected ${totalExpectedCantrips} cantrips (${expectedCantrips} class + ${racialCantripsCount} racial), but got ${cantrips.length}`,
      expected: totalExpectedCantrips,
      actual: cantrips.length,
    });
  }

  // Validate each selected cantrip against available list
  cantrips.forEach((cantripId) => {
    // Check if it's a racial cantrip
    const isRacialCantrip = racialSpells.cantrips.includes(cantripId);

    // Check if it's a bonus cantrip from racial feature
    let isValidBonusCantrip = false;
    if (racialSpells.bonusCantrips > 0 && racialSpells.bonusCantripSource === 'wizard') {
      isValidBonusCantrip =
        availableCantripIds.length === 0 || availableCantripIds.includes(cantripId);
    }

    // Validate availability using API data
    if (
      !isRacialCantrip &&
      !isValidBonusCantrip &&
      availableCantripIds.length > 0 &&
      !availableCantripIds.includes(cantripId)
    ) {
      errors.push({
        type: 'INVALID_SPELL',
        message: `${cantripId} is not available as a cantrip for ${character.class.name}`,
        spellId: cantripId,
      });
    }
  });

  // Validate spell count
  if (spellcastingInfo.spellsKnown !== undefined && spellcastingInfo.spellsKnown > 0) {
    const expectedSpells = spellcastingInfo.spellsKnown;
    if (spells.length !== expectedSpells) {
      errors.push({
        type: 'COUNT_MISMATCH',
        message: `Expected ${expectedSpells} spells known, but got ${spells.length}`,
        expected: expectedSpells,
        actual: spells.length,
      });
    }
  }

  // Validate each selected spell against available list
  spells.forEach((spellId) => {
    if (availableSpellIds.length > 0 && !availableSpellIds.includes(spellId)) {
      errors.push({
        type: 'INVALID_SPELL',
        message: `${spellId} is not available as a 1st level spell for ${character.class.name}`,
        spellId: spellId,
      });
    }
  });

  // Add helpful warnings
  if (spellcastingInfo.hasSpellbook) {
    warnings.push(
      'As a Wizard, these spells will be recorded in your spellbook. You can prepare spells equal to your Intelligence modifier + 1 (minimum 1) each day.',
    );
  }

  if (spellcastingInfo.isPactMagic) {
    warnings.push('As a Warlock, you use Pact Magic. Your spell slots recharge on a short rest.');
  }

  if (spellcastingInfo.ritualCasting) {
    warnings.push(
      'Your class can cast spells as rituals if they have the ritual tag, without expending a spell slot.',
    );
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Get spell validation rules summary for UI display
 */
export function getSpellValidationRules(characterClass: CharacterClass): string[] {
  const spellcastingInfo = getSpellcastingInfo(characterClass);

  if (!spellcastingInfo) {
    return [`${characterClass.name} is not a spellcasting class at 1st level.`];
  }

  const rules: string[] = [];

  if (spellcastingInfo.cantripsKnown > 0) {
    rules.push(
      `Must select exactly ${spellcastingInfo.cantripsKnown} cantrip${spellcastingInfo.cantripsKnown > 1 ? 's' : ''}.`,
    );
  }

  if (spellcastingInfo.spellsKnown) {
    rules.push(
      `Must select exactly ${spellcastingInfo.spellsKnown} spell${spellcastingInfo.spellsKnown > 1 ? 's' : ''} known.`,
    );
  }

  if (spellcastingInfo.spellsPrepared) {
    rules.push(
      `Can prepare ${spellcastingInfo.spellsPrepared} spell${spellcastingInfo.spellsPrepared > 1 ? 's' : ''} (minimum 1).`,
    );
  }

  if (spellcastingInfo.hasSpellbook) {
    rules.push('Uses a spellbook to record spells. Can prepare spells daily.');
  }

  if (spellcastingInfo.isPactMagic) {
    rules.push('Uses Pact Magic. Spell slots recharge on short rest.');
  }

  if (spellcastingInfo.ritualCasting) {
    rules.push('Can cast ritual spells without expending spell slots.');
  }

  rules.push(
    `Spellcasting ability: ${spellcastingInfo.spellcastingAbility.charAt(0).toUpperCase() + spellcastingInfo.spellcastingAbility.slice(1)}.`,
  );

  return rules;
}
