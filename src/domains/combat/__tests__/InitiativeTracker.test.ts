/**
 * Initiative Tracker Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  rollInitiativeForParticipant,
  rollInitiativeForAll,
  sortByInitiative,
  updateInitiative,
  reorderParticipants,
  getInitiativeOrder,
  getFirstInInitiative,
  groupByInitiative,
} from '../InitiativeTracker';
import type { CombatParticipant } from '../types';
import * as diceRolls from '@/utils/diceRolls';

// Mock the rollDie function
vi.mock('@/utils/diceRolls', () => ({
  rollDie: vi.fn(),
}));

describe('InitiativeTracker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const createMockParticipant = (
    id: string,
    initiative: number = 0
  ): CombatParticipant => ({
    id,
    name: `Participant ${id}`,
    participantType: 'player',
    maxHitPoints: 10,
    currentHitPoints: 10,
    temporaryHitPoints: 0,
    armorClass: 15,
    initiative,
    speed: 30,
    actionTaken: false,
    bonusActionTaken: false,
    reactionTaken: false,
    movementUsed: 0,
    reactionOpportunities: [],
    conditions: [],
    deathSaves: { successes: 0, failures: 0 },
    damageResistances: [],
    damageImmunities: [],
    damageVulnerabilities: [],
  });

  describe('rollInitiativeForParticipant', () => {
    it('should roll initiative for a participant', () => {
      const participant = createMockParticipant('p1', 3);
      vi.mocked(diceRolls.rollDie).mockReturnValue(15);

      const result = rollInitiativeForParticipant(participant);

      expect(result.participantId).toBe('p1');
      expect(result.initiative).toBe(18); // 15 + 3
      expect(result.roll.total).toBe(18);
      expect(result.roll.naturalRoll).toBe(15);
    });

    it('should use custom initiative modifier', () => {
      const participant = createMockParticipant('p1', 3);
      vi.mocked(diceRolls.rollDie).mockReturnValue(10);

      const result = rollInitiativeForParticipant(participant, 5);

      expect(result.initiative).toBe(15); // 10 + 5 (custom modifier)
    });
  });

  describe('rollInitiativeForAll', () => {
    it('should roll initiative for all participants', () => {
      const participants = [
        createMockParticipant('p1', 2),
        createMockParticipant('p2', 3),
      ];

      vi.mocked(diceRolls.rollDie).mockReturnValueOnce(10).mockReturnValueOnce(15);

      const results = rollInitiativeForAll(participants);

      expect(results.size).toBe(2);
      expect(results.get('p1')?.initiative).toBe(12); // 10 + 2
      expect(results.get('p2')?.initiative).toBe(18); // 15 + 3
    });
  });

  describe('sortByInitiative', () => {
    it('should sort participants by initiative (highest first)', () => {
      const participants = [
        createMockParticipant('p1', 10),
        createMockParticipant('p2', 20),
        createMockParticipant('p3', 15),
      ];

      const sorted = sortByInitiative(participants);

      expect(sorted[0].id).toBe('p2'); // 20
      expect(sorted[1].id).toBe('p3'); // 15
      expect(sorted[2].id).toBe('p1'); // 10
    });

    it('should preserve order on ties', () => {
      const participants = [
        createMockParticipant('p1', 15),
        createMockParticipant('p2', 15),
      ];

      const sorted = sortByInitiative(participants);

      // Order should be preserved when tied
      expect(sorted[0].id).toBe('p1');
      expect(sorted[1].id).toBe('p2');
    });
  });

  describe('updateInitiative', () => {
    it('should update initiative and re-sort', () => {
      const participants = [
        createMockParticipant('p1', 10),
        createMockParticipant('p2', 20),
      ];

      const updated = updateInitiative(participants, 'p1', 25);

      expect(updated[0].id).toBe('p1'); // Now first with 25
      expect(updated[0].initiative).toBe(25);
      expect(updated[1].id).toBe('p2'); // Now second with 20
    });
  });

  describe('reorderParticipants', () => {
    it('should reorder participants based on ID array', () => {
      const participants = [
        createMockParticipant('p1', 10),
        createMockParticipant('p2', 20),
        createMockParticipant('p3', 15),
      ];

      const reordered = reorderParticipants(participants, ['p3', 'p1', 'p2']);

      expect(reordered[0].id).toBe('p3');
      expect(reordered[1].id).toBe('p1');
      expect(reordered[2].id).toBe('p2');
    });

    it('should handle missing IDs in new order', () => {
      const participants = [
        createMockParticipant('p1', 10),
        createMockParticipant('p2', 20),
      ];

      const reordered = reorderParticipants(participants, ['p2']);

      expect(reordered[0].id).toBe('p2');
      expect(reordered[1].id).toBe('p1'); // Added at end
    });
  });

  describe('getInitiativeOrder', () => {
    it('should return sorted participant IDs', () => {
      const participants = [
        createMockParticipant('p1', 10),
        createMockParticipant('p2', 20),
        createMockParticipant('p3', 15),
      ];

      const order = getInitiativeOrder(participants);

      expect(order).toEqual(['p2', 'p3', 'p1']);
    });
  });

  describe('getFirstInInitiative', () => {
    it('should return participant with highest initiative', () => {
      const participants = [
        createMockParticipant('p1', 10),
        createMockParticipant('p2', 20),
        createMockParticipant('p3', 15),
      ];

      const first = getFirstInInitiative(participants);

      expect(first?.id).toBe('p2');
    });

    it('should return undefined for empty array', () => {
      const first = getFirstInInitiative([]);
      expect(first).toBeUndefined();
    });
  });

  describe('groupByInitiative', () => {
    it('should group participants by initiative value', () => {
      const participants = [
        createMockParticipant('p1', 10),
        createMockParticipant('p2', 20),
        createMockParticipant('p3', 10),
      ];

      const groups = groupByInitiative(participants);

      expect(groups.size).toBe(2);
      expect(groups.get(10)?.length).toBe(2);
      expect(groups.get(20)?.length).toBe(1);
    });
  });
});
