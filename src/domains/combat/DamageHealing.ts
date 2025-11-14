/**
 * Damage and Healing Module
 *
 * Handles damage calculation with resistances/immunities and healing.
 * Pure TypeScript - NO React dependencies.
 */

import type {
  CombatParticipant,
  DamageCalculationResult,
  ApplyDamageOptions,
  HealingOptions,
  HealingResult,
} from './types';

import { calculateDamage } from '@/utils/diceUtils';

/**
 * Calculate damage with resistances, immunities, and vulnerabilities
 */
export function calculateDamageWithResistances(
  participant: CombatParticipant,
  options: ApplyDamageOptions,
): DamageCalculationResult {
  const { damage, damageType, ignoreResistances, ignoreImmunities } = options;

  let finalDamage = damage;
  let wasResisted = false;
  let wasImmune = false;
  let wasVulnerable = false;

  if (damageType && !ignoreResistances && !ignoreImmunities) {
    finalDamage = calculateDamage(
      damage,
      damageType,
      participant.damageResistances,
      participant.damageImmunities,
      participant.damageVulnerabilities,
    );

    wasImmune = finalDamage === 0 && damage > 0;
    wasResisted = finalDamage < damage && finalDamage > 0;
    wasVulnerable = finalDamage > damage;
  }

  const tempHPAbsorbed = Math.min(participant.temporaryHitPoints, finalDamage);
  const hpDamage = finalDamage - tempHPAbsorbed;

  const newTempHP = participant.temporaryHitPoints - tempHPAbsorbed;
  const newCurrentHP = Math.max(0, participant.currentHitPoints - hpDamage);

  return {
    originalDamage: damage,
    finalDamage,
    damageType,
    wasResisted,
    wasImmune,
    wasVulnerable,
    tempHPAbsorbed,
    hpDamage,
    newCurrentHP,
    newTempHP,
  };
}

/**
 * Apply damage to a participant
 */
export function applyDamage(
  participant: CombatParticipant,
  options: ApplyDamageOptions,
): { participant: CombatParticipant; result: DamageCalculationResult } {
  const result = calculateDamageWithResistances(participant, options);

  const updated: CombatParticipant = {
    ...participant,
    currentHitPoints: result.newCurrentHP,
    temporaryHitPoints: result.newTempHP,
  };

  return { participant: updated, result };
}

/**
 * Apply healing to a participant
 */
export function applyHealing(
  participant: CombatParticipant,
  options: HealingOptions,
): { participant: CombatParticipant; result: HealingResult } {
  const maxHP = options.maxHPOverride ?? participant.maxHitPoints;
  const wasAtMaxHP = participant.currentHitPoints >= maxHP;

  let newCurrentHP = participant.currentHitPoints + options.healing;

  if (!options.canOverheal) {
    newCurrentHP = Math.min(maxHP, newCurrentHP);
  }

  const healingApplied = newCurrentHP - participant.currentHitPoints;

  const updated: CombatParticipant = {
    ...participant,
    currentHitPoints: newCurrentHP,
  };

  return {
    participant: updated,
    result: {
      healingApplied,
      newCurrentHP,
      wasAtMaxHP,
    },
  };
}

/**
 * Apply temporary hit points to a participant
 * Temporary HP don't stack - take the higher value
 */
export function applyTemporaryHP(
  participant: CombatParticipant,
  tempHP: number,
): CombatParticipant {
  return {
    ...participant,
    temporaryHitPoints: Math.max(participant.temporaryHitPoints, tempHP),
  };
}
