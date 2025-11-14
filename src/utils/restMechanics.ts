/**
 * Rest Mechanics Utilities for D&D 5e
 *
 * Provides functions for handling short rests and long rests according to D&D 5e rules.
 * Handles hit dice recovery, spell slot recovery, class feature restoration, and more.
 *
 * Dependencies:
 * - Character types from '@/types/character'
 * - Combat types from '@/types/combat'
 * - Class feature utilities from '@/utils/classFeatures'
 * - Spell management utilities from '@/utils/spell-management'
 *
 * @author AI Dungeon Master Team
 */

import type { Character } from '@/types/character';
import type { CombatParticipant } from '@/types/combat';

import { CharacterClass } from '@/types/character';
import { restoreClassFeatures, getCharacterResources } from '@/utils/classFeatures';
import { rollDie } from '@/utils/diceRolls';
import { restoreSpellSlots } from '@/utils/spell-management';

// ===========================
// Type Definitions
// ===========================

export type RestType = 'short' | 'long';

export interface RestResult {
  character: Character;
  hitPointsRecovered: number;
  hitDiceRecovered: number;
  spellSlotsRecovered: number;
  classFeaturesRestored: string[];
  exhaustionRemoved: number;
}

// ===========================
// Hit Dice Mechanics
// ===========================

/**
 * Calculate maximum hit dice for a character based on class levels
 */
export function calculateMaxHitDice(character: Character): number {
  if (!character.classLevels || character.classLevels.length === 0) {
    const level = character.level || 1;
    return Math.floor(level / 2);
  }

  // For multiclass characters, take half of total level (minimum 1)
  const totalLevel = character.classLevels.reduce((sum, cls) => sum + cls.level, 0);
  return Math.max(1, Math.floor(totalLevel / 2));
}

/**
 * Roll hit dice to recover hit points
 * @param character - Character rolling hit dice
 * @param numDice - Number of hit dice to roll
 * @returns Object with hit points recovered and updated character
 */
export function rollHitDice(
  character: Character,
  numDice: number,
): {
  hitPointsRecovered: number;
  updatedCharacter: Character;
} {
  if (!character.hitDice || numDice <= 0) {
    return { hitPointsRecovered: 0, updatedCharacter: character };
  }

  const hitDiceType = character.hitDice.type.replace('d', '');
  const dieType = parseInt(hitDiceType) || 8;
  const conModifier = character.abilityScores?.constitution?.modifier || 0;

  let totalRecovered = 0;
  let remainingDice = character.hitDice.remaining;

  // Roll hit dice
  for (let i = 0; i < Math.min(numDice, remainingDice); i++) {
    const roll = rollDie(dieType);
    const recovered = Math.max(1, roll + conModifier); // Minimum 1 HP recovered
    totalRecovered += recovered;
    remainingDice--;
  }

  // Update character hit dice
  const updatedCharacter = {
    ...character,
    hitDice: {
      ...character.hitDice,
      remaining: remainingDice,
    },
    hitPoints: {
      ...character.hitPoints,
      current: Math.min(
        character.hitPoints?.maximum || 1,
        (character.hitPoints?.current || 0) + totalRecovered,
      ),
    },
  };

  return {
    hitPointsRecovered: totalRecovered,
    updatedCharacter,
  };
}

/**
 * Recover hit dice on a long rest
 * @param character - Character to recover hit dice for
 * @returns Updated character with recovered hit dice
 */
export function recoverHitDice(character: Character): Character {
  if (!character.hitDice) {
    return character;
  }

  const maxHitDice = calculateMaxHitDice(character);
  const currentHitDice = character.hitDice.remaining;
  const maxHitDiceCount = character.hitDice.total;

  // Recover up to half of max hit dice (rounded down, minimum 1)
  const diceToRecover = Math.max(1, Math.floor(maxHitDice));
  const newHitDiceCount = Math.min(maxHitDiceCount, currentHitDice + diceToRecover);

  return {
    ...character,
    hitDice: {
      ...character.hitDice,
      remaining: newHitDiceCount,
    },
  };
}

// ===========================
// Spell Slot Recovery
// ===========================

/**
 * Recover spell slots on a short rest (for classes with special rules)
 * @param character - Character to recover spell slots for
 * @param className - Class name for special recovery rules
 * @param level - Character level
 * @returns Updated character with recovered spell slots
 */
