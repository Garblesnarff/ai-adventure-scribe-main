/**
 * Stealth Utilities for D&D 5e
 *
 * Handles hiding, sneaking, and stealth-related mechanics
 */

import type { CombatParticipant, DiceRoll } from '@/types/combat';

import { Condition } from '@/types/combat';
import { rollDice } from '@/utils/diceUtils';

/**
 * Calculate stealth check bonus for a participant
 */
export function calculateStealthBonus(participant: CombatParticipant): number {
  // Base proficiency bonus (simplified - would normally calculate from level)
  const proficiencyBonus = Math.floor((participant.level || 1) / 4) + 2;

  // Dexterity modifier (simplified - would normally calculate from ability score)
  const dexModifier = 2;

  // Racial bonuses
  let racialBonus = 0;
  if (participant.racialTraits?.some((t) => t.name === 'naturally_stealthy')) {
    racialBonus = 1;
  }

  // Class feature bonuses
  let classBonus = 0;
  if (participant.classFeatures?.some((f) => f.name === 'sneak_attack')) {
    classBonus = 1; // Rogues get bonus to stealth
  }

  // Equipment modifiers
  let equipmentBonus = 0;
  if (participant.mainHandWeapon?.properties?.finesse) {
    equipmentBonus += 1; // Finesse weapons help with stealth
  }

  // Condition modifiers
  let conditionModifier = 0;
  if (participant.conditions.some((c) => c.name === 'prone')) {
    conditionModifier -= 2; // Prone gives disadvantage on stealth
  }

  return (
    dexModifier + proficiencyBonus + racialBonus + classBonus + equipmentBonus + conditionModifier
  );
}

/**
 * Roll a stealth check
 */
export function rollStealthCheck(participant: CombatParticipant): DiceRoll {
  const bonus = calculateStealthBonus(participant);
  return rollDice(20, 1, bonus);
}

/**
 * Check if a participant can attempt to hide
 */
export function canHide(participant: CombatParticipant): boolean {
  // Can't hide if already hidden
  if (participant.isHidden) {
    return false;
  }

  // Can't hide if heavily obscured or blinded
  const isBlinded = participant.conditions.some((c) => c.name === 'blinded');
  if (isBlinded) {
    return false;
  }

  // Must have cover or be in lightly/heavily obscured area
  // For simplicity, we'll assume they can hide if they're not in clear conditions
  const isObscured = participant.obscurement !== 'clear';
  const hasCover = true; // Simplified - would normally check for actual cover

  return isObscured || hasCover;
}

/**
 * Attempt to hide
 */
export function attemptHide(participant: CombatParticipant): {
  success: boolean;
  roll: DiceRoll;
  description: string;
} {
  // Check if they can hide
  if (!canHide(participant)) {
    return {
      success: false,
      roll: { dieType: 20, count: 1, modifier: 0, results: [1], keptResults: [1], total: 1 },
      description: `${participant.name} cannot attempt to hide in current conditions`,
    };
  }

  // Roll stealth check
  const roll = rollStealthCheck(participant);
  const success = roll.total >= 10; // Simplified DC for hiding

  const description = success
    ? `${participant.name} successfully hides (Rolled ${roll.total})`
    : `${participant.name} fails to hide (Rolled ${roll.total})`;

  return {
    success,
    roll,
    description,
  };
}

/**
 * Stop hiding
 */
export function stopHiding(participant: CombatParticipant): CombatParticipant {
  return {
    ...participant,
    isHidden: false,
  };
}

/**
 * Check if a hidden participant can remain hidden
 */
export function canRemainHidden(participant: CombatParticipant, actionTaken: string): boolean {
  // Certain actions automatically break stealth
  const breakingActions = ['attack', 'cast_spell', 'shove', 'grapple', 'dash'];

  if (breakingActions.includes(actionTaken)) {
    return false;
  }

  // Moving might break stealth depending on distance and method
  if (actionTaken === 'move') {
    // For simplicity, we'll say moving breaks stealth
    return false;
  }

  return true;
}

/**
 * Apply hidden condition to participant
 */
export function applyHiddenCondition(participant: CombatParticipant): CombatParticipant {
  return {
    ...participant,
    isHidden: true,
  };
}

/**
 * Remove hidden condition from participant
 */
export function removeHiddenCondition(participant: CombatParticipant): CombatParticipant {
  return {
    ...participant,
    isHidden: false,
  };
}

/**
 * Check if observer can see hidden participant
 */
export function canSeeHidden(
  observer: CombatParticipant,
  hiddenParticipant: CombatParticipant,
  distance: number = 30,
): {
  canSee: boolean;
  description: string;
} {
  // If not hidden, can be seen
  if (!hiddenParticipant.isHidden) {
    return {
      canSee: true,
      description: `${hiddenParticipant.name} is not hidden`,
    };
  }

  // Check observer's vision capabilities
  const hasBlindsight = observer.visionTypes?.some(
    (v) => v.type === 'blindsight' && distance <= v.range,
  );
  const hasTruesight = observer.visionTypes?.some(
    (v) => v.type === 'truesight' && distance <= v.range,
  );

  // Blindsight and truesight can see hidden creatures
  if (hasBlindsight || hasTruesight) {
    return {
      canSee: true,
      description: `${observer.name} can see ${hiddenParticipant.name} with ${hasBlindsight ? 'blindsight' : 'truesight'}`,
    };
  }

  // Roll perception check against stealth
  const observerPerception = rollDice(20, 1, 2); // Simplified perception bonus
  const hiddenStealth = rollStealthCheck(hiddenParticipant);

  const canSee = observerPerception.total >= hiddenStealth.total;

  return {
    canSee,
    description: canSee
      ? `${observer.name} spots ${hiddenParticipant.name} (Perception ${observerPerception.total} vs Stealth ${hiddenStealth.total})`
      : `${observer.name} fails to spot ${hiddenParticipant.name} (Perception ${observerPerception.total} vs Stealth ${hiddenStealth.total})`,
  };
}

/**
 * Get stealth action description
 */
export function getStealthActionDescription(
  participant: CombatParticipant,
  success: boolean,
): string {
  return success
    ? `${participant.name} successfully hides from enemies`
    : `${participant.name} fails to hide and remains visible`;
}
