/**
 * Conditions Service Tests
 *
 * Comprehensive test suite for D&D 5E conditions system
 * Tests all 13 core conditions, duration tracking, saving throws, and mechanical effects
 *
 * Work Unit 1.3a
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { ConditionsService } from '../conditions-service.js';
import { db } from '../../../../db/client.js';
import { sql } from 'drizzle-orm';

// Test data
let testEncounterId: string;
let testParticipantId: string;
let testConditionId: string;

/**
 * Setup test encounter and participant
 */
async function createTestData(): Promise<{ encounterId: string; participantId: string }> {
  // Create a test session
  const sessionResult = await db.execute(
    sql`
      INSERT INTO game_sessions (campaign_id, character_id, session_number, status, start_time)
      VALUES (NULL, NULL, 1, 'active', NOW())
      RETURNING id
    `
  );
  const sessionId = (sessionResult as any)[0].id;

  // Create a test encounter
  const encounterResult = await db.execute(
    sql`
      INSERT INTO combat_encounters (session_id, current_round, status)
      VALUES (${sessionId}, 1, 'active')
      RETURNING id
    `
  );
  const encounterId = (encounterResult as any)[0].id;

  // Create a test participant
  const participantResult = await db.execute(
    sql`
      INSERT INTO combat_participants (encounter_id, name, initiative, initiative_modifier, turn_order, max_hp, current_hp)
      VALUES (${encounterId}, 'Test Fighter', 15, 2, 0, 50, 50)
      RETURNING id
    `
  );
  const participantId = (participantResult as any)[0].id;

  return { encounterId, participantId };
}

/**
 * Cleanup test data
 */
async function cleanupTestData() {
  // Delete all test sessions (cascades to encounters and participants)
  await db.execute(sql`DELETE FROM game_sessions WHERE session_number = 1`);
}

