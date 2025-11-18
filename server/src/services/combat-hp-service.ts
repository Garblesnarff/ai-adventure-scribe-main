/**
 * Combat HP Service
 *
 * Handles HP tracking, damage application, healing, temp HP, and death saves
 * for D&D 5E combat encounters. Implements all D&D 5E rules for damage resistance,
 * vulnerability, temporary hit points, and death saving throws.
 *
 * @module server/services/combat-hp-service
 */

import { db } from '../../../db/client.js';
import {
  combatParticipants,
  combatParticipantStatus,
  combatDamageLog,
  combatEncounters,
  type CombatParticipantStatus,
  type CombatDamageLog,
} from '../../../db/schema/index.js';
import { eq, and, desc } from 'drizzle-orm';
import { NotFoundError, ValidationError, BusinessLogicError } from '../lib/errors.js';

/**
 * Damage types in D&D 5E
 */
export type DamageType =
  | 'acid' | 'bludgeoning' | 'cold' | 'fire' | 'force'
  | 'lightning' | 'necrotic' | 'piercing' | 'poison'
  | 'psychic' | 'radiant' | 'slashing' | 'thunder';

/**
 * Result of applying damage to a participant
 */
export interface DamageResult {
  participantId: string;
  originalDamage: number;
  modifiedDamage: number; // After resistance/vulnerability
  tempHpLost: number;
  hpLost: number;
  newCurrentHp: number;
  newTempHp: number;
  isConscious: boolean;
  isDead: boolean;
  wasResisted: boolean;
  wasVulnerable: boolean;
  wasImmune: boolean;
  massiveDamage: boolean; // Instant death from massive damage
}

/**
 * Result of healing a participant
 */
export interface HealingResult {
  participantId: string;
  healingAmount: number;
  healingApplied: number;
  overheal: number;
  newCurrentHp: number;
  wasRevived: boolean;
  isConscious: boolean;
}

/**
 * Result of a death save roll
 */
export interface DeathSaveResult {
  participantId: string;
  roll: number;
  isSuccess: boolean;
  isCritical: boolean; // Natural 1 or 20
  successes: number;
  failures: number;
  isStabilized: boolean;
  isDead: boolean;
  wasRevived: boolean; // Natural 20 revives with 1 HP
  newCurrentHp: number;
}

/**
 * Options for applying damage
 */
export interface ApplyDamageOptions {
  damageAmount: number;
  damageType?: DamageType;
  sourceParticipantId?: string;
  sourceDescription?: string;
  ignoreResistances?: boolean;
  ignoreImmunities?: boolean;
}

/**
 * Combat HP Service
 */
export class CombatHPService {
  /**
   * Apply damage to a participant with D&D 5E rules
   * - Temp HP shields damage before real HP
   * - Resistance = half damage (round down)
   * - Vulnerability = double damage
   * - Immunity = 0 damage
   * - Massive damage (damage >= max HP while at 0 HP) = instant death
   */
  static async applyDamage(
    participantId: string,
    options: ApplyDamageOptions
  ): Promise<DamageResult> {
    const {
      damageAmount,
      damageType,
      sourceParticipantId,
      sourceDescription,
      ignoreResistances = false,
      ignoreImmunities = false,
    } = options;

    // Get participant and status
    const participant = await db.query.combatParticipants.findFirst({
      where: eq(combatParticipants.id, participantId),
      with: {
        status: true,
      },
    });

    if (!participant) {
      throw new NotFoundError('Participant', participantId);
    }

    if (!participant.status) {
      throw new BusinessLogicError('Participant has no status record', { participantId });
    }

    const status = participant.status;
    let modifiedDamage = Math.max(0, damageAmount);
    let wasResisted = false;
    let wasVulnerable = false;
    let wasImmune = false;

    // Apply resistance/vulnerability/immunity
    if (damageType && !ignoreImmunities) {
      const immunities = participant.damageImmunities || [];
      if (immunities.includes(damageType)) {
        modifiedDamage = 0;
        wasImmune = true;
      }
    }

    if (damageType && !wasImmune && !ignoreResistances) {
      const resistances = participant.damageResistances || [];
      const vulnerabilities = participant.damageVulnerabilities || [];

      if (resistances.includes(damageType)) {
        modifiedDamage = Math.floor(modifiedDamage / 2);
        wasResisted = true;
      } else if (vulnerabilities.includes(damageType)) {
        modifiedDamage = modifiedDamage * 2;
        wasVulnerable = true;
      }
    }

    // Apply damage to temp HP first, then real HP
    let tempHpLost = 0;
    let hpLost = 0;
    let newTempHp = status.tempHp;
    let newCurrentHp = status.currentHp;

    if (modifiedDamage > 0) {
      if (newTempHp > 0) {
        tempHpLost = Math.min(newTempHp, modifiedDamage);
        newTempHp -= tempHpLost;
        modifiedDamage -= tempHpLost;
      }

      if (modifiedDamage > 0) {
        hpLost = modifiedDamage;
        newCurrentHp = Math.max(0, newCurrentHp - hpLost);
      }
    }

    // Check for consciousness
    const isConscious = newCurrentHp > 0;

    // Check for massive damage (instant death)
    // Massive damage = taking damage >= max HP while at 0 HP
    const massiveDamage = status.currentHp === 0 && hpLost >= status.maxHp;
    const isDead = massiveDamage || status.deathSavesFailures >= 3;

    // Update status
    const [updatedStatus] = await db
      .update(combatParticipantStatus)
      .set({
        currentHp: newCurrentHp,
        tempHp: newTempHp,
        isConscious,
        deathSavesFailures: massiveDamage ? 3 : status.deathSavesFailures,
        updatedAt: new Date(),
      })
      .where(eq(combatParticipantStatus.participantId, participantId))
      .returning();

    // Log damage
    if (damageAmount > 0) {
      const encounter = await db.query.combatEncounters.findFirst({
        where: eq(combatEncounters.id, participant.encounterId),
      });

      await db.insert(combatDamageLog).values({
        encounterId: participant.encounterId,
        participantId,
        damageAmount: modifiedDamage,
        damageType: damageType || 'untyped',
        sourceParticipantId: sourceParticipantId || null,
        sourceDescription: sourceDescription || null,
        roundNumber: encounter?.currentRound || 1,
      });
    }

    return {
      participantId,
      originalDamage: damageAmount,
      modifiedDamage,
      tempHpLost,
      hpLost,
      newCurrentHp,
      newTempHp,
      isConscious,
      isDead,
      wasResisted,
      wasVulnerable,
      wasImmune,
      massiveDamage,
    };
  }