export function recoverSpellSlotsShortRest(
  character: Character,
  className: string,
  level: number,
): Character {
  // Wizard: Arcane Recovery
  if (className.toLowerCase() === 'wizard' && level >= 2) {
    // Recover spell slots with combined level up to half wizard level (rounded up)
    // This is a simplified implementation - in a full implementation,
    // the player would choose which slots to recover
    const wizardLevel = level; // For single class, this is the same
    const maxRecoveryLevel = Math.ceil(wizardLevel / 2);

    // For now, we'll recover one spell slot of appropriate level
    if (character.spellSlots) {
      const updatedSlots = { ...character.spellSlots };

      // Try to recover a slot of the highest level possible
      for (let i = maxRecoveryLevel; i >= 1; i--) {
        if (updatedSlots[i] && updatedSlots[i].current < updatedSlots[i].max) {
          updatedSlots[i] = {
            ...updatedSlots[i],
            current: updatedSlots[i].current + 1,
          };
          break;
        }
      }

      return {
        ...character,
        spellSlots: updatedSlots,
      };
    }
  }

  // Warlock: All spell slots recover on short rest
  if (className.toLowerCase() === 'warlock') {
    return restoreSpellSlots(character);
  }

  return character;
}

// ===========================
// Class Feature Recovery
// ===========================

/**
 * Restore class features on rest
 * @param character - Character to restore features for
 * @param restType - Type of rest (short or long)
 * @returns Updated character with restored features
 */
export function restoreClassFeaturesOnRest(character: Character, restType: RestType): Character {
  if (!character.classFeatures) {
    return character;
  }

  // Get current resources
  const currentResources =
    character.classResources ||
    getCharacterResources(character.class?.name || 'fighter', character.level || 1);

  // Restore features
  const { resources: updatedResources } = restoreClassFeatures(
    Object.values(character.classFeatures),
    currentResources,
    restType,
  );

  return {
    ...character,
    classResources: updatedResources,
  };
}

// ===========================
// Exhaustion Recovery
// ===========================

/**
 * Remove exhaustion levels on long rest
 * @param character - Character to remove exhaustion for
 * @param hadFoodAndWater - Whether character had food and water
 * @returns Updated character with reduced exhaustion
 */
export function recoverExhaustion(
  character: Character,
  hadFoodAndWater: boolean = true,
): Character {
  if (!character.conditions) {
    return character;
  }

  // Find exhaustion condition
  const exhaustionIndex = character.conditions.findIndex((c) => c.name === 'exhaustion');
  if (exhaustionIndex === -1) {
    return character;
  }

  const exhaustion = character.conditions[exhaustionIndex];
  let exhaustionLevel = exhaustion.level || 0;

  // Remove one level of exhaustion on long rest with food and water
  if (hadFoodAndWater && exhaustionLevel > 0) {
    exhaustionLevel = Math.max(0, exhaustionLevel - 1);
  }

  // Update or remove exhaustion condition
  const updatedConditions = [...character.conditions];
  if (exhaustionLevel > 0) {
    updatedConditions[exhaustionIndex] = {
      ...exhaustion,
      level: exhaustionLevel,
    };
  } else {
    updatedConditions.splice(exhaustionIndex, 1);
  }

  return {
    ...character,
    conditions: updatedConditions,
  };
}

// ===========================
// Main Rest Functions
// ===========================

/**
 * Process a short rest for a character
 * @param character - Character taking the rest
 * @param hitDiceToRoll - Number of hit dice to roll (0 to skip HP recovery)
 * @returns Rest result with details of recovery
 */
export function processShortRest(character: Character, hitDiceToRoll: number = 0): RestResult {
  let updatedCharacter = { ...character };
  let hitPointsRecovered = 0;
  const hitDiceRecovered = 0;
  let spellSlotsRecovered = 0;
  const classFeaturesRestored: string[] = [];

  // Roll hit dice for HP recovery
  if (hitDiceToRoll > 0) {
    const { hitPointsRecovered: hpRecovered, updatedCharacter: charWithHP } = rollHitDice(
      updatedCharacter,
      hitDiceToRoll,
    );
    hitPointsRecovered = hpRecovered;
    updatedCharacter = charWithHP;
  }

  // Recover spell slots for classes with special rules
  if (updatedCharacter.class) {
    const charWithSlots = recoverSpellSlotsShortRest(
      updatedCharacter,
      updatedCharacter.class.name,
      updatedCharacter.level || 1,
    );

    // Calculate how many slots were recovered (simplified)
    if (charWithSlots.spellSlots !== updatedCharacter.spellSlots) {
      spellSlotsRecovered = 1; // Simplified count
    }

    updatedCharacter = charWithSlots;
  }

  // Restore class features that recover on short rest
  const charWithFeatures = restoreClassFeaturesOnRest(updatedCharacter, 'short');
  if (charWithFeatures !== updatedCharacter) {
    // In a full implementation, we'd track which specific features were restored
    classFeaturesRestored.push('Short rest features');
  }
  updatedCharacter = charWithFeatures;

  return {
    character: updatedCharacter,
    hitPointsRecovered,
    hitDiceRecovered,
    spellSlotsRecovered,
    classFeaturesRestored,
    exhaustionRemoved: 0,
  };
}

/**
 * Process a long rest for a character
 * @param character - Character taking the rest
 * @param hadFoodAndWater - Whether character had food and water
 * @returns Rest result with details of recovery
 */
