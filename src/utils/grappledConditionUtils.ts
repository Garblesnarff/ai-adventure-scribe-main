/**
 * Grappled Condition Utilities for D&D 5e Combat
 * 
 * Handles the effects of the grappled condition on movement, actions, and escape mechanics
 */

import { 
  CombatParticipant, 
  Condition
} from '@/types/combat';
import { escapeGrapple } from '@/utils/grappleUtils';

/**
 * Apply grappled condition effects to a participant
 */
export function applyGrappledEffects(participant: CombatParticipant): CombatParticipant {
  // The grappled condition reduces speed to 0
  // We'll set a flag to indicate the participant is grappled
  return {
    ...participant,
    speed: 0, // Grappled creatures have speed 0
    // Note: In a full implementation, we would also track who is grappling whom
  };
}

/**
 * Remove grappled condition effects from a participant
 */
export function removeGrappledEffects(participant: CombatParticipant): CombatParticipant {
  // Restore normal speed
  // This is simplified - in a real implementation, we would restore the participant's actual speed
  return {
    ...participant,
    speed: participant.speed || 30 // Default speed if not set
  };
}

/**
 * Check if a participant can escape from grapple
 */
export function canEscapeGrapple(
  participant: CombatParticipant,
  grapplerId: string,
  encounter: any // Simplified - would be CombatEncounter
): boolean {
  const grappler = encounter.participants.find((p: any) => p.id === grapplerId);
  if (!grappler) return false;
  
  // Roll to escape
  const escapeResult = escapeGrapple(participant, grappler);
  return escapeResult.success;
}

/**
 * Check if grapple is still valid
 */
export function isGrappleStillValid(
  participant: CombatParticipant,
  grapplerId: string,
  encounter: any // Simplified - would be CombatEncounter
): boolean {
  const grappler = encounter.participants.find((p: any) => p.id === grapplerId);
  if (!grappler) return false;
  
  // Check if grappler is still capable of maintaining grapple
  const incapacitatingConditions = ['stunned', 'paralyzed', 'unconscious', 'petrified'];
  const isGrapplerIncapacitated = grappler.conditions.some((c: Condition) => 
    incapacitatingConditions.includes(c.name)
  );
  
  if (isGrapplerIncapacitated) return false;
  
  // Check if target is still within reach (simplified)
  return true;
}

/**
 * Get grappled condition description with effects
 */
export function getGrappledConditionDescription(): string {
  return "The creature is grappled. While grappled, the creature's speed becomes 0, and it can't benefit from any bonus to its speed. The condition ends if the grappler is incapacitated or if an effect removes the grappled creature from the reach of the grappler or if the grappled creature successfully escapes.";
}

/**
 * Check if participant has the grappled condition
 */
export function hasGrappledCondition(participant: CombatParticipant): boolean {
  return participant.conditions.some(condition => condition.name === 'grappled');
}

/**
 * Get the grappler ID from the grappled condition
 */
export function getGrapplerIdFromCondition(participant: CombatParticipant): string | null {
  const grappledCondition = participant.conditions.find(condition => condition.name === 'grappled');
  if (!grappledCondition) return null;
  
  // In a full implementation, we would store the grappler ID in the condition
  // For now, we'll return null as we don't have that information
  return null;
}

/**
 * Update participant speed based on conditions
 */
export function updateParticipantSpeed(participant: CombatParticipant): number {
  let speed = participant.speed || 30; // Default speed
  
  // Check for grappled condition
  const isGrappled = hasGrappledCondition(participant);
  if (isGrappled) {
    speed = 0;
  }
  
  // Check for other movement-affecting conditions
  const isProne = participant.conditions.some(condition => condition.name === 'prone');
  if (isProne && speed > 0) {
    speed = Math.floor(speed / 2); // Prone reduces speed to half
  }
  
  const isRestrained = participant.conditions.some(condition => condition.name === 'restrained');
  if (isRestrained) {
    speed = 0;
  }
  
  return speed;
}