/**
 * Combat Domain Types
 *
 * Pure TypeScript type definitions for D&D 5e combat mechanics.
 * NO React dependencies - framework-agnostic combat types.
 */

import type {
  CombatParticipant,
  CombatEncounter,
  CombatAction,
  Condition,
  ConditionName,
  DamageType,
  DiceRoll,
  ReactionOpportunity,
  DeathSaves,
} from '@/types/combat';

// Re-export types from the main types file for convenience
export type {
  CombatParticipant,
  CombatEncounter,
  CombatAction,
  Condition,
  ConditionName,
  DamageType,
  DiceRoll,
  ReactionOpportunity,
  DeathSaves,
};

/**
 * Result of a death save roll
 */
export type DeathSaveResult = 'success' | 'failure' | 'critical';

/**
 * Result of an initiative roll
 */
export interface InitiativeRollResult {
  participantId: string;
  initiative: number;
  roll: DiceRoll;
}

/**
 * Result of a turn advancement
 */
export interface TurnAdvancementResult {
  nextParticipantId: string | undefined;
  newRound: number;
  participantsToUpdate: Map<string, Partial<CombatParticipant>>;
}

/**
 * Damage calculation result with resistances/immunities applied
 */
export interface DamageCalculationResult {
  originalDamage: number;
  finalDamage: number;
  damageType?: DamageType;
  wasResisted: boolean;
  wasImmune: boolean;
  wasVulnerable: boolean;
  tempHPAbsorbed: number;
  hpDamage: number;
  newCurrentHP: number;
  newTempHP: number;
}

/**
 * Options for applying damage to a participant
 */
export interface ApplyDamageOptions {
  damage: number;
  damageType?: DamageType;
  ignoreResistances?: boolean;
  ignoreImmunities?: boolean;
}

/**
 * Options for healing a participant
 */
export interface HealingOptions {
  healing: number;
  canOverheal?: boolean;
  maxHPOverride?: number;
}

/**
 * Result of applying healing
 */
export interface HealingResult {
  healingApplied: number;
  newCurrentHP: number;
  wasAtMaxHP: boolean;
}

/**
 * Options for adding a participant to combat
 */
export interface AddParticipantOptions {
  rollInitiative?: boolean;
  initiativeModifier?: number;
  insertAtIndex?: number;
}

/**
 * Result of adding a participant
 */
export interface AddParticipantResult {
  participant: CombatParticipant;
  initiativeRoll?: DiceRoll;
  insertedAtIndex: number;
}
