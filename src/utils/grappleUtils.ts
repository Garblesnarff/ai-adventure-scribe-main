/**
 * Grapple Utilities for D&D 5e Combat
 *
 * Handles grapple mechanics, strength checks, and condition application
 */

import type { CombatParticipant, Condition, DiceRoll } from '@/types/combat';

import { rollDice } from '@/utils/diceUtils';

/**
 * Check if a participant can attempt to grapple
 */
export function canAttemptGrapple(participant: CombatParticipant): boolean {
  // Must not be incapacitated
  const incapacitatingConditions = ['stunned', 'paralyzed', 'unconscious', 'petrified'];
  const isIncapacitated = participant.conditions.some((c) =>
    incapacitatingConditions.includes(c.name),
  );

  if (isIncapacitated) return false;

  // Must have at least one free hand
  // For simplicity, we'll assume they can grapple if they have a main hand weapon that's not two-handed
  if (participant.mainHandWeapon?.properties.twoHanded) {
    return false;
  }

  return true;
}

/**
 * Calculate grapple DC (typically 8 + proficiency bonus + Strength modifier)
 */
export function calculateGrappleDC(participant: CombatParticipant): number {
  // Simplified calculation - would normally use actual ability scores
  const baseDC = 8;
  const proficiencyBonus = Math.floor((participant.level || 1) / 4) + 2;
  const strengthModifier = 3; // Simplified - would use actual Strength modifier

  return baseDC + proficiencyBonus + strengthModifier;
}

/**
 * Roll a grapple check
 */
export function rollGrappleCheck(
  participant: CombatParticipant,
  target: CombatParticipant,
): {
  roll: DiceRoll;
  description: string;
  success: boolean;
  dc: number;
} {
  const dc = calculateGrappleDC(participant);

  // Roll 1d20 + Strength modifier + proficiency bonus
  const strengthModifier = 3; // Simplified - would use actual Strength modifier
  const proficiencyBonus = Math.floor((participant.level || 1) / 4) + 2;
  const modifier = strengthModifier + proficiencyBonus;

  const roll = rollDice(20, 1, modifier);
  const success = roll.total >= dc;

  const description = `${participant.name} attempts to grapple ${target.name} (DC ${dc})`;

  return {
    roll,
    description,
    success,
    dc,
  };
}

/**
 * Create grappled condition
 */
export function createGrappledCondition(grapplerId: string, escapeDC: number): Condition {
  return {
    name: 'grappled',
    description:
      "The creature is grappled. While grappled, the creature's speed becomes 0, and it can't benefit from any bonus to its speed. The condition ends if the grappler is incapacitated or if an effect removes the grappled creature from the reach of the grappler.",
    duration: -1, // Permanent until escaped or grappler is incapacitated
    saveEndsType: 'end',
    saveDC: escapeDC,
    saveAbility: 'str', // Strength check to escape
    sourceSpell: undefined,
    concentrationRequired: false,
  };
}

/**
 * Check if target can be grappled
 */
export function canBeGrappled(target: CombatParticipant): boolean {
  // Can't grapple creatures that are already grappled
  const isAlreadyGrappled = target.conditions.some((c) => c.name === 'grappled');
  if (isAlreadyGrappled) return false;

  // Can't grapple creatures that are much larger (simplified size check)
  // For simplicity, we'll assume all creatures are Medium size
  return true;
}

/**
 * Check if grapple can be maintained
 */
export function canMaintainGrapple(grappler: CombatParticipant, grappledTargetId: string): boolean {
  // Must not be incapacitated
  const incapacitatingConditions = ['stunned', 'paralyzed', 'unconscious', 'petrified'];
  const isIncapacitated = grappler.conditions.some((c) =>
    incapacitatingConditions.includes(c.name),
  );

  if (isIncapacitated) return false;

  // Must be within reach of the target
  // Simplified - assume they're within reach if they successfully grappled
  return true;
}

/**
 * Escape from grapple
 */
export function escapeGrapple(
  target: CombatParticipant,
  grappler: CombatParticipant,
): {
  roll: DiceRoll;
  success: boolean;
  description: string;
} {
  // Roll Strength (Athletics) check against grappler's grapple DC
  const targetStrengthModifier = 3; // Simplified - would use actual Strength modifier
  const targetProficiencyBonus = Math.floor((target.level || 1) / 4) + 2;
  const targetModifier = targetStrengthModifier + targetProficiencyBonus;

  const roll = rollDice(20, 1, targetModifier);
  const grappleDC = calculateGrappleDC(grappler);
  const success = roll.total >= grappleDC;

  const description = `${target.name} attempts to escape grapple from ${grappler.name} (DC ${grappleDC})`;

  return {
    roll,
    success,
    description,
  };
}

/**
 * Get grapple action description
 */
export function getGrappleActionDescription(
  grappler: CombatParticipant,
  target: CombatParticipant,
  success: boolean,
): string {
  if (success) {
    return `${grappler.name} successfully grapples ${target.name}!`;
  } else {
    return `${grappler.name} fails to grapple ${target.name}.`;
  }
}