  /**
   * Heal damage on a participant
   * - Healing cannot exceed max HP
   * - Healing can revive unconscious characters (if they have 0 death save failures)
   */
  static async healDamage(
    participantId: string,
    healingAmount: number,
    sourceDescription?: string
  ): Promise<HealingResult> {
    if (healingAmount < 0) {
      throw new ValidationError('Healing amount must be non-negative', { healingAmount });
    }

    const participant = await db.query.combatParticipants.findFirst({
      where: eq(combatParticipants.id, participantId),
      with: {
        status: true,
      },
    });

    if (!participant || !participant.status) {
      throw new NotFoundError('Participant', participantId);
    }

    const status = participant.status;
    const wasUnconscious = !status.isConscious;

    // Calculate new HP (capped at max HP)
    const newCurrentHp = Math.min(status.maxHp, status.currentHp + healingAmount);
    const healingApplied = newCurrentHp - status.currentHp;
    const overheal = healingAmount - healingApplied;

    // Revive if healing brings HP above 0
    const isConscious = newCurrentHp > 0;
    const wasRevived = wasUnconscious && isConscious;

    // Clear death saves if revived
    const deathSavesSuccesses = wasRevived ? 0 : status.deathSavesSuccesses;
    const deathSavesFailures = wasRevived ? 0 : status.deathSavesFailures;

    // Update status
    await db
      .update(combatParticipantStatus)
      .set({
        currentHp: newCurrentHp,
        isConscious,
        deathSavesSuccesses,
        deathSavesFailures,
        updatedAt: new Date(),
      })
      .where(eq(combatParticipantStatus.participantId, participantId));

    return {
      participantId,
      healingAmount,
      healingApplied,
      overheal,
      newCurrentHp,
      wasRevived,
      isConscious,
    };
  }

  /**
   * Set temporary HP for a participant
   * - Temp HP doesn't stack (always use higher value)
   * - Temp HP doesn't add to current HP
   */
  static async setTempHP(
    participantId: string,
    tempHpAmount: number
  ): Promise<{ participantId: string; oldTempHp: number; newTempHp: number }> {
    if (tempHpAmount < 0) {
      throw new ValidationError('Temporary HP amount must be non-negative', { tempHpAmount });
    }

    const participant = await db.query.combatParticipants.findFirst({
      where: eq(combatParticipants.id, participantId),
      with: {
        status: true,
      },
    });

    if (!participant || !participant.status) {
      throw new NotFoundError('Participant', participantId);
    }

    const status = participant.status;
    const oldTempHp = status.tempHp;

    // Temp HP doesn't stack - use higher value
    const newTempHp = Math.max(oldTempHp, tempHpAmount);

    // Update status
    await db
      .update(combatParticipantStatus)
      .set({
        tempHp: newTempHp,
        updatedAt: new Date(),
      })
      .where(eq(combatParticipantStatus.participantId, participantId));

    return {
      participantId,
      oldTempHp,
      newTempHp,
    };
  }

