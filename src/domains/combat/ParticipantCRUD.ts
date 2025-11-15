/**
 * Participant CRUD Module
 *
 * Basic participant create, read, update, delete operations.
 * Pure TypeScript - NO React dependencies.
 */

import { sortByInitiative } from './InitiativeTracker';

import type { CombatParticipant, AddParticipantOptions, AddParticipantResult } from './types';

import { rollDie } from '@/utils/diceRolls';

/**
 * Create a new participant with default values
 */
export function createParticipant(
  partial: Partial<CombatParticipant>,
  options?: AddParticipantOptions,
): AddParticipantResult {
  const participant: CombatParticipant = {
    id: partial.id || crypto.randomUUID(),
    name: partial.name || 'Unknown',
    participantType: partial.participantType || 'monster',
    characterId: partial.characterId,
    characterClass: partial.characterClass,
    level: partial.level,
    maxHitPoints: partial.maxHitPoints || 1,
    currentHitPoints: partial.currentHitPoints ?? partial.maxHitPoints ?? 1,
    temporaryHitPoints: partial.temporaryHitPoints || 0,
    armorClass: partial.armorClass || 10,
    initiative: partial.initiative || 0,
    speed: partial.speed || 30,
    actionTaken: false,
    bonusActionTaken: false,
    reactionTaken: false,
    movementUsed: 0,
    reactionOpportunities: [],
    conditions: [],
    deathSaves: { successes: 0, failures: 0 },
    damageResistances: partial.damageResistances || [],
    damageImmunities: partial.damageImmunities || [],
    damageVulnerabilities: partial.damageVulnerabilities || [],
    fightingStyles: partial.fightingStyles,
    mainHandWeapon: partial.mainHandWeapon,
    offHandWeapon: partial.offHandWeapon,
    classFeatures: partial.classFeatures,
    resources: partial.resources,
    isRaging: partial.isRaging || false,
    activeConcentration: partial.activeConcentration || null,
    spellSlots: partial.spellSlots,
    preparedSpells: partial.preparedSpells,
    racialTraits: partial.racialTraits,
    visionTypes: partial.visionTypes,
    obscurement: partial.obscurement || 'clear',
    isHidden: partial.isHidden || false,
    stealthCheckBonus: partial.stealthCheckBonus || 0,
  };

  let initiativeRoll;
  if (options?.rollInitiative) {
    const modifier = options.initiativeModifier ?? participant.initiative ?? 0;
    const roll = rollDie(20);
    participant.initiative = roll + modifier;
    initiativeRoll = {
      dieType: 20,
      count: 1,
      modifier,
      results: [roll],
      keptResults: [roll],
      total: participant.initiative,
      naturalRoll: roll,
    };
  }

  return {
    participant,
    initiativeRoll,
    insertedAtIndex: options?.insertAtIndex ?? -1,
  };
}

/**
 * Add a participant to combat
 */
export function addParticipant(
  participants: CombatParticipant[],
  newParticipant: CombatParticipant,
): CombatParticipant[] {
  const updated = [...participants, newParticipant];
  return sortByInitiative(updated);
}

/**
 * Remove a participant from combat
 */
export function removeParticipant(
  participants: CombatParticipant[],
  participantId: string,
): CombatParticipant[] {
  return participants.filter((p) => p.id !== participantId);
}

/**
 * Update a participant's properties
 */
export function updateParticipant(
  participants: CombatParticipant[],
  participantId: string,
  updates: Partial<CombatParticipant>,
): CombatParticipant[] {
  return participants.map((p) => (p.id === participantId ? { ...p, ...updates } : p));
}

/**
 * Find a participant by ID
 */
export function findParticipant(
  participants: CombatParticipant[],
  participantId: string,
): CombatParticipant | undefined {
  return participants.find((p) => p.id === participantId);
}

/**
 * Get all participants of a specific type
 */
export function getParticipantsByType(
  participants: CombatParticipant[],
  type: 'player' | 'enemy' | 'npc',
): CombatParticipant[] {
  return participants.filter((p) => p.participantType === type);
}

/**
 * Get all alive participants
 */
export function getAliveParticipants(participants: CombatParticipant[]): CombatParticipant[] {
  return participants.filter((p) => p.currentHitPoints > 0);
}

/**
 * Get all unconscious participants
 */
export function getUnconsciousParticipants(participants: CombatParticipant[]): CombatParticipant[] {
  return participants.filter((p) => p.currentHitPoints <= 0 && p.deathSaves.failures < 3);
}

/**
 * Get all dead participants
 */
export function getDeadParticipants(participants: CombatParticipant[]): CombatParticipant[] {
  return participants.filter((p) => p.deathSaves.failures >= 3);
}

/**
 * Check if combat should end
 */
export function shouldCombatEnd(participants: CombatParticipant[]): {
  shouldEnd: boolean;
  reason?: 'all_enemies_defeated' | 'all_players_defeated' | 'all_dead';
} {
  const alivePlayers = getAliveParticipants(getParticipantsByType(participants, 'player'));
  const aliveEnemies = getAliveParticipants(getParticipantsByType(participants, 'enemy'));

  if (alivePlayers.length === 0 && aliveEnemies.length === 0) {
    return { shouldEnd: true, reason: 'all_dead' };
  }

  if (alivePlayers.length === 0) {
    return { shouldEnd: true, reason: 'all_players_defeated' };
  }

  if (aliveEnemies.length === 0) {
    return { shouldEnd: true, reason: 'all_enemies_defeated' };
  }

  return { shouldEnd: false };
}
