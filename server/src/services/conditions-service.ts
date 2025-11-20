/**
 * Conditions Service
 *
 * Handles D&D 5E condition management for combat participants.
 * Implements all 13 core conditions with mechanical effects tracking,
 * duration management, and saving throw logic.
 *
 * @module server/services/conditions-service
 */

import { db } from '../../../db/client.js';
import { sql } from 'drizzle-orm';
import type {
  Condition,
  ConditionLibraryEntry,
  ParticipantCondition,
  ParticipantConditionWithDetails,
  NewParticipantCondition,
  MechanicalEffects,
  AggregatedMechanicalEffects,
  ConditionConflict,
  ConditionDurationType,
  SaveAbility,
} from '../types/combat.js';
import { NotFoundError, ValidationError, BusinessLogicError } from '../lib/errors.js';

/**
 * Conditions that include or supersede other conditions
 */
const CONDITION_HIERARCHY: Record<string, string[]> = {
  'Paralyzed': ['Incapacitated'],
  'Petrified': ['Incapacitated'],
  'Stunned': ['Incapacitated'],
  'Unconscious': ['Incapacitated', 'Prone'],
};

/**
 * Mutually incompatible conditions
 */
const INCOMPATIBLE_CONDITIONS: Record<string, string[]> = {
  'Invisible': ['Blinded'], // Being invisible doesn't help if you're blind
  'Prone': ['Flying'], // Can't be prone while flying (if we add flying status)
};

export class ConditionsService {
  /**
   * Apply a condition to a combat participant
   */
  static async applyCondition(
    participantId: string,
    conditionName: string,
    durationType: ConditionDurationType,
    durationValue?: number,
    saveDC?: number,
    saveAbility?: SaveAbility,
    source?: string,
    currentRound?: number
  ): Promise<{ condition: ParticipantConditionWithDetails; warnings: string[] }> {
    const warnings: string[] = [];

    // Get condition from library
    const conditionLibrary = await db.execute<Record<string, unknown>>(
      sql`SELECT * FROM conditions_library WHERE name = ${conditionName} LIMIT 1`
    );

    if (!conditionLibrary || conditionLibrary.length === 0) {
      throw new NotFoundError('Condition', conditionName);
    }

    const conditionEntry = conditionLibrary[0] as unknown as ConditionLibraryEntry;

    // Get participant to get current round
    const participantResult = await db.execute<Record<string, unknown>>(
      sql`SELECT encounter_id FROM combat_participants WHERE id = ${participantId} LIMIT 1`
    );

    if (!participantResult || participantResult.length === 0) {
      throw new NotFoundError('Participant', participantId);
    }

    // Get current round from encounter if not provided
    let appliedAtRound = currentRound || 1;
    if (!currentRound) {
      const encounterResult = await db.execute<Record<string, unknown>>(
        sql`SELECT current_round FROM combat_encounters WHERE id = ${participantResult[0]!.encounter_id} LIMIT 1`
      );
      if (encounterResult && encounterResult.length > 0) {
        appliedAtRound = encounterResult[0]!.current_round as number;
      }
    }

    // Calculate expiry round
    let expiresAtRound: number | null = null;
    if (durationType === 'rounds' && durationValue) {
      expiresAtRound = appliedAtRound + durationValue;
    } else if (durationType === 'minutes' && durationValue) {
      // 1 minute = 10 rounds (60 seconds / 6 seconds per round)
      expiresAtRound = appliedAtRound + (durationValue * 10);
    } else if (durationType === 'hours' && durationValue) {
      // 1 hour = 600 rounds
      expiresAtRound = appliedAtRound + (durationValue * 600);
    }

    // Check for conflicts
    const conflicts = await this.checkConditionConflicts(participantId, conditionName);
    conflicts.forEach(conflict => {
      warnings.push(conflict.message);
      // Auto-remove superseded conditions
      if (conflict.conflictType === 'superseded') {
        this.removeCondition(conflict.existingCondition.id).catch(err => {
          console.error('Failed to remove superseded condition:', err);
        });
      }
    });

    // Insert the condition
    const result = await db.execute<Record<string, unknown>>(
      sql`
        INSERT INTO combat_participant_conditions (
          participant_id,
          condition_id,
          duration_type,
          duration_value,
          save_dc,
          save_ability,
          applied_at_round,
          expires_at_round,
          source_description,
          is_active
        ) VALUES (
          ${participantId},
          ${conditionEntry.id},
          ${durationType},
          ${durationValue || null},
          ${saveDC || null},
          ${saveAbility || null},
          ${appliedAtRound},
          ${expiresAtRound},
          ${source || null},
          true
        )
        RETURNING *
      `
    );

    const participantCondition = result[0] as unknown as ParticipantCondition;

    // Parse mechanical effects
    const condition = this.parseCondition(conditionEntry);

    return {
      condition: {
        ...participantCondition,
        condition,
      },
      warnings,
    };
  }

  /**
   * Remove a condition from a participant
   */
  static async removeCondition(conditionId: string): Promise<boolean> {
    const result = await db.execute<Record<string, unknown>>(
      sql`
        UPDATE combat_participant_conditions
        SET is_active = false
        WHERE id = ${conditionId}
        RETURNING id
      `
    );

    return result ? result.length > 0 : false;
  }

