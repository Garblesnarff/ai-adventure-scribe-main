import { CharacterClass, Character, Spell, Subrace } from '@/types/character';
import { getClassSpells } from '@/data/spellOptions';

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
  type: 'INVALID_SPELL' | 'COUNT_MISMATCH' | 'ABILITY_REQUIREMENT' | 'RACIAL_RESTRICTION' | 'LEVEL_REQUIREMENT';
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
export function getSpellcastingInfo(characterClass: CharacterClass, level: number = 1): SpellcastingInfo | null {
  if (!characterClass.spellcasting) {
    return null;
  }

  const spellcasting = characterClass.spellcasting;

  // Level 1 spell counts by class following D&D 5E rules
  const levelOneSpellcasting: Record<string, Partial<SpellcastingInfo>> = {
    'Wizard': {
      cantripsKnown: 3,
      spellsKnown: 6, // In spellbook
      hasSpellbook: true,
      ritualCasting: true,
      spellcastingAbility: 'intelligence'
    },
    'Cleric': {
      cantripsKnown: 3,
      spellsPrepared: 1, // Wis mod + level (minimum 1)
      ritualCasting: true,
      spellcastingAbility: 'wisdom'
    },
    'Bard': {
      cantripsKnown: 2,
      spellsKnown: 4,
      ritualCasting: false,
      spellcastingAbility: 'charisma'
    },
    'Druid': {
      cantripsKnown: 2,
      spellsPrepared: 1, // Wis mod + level (minimum 1)
      ritualCasting: true,
      spellcastingAbility: 'wisdom'
    },
    'Sorcerer': {
      cantripsKnown: 4,
      spellsKnown: 2,
      ritualCasting: false,
      spellcastingAbility: 'charisma'
    },
    'Warlock': {
      cantripsKnown: 2,
      spellsKnown: 2,
      isPactMagic: true,
      ritualCasting: false,
      spellcastingAbility: 'charisma'
    },
    'Paladin': {
      cantripsKnown: 0, // No spellcasting at level 1
      spellsKnown: 0,
      spellcastingAbility: 'charisma'
    },
    'Ranger': {
      cantripsKnown: 0, // No spellcasting at level 1
      spellsKnown: 0,
      spellcastingAbility: 'wisdom'
    }
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
    spellcastingAbility: classInfo.spellcastingAbility || spellcasting.ability
  };
}

/**
 * Get racial bonus spells for a character
 */
