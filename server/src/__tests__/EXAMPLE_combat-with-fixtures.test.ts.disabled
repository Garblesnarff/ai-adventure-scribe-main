/**
 * EXAMPLE: Combat Test with Fixtures
 *
 * This is an example showing how to refactor unit tests to use fixtures
 * instead of requiring a real database connection.
 *
 * Key Changes from Original:
 * 1. Use createMockDatabase() instead of real db
 * 2. Use fixtures instead of inserting test data
 * 3. Remove DATABASE_URL checks
 * 4. Tests run fast (<5ms per test) with no external dependencies
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createMockDatabase } from './mocks/database.js';
import {
  characters,
  combat,
  CombatEncounterBuilder,
  CombatParticipantBuilder,
  CombatParticipantStatusBuilder,
} from './fixtures/index.js';
import { createTestId } from './utils/index.js';

// Create mock database
let mockDb: ReturnType<typeof createMockDatabase>;

describe('Example: Combat with Fixtures', () => {
  beforeEach(() => {
    // Create fresh mock database for each test
    mockDb = createMockDatabase();

    // Pre-populate with fixture data
    mockDb.setData('characters', [characters.fighterLevel5, characters.wizardLevel5]);
    mockDb.setData('combat_encounters', [combat.activeEncounter]);
    mockDb.setData('combat_participants', [
      combat.fighterParticipant,
      combat.wizardParticipant,
      combat.goblinParticipant,
    ]);
    mockDb.setData('combat_participant_status', [
      combat.fighterStatus,
      combat.wizardStatus,
      combat.goblinStatus,
    ]);
  });

  describe('Basic Combat Queries', () => {
    it('should retrieve an active encounter', async () => {
      const encounter = await mockDb.query.combat_encounters.findFirst({
        where: { id: 'fixture-encounter-1' },
      });

      expect(encounter).toBeDefined();
      expect(encounter.status).toBe('active');
      expect(encounter.currentRound).toBe(1);
    });

    it('should retrieve all participants in an encounter', async () => {
      const participants = await mockDb.query.combat_participants.findMany({
        where: { encounterId: 'fixture-encounter-1' },
      });

      expect(participants).toHaveLength(3);
      expect(participants.map((p) => p.name)).toContain('Test Fighter');
      expect(participants.map((p) => p.name)).toContain('Test Wizard');
      expect(participants.map((p) => p.name)).toContain('Goblin');
    });

    it('should retrieve participant status', async () => {
      const status = await mockDb.query.combat_participant_status.findFirst({
        where: { participantId: 'fixture-participant-fighter' },
      });

      expect(status).toBeDefined();
      expect(status.currentHp).toBe(45);
      expect(status.maxHp).toBe(45);
      expect(status.isConscious).toBe(true);
    });
  });

  describe('Combat State Modifications', () => {
    it('should update participant HP', async () => {
      // Take damage
      const [updated] = await mockDb
        .update({ name: 'combat_participant_status' })
        .set({ currentHp: 30 })
        .where({ participantId: 'fixture-participant-fighter' })
        .returning();

      expect(updated.currentHp).toBe(30);
      expect(updated.maxHp).toBe(45);

      // Verify it persisted
      const status = await mockDb.query.combat_participant_status.findFirst({
        where: { participantId: 'fixture-participant-fighter' },
      });
      expect(status.currentHp).toBe(30);
    });

    it('should advance round number', async () => {
      const [updated] = await mockDb
        .update({ name: 'combat_encounters' })
        .set({ currentRound: 2, currentTurnOrder: 0 })
        .where({ id: 'fixture-encounter-1' })
        .returning();

      expect(updated.currentRound).toBe(2);
      expect(updated.currentTurnOrder).toBe(0);
    });

    it('should mark participant as unconscious', async () => {
      const [updated] = await mockDb
        .update({ name: 'combat_participant_status' })
        .set({ currentHp: 0, isConscious: false })
        .where({ participantId: 'fixture-participant-wizard' })
        .returning();

      expect(updated.currentHp).toBe(0);
      expect(updated.isConscious).toBe(false);
    });
  });

  describe('Using Fixture Builders', () => {
    it('should create custom combat scenario with builders', async () => {
      // Create a new encounter with builders
      const newEncounter = new CombatEncounterBuilder()
        .withId(createTestId('encounter'))
        .withSessionId('test-session')
        .withLocation('Dragon Lair')
        .withDifficulty('deadly')
        .build();

      const [inserted] = await mockDb
        .insert({ name: 'combat_encounters' })
        .values(newEncounter)
        .returning();

      expect(inserted.location).toBe('Dragon Lair');
      expect(inserted.difficulty).toBe('deadly');
      expect(inserted.status).toBe('active');
    });

    it('should create custom participant with builder', async () => {
      const newParticipant = new CombatParticipantBuilder()
        .withId(createTestId('participant'))
        .withEncounterId('fixture-encounter-1')
        .withName('Orc Warchief')
        .withType('enemy')
        .withInitiative(14, 2)
        .withAC(16)
        .withHp(93)
        .withResistances(['cold'])
        .build();

      const [inserted] = await mockDb
        .insert({ name: 'combat_participants' })
        .values(newParticipant)
        .returning();

      expect(inserted.name).toBe('Orc Warchief');
      expect(inserted.armorClass).toBe(16);
      expect(inserted.maxHp).toBe(93);
      expect(inserted.damageResistances).toContain('cold');
    });

    it('should create participant with status using builders', async () => {
      // Create participant
      const participant = new CombatParticipantBuilder()
        .withId(createTestId('participant'))
        .withEncounterId('fixture-encounter-1')
        .withName('Injured Paladin')
        .withHp(50)
        .build();

      const [insertedParticipant] = await mockDb
        .insert({ name: 'combat_participants' })
        .values(participant)
        .returning();

      // Create status
      const status = new CombatParticipantStatusBuilder()
        .withParticipantId(insertedParticipant.id)
        .withHp(25, 50) // Current: 25, Max: 50
        .withTempHp(10)
        .build();

      const [insertedStatus] = await mockDb
        .insert({ name: 'combat_participant_status' })
        .values(status)
        .returning();

      expect(insertedStatus.currentHp).toBe(25);
      expect(insertedStatus.maxHp).toBe(50);
      expect(insertedStatus.tempHp).toBe(10);
    });
  });

  describe('Performance', () => {
    it('should run quickly without database', async () => {
      const start = performance.now();

      // Perform multiple operations
      await mockDb.query.combat_encounters.findFirst({
        where: { id: 'fixture-encounter-1' },
      });
      await mockDb.query.combat_participants.findMany({
        where: { encounterId: 'fixture-encounter-1' },
      });
      await mockDb
        .update({ name: 'combat_participant_status' })
        .set({ currentHp: 40 })
        .where({ participantId: 'fixture-participant-fighter' })
        .returning();

      const end = performance.now();
      const duration = end - start;

      // Should complete in less than 5ms (much faster than real DB)
      expect(duration).toBeLessThan(5);
    });
  });

  describe('No DATABASE_URL Required', () => {
    it('should work without DATABASE_URL environment variable', () => {
      // This test would have been skipped in the old version
      // if (!process.env.DATABASE_URL) return;

      // Now it runs without any database configuration
      expect(mockDb).toBeDefined();
      expect(mockDb.query).toBeDefined();
      expect(mockDb.insert).toBeDefined();
    });
  });
});