  /**
   * Attempt a saving throw against a condition
   */
  static async attemptSave(
    conditionId: string,
    saveRoll: number
  ): Promise<{ saved: boolean; conditionRemoved: boolean; message: string }> {
    // Get the condition
    const result = await db.execute<Record<string, unknown>>(
      sql`
        SELECT * FROM combat_participant_conditions
        WHERE id = ${conditionId} AND is_active = true
        LIMIT 1
      `
    );

    if (!result || result.length === 0) {
      throw new NotFoundError('Active condition', conditionId);
    }

    const condition = result[0] as unknown as ParticipantCondition;

    if (!condition.saveDc || !condition.saveAbility) {
      throw new BusinessLogicError('This condition does not require a saving throw', { conditionId });
    }

    const saved = saveRoll >= condition.saveDc;
    let conditionRemoved = false;
    let message = '';

    if (saved) {
      // Remove the condition
      await this.removeCondition(conditionId);
      conditionRemoved = true;
      message = `Saving throw successful (${saveRoll})! Condition removed.`;
    } else {
      message = `Saving throw failed (${saveRoll}). Condition persists.`;
    }

    return { saved, conditionRemoved, message };
  }

  /**
   * Get all active conditions for a participant
   */
  static async getActiveConditions(participantId: string): Promise<ParticipantConditionWithDetails[]> {
    const result = await db.execute<Record<string, unknown>>(
      sql`
        SELECT
          cpc.*,
          cl.name as condition_name,
          cl.description as condition_description,
          cl.mechanical_effects,
          cl.icon_name
        FROM combat_participant_conditions cpc
        JOIN conditions_library cl ON cl.id = cpc.condition_id
        WHERE cpc.participant_id = ${participantId}
          AND cpc.is_active = true
        ORDER BY cpc.applied_at_round DESC
      `
    );

    return (result || []).map((row: any) => {
      const mechanicalEffects = this.parseMechanicalEffects(row.mechanical_effects);

      return {
        id: row.id,
        participantId: row.participant_id,
        conditionId: row.condition_id,
        durationType: row.duration_type as ConditionDurationType,
        durationValue: row.duration_value,
        saveDc: row.save_dc,
        saveAbility: row.save_ability as SaveAbility | null,
        appliedAtRound: row.applied_at_round,
        expiresAtRound: row.expires_at_round,
        sourceDescription: row.source_description,
        isActive: row.is_active,
        createdAt: new Date(row.created_at),
        condition: {
          id: row.condition_id,
          name: row.condition_name,
          description: row.condition_description,
          mechanicalEffects,
          iconName: row.icon_name,
          createdAt: new Date(row.created_at),
        },
      };
    });
  }

  /**
   * Get aggregated mechanical effects for a participant from all active conditions
   */
  static async getMechanicalEffects(participantId: string): Promise<AggregatedMechanicalEffects> {
    const conditions = await this.getActiveConditions(participantId);

    const aggregated = {
      appliedConditions: [] as string[],
    } as AggregatedMechanicalEffects;

    // Merge all mechanical effects
    for (const condition of conditions) {
      aggregated.appliedConditions.push(condition.condition.name);
      const effects = condition.condition.mechanicalEffects;

      // Merge effects - most restrictive wins
      for (const [key, value] of Object.entries(effects)) {
        if (key === 'appliedConditions') continue;

        if (!aggregated[key]) {
          aggregated[key] = value;
        } else {
          // Apply precedence rules
          aggregated[key] = this.mergeEffectValues(aggregated[key], value, key);
        }
      }
    }

    return aggregated;
  }

  /**
   * Advance condition durations at the end of a round
   */
  static async advanceConditionDurations(
    encounterId: string,
    currentRound: number
  ): Promise<{
    expiredConditions: ParticipantConditionWithDetails[];
    savingThrowsNeeded: Array<{ participantId: string; conditionId: string; saveAbility: SaveAbility; saveDc: number }>;
  }> {
    // Get all active conditions for this encounter's participants
    const result = await db.execute<Record<string, unknown>>(
      sql`
        SELECT
          cpc.*,
          cl.name as condition_name,
          cl.description as condition_description,
          cl.mechanical_effects,
          cl.icon_name,
          cp.id as participant_id
        FROM combat_participant_conditions cpc
        JOIN conditions_library cl ON cl.id = cpc.condition_id
        JOIN combat_participants cp ON cp.id = cpc.participant_id
        WHERE cp.encounter_id = ${encounterId}
          AND cpc.is_active = true
      `
    );

    const expiredConditions: ParticipantConditionWithDetails[] = [];
    const savingThrowsNeeded: Array<{ participantId: string; conditionId: string; saveAbility: SaveAbility; saveDc: number }> = [];

    for (const rowData of (result || [])) {
      const row = rowData as any;
      // Check if condition has expired
      if (row.expires_at_round && row.expires_at_round <= currentRound) {
        await this.removeCondition(row.id);

        const mechanicalEffects = this.parseMechanicalEffects(row.mechanical_effects);
        expiredConditions.push({
          id: row.id,
          participantId: row.participant_id,
          conditionId: row.condition_id,
          durationType: row.duration_type as ConditionDurationType,
          durationValue: row.duration_value,
          saveDc: row.save_dc,
          saveAbility: row.save_ability as SaveAbility | null,
          appliedAtRound: row.applied_at_round,
          expiresAtRound: row.expires_at_round,
          sourceDescription: row.source_description,
          isActive: false,
          createdAt: new Date(row.created_at),
          condition: {
            id: row.condition_id,
            name: row.condition_name,
            description: row.condition_description,
            mechanicalEffects,
            iconName: row.icon_name,
            createdAt: new Date(row.created_at),
          },
        });
      }
      // Check if condition requires a saving throw
      else if (row.duration_type === 'until_save' && row.save_dc && row.save_ability) {
        savingThrowsNeeded.push({
          participantId: row.participant_id,
          conditionId: row.id,
          saveAbility: row.save_ability as SaveAbility,
          saveDc: row.save_dc,
        });
      }
    }

    return { expiredConditions, savingThrowsNeeded };
  }

