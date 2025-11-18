/**
 * Combat HP Service Tests
 *
 * Comprehensive test suite for D&D 5E HP and damage tracking system
 * Tests damage application, resistances, temp HP, death saves, healing, and edge cases
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { CombatHPService } from '../combat-hp-service.js';
import { db } from '../../../../db/client.js';
import {
  combatEncounters,
  combatParticipants,
  combatParticipantStatus,
  gameSessions,
} from '../../../../db/schema/index.js';
import { eq } from 'drizzle-orm';

// Test data
let testSessionId: string;
let testEncounterId: string;
let testParticipantId: string;

/**
 * Setup test session
 */
async function createTestSession(): Promise<string> {
  const [session] = await db
    .insert(gameSessions)
    .values({
      campaignId: null,
      characterId: null,
      sessionNumber: 1,
      status: 'active',
      startTime: new Date(),
    })
    .returning();

  if (!session) throw new Error('Failed to create test session');
  return session.id;
}

/**
 * Create test encounter
 */
async function createTestEncounter(sessionId: string): Promise<string> {
  const [encounter] = await db
    .insert(combatEncounters)
    .values({
      sessionId,
      status: 'active',
      currentRound: 1,
    })
    .returning();

  if (!encounter) throw new Error('Failed to create test encounter');
  return encounter.id;
}

/**
 * Create test participant
 */
async function createTestParticipant(
  encounterId: string,
  options: {
    maxHp?: number;
    currentHp?: number;
    resistances?: string[];
    vulnerabilities?: string[];
    immunities?: string[];
  } = {}
): Promise<string> {
  const {
    maxHp = 50,
    currentHp = 50,
    resistances = [],
    vulnerabilities = [],
    immunities = [],
  } = options;

  const [participant] = await db
    .insert(combatParticipants)
    .values({
      encounterId,
      name: 'Test Fighter',
      participantType: 'player',
      initiative: 15,
      initiativeModifier: 2,
      turnOrder: 0,
      armorClass: 16,
      maxHp,
      damageResistances: resistances,
      damageVulnerabilities: vulnerabilities,
      damageImmunities: immunities,
    })
    .returning();

  if (!participant) throw new Error('Failed to create test participant');

  // Initialize status
  await CombatHPService.initializeParticipantStatus(participant.id, maxHp, currentHp);

  return participant.id;
}

/**
 * Cleanup test data
 */
async function cleanupTestData(sessionId: string) {
  // Delete session (cascade will delete encounters and participants)
  await db.delete(gameSessions).where(eq(gameSessions.id, sessionId));
}

