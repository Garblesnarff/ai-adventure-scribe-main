/**
 * Combat Initiative Service Tests
 *
 * Comprehensive test suite for D&D 5E combat initiative system
 * Tests initiative calculation, turn order, round advancement, and edge cases
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { CombatInitiativeService } from '../combat-initiative-service.js';
import { db } from '../../../../src/infrastructure/database/index.js';
import { combatEncounters, combatParticipants, gameSessions } from '../../../../db/schema/index.js';
import { eq } from 'drizzle-orm';
import type { CreateParticipantInput } from '../../types/combat.js';

// Test data
let testSessionId: string;
let testEncounterId: string;

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
 * Cleanup test data
 */
async function cleanupTestData(sessionId: string) {
  // Delete session (cascade will delete encounters and participants)
  await db.delete(gameSessions).where(eq(gameSessions.id, sessionId));
}

describe('CombatInitiativeService', () => {
  beforeAll(async () => {
    // Skip tests if no database
    if (!process.env.DATABASE_URL) {
      console.log('Skipping combat tests - no database configured');
      return;
    }
  });

  beforeEach(async () => {
    if (!process.env.DATABASE_URL) return;

    // Create fresh test session for each test
    testSessionId = await createTestSession();
  });

  afterAll(async () => {
    if (!process.env.DATABASE_URL) return;

    // Cleanup any remaining test data
    if (testSessionId) {
      await cleanupTestData(testSessionId);
    }
  });

  describe('startCombat', () => {
    it('should create a new combat encounter with participants', async () => {
      if (!process.env.DATABASE_URL) return;

      const participants: CreateParticipantInput[] = [
        {
          encounterId: '', // Will be set by service
          name: 'Fighter',
          initiativeModifier: 2,
          hpCurrent: 45,
          hpMax: 45,
        },
        {
          encounterId: '',
          name: 'Wizard',
          initiativeModifier: 3,
          hpCurrent: 28,
          hpMax: 28,
        },
        {
          encounterId: '',
          name: 'Goblin',
          initiativeModifier: 1,
          hpCurrent: 7,
          hpMax: 7,
        },
      ];

      const combatState = await CombatInitiativeService.startCombat(
        testSessionId,
        participants,
        false
      );

      expect(combatState).toBeDefined();
      expect(combatState.encounter).toBeDefined();
      expect(combatState.encounter.sessionId).toBe(testSessionId);
      expect(combatState.encounter.status).toBe('active');
      expect(combatState.encounter.currentRound).toBe(1);
      expect(combatState.participants).toHaveLength(3);
      expect(combatState.turnOrder).toBeDefined();
      expect(combatState.currentParticipant).toBeDefined();

      testEncounterId = combatState.encounter.id;
    });

    it('should start with surprise round when specified', async () => {
      if (!process.env.DATABASE_URL) return;

      const participants: CreateParticipantInput[] = [
        {
          encounterId: '',
          name: 'Rogue',
          initiativeModifier: 4,
        },
      ];

      const combatState = await CombatInitiativeService.startCombat(
        testSessionId,
        participants,
        true
      );

      expect(combatState.encounter.currentRound).toBe(0);
    });

    it('should handle single participant', async () => {
      if (!process.env.DATABASE_URL) return;

      const participants: CreateParticipantInput[] = [
        {
          encounterId: '',
          name: 'Solo Fighter',
          initiativeModifier: 2,
        },
      ];

      const combatState = await CombatInitiativeService.startCombat(
        testSessionId,
        participants,
        false
      );

      expect(combatState.participants).toHaveLength(1);
      expect(combatState.currentParticipant).toBeDefined();
      expect(combatState.currentParticipant?.name).toBe('Solo Fighter');
    });

    it('should handle 10+ participants', async () => {
      if (!process.env.DATABASE_URL) return;

      const participants: CreateParticipantInput[] = Array.from({ length: 12 }, (_, i) => ({
        encounterId: '',
        name: `Participant ${i + 1}`,
        initiativeModifier: Math.floor(Math.random() * 5),
      }));

      const combatState = await CombatInitiativeService.startCombat(
        testSessionId,
        participants,
        false
      );

      expect(combatState.participants).toHaveLength(12);
      expect(combatState.turnOrder).toHaveLength(12);
    });
  });

  describe('rollInitiative', () => {
    beforeEach(async () => {
      if (!process.env.DATABASE_URL) return;

      const participants: CreateParticipantInput[] = [
        {
          encounterId: '',
          name: 'Test Character',
          initiativeModifier: 2,
        },
      ];

      const combatState = await CombatInitiativeService.startCombat(
        testSessionId,
        participants,
        false
      );

      testEncounterId = combatState.encounter.id;
    });

    it('should roll initiative with automatic d20 roll', async () => {
      if (!process.env.DATABASE_URL) return;

      const participants = await db.query.combatParticipants.findMany({
        where: eq(combatParticipants.encounterId, testEncounterId),
      });

      const participantId = participants[0]!.id;

      const result = await CombatInitiativeService.rollInitiative(
        testEncounterId,
        participantId
      );

      expect(result).toBeDefined();
      expect(result.participantId).toBe(participantId);
      expect(result.roll).toBeGreaterThanOrEqual(1);
      expect(result.roll).toBeLessThanOrEqual(20);
      expect(result.modifier).toBe(2);
      expect(result.total).toBe(result.roll + result.modifier);
    });

    it('should accept manual roll value', async () => {
      if (!process.env.DATABASE_URL) return;

      const participants = await db.query.combatParticipants.findMany({
        where: eq(combatParticipants.encounterId, testEncounterId),
      });

      const participantId = participants[0]!.id;

      const result = await CombatInitiativeService.rollInitiative(
        testEncounterId,
        participantId,
        15
      );

      expect(result.roll).toBe(15);
      expect(result.total).toBe(17); // 15 + 2
    });

    it('should apply modifier correctly', async () => {
      if (!process.env.DATABASE_URL) return;

      const participants = await db.query.combatParticipants.findMany({
        where: eq(combatParticipants.encounterId, testEncounterId),
      });

      const participantId = participants[0]!.id;

      const result = await CombatInitiativeService.rollInitiative(
        testEncounterId,
        participantId,
        10,
        5
      );

      expect(result.roll).toBe(10);
      expect(result.modifier).toBe(5);
      expect(result.total).toBe(15);
    });
  });

  describe('calculateTurnOrder', () => {
    it('should sort participants by initiative descending', async () => {
      if (!process.env.DATABASE_URL) return;

      const participants: CreateParticipantInput[] = [
        { encounterId: '', name: 'A', initiativeModifier: 0 },
        { encounterId: '', name: 'B', initiativeModifier: 0 },
        { encounterId: '', name: 'C', initiativeModifier: 0 },
      ];

      const combatState = await CombatInitiativeService.startCombat(
        testSessionId,
        participants,
        false
      );

      const encounterId = combatState.encounter.id;

      // Manually set initiatives
      const allParticipants = await db.query.combatParticipants.findMany({
        where: eq(combatParticipants.encounterId, encounterId),
      });

      // Set specific initiatives
      await CombatInitiativeService.rollInitiative(encounterId, allParticipants[0]!.id, 10, 0);
      await CombatInitiativeService.rollInitiative(encounterId, allParticipants[1]!.id, 20, 0);
      await CombatInitiativeService.rollInitiative(encounterId, allParticipants[2]!.id, 15, 0);

      const updatedState = await CombatInitiativeService.getCombatState(encounterId);

      expect(updatedState.turnOrder[0]!.participant.name).toBe('B'); // 20
      expect(updatedState.turnOrder[1]!.participant.name).toBe('C'); // 15
      expect(updatedState.turnOrder[2]!.participant.name).toBe('A'); // 10
    });

    it('should break ties by DEX modifier', async () => {
      if (!process.env.DATABASE_URL) return;

      const participants: CreateParticipantInput[] = [
        { encounterId: '', name: 'Low DEX', initiativeModifier: 1 },
        { encounterId: '', name: 'High DEX', initiativeModifier: 4 },
      ];

      const combatState = await CombatInitiativeService.startCombat(
        testSessionId,
        participants,
        false
      );

      const encounterId = combatState.encounter.id;
      const allParticipants = await db.query.combatParticipants.findMany({
        where: eq(combatParticipants.encounterId, encounterId),
      });

      // Set same initiative for both
      await CombatInitiativeService.rollInitiative(encounterId, allParticipants[0]!.id, 15, 1);
      await CombatInitiativeService.rollInitiative(encounterId, allParticipants[1]!.id, 15, 4);

      const updatedState = await CombatInitiativeService.getCombatState(encounterId);

      // Higher DEX modifier should go first
      expect(updatedState.turnOrder[0]!.participant.name).toBe('High DEX');
      expect(updatedState.turnOrder[1]!.participant.name).toBe('Low DEX');
    });
  });

  describe('advanceTurn', () => {
    beforeEach(async () => {
      if (!process.env.DATABASE_URL) return;

      const participants: CreateParticipantInput[] = [
        { encounterId: '', name: 'P1', initiativeModifier: 3 },
        { encounterId: '', name: 'P2', initiativeModifier: 2 },
        { encounterId: '', name: 'P3', initiativeModifier: 1 },
      ];

      const combatState = await CombatInitiativeService.startCombat(
        testSessionId,
        participants,
        false
      );

      testEncounterId = combatState.encounter.id;
    });

    it('should advance to next participant', async () => {
      if (!process.env.DATABASE_URL) return;

      const initialState = await CombatInitiativeService.getCombatState(testEncounterId);
      const firstParticipant = initialState.currentParticipant;

      const result = await CombatInitiativeService.advanceTurn(testEncounterId);

      expect(result.previousParticipant?.id).toBe(firstParticipant?.id);
      expect(result.currentParticipant).toBeDefined();
      expect(result.currentParticipant.id).not.toBe(firstParticipant?.id);
      expect(result.newRound).toBe(false);
    });

    it('should increment round after last participant', async () => {
      if (!process.env.DATABASE_URL) return;

      // Advance through all participants
      await CombatInitiativeService.advanceTurn(testEncounterId);
      await CombatInitiativeService.advanceTurn(testEncounterId);
      const result = await CombatInitiativeService.advanceTurn(testEncounterId);

      expect(result.newRound).toBe(true);
      expect(result.roundNumber).toBe(2);
    });

    it('should cycle back to first participant', async () => {
      if (!process.env.DATABASE_URL) return;

      const initialState = await CombatInitiativeService.getCombatState(testEncounterId);
      const firstParticipant = initialState.turnOrder[0]!.participant;

      // Advance through all participants
      await CombatInitiativeService.advanceTurn(testEncounterId);
      await CombatInitiativeService.advanceTurn(testEncounterId);
      const result = await CombatInitiativeService.advanceTurn(testEncounterId);

      expect(result.currentParticipant.id).toBe(firstParticipant.id);
    });

    it('should throw error if encounter is not active', async () => {
      if (!process.env.DATABASE_URL) return;

      await CombatInitiativeService.endCombat(testEncounterId);

      await expect(
        CombatInitiativeService.advanceTurn(testEncounterId)
      ).rejects.toThrow('Encounter is not active');
    });
  });

  describe('getCurrentTurn', () => {
    beforeEach(async () => {
      if (!process.env.DATABASE_URL) return;

      const participants: CreateParticipantInput[] = [
        { encounterId: '', name: 'Current', initiativeModifier: 5 },
        { encounterId: '', name: 'Next', initiativeModifier: 3 },
      ];

      const combatState = await CombatInitiativeService.startCombat(
        testSessionId,
        participants,
        false
      );

      testEncounterId = combatState.encounter.id;
    });

    it('should return current participant', async () => {
      if (!process.env.DATABASE_URL) return;

      const current = await CombatInitiativeService.getCurrentTurn(testEncounterId);

      expect(current).toBeDefined();
      expect(current?.isActive).toBe(true);
    });

    it('should return null if no active participants', async () => {
      if (!process.env.DATABASE_URL) return;

      // Deactivate all participants
      const participants = await db.query.combatParticipants.findMany({
        where: eq(combatParticipants.encounterId, testEncounterId),
      });

      for (const p of participants) {
        await CombatInitiativeService.removeParticipant(p.id);
      }

      const current = await CombatInitiativeService.getCurrentTurn(testEncounterId);

      expect(current).toBeNull();
    });
  });

  describe('reorderInitiative', () => {
    beforeEach(async () => {
      if (!process.env.DATABASE_URL) return;

      const participants: CreateParticipantInput[] = [
        { encounterId: '', name: 'P1', initiativeModifier: 0 },
        { encounterId: '', name: 'P2', initiativeModifier: 0 },
      ];

      const combatState = await CombatInitiativeService.startCombat(
        testSessionId,
        participants,
        false
      );

      testEncounterId = combatState.encounter.id;
    });

    it('should update participant initiative and recalculate order', async () => {
      if (!process.env.DATABASE_URL) return;

      const participants = await db.query.combatParticipants.findMany({
        where: eq(combatParticipants.encounterId, testEncounterId),
      });

      const participantId = participants[0]!.id;

      await CombatInitiativeService.reorderInitiative(testEncounterId, participantId, 25);

      const updatedState = await CombatInitiativeService.getCombatState(testEncounterId);
      const updatedParticipant = updatedState.participants.find(p => p.id === participantId);

      expect(updatedParticipant?.initiative).toBe(25);
      expect(updatedState.turnOrder[0]!.participant.id).toBe(participantId);
    });
  });

  describe('endCombat', () => {
    beforeEach(async () => {
      if (!process.env.DATABASE_URL) return;

      const participants: CreateParticipantInput[] = [
        { encounterId: '', name: 'Fighter', initiativeModifier: 2 },
      ];

      const combatState = await CombatInitiativeService.startCombat(
        testSessionId,
        participants,
        false
      );

      testEncounterId = combatState.encounter.id;
    });

    it('should mark encounter as completed', async () => {
      if (!process.env.DATABASE_URL) return;

      const result = await CombatInitiativeService.endCombat(testEncounterId);

      expect(result.status).toBe('completed');
      expect(result.endedAt).toBeDefined();
      expect(result.endedAt).toBeInstanceOf(Date);
    });

    it('should not allow advancing turn after ending', async () => {
      if (!process.env.DATABASE_URL) return;

      await CombatInitiativeService.endCombat(testEncounterId);

      await expect(
        CombatInitiativeService.advanceTurn(testEncounterId)
      ).rejects.toThrow('Encounter is not active');
    });
  });

  describe('getCombatState', () => {
    beforeEach(async () => {
      if (!process.env.DATABASE_URL) return;

      const participants: CreateParticipantInput[] = [
        { encounterId: '', name: 'P1', initiativeModifier: 3 },
        { encounterId: '', name: 'P2', initiativeModifier: 2 },
      ];

      const combatState = await CombatInitiativeService.startCombat(
        testSessionId,
        participants,
        false
      );

      testEncounterId = combatState.encounter.id;
    });

    it('should return complete combat state', async () => {
      if (!process.env.DATABASE_URL) return;

      const state = await CombatInitiativeService.getCombatState(testEncounterId);

      expect(state).toBeDefined();
      expect(state.encounter).toBeDefined();
      expect(state.participants).toBeDefined();
      expect(state.turnOrder).toBeDefined();
      expect(state.currentParticipant).toBeDefined();
    });

    it('should mark current participant correctly', async () => {
      if (!process.env.DATABASE_URL) return;

      const state = await CombatInitiativeService.getCombatState(testEncounterId);

      const currentEntry = state.turnOrder.find(e => e.isCurrent);
      expect(currentEntry).toBeDefined();
      expect(currentEntry?.participant.id).toBe(state.currentParticipant?.id);
    });
  });

  describe('Multiple simultaneous combats', () => {
    it('should handle multiple concurrent encounters', async () => {
      if (!process.env.DATABASE_URL) return;

      // Create second session
      const session2Id = await createTestSession();

      const participants1: CreateParticipantInput[] = [
        { encounterId: '', name: 'Combat1-P1', initiativeModifier: 2 },
      ];

      const participants2: CreateParticipantInput[] = [
        { encounterId: '', name: 'Combat2-P1', initiativeModifier: 3 },
      ];

      const combat1 = await CombatInitiativeService.startCombat(
        testSessionId,
        participants1,
        false
      );

      const combat2 = await CombatInitiativeService.startCombat(
        session2Id,
        participants2,
        false
      );

      expect(combat1.encounter.id).not.toBe(combat2.encounter.id);
      expect(combat1.encounter.sessionId).toBe(testSessionId);
      expect(combat2.encounter.sessionId).toBe(session2Id);

      // Advance turn in combat1
      await CombatInitiativeService.advanceTurn(combat1.encounter.id);

      // Combat2 should be unaffected
      const combat2State = await CombatInitiativeService.getCombatState(combat2.encounter.id);
      expect(combat2State.encounter.currentRound).toBe(1);
      expect(combat2State.encounter.currentTurnOrder).toBe(0);

      // Cleanup
      await cleanupTestData(session2Id);
    });
  });

  describe('Performance', () => {
    it('should calculate initiative in under 50ms', async () => {
      if (!process.env.DATABASE_URL) return;

      const participants: CreateParticipantInput[] = Array.from({ length: 10 }, (_, i) => ({
        encounterId: '',
        name: `Participant ${i}`,
        initiativeModifier: i,
      }));

      const combatState = await CombatInitiativeService.startCombat(
        testSessionId,
        participants,
        false
      );

      const encounterId = combatState.encounter.id;
      const allParticipants = await db.query.combatParticipants.findMany({
        where: eq(combatParticipants.encounterId, encounterId),
      });

      const startTime = Date.now();
      await CombatInitiativeService.calculateTurnOrder(encounterId);
      const endTime = Date.now();

      const duration = endTime - startTime;
      expect(duration).toBeLessThan(50);
    });
  });
});