  /**
   * Check for condition conflicts before applying
   */
  static async checkConditionConflicts(
    participantId: string,
    newConditionName: string
  ): Promise<ConditionConflict[]> {
    const activeConditions = await this.getActiveConditions(participantId);
    const conflicts: ConditionConflict[] = [];

    for (const existingCondition of activeConditions) {
      const existingName = existingCondition.condition.name;

      // Check for duplicate
      if (existingName === newConditionName) {
        conflicts.push({
          existingCondition,
          newConditionName,
          conflictType: 'duplicate',
          message: `${newConditionName} is already applied to this participant`,
        });
      }

      // Check if new condition supersedes existing
      if (CONDITION_HIERARCHY[newConditionName]?.includes(existingName)) {
        conflicts.push({
          existingCondition,
          newConditionName,
          conflictType: 'superseded',
          message: `${newConditionName} includes ${existingName}, which will be removed`,
        });
      }

      // Check if existing condition supersedes new
      if (CONDITION_HIERARCHY[existingName]?.includes(newConditionName)) {
        conflicts.push({
          existingCondition,
          newConditionName,
          conflictType: 'superseded',
          message: `${existingName} already includes the effects of ${newConditionName}`,
        });
      }

      // Check for incompatibilities
      if (INCOMPATIBLE_CONDITIONS[newConditionName]?.includes(existingName)) {
        conflicts.push({
          existingCondition,
          newConditionName,
          conflictType: 'incompatible',
          message: `${newConditionName} is incompatible with ${existingName}`,
        });
      }
    }

    return conflicts;
  }

  /**
   * Get all available conditions from the library
   */
  static async getConditionsLibrary(): Promise<Condition[]> {
    const result = await db.execute<Record<string, unknown>>(
      sql`SELECT * FROM conditions_library ORDER BY name ASC`
    );

    return (result || []).map((row: any) => this.parseCondition(row as ConditionLibraryEntry));
  }

  /**
   * Parse a condition from the library
   */
  private static parseCondition(entry: ConditionLibraryEntry | any): Condition {
    return {
      id: entry.id,
      name: entry.name,
      description: entry.description,
      mechanicalEffects: this.parseMechanicalEffects(entry.mechanicalEffects || entry.mechanical_effects),
      iconName: entry.iconName || entry.icon_name || null,
      createdAt: new Date(entry.createdAt || entry.created_at),
    };
  }

  /**
   * Parse mechanical effects JSON string
   */
  private static parseMechanicalEffects(effectsJson: string): MechanicalEffects {
    try {
      return JSON.parse(effectsJson);
    } catch (error) {
      console.error('Failed to parse mechanical effects:', error);
      return {};
    }
  }

  /**
   * Merge two effect values, choosing the most restrictive
   */
  private static mergeEffectValues(
    current: string | number | boolean | undefined,
    incoming: string | number | boolean | undefined,
    key: string
  ): string | number | boolean | undefined {
    // For auto_fail, that always takes precedence
    if (current === 'auto_fail' || incoming === 'auto_fail') {
      return 'auto_fail';
    }

    // For advantage/disadvantage, disadvantage takes precedence
    if (
      (current === 'disadvantage' || incoming === 'disadvantage') &&
      (key.includes('attack') || key.includes('check') || key.includes('save'))
    ) {
      return 'disadvantage';
    }

    // For speed, the lowest (most restrictive) wins
    if (key === 'speed' && typeof current === 'number' && typeof incoming === 'number') {
      return Math.min(current, incoming);
    }

    // For actions/reactions 'none', that takes precedence
    if (current === 'none' || incoming === 'none') {
      return 'none';
    }

    // For boolean flags, true (more restrictive) takes precedence
    if (typeof current === 'boolean' && typeof incoming === 'boolean') {
      if (key.includes('cannot') || key.includes('negated')) {
        return current || incoming; // Either restriction applies
      }
    }

    // Default: incoming overrides
    return incoming;
  }
}
