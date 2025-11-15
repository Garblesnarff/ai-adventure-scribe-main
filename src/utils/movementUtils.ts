/**
 * Movement Utilities for D&D 5e Combat
 *
 * Handles movement calculations, opportunity attacks, and positioning
 */

import type { CombatParticipant, CombatEncounter, ReactionOpportunity } from '@/types/combat';

import { checkMovementOpportunityAttacks } from '@/utils/reactionSystem';

/**
 * Process movement action and check for opportunity attacks
 */
export function processMovementAction(
  participantId: string,
  fromPosition: string,
  toPosition: string,
  encounter: CombatEncounter,
): ReactionOpportunity[] {
  const participant = encounter.participants.find((p) => p.id === participantId);
  if (!participant) {
    return [];
  }

  // Check for opportunity attacks
  const opportunities = checkMovementOpportunityAttacks(
    participant,
    encounter,
    fromPosition,
    toPosition,
  );

  return opportunities;
}

/**
 * Check if movement provokes opportunity attacks
 */
export function doesMovementProvokeOpportunityAttacks(
  participant: CombatParticipant,
  fromPosition: string,
  toPosition: string,
): boolean {
  // Movement provokes opportunity attacks if:
  // 1. The creature leaves a hostile creature's reach
  // 2. The movement is not a teleport or involuntary movement
  // 3. The creature doesn't have features that prevent opportunity attacks

  // Simplified check - in a real implementation, you'd have proper positioning
  const isLeavingReach =
    fromPosition !== toPosition &&
    (fromPosition === 'melee' || fromPosition === 'adjacent') &&
    (toPosition === 'ranged' || toPosition === 'distant');

  // Check for features that prevent opportunity attacks
  const hasMobileFeature = participant.classFeatures?.some((f) => f.name === 'mobile') || false;
  const isFlying = participant.speed.fly > 0;
  const isUsingDisengage = participant.bonusActionTaken; // Simplified - would need proper tracking

  return isLeavingReach && !hasMobileFeature && !isFlying && !isUsingDisengage;
}

/**
 * Calculate movement cost based on terrain
 */
export function calculateMovementCost(
  fromPosition: string,
  toPosition: string,
  terrain: string,
): number {
  // Simplified movement cost calculation
  let baseCost = 0;

  // Determine base movement cost
  if (fromPosition === 'melee' && toPosition === 'adjacent') {
    baseCost = 5; // 5 feet
  } else if (fromPosition === 'adjacent' && toPosition === 'ranged') {
    baseCost = 10; // 10 feet
  } else if (fromPosition === 'ranged' && toPosition === 'distant') {
    baseCost = 15; // 15 feet
  }

  // Apply terrain modifiers
  let terrainMultiplier = 1;
  switch (terrain) {
    case 'difficult':
      terrainMultiplier = 2;
      break;
    case 'rough':
      terrainMultiplier = 1.5;
      break;
    default:
      terrainMultiplier = 1;
  }

  return baseCost * terrainMultiplier;
}

/**
 * Check if a participant can move to a position
 */
export function canMoveToPosition(
  participant: CombatParticipant,
  currentPosition: string,
  targetPosition: string,
  availableMovement: number,
): boolean {
  // Check if participant has enough movement
  const movementCost = calculateMovementCost(currentPosition, targetPosition, 'clear');
  return availableMovement >= movementCost;
}