describe('ConditionsService', () => {
  beforeAll(async () => {
    // Skip tests if no database
    if (!process.env.DATABASE_URL) {
      console.log('Skipping conditions tests - no database configured');
      return;
    }
  });

  beforeEach(async () => {
    if (!process.env.DATABASE_URL) return;

    // Clean up any existing test data
    await cleanupTestData();

    // Create fresh test data for each test
    const data = await createTestData();
    testEncounterId = data.encounterId;
    testParticipantId = data.participantId;
  });

  afterAll(async () => {
    if (!process.env.DATABASE_URL) return;
    await cleanupTestData();
  });

  describe('applyCondition', () => {
    it('should apply a condition to a participant', async () => {
      if (!process.env.DATABASE_URL) return;

      const result = await ConditionsService.applyCondition(
        testParticipantId,
        'Blinded',
        'rounds',
        3,
        undefined,
        undefined,
        'Dark spell',
        1
      );

      expect(result.condition).toBeDefined();
      expect(result.condition.condition.name).toBe('Blinded');
      expect(result.condition.durationType).toBe('rounds');
      expect(result.condition.durationValue).toBe(3);
      expect(result.condition.expiresAtRound).toBe(4); // Applied at round 1, lasts 3 rounds
      expect(result.condition.isActive).toBe(true);
    });

    it('should apply condition with saving throw requirements', async () => {
      if (!process.env.DATABASE_URL) return;

      const result = await ConditionsService.applyCondition(
        testParticipantId,
        'Paralyzed',
        'until_save',
        undefined,
        15,
        'constitution',
        'Hold Person spell',
        1
      );

      expect(result.condition.saveDc).toBe(15);
      expect(result.condition.saveAbility).toBe('constitution');
      expect(result.condition.durationType).toBe('until_save');
      expect(result.condition.expiresAtRound).toBeNull();
    });

    it('should handle permanent conditions', async () => {
      if (!process.env.DATABASE_URL) return;

      const result = await ConditionsService.applyCondition(
        testParticipantId,
        'Petrified',
        'permanent',
        undefined,
        undefined,
        undefined,
        'Basilisk gaze',
        1
      );

      expect(result.condition.durationType).toBe('permanent');
      expect(result.condition.expiresAtRound).toBeNull();
    });

    it('should calculate duration in minutes correctly', async () => {
      if (!process.env.DATABASE_URL) return;

      const result = await ConditionsService.applyCondition(
        testParticipantId,
        'Invisible',
        'minutes',
        1,
        undefined,
        undefined,
        'Invisibility spell',
        1
      );

      // 1 minute = 10 rounds (60 seconds / 6 seconds per round)
      expect(result.condition.expiresAtRound).toBe(11);
    });

    it('should calculate duration in hours correctly', async () => {
      if (!process.env.DATABASE_URL) return;

      const result = await ConditionsService.applyCondition(
        testParticipantId,
        'Frightened',
        'hours',
        1,
        undefined,
        undefined,
        'Curse',
        1
      );

      // 1 hour = 600 rounds
      expect(result.condition.expiresAtRound).toBe(601);
    });

    it('should warn about duplicate conditions', async () => {
      if (!process.env.DATABASE_URL) return;

      // Apply first condition
      await ConditionsService.applyCondition(
        testParticipantId,
        'Poisoned',
        'rounds',
        5,
        undefined,
        undefined,
        'Poison dart',
        1
      );

      // Apply same condition again
      const result = await ConditionsService.applyCondition(
        testParticipantId,
        'Poisoned',
        'rounds',
        3,
        undefined,
        undefined,
        'Another poison',
        1
      );

      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0]).toContain('already applied');
    });

    it('should handle superseded conditions', async () => {
      if (!process.env.DATABASE_URL) return;

      // Apply Incapacitated first
      await ConditionsService.applyCondition(
        testParticipantId,
        'Incapacitated',
        'rounds',
        3,
        undefined,
        undefined,
        'Test',
        1
      );

      // Apply Paralyzed (which includes Incapacitated)
      const result = await ConditionsService.applyCondition(
        testParticipantId,
        'Paralyzed',
        'rounds',
        2,
        undefined,
        undefined,
        'Test',
        1
      );

      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0]).toContain('includes');
    });

    it('should throw error for non-existent condition', async () => {
      if (!process.env.DATABASE_URL) return;

      await expect(
        ConditionsService.applyCondition(
          testParticipantId,
          'FakeCondition',
          'rounds',
          3,
          undefined,
          undefined,
          'Test',
          1
        )
      ).rejects.toThrow('not found in library');
    });
  });

  describe('removeCondition', () => {
    it('should remove an active condition', async () => {
      if (!process.env.DATABASE_URL) return;

      // Apply a condition
      const applied = await ConditionsService.applyCondition(
        testParticipantId,
        'Stunned',
        'rounds',
        2,
        undefined,
        undefined,
        'Test',
        1
      );

      // Remove it
      const removed = await ConditionsService.removeCondition(applied.condition.id);

      expect(removed).toBe(true);

      // Verify it's no longer active
      const activeConditions = await ConditionsService.getActiveConditions(testParticipantId);
      expect(activeConditions).toHaveLength(0);
    });

    it('should return false for non-existent condition', async () => {
      if (!process.env.DATABASE_URL) return;

      const removed = await ConditionsService.removeCondition('00000000-0000-0000-0000-000000000000');
      expect(removed).toBe(false);
    });
  });

  describe('attemptSave', () => {
    it('should succeed on a successful saving throw', async () => {
      if (!process.env.DATABASE_URL) return;

      // Apply condition requiring save
      const applied = await ConditionsService.applyCondition(
        testParticipantId,
        'Frightened',
        'until_save',
        undefined,
        13,
        'wisdom',
        'Fear spell',
        1
      );

      // Attempt save with roll of 15 (should succeed against DC 13)
      const saveResult = await ConditionsService.attemptSave(applied.condition.id, 15);

      expect(saveResult.saved).toBe(true);
      expect(saveResult.conditionRemoved).toBe(true);
      expect(saveResult.message).toContain('successful');
    });

    it('should fail on an unsuccessful saving throw', async () => {
      if (!process.env.DATABASE_URL) return;

      // Apply condition requiring save
      const applied = await ConditionsService.applyCondition(
        testParticipantId,
        'Frightened',
        'until_save',
        undefined,
        15,
        'wisdom',
        'Fear spell',
        1
      );

      // Attempt save with roll of 10 (should fail against DC 15)
      const saveResult = await ConditionsService.attemptSave(applied.condition.id, 10);

      expect(saveResult.saved).toBe(false);
      expect(saveResult.conditionRemoved).toBe(false);
      expect(saveResult.message).toContain('failed');
    });

    it('should throw error for condition without save requirement', async () => {
      if (!process.env.DATABASE_URL) return;

      // Apply condition without save requirement
      const applied = await ConditionsService.applyCondition(
        testParticipantId,
        'Prone',
        'permanent',
        undefined,
        undefined,
        undefined,
        'Knocked down',
        1
      );

      // Try to attempt save
      await expect(
        ConditionsService.attemptSave(applied.condition.id, 15)
      ).rejects.toThrow('does not require a saving throw');
    });
  });

  describe('getActiveConditions', () => {
    it('should return all active conditions for a participant', async () => {
      if (!process.env.DATABASE_URL) return;

      // Apply multiple conditions
      await ConditionsService.applyCondition(testParticipantId, 'Blinded', 'rounds', 3);
      await ConditionsService.applyCondition(testParticipantId, 'Deafened', 'rounds', 2);

      const conditions = await ConditionsService.getActiveConditions(testParticipantId);

      expect(conditions).toHaveLength(2);
      expect(conditions.map(c => c.condition.name).sort()).toEqual(['Blinded', 'Deafened'].sort());
    });

    it('should return empty array for participant with no conditions', async () => {
      if (!process.env.DATABASE_URL) return;

      const conditions = await ConditionsService.getActiveConditions(testParticipantId);

      expect(conditions).toHaveLength(0);
    });

    it('should not include removed conditions', async () => {
      if (!process.env.DATABASE_URL) return;

      // Apply and remove a condition
      const applied = await ConditionsService.applyCondition(
        testParticipantId,
        'Stunned',
        'rounds',
        2
      );
      await ConditionsService.removeCondition(applied.condition.id);

      const conditions = await ConditionsService.getActiveConditions(testParticipantId);

      expect(conditions).toHaveLength(0);
    });
  });

  describe('getMechanicalEffects', () => {
    it('should return aggregated effects from single condition', async () => {
      if (!process.env.DATABASE_URL) return;

      await ConditionsService.applyCondition(testParticipantId, 'Blinded', 'rounds', 3);

      const effects = await ConditionsService.getMechanicalEffects(testParticipantId);

      expect(effects.attack_rolls).toBe('disadvantage');
      expect(effects.attacks_against).toBe('advantage');
      expect(effects.appliedConditions).toContain('Blinded');
    });

    it('should aggregate effects from multiple conditions', async () => {
      if (!process.env.DATABASE_URL) return;

      await ConditionsService.applyCondition(testParticipantId, 'Poisoned', 'rounds', 3);
      await ConditionsService.applyCondition(testParticipantId, 'Prone', 'permanent');

      const effects = await ConditionsService.getMechanicalEffects(testParticipantId);

      expect(effects.attack_rolls).toBe('disadvantage'); // From both conditions
      expect(effects.attacks_against_melee).toBe('advantage'); // From Prone
      expect(effects.ability_checks).toBe('disadvantage'); // From Poisoned
      expect(effects.appliedConditions).toHaveLength(2);
    });

    it('should handle condition with speed reduction', async () => {
      if (!process.env.DATABASE_URL) return;

      await ConditionsService.applyCondition(testParticipantId, 'Grappled', 'permanent');

      const effects = await ConditionsService.getMechanicalEffects(testParticipantId);

      expect(effects.speed).toBe(0);
    });

    it('should prioritize most restrictive effects', async () => {
      if (!process.env.DATABASE_URL) return;

      // Apply conditions with different speed restrictions
      await ConditionsService.applyCondition(testParticipantId, 'Paralyzed', 'rounds', 2);

      const effects = await ConditionsService.getMechanicalEffects(testParticipantId);

      // Paralyzed has auto-fail saves which should take precedence
      expect(effects.saving_throws_dex).toBe('auto_fail');
      expect(effects.saving_throws_str).toBe('auto_fail');
    });
  });

  describe('advanceConditionDurations', () => {
    it('should expire conditions that have reached their duration', async () => {
      if (!process.env.DATABASE_URL) return;

      // Apply condition that expires at round 3
      await ConditionsService.applyCondition(
        testParticipantId,
        'Blinded',
        'rounds',
        2,
        undefined,
        undefined,
        'Test',
        1
      );

      // Advance to round 3
      const result = await ConditionsService.advanceConditionDurations(testEncounterId, 3);

      expect(result.expiredConditions).toHaveLength(1);
      expect(result.expiredConditions[0]!.condition.name).toBe('Blinded');

      // Verify condition is no longer active
      const activeConditions = await ConditionsService.getActiveConditions(testParticipantId);
      expect(activeConditions).toHaveLength(0);
    });

    it('should not expire conditions that have not reached their duration', async () => {
      if (!process.env.DATABASE_URL) return;

      // Apply condition that expires at round 5
      await ConditionsService.applyCondition(
        testParticipantId,
        'Poisoned',
        'rounds',
        4,
        undefined,
        undefined,
        'Test',
        1
      );

      // Advance to round 3 (condition should still be active)
      const result = await ConditionsService.advanceConditionDurations(testEncounterId, 3);

      expect(result.expiredConditions).toHaveLength(0);

      // Verify condition is still active
      const activeConditions = await ConditionsService.getActiveConditions(testParticipantId);
      expect(activeConditions).toHaveLength(1);
    });

    it('should identify conditions requiring saving throws', async () => {
      if (!process.env.DATABASE_URL) return;

      // Apply condition with until_save duration
      await ConditionsService.applyCondition(
        testParticipantId,
        'Frightened',
        'until_save',
        undefined,
        14,
        'wisdom',
        'Test',
        1
      );

      // Advance round
      const result = await ConditionsService.advanceConditionDurations(testEncounterId, 2);

      expect(result.savingThrowsNeeded).toHaveLength(1);
      expect(result.savingThrowsNeeded[0]!.saveAbility).toBe('wisdom');
      expect(result.savingThrowsNeeded[0]!.saveDc).toBe(14);
    });
  });

  describe('checkConditionConflicts', () => {
    it('should detect duplicate conditions', async () => {
      if (!process.env.DATABASE_URL) return;

      await ConditionsService.applyCondition(testParticipantId, 'Stunned', 'rounds', 2);

      const conflicts = await ConditionsService.checkConditionConflicts(
        testParticipantId,
        'Stunned'
      );

      expect(conflicts).toHaveLength(1);
      expect(conflicts[0]!.conflictType).toBe('duplicate');
    });

    it('should detect superseded conditions', async () => {
      if (!process.env.DATABASE_URL) return;

      await ConditionsService.applyCondition(testParticipantId, 'Incapacitated', 'rounds', 2);

      const conflicts = await ConditionsService.checkConditionConflicts(
        testParticipantId,
        'Paralyzed'
      );

      expect(conflicts).toHaveLength(1);
      expect(conflicts[0]!.conflictType).toBe('superseded');
    });

    it('should return empty array when no conflicts', async () => {
      if (!process.env.DATABASE_URL) return;

      const conflicts = await ConditionsService.checkConditionConflicts(
        testParticipantId,
        'Blinded'
      );

      expect(conflicts).toHaveLength(0);
    });
  });

  describe('getConditionsLibrary', () => {
    it('should return all 13 core D&D 5E conditions', async () => {
      if (!process.env.DATABASE_URL) return;

      const conditions = await ConditionsService.getConditionsLibrary();

      expect(conditions.length).toBeGreaterThanOrEqual(13);

      // Check that all core conditions are present
      const conditionNames = conditions.map(c => c.name);
      const coreConditions = [
        'Blinded',
        'Charmed',
        'Deafened',
        'Frightened',
        'Grappled',
        'Incapacitated',
        'Invisible',
        'Paralyzed',
        'Petrified',
        'Poisoned',
        'Prone',
        'Restrained',
        'Stunned',
        'Unconscious',
      ];

      for (const conditionName of coreConditions) {
        expect(conditionNames).toContain(conditionName);
      }
    });

    it('should have parsed mechanical effects for each condition', async () => {
      if (!process.env.DATABASE_URL) return;

      const conditions = await ConditionsService.getConditionsLibrary();

      for (const condition of conditions) {
        expect(condition.mechanicalEffects).toBeDefined();
        expect(typeof condition.mechanicalEffects).toBe('object');
      }
    });
  });

  describe('Performance Requirements', () => {
    it('should check conditions in less than 20ms', async () => {
      if (!process.env.DATABASE_URL) return;

      // Apply multiple conditions
      await ConditionsService.applyCondition(testParticipantId, 'Blinded', 'rounds', 3);
      await ConditionsService.applyCondition(testParticipantId, 'Poisoned', 'rounds', 2);
      await ConditionsService.applyCondition(testParticipantId, 'Prone', 'permanent');

      // Measure performance
      const start = Date.now();
      await ConditionsService.getMechanicalEffects(testParticipantId);
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(20);
    });
  });
});