export function processLongRest(character: Character, hadFoodAndWater: boolean = true): RestResult {
  let updatedCharacter = { ...character };
  let hitPointsRecovered = 0;
  let hitDiceRecovered = 0;
  let spellSlotsRecovered = 0;
  const classFeaturesRestored: string[] = [];
  let exhaustionRemoved = 0;

  // Recover all hit points
  if (updatedCharacter.hitPoints) {
    hitPointsRecovered = updatedCharacter.hitPoints.maximum - updatedCharacter.hitPoints.current;
    updatedCharacter = {
      ...updatedCharacter,
      hitPoints: {
        ...updatedCharacter.hitPoints,
        current: updatedCharacter.hitPoints.maximum,
      },
    };
  }

  // Recover hit dice
  const charWithHitDice = recoverHitDice(updatedCharacter);
  if (charWithHitDice.hitDice?.remaining !== updatedCharacter.hitDice?.remaining) {
    hitDiceRecovered =
      (charWithHitDice.hitDice?.remaining || 0) - (updatedCharacter.hitDice?.remaining || 0);
  }
  updatedCharacter = charWithHitDice;

  // Recover all spell slots
  const charWithSlots = restoreSpellSlots(updatedCharacter);
  if (charWithSlots.spellSlots !== updatedCharacter.spellSlots) {
    spellSlotsRecovered = 1; // Simplified count
  }
  updatedCharacter = charWithSlots;

  // Restore all class features
  const charWithFeatures = restoreClassFeaturesOnRest(updatedCharacter, 'long');
  if (charWithFeatures !== updatedCharacter) {
    classFeaturesRestored.push('All class features');
  }
  updatedCharacter = charWithFeatures;

  // Remove exhaustion
  const charWithExhaustion = recoverExhaustion(updatedCharacter, hadFoodAndWater);
  if (charWithExhaustion.conditions?.length !== updatedCharacter.conditions?.length) {
    exhaustionRemoved = 1; // Simplified count
  }
  updatedCharacter = charWithExhaustion;

  return {
    character: updatedCharacter,
    hitPointsRecovered,
    hitDiceRecovered,
    spellSlotsRecovered,
    classFeaturesRestored,
    exhaustionRemoved,
  };
}

// ===========================
// Combat Participant Rest Functions
// ===========================

/**
 * Process a short rest for a combat participant
 * @param participant - Combat participant taking the rest
 * @param hitDiceToRoll - Number of hit dice to roll (0 to skip HP recovery)
 * @returns Updated participant with rest effects applied
 */
export function processShortRestCombat(
  participant: CombatParticipant,
  hitDiceToRoll: number = 0,
): CombatParticipant {
  // For combat participants, we need to work with limited data
  // This is a simplified implementation

  let updatedParticipant = { ...participant };

  // Roll hit dice for HP recovery
  if (hitDiceToRoll > 0 && participant.hitDice && participant.hitDice.current > 0) {
    const hitDiceType = 8; // Default d8
    let totalRecovered = 0;
    let remainingDice = participant.hitDice.current;

    // Roll hit dice
    for (let i = 0; i < Math.min(hitDiceToRoll, remainingDice); i++) {
      const roll = rollDie(hitDiceType);
      const recovered = Math.max(1, roll); // Simplified - no CON modifier
      totalRecovered += recovered;
      remainingDice--;
    }

    // Update participant
    updatedParticipant = {
      ...updatedParticipant,
      currentHitPoints: Math.min(
        participant.maxHitPoints,
        participant.currentHitPoints + totalRecovered,
      ),
      hitDice: {
        ...participant.hitDice,
        current: remainingDice,
      },
    };
  }

  return updatedParticipant;
}

/**
 * Process a long rest for a combat participant
 * @param participant - Combat participant taking the rest
 * @returns Updated participant with rest effects applied
 */
export function processLongRestCombat(participant: CombatParticipant): CombatParticipant {
  // Recover all hit points
  const updatedParticipant = {
    ...participant,
    currentHitPoints: participant.maxHitPoints,
    hitDice: participant.hitDice
      ? {
          ...participant.hitDice,
          current: participant.hitDice.max, // Recover all hit dice
        }
      : undefined,
    // Reset conditions (except permanent ones)
    conditions: participant.conditions?.filter((c) => c.duration === -1) || [],
    // Reset action tracking
    actionTaken: false,
    bonusActionTaken: false,
    reactionTaken: false,
    movementUsed: 0,
    // Reset spell slots
    spellSlots: participant.spellSlots
      ? Object.fromEntries(
          Object.entries(participant.spellSlots).map(([level, slots]) => [
            level,
            { ...slots, current: slots.max },
          ]),
        )
      : undefined,
    activeConcentration: null,
  };

  return updatedParticipant;
}