export function getRacialSpells(race: string, subrace?: Subrace): { cantrips: string[], spells: string[], bonusCantrips: number, bonusCantripSource?: string } {
  // Default empty response
  let result = { cantrips: [] as string[], spells: [] as string[], bonusCantrips: 0, bonusCantripSource: undefined as string | undefined };

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
  const racialSpells: Record<string, { cantrips: string[], spells: string[], bonusCantrips?: number, bonusCantripSource?: string }> = {
    'High Elf': {
      cantrips: [],
      spells: [],
      bonusCantrips: 1,
      bonusCantripSource: 'wizard'
    },
    'Drow': {
      cantrips: ['dancing-lights'],
      spells: [] // Gets Faerie Fire and Darkness at higher levels
    },
    'Forest Gnome': {
      cantrips: ['minor-illusion'],
      spells: []
    },
    'Tiefling': {
      cantrips: ['thaumaturgy'],
      spells: [] // Gets Hellish Rebuke at 3rd level, Darkness at 5th level
    }
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
  selectedSpells: string[] = []
): SpellValidationResult {
  const errors: SpellValidationError[] = [];
  const warnings: string[] = [];

  // Handle null or missing character
  if (!character) {
    if (selectedCantrips.length > 0 || selectedSpells.length > 0) {
      errors.push({
        type: 'LEVEL_REQUIREMENT',
        message: 'Cannot validate spells without a character'
      });
    }
    return { valid: errors.length === 0, errors, warnings };
  }

  // Early return for non-spellcasters - but check racial spells first
  if (!character.class?.spellcasting) {
    const racialSpells = getRacialSpells(character.race?.name || '', character.subrace || undefined);
    const hasRacialSpells = racialSpells.cantrips.length > 0 || racialSpells.bonusCantrips > 0;

    if (!hasRacialSpells && (selectedCantrips.length > 0 || selectedSpells.length > 0)) {
      errors.push({
        type: 'LEVEL_REQUIREMENT',
        message: `${character.class?.name} is not a spellcasting class at level 1`
      });
    } else if (hasRacialSpells) {
      // Validate only racial spells for non-spellcasters
      const expectedRacialCantrips = racialSpells.cantrips.length + racialSpells.bonusCantrips;

      if (selectedCantrips.length !== expectedRacialCantrips) {
        errors.push({
          type: 'COUNT_MISMATCH',
          message: `Expected ${expectedRacialCantrips} racial cantrips, but got ${selectedCantrips.length}`,
          expected: expectedRacialCantrips,
          actual: selectedCantrips.length
        });
      }

      // Validate racial cantrips
      selectedCantrips.forEach(cantripId => {
        const isRacialCantrip = racialSpells.cantrips.includes(cantripId);
        let isValidBonusCantrip = false;

        if (racialSpells.bonusCantrips > 0 && racialSpells.bonusCantripSource) {
          if (racialSpells.bonusCantripSource === 'wizard') {
            const { cantrips: wizardCantrips } = getClassSpells('Wizard');
            isValidBonusCantrip = wizardCantrips.some(cantrip => cantrip.id === cantripId);
          }
        }

        if (!isRacialCantrip && !isValidBonusCantrip) {
          errors.push({
            type: 'INVALID_SPELL',
            message: `${cantripId} is not a valid racial cantrip for ${character.race?.name}`,
            spellId: cantripId
          });
        }
      });

      if (selectedSpells.length > 0) {
        errors.push({
          type: 'LEVEL_REQUIREMENT',
          message: `${character.class?.name} cannot cast spells at level ${character.level || 1}`
        });
      }
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  // Now check if this is a spellcaster at this level
  const spellcastingInfo = getSpellcastingInfo(character.class, character.level || 1);
  if (!spellcastingInfo || (spellcastingInfo.cantripsKnown === 0 && spellcastingInfo.spellsKnown === 0)) {
    // This should not happen since we handled non-spellcasters above
    return { valid: errors.length === 0, errors, warnings };
  }

  // Get available spells for the class
  const { cantrips: availableCantrips, spells: availableSpells } = getClassSpells(character.class.name);
  const availableCantripIds = availableCantrips.map(c => c.id);
  const availableSpellIds = availableSpells.map(s => s.id);

  // Get racial bonus spells
  const racialSpells = getRacialSpells(character.race?.name || '', character.subrace || undefined);

  // Validate cantrip count
  const expectedCantrips = spellcastingInfo.cantripsKnown;
  const racialCantripsCount = racialSpells.cantrips.length + racialSpells.bonusCantrips;
  const totalExpectedCantrips = expectedCantrips + racialCantripsCount;

  if (selectedCantrips.length !== totalExpectedCantrips) {
    errors.push({
      type: 'COUNT_MISMATCH',
      message: `Expected ${totalExpectedCantrips} cantrips (${expectedCantrips} class + ${racialCantripsCount} racial), but got ${selectedCantrips.length}`,
      expected: totalExpectedCantrips,
      actual: selectedCantrips.length
    });
  }

  // Validate each selected cantrip
  selectedCantrips.forEach(cantripId => {
    // Check if it's a racial cantrip
    const isRacialCantrip = racialSpells.cantrips.includes(cantripId);

    // Check if it's a bonus cantrip from racial feature (e.g., High Elf wizard cantrip)
    const isBonusCantrip = racialSpells.bonusCantrips > 0 && racialSpells.bonusCantripSource;
    let isValidBonusCantrip = false;

    if (isBonusCantrip && racialSpells.bonusCantripSource) {
      if (racialSpells.bonusCantripSource === 'wizard') {
        // High Elf can choose any wizard cantrip
        const { cantrips: wizardCantrips } = getClassSpells('Wizard');
        isValidBonusCantrip = wizardCantrips.some(cantrip => cantrip.id === cantripId);
      }
      // Add more bonus cantrip sources as needed
    }

    if (!isRacialCantrip && !isValidBonusCantrip && !availableCantripIds.includes(cantripId)) {
      errors.push({
        type: 'INVALID_SPELL',
        message: `${cantripId} is not available as a cantrip for ${character.class.name}`,
        spellId: cantripId
      });
    }
  });

  // Validate spell count
  if (spellcastingInfo.spellsKnown !== undefined && spellcastingInfo.spellsKnown > 0) {
    const expectedSpells = spellcastingInfo.spellsKnown;
    if (selectedSpells.length !== expectedSpells) {
      errors.push({
        type: 'COUNT_MISMATCH',
        message: `Expected ${expectedSpells} spells known, but got ${selectedSpells.length}`,
        expected: expectedSpells,
        actual: selectedSpells.length
      });
    }
  }

  // Validate each selected spell
  selectedSpells.forEach(spellId => {
    if (!availableSpellIds.includes(spellId)) {
      errors.push({
        type: 'INVALID_SPELL',
        message: `${spellId} is not available as a 1st level spell for ${character.class.name}`,
        spellId: spellId
      });
    }
  });

  // Add helpful warnings
  if (spellcastingInfo.hasSpellbook) {
    warnings.push('As a Wizard, these spells will be recorded in your spellbook. You can prepare spells equal to your Intelligence modifier + 1 (minimum 1) each day.');
  }

  if (spellcastingInfo.isPactMagic) {
    warnings.push('As a Warlock, you use Pact Magic. Your spell slots recharge on a short rest.');
  }

  if (spellcastingInfo.ritualCasting) {
    warnings.push('Your class can cast spells as rituals if they have the ritual tag, without expending a spell slot.');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Validate spell selection during character creation
 */
export function validateCharacterSpellSelection(character: Character): SpellValidationResult {
  return validateSpellSelection(
    character,
    character.cantrips || [],
    character.knownSpells || []
  );
}

/**
 * Get maximum spell counts for a character class
 */
export function getMaxSpellCounts(characterClass: CharacterClass, level: number = 1): { cantrips: number, spells: number } {
  const spellcastingInfo = getSpellcastingInfo(characterClass, level);

  if (!spellcastingInfo) {
    return { cantrips: 0, spells: 0 };
  }

  return {
    cantrips: spellcastingInfo.cantripsKnown,
    spells: spellcastingInfo.spellsKnown || spellcastingInfo.spellsPrepared || 0
  };
}

/**
 * Check if a spell is valid for a character class
 */
export function isSpellValidForClass(spellId: string, characterClass: CharacterClass, isCantrip: boolean = false): boolean {
  const { cantrips, spells } = getClassSpells(characterClass.name);

  if (isCantrip) {
    return cantrips.some(cantrip => cantrip.id === spellId);
  } else {
    return spells.some(spell => spell.id === spellId);
  }
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
    rules.push(`Must select exactly ${spellcastingInfo.cantripsKnown} cantrip${spellcastingInfo.cantripsKnown > 1 ? 's' : ''}.`);
  }

  if (spellcastingInfo.spellsKnown) {
    rules.push(`Must select exactly ${spellcastingInfo.spellsKnown} spell${spellcastingInfo.spellsKnown > 1 ? 's' : ''} known.`);
  }

  if (spellcastingInfo.spellsPrepared) {
    rules.push(`Can prepare ${spellcastingInfo.spellsPrepared} spell${spellcastingInfo.spellsPrepared > 1 ? 's' : ''} (minimum 1).`);
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

  rules.push(`Spellcasting ability: ${spellcastingInfo.spellcastingAbility.charAt(0).toUpperCase() + spellcastingInfo.spellcastingAbility.slice(1)}.`);

  return rules;
}