describe('CombatHPService', () => {
  beforeAll(async () => {
    // Skip tests if no database
    if (!process.env.DATABASE_URL) {
      console.log('Skipping HP service tests - no database configured');
      return;
    }
  });

  beforeEach(async () => {
    if (!process.env.DATABASE_URL) return;

    // Create fresh test data for each test
    testSessionId = await createTestSession();
    testEncounterId = await createTestEncounter(testSessionId);
    testParticipantId = await createTestParticipant(testEncounterId);
  });

  afterAll(async () => {
    if (!process.env.DATABASE_URL) return;

    // Cleanup any remaining test data
    if (testSessionId) {
      await cleanupTestData(testSessionId);
    }
  });

  describe('applyDamage', () => {
    it('should apply basic damage correctly', async () => {
      if (!process.env.DATABASE_URL) return;

      const result = await CombatHPService.applyDamage(testParticipantId, {
        damageAmount: 15,
        damageType: 'slashing',
      });

      expect(result.originalDamage).toBe(15);
      expect(result.modifiedDamage).toBe(15);
      expect(result.newCurrentHp).toBe(35);
      expect(result.hpLost).toBe(15);
      expect(result.isConscious).toBe(true);
      expect(result.isDead).toBe(false);
      expect(result.wasResisted).toBe(false);
      expect(result.wasVulnerable).toBe(false);
      expect(result.wasImmune).toBe(false);
    });

    it('should apply resistance (half damage, rounded down)', async () => {
      if (!process.env.DATABASE_URL) return;

      // Create participant with fire resistance
      const participantId = await createTestParticipant(testEncounterId, {
        resistances: ['fire'],
      });

      const result = await CombatHPService.applyDamage(participantId, {
        damageAmount: 17,
        damageType: 'fire',
      });

      expect(result.originalDamage).toBe(17);
      expect(result.modifiedDamage).toBe(8); // 17 / 2 = 8.5, rounded down to 8
      expect(result.newCurrentHp).toBe(42);
      expect(result.wasResisted).toBe(true);
    });

    it('should apply vulnerability (double damage)', async () => {
      if (!process.env.DATABASE_URL) return;

      // Create participant with cold vulnerability
      const participantId = await createTestParticipant(testEncounterId, {
        vulnerabilities: ['cold'],
      });

      const result = await CombatHPService.applyDamage(participantId, {
        damageAmount: 10,
        damageType: 'cold',
      });

      expect(result.originalDamage).toBe(10);
      expect(result.modifiedDamage).toBe(20); // 10 * 2 = 20
      expect(result.newCurrentHp).toBe(30);
      expect(result.wasVulnerable).toBe(true);
    });

    it('should apply immunity (zero damage)', async () => {
      if (!process.env.DATABASE_URL) return;

      // Create participant with poison immunity
      const participantId = await createTestParticipant(testEncounterId, {
        immunities: ['poison'],
      });

      const result = await CombatHPService.applyDamage(participantId, {
        damageAmount: 25,
        damageType: 'poison',
      });

      expect(result.originalDamage).toBe(25);
      expect(result.modifiedDamage).toBe(0);
      expect(result.newCurrentHp).toBe(50);
      expect(result.wasImmune).toBe(true);
    });

    it('should use temp HP to shield damage before real HP', async () => {
      if (!process.env.DATABASE_URL) return;

      // Set temp HP
      await CombatHPService.setTempHP(testParticipantId, 10);

      const result = await CombatHPService.applyDamage(testParticipantId, {
        damageAmount: 15,
        damageType: 'slashing',
      });

      expect(result.tempHpLost).toBe(10);
      expect(result.hpLost).toBe(5);
      expect(result.newTempHp).toBe(0);
      expect(result.newCurrentHp).toBe(45);
    });

    it('should not damage real HP if temp HP absorbs all damage', async () => {
      if (!process.env.DATABASE_URL) return;

      // Set temp HP
      await CombatHPService.setTempHP(testParticipantId, 20);

      const result = await CombatHPService.applyDamage(testParticipantId, {
        damageAmount: 15,
        damageType: 'slashing',
      });

      expect(result.tempHpLost).toBe(15);
      expect(result.hpLost).toBe(0);
      expect(result.newTempHp).toBe(5);
      expect(result.newCurrentHp).toBe(50);
    });

    it('should make participant unconscious when HP reaches 0', async () => {
      if (!process.env.DATABASE_URL) return;

      const result = await CombatHPService.applyDamage(testParticipantId, {
        damageAmount: 50,
        damageType: 'slashing',
      });

      expect(result.newCurrentHp).toBe(0);
      expect(result.isConscious).toBe(false);
      expect(result.isDead).toBe(false);
    });

    it('should trigger massive damage instant death (damage >= max HP while at 0 HP)', async () => {
      if (!process.env.DATABASE_URL) return;

      // First knock unconscious
      await CombatHPService.applyDamage(testParticipantId, {
        damageAmount: 50,
        damageType: 'slashing',
      });

      // Now deal massive damage
      const result = await CombatHPService.applyDamage(testParticipantId, {
        damageAmount: 50, // >= max HP
        damageType: 'slashing',
      });

      expect(result.massiveDamage).toBe(true);
      expect(result.isDead).toBe(true);
    });

    it('should not trigger massive damage if already has HP', async () => {
      if (!process.env.DATABASE_URL) return;

      const result = await CombatHPService.applyDamage(testParticipantId, {
        damageAmount: 50, // >= max HP but currently at full HP
        damageType: 'slashing',
      });

      expect(result.massiveDamage).toBe(false);
      expect(result.newCurrentHp).toBe(0);
      expect(result.isConscious).toBe(false);
    });

    it('should log damage to combat_damage_log', async () => {
      if (!process.env.DATABASE_URL) return;

      await CombatHPService.applyDamage(testParticipantId, {
        damageAmount: 15,
        damageType: 'fire',
        sourceDescription: 'Fireball',
      });

      const logs = await CombatHPService.getDamageLog(testEncounterId);

      expect(logs.length).toBe(1);
      expect(logs[0]!.damageAmount).toBe(15);
      expect(logs[0]!.damageType).toBe('fire');
      expect(logs[0]!.participantId).toBe(testParticipantId);
    });
  });

  describe('healDamage', () => {
    it('should heal damage correctly', async () => {
      if (!process.env.DATABASE_URL) return;

      // First take damage
      await CombatHPService.applyDamage(testParticipantId, {
        damageAmount: 20,
        damageType: 'slashing',
      });

      // Then heal
      const result = await CombatHPService.healDamage(testParticipantId, 10);

      expect(result.healingAmount).toBe(10);
      expect(result.healingApplied).toBe(10);
      expect(result.newCurrentHp).toBe(40);
      expect(result.wasRevived).toBe(false);
    });

    it('should not heal beyond max HP', async () => {
      if (!process.env.DATABASE_URL) return;

      // Take some damage
      await CombatHPService.applyDamage(testParticipantId, {
        damageAmount: 10,
        damageType: 'slashing',
      });

      // Try to overheal
      const result = await CombatHPService.healDamage(testParticipantId, 50);

      expect(result.healingAmount).toBe(50);
      expect(result.healingApplied).toBe(10); // Can only heal 10 HP
      expect(result.overheal).toBe(40);
      expect(result.newCurrentHp).toBe(50); // Max HP
    });

    it('should revive unconscious participant and clear death saves', async () => {
      if (!process.env.DATABASE_URL) return;

      // Knock unconscious
      await CombatHPService.applyDamage(testParticipantId, {
        damageAmount: 50,
        damageType: 'slashing',
      });

      // Add some death save failures
      await CombatHPService.rollDeathSave(testParticipantId, 5); // Failure

      // Heal
      const result = await CombatHPService.healDamage(testParticipantId, 10);

      expect(result.wasRevived).toBe(true);
      expect(result.isConscious).toBe(true);
      expect(result.newCurrentHp).toBe(10);

      // Check death saves were cleared
      const status = await CombatHPService.getParticipantStatus(testParticipantId);
      expect(status?.deathSavesSuccesses).toBe(0);
      expect(status?.deathSavesFailures).toBe(0);
    });

    it('should reject negative healing', async () => {
      if (!process.env.DATABASE_URL) return;

      await expect(
        CombatHPService.healDamage(testParticipantId, -10)
      ).rejects.toThrow('Healing amount must be non-negative');
    });
  });

  describe('setTempHP', () => {
    it('should set temp HP correctly', async () => {
      if (!process.env.DATABASE_URL) return;

      const result = await CombatHPService.setTempHP(testParticipantId, 15);

      expect(result.oldTempHp).toBe(0);
      expect(result.newTempHp).toBe(15);
    });

    it('should not stack temp HP (use higher value)', async () => {
      if (!process.env.DATABASE_URL) return;

      // Set initial temp HP
      await CombatHPService.setTempHP(testParticipantId, 10);

      // Try to set lower temp HP - should keep higher value
      const result1 = await CombatHPService.setTempHP(testParticipantId, 5);
      expect(result1.newTempHp).toBe(10); // Kept higher value

      // Set higher temp HP - should replace
      const result2 = await CombatHPService.setTempHP(testParticipantId, 20);
      expect(result2.newTempHp).toBe(20);
    });

    it('should reject negative temp HP', async () => {
      if (!process.env.DATABASE_URL) return;

      await expect(
        CombatHPService.setTempHP(testParticipantId, -5)
      ).rejects.toThrow('Temporary HP amount must be non-negative');
    });
  });

  describe('rollDeathSave', () => {
    beforeEach(async () => {
      if (!process.env.DATABASE_URL) return;

      // Make participant unconscious
      await CombatHPService.applyDamage(testParticipantId, {
        damageAmount: 50,
        damageType: 'slashing',
      });
    });

    it('should handle natural 20 (revive with 1 HP)', async () => {
      if (!process.env.DATABASE_URL) return;

      const result = await CombatHPService.rollDeathSave(testParticipantId, 20);

      expect(result.roll).toBe(20);
      expect(result.isCritical).toBe(true);
      expect(result.isSuccess).toBe(true);
      expect(result.wasRevived).toBe(true);
      expect(result.newCurrentHp).toBe(1);
      expect(result.successes).toBe(0);
      expect(result.failures).toBe(0);
    });

    it('should handle natural 1 (2 failures)', async () => {
      if (!process.env.DATABASE_URL) return;

      const result = await CombatHPService.rollDeathSave(testParticipantId, 1);

      expect(result.roll).toBe(1);
      expect(result.isCritical).toBe(true);
      expect(result.isSuccess).toBe(false);
      expect(result.failures).toBe(2);
      expect(result.isDead).toBe(false);
    });

    it('should handle failure (2-9)', async () => {
      if (!process.env.DATABASE_URL) return;

      const result = await CombatHPService.rollDeathSave(testParticipantId, 5);

      expect(result.isSuccess).toBe(false);
      expect(result.isCritical).toBe(false);
      expect(result.failures).toBe(1);
      expect(result.isDead).toBe(false);
    });

    it('should handle success (10-19)', async () => {
      if (!process.env.DATABASE_URL) return;

      const result = await CombatHPService.rollDeathSave(testParticipantId, 15);

      expect(result.isSuccess).toBe(true);
      expect(result.isCritical).toBe(false);
      expect(result.successes).toBe(1);
      expect(result.isStabilized).toBe(false);
    });

    it('should stabilize at 3 successes', async () => {
      if (!process.env.DATABASE_URL) return;

      await CombatHPService.rollDeathSave(testParticipantId, 10); // Success
      await CombatHPService.rollDeathSave(testParticipantId, 15); // Success
      const result = await CombatHPService.rollDeathSave(testParticipantId, 12); // Success

      expect(result.successes).toBe(3);
      expect(result.isStabilized).toBe(true);
      expect(result.isDead).toBe(false);
    });

    it('should die at 3 failures', async () => {
      if (!process.env.DATABASE_URL) return;

      await CombatHPService.rollDeathSave(testParticipantId, 5); // Failure
      await CombatHPService.rollDeathSave(testParticipantId, 3); // Failure
      const result = await CombatHPService.rollDeathSave(testParticipantId, 7); // Failure

      expect(result.failures).toBe(3);
      expect(result.isDead).toBe(true);
    });

    it('should die immediately with nat 1 + previous failure', async () => {
      if (!process.env.DATABASE_URL) return;

      await CombatHPService.rollDeathSave(testParticipantId, 5); // 1 failure
      const result = await CombatHPService.rollDeathSave(testParticipantId, 1); // +2 failures = 3 total

      expect(result.failures).toBe(3);
      expect(result.isDead).toBe(true);
    });

    it('should reject death save for conscious participant', async () => {
      if (!process.env.DATABASE_URL) return;

      // Create a conscious participant
      const consciousId = await createTestParticipant(testEncounterId);

      await expect(
        CombatHPService.rollDeathSave(consciousId, 10)
      ).rejects.toThrow('Cannot roll death save for conscious participant');
    });

    it('should reject invalid roll values', async () => {
      if (!process.env.DATABASE_URL) return;

      await expect(
        CombatHPService.rollDeathSave(testParticipantId, 0)
      ).rejects.toThrow('Death save roll must be between 1 and 20');

      await expect(
        CombatHPService.rollDeathSave(testParticipantId, 21)
      ).rejects.toThrow('Death save roll must be between 1 and 20');
    });
  });

  describe('checkConscious', () => {
    it('should return true for conscious participant', async () => {
      if (!process.env.DATABASE_URL) return;

      const isConscious = await CombatHPService.checkConscious(testParticipantId);
      expect(isConscious).toBe(true);
    });

    it('should return false for unconscious participant', async () => {
      if (!process.env.DATABASE_URL) return;

      await CombatHPService.applyDamage(testParticipantId, {
        damageAmount: 50,
        damageType: 'slashing',
      });

      const isConscious = await CombatHPService.checkConscious(testParticipantId);
      expect(isConscious).toBe(false);
    });
  });

  describe('getDamageLog', () => {
    it('should retrieve damage log for encounter', async () => {
      if (!process.env.DATABASE_URL) return;

      // Apply some damage
      await CombatHPService.applyDamage(testParticipantId, {
        damageAmount: 10,
        damageType: 'fire',
      });
      await CombatHPService.applyDamage(testParticipantId, {
        damageAmount: 5,
        damageType: 'cold',
      });

      const logs = await CombatHPService.getDamageLog(testEncounterId);

      expect(logs.length).toBe(2);
      expect(logs[0]!.encounterId).toBe(testEncounterId);
    });

    it('should filter damage log by participant', async () => {
      if (!process.env.DATABASE_URL) return;

      const participant2Id = await createTestParticipant(testEncounterId);

      await CombatHPService.applyDamage(testParticipantId, {
        damageAmount: 10,
        damageType: 'fire',
      });
      await CombatHPService.applyDamage(participant2Id, {
        damageAmount: 5,
        damageType: 'cold',
      });

      const logs = await CombatHPService.getDamageLog(testEncounterId, testParticipantId);

      expect(logs.length).toBe(1);
      expect(logs[0]!.participantId).toBe(testParticipantId);
    });

    it('should filter damage log by round', async () => {
      if (!process.env.DATABASE_URL) return;

      await CombatHPService.applyDamage(testParticipantId, {
        damageAmount: 10,
        damageType: 'fire',
      });

      // Advance round
      await db
        .update(combatEncounters)
        .set({ currentRound: 2 })
        .where(eq(combatEncounters.id, testEncounterId));

      await CombatHPService.applyDamage(testParticipantId, {
        damageAmount: 5,
        damageType: 'cold',
      });

      const round1Logs = await CombatHPService.getDamageLog(testEncounterId, undefined, 1);
      const round2Logs = await CombatHPService.getDamageLog(testEncounterId, undefined, 2);

      expect(round1Logs.length).toBe(1);
      expect(round2Logs.length).toBe(1);
    });
  });

  describe('Edge Cases', () => {
    it('should handle 0 damage', async () => {
      if (!process.env.DATABASE_URL) return;

      const result = await CombatHPService.applyDamage(testParticipantId, {
        damageAmount: 0,
        damageType: 'slashing',
      });

      expect(result.modifiedDamage).toBe(0);
      expect(result.newCurrentHp).toBe(50);
    });

    it('should handle healing when at max HP', async () => {
      if (!process.env.DATABASE_URL) return;

      const result = await CombatHPService.healDamage(testParticipantId, 10);

      expect(result.healingApplied).toBe(0);
      expect(result.overheal).toBe(10);
      expect(result.newCurrentHp).toBe(50);
    });

    it('should handle multiple resistances', async () => {
      if (!process.env.DATABASE_URL) return;

      const participantId = await createTestParticipant(testEncounterId, {
        resistances: ['fire', 'cold', 'lightning'],
      });

      const result = await CombatHPService.applyDamage(participantId, {
        damageAmount: 20,
        damageType: 'cold',
      });

      expect(result.modifiedDamage).toBe(10);
      expect(result.wasResisted).toBe(true);
    });

    it('should handle non-existent participant', async () => {
      if (!process.env.DATABASE_URL) return;

      await expect(
        CombatHPService.applyDamage('00000000-0000-0000-0000-000000000000', {
          damageAmount: 10,
          damageType: 'slashing',
        })
      ).rejects.toThrow('Participant');
    });

    it('should handle damage type with resistance and ignore flag', async () => {
      if (!process.env.DATABASE_URL) return;

      const participantId = await createTestParticipant(testEncounterId, {
        resistances: ['fire'],
      });

      const result = await CombatHPService.applyDamage(participantId, {
        damageAmount: 20,
        damageType: 'fire',
        ignoreResistances: true,
      });

      expect(result.modifiedDamage).toBe(20); // Resistance ignored
      expect(result.wasResisted).toBe(false);
    });

    it('should handle immunity with ignore flag', async () => {
      if (!process.env.DATABASE_URL) return;

      const participantId = await createTestParticipant(testEncounterId, {
        immunities: ['poison'],
      });

      const result = await CombatHPService.applyDamage(participantId, {
        damageAmount: 20,
        damageType: 'poison',
        ignoreImmunities: true,
      });

      expect(result.modifiedDamage).toBe(20); // Immunity ignored
      expect(result.wasImmune).toBe(false);
    });
  });
});