  /**
   * Roll a death save for an unconscious participant
   * - Natural 1 = 2 failures
   * - 2-9 = 1 failure
   * - 10-19 = 1 success
   * - Natural 20 = revive with 1 HP
   * - 3 successes = stabilized (unconscious but not dying)
   * - 3 failures = dead
   */
  static async rollDeathSave(
    participantId: string,
    roll: number
  ): Promise<DeathSaveResult> {
    if (roll < 1 || roll > 20) {
      throw new ValidationError('Death save roll must be between 1 and 20', { roll });
    }

    const participant = await db.query.combatParticipants.findFirst({
      where: eq(combatParticipants.id, participantId),
      with: {
        status: true,
      },
    });

    if (!participant || !participant.status) {
      throw new NotFoundError('Participant', participantId);
    }

    const status = participant.status;

    if (status.isConscious) {
      throw new BusinessLogicError('Cannot roll death save for conscious participant', { participantId });
    }

    let successes = status.deathSavesSuccesses;
    let failures = status.deathSavesFailures;
    let isStabilized = false;
    let isDead = false;
    let wasRevived = false;
    let newCurrentHp = status.currentHp;
    let isConscious = false;
    let isCritical = false;
    let isSuccess = false;

    // Natural 20 = revive with 1 HP
    if (roll === 20) {
      isCritical = true;
      isSuccess = true;
      wasRevived = true;
      isConscious = true;
      newCurrentHp = 1;
      successes = 0;
      failures = 0;
    }
    // Natural 1 = 2 failures
    else if (roll === 1) {
      isCritical = true;
      isSuccess = false;
      failures = Math.min(3, failures + 2);
      if (failures >= 3) {
        isDead = true;
      }
    }
    // 2-9 = failure
    else if (roll < 10) {
      isSuccess = false;
      failures = Math.min(3, failures + 1);
      if (failures >= 3) {
        isDead = true;
      }
    }
    // 10-19 = success
    else {
      isSuccess = true;
      successes = Math.min(3, successes + 1);
      if (successes >= 3) {
        isStabilized = true;
      }
    }

    // Update status
    await db
      .update(combatParticipantStatus)
      .set({
        currentHp: newCurrentHp,
        deathSavesSuccesses: successes,
        deathSavesFailures: failures,
        isConscious,
        updatedAt: new Date(),
      })
      .where(eq(combatParticipantStatus.participantId, participantId));

    return {
      participantId,
      roll,
      isSuccess,
      isCritical,
      successes,
      failures,
      isStabilized,
      isDead,
      wasRevived,
      newCurrentHp,
    };
  }

  /**
   * Check if a participant is conscious
   */
  static async checkConscious(participantId: string): Promise<boolean> {
    const participant = await db.query.combatParticipants.findFirst({
      where: eq(combatParticipants.id, participantId),
      with: {
        status: true,
      },
    });

    if (!participant || !participant.status) {
      throw new NotFoundError('Participant', participantId);
    }

    return participant.status.isConscious;
  }

  /**
   * Get damage log for an encounter or specific participant
   */
  static async getDamageLog(
    encounterId: string,
    participantId?: string,
    round?: number
  ): Promise<CombatDamageLog[]> {
    const conditions = [eq(combatDamageLog.encounterId, encounterId)];

    if (participantId) {
      conditions.push(eq(combatDamageLog.participantId, participantId));
    }

    if (round !== undefined) {
      conditions.push(eq(combatDamageLog.roundNumber, round));
    }

    const logs = await db.query.combatDamageLog.findMany({
      where: conditions.length > 1 ? and(...conditions) : conditions[0],
      orderBy: [desc(combatDamageLog.createdAt)],
    });

    return logs;
  }

  /**
   * Get participant status
   */
  static async getParticipantStatus(
    participantId: string
  ): Promise<CombatParticipantStatus | null> {
    const participant = await db.query.combatParticipants.findFirst({
      where: eq(combatParticipants.id, participantId),
      with: {
        status: true,
      },
    });

    return participant?.status || null;
  }

  /**
   * Initialize status for a new participant
   */
  static async initializeParticipantStatus(
    participantId: string,
    maxHp: number,
    currentHp?: number
  ): Promise<CombatParticipantStatus> {
    const [status] = await db
      .insert(combatParticipantStatus)
      .values({
        participantId,
        maxHp,
        currentHp: currentHp !== undefined ? currentHp : maxHp,
        tempHp: 0,
        isConscious: true,
        deathSavesSuccesses: 0,
        deathSavesFailures: 0,
      })
      .returning();

    if (!status) {
      throw new NotFoundError('Failed to initialize participant status', participantId);
    }

    return status;
  }
}
