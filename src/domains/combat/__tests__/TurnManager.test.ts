/**
 * Turn Manager Tests
 */

import { describe, it, expect } from 'vitest';
import {
  canTakeTurn,
  findNextValidParticipant,
  advanceTurn,
  resetTurnState,
  getCurrentParticipant,
  isParticipantsTurn,
  getTurnOrderNumber,
} from '../TurnManager';
import type { CombatParticipant } from '../types';

describe('TurnManager', () => {
  const createMockParticipant = (
    id: string,
    currentHP: number = 10,
    deathSaveFailures: number = 0
  ): CombatParticipant => ({
    id,
    name: `Participant ${id}`,
    participantType: 'player',
    maxHitPoints: 10,
    currentHitPoints: currentHP,
    temporaryHitPoints: 0,
    armorClass: 15,
    initiative: 10,
    speed: 30,
    actionTaken: false,
    bonusActionTaken: false,
    reactionTaken: false,
    movementUsed: 0,
    reactionOpportunities: [],
    conditions: [],
    deathSaves: { successes: 0, failures: deathSaveFailures },
    damageResistances: [],
    damageImmunities: [],
    damageVulnerabilities: [],
  });

  describe('canTakeTurn', () => {
    it('should return true for conscious participant', () => {
      const participant = createMockParticipant('p1', 10);
      expect(canTakeTurn(participant)).toBe(true);
    });

    it('should return false for unconscious participant', () => {
      const participant = createMockParticipant('p1', 0);
      expect(canTakeTurn(participant)).toBe(false);
    });

    it('should return false for dead participant', () => {
      const participant = createMockParticipant('p1', 0, 3);
      expect(canTakeTurn(participant)).toBe(false);
    });
  });

  describe('findNextValidParticipant', () => {
    it('should find next valid participant', () => {
      const participants = [
        createMockParticipant('p1', 10),
        createMockParticipant('p2', 10),
      ];

      const result = findNextValidParticipant(participants, 0);

      expect(result.index).toBe(1);
      expect(result.participant?.id).toBe('p2');
      expect(result.wrappedAround).toBe(false);
    });

    it('should skip unconscious participants', () => {
      const participants = [
        createMockParticipant('p1', 10),
        createMockParticipant('p2', 0), // Unconscious
        createMockParticipant('p3', 10),
      ];

      const result = findNextValidParticipant(participants, 0);

      expect(result.index).toBe(2);
      expect(result.participant?.id).toBe('p3');
    });

    it('should wrap around to start of initiative', () => {
      const participants = [
        createMockParticipant('p1', 10),
        createMockParticipant('p2', 10),
      ];

      const result = findNextValidParticipant(participants, 1);

      expect(result.index).toBe(0);
      expect(result.participant?.id).toBe('p1');
      expect(result.wrappedAround).toBe(true);
    });

    it('should return undefined if no valid participants', () => {
      const participants = [
        createMockParticipant('p1', 0, 3), // Dead
        createMockParticipant('p2', 0, 3), // Dead
      ];

      const result = findNextValidParticipant(participants, 0);

      expect(result.index).toBe(-1);
      expect(result.participant).toBeUndefined();
    });
  });

  describe('advanceTurn', () => {
    it('should advance to next turn', () => {
      const participants = [
        createMockParticipant('p1', 10),
        createMockParticipant('p2', 10),
      ];

      const result = advanceTurn(participants, 'p1', 1);

      expect(result.nextParticipantId).toBe('p2');
      expect(result.newRound).toBe(1);
      expect(result.participantsToUpdate.size).toBe(1);
      expect(result.participantsToUpdate.has('p2')).toBe(true);
    });

    it('should increment round when wrapping around', () => {
      const participants = [
        createMockParticipant('p1', 10),
        createMockParticipant('p2', 10),
      ];

      const result = advanceTurn(participants, 'p2', 1);

      expect(result.nextParticipantId).toBe('p1');
      expect(result.newRound).toBe(2);
    });

    it('should reset action economy for next participant', () => {
      const participants = [
        createMockParticipant('p1', 10),
        createMockParticipant('p2', 10),
      ];

      const result = advanceTurn(participants, 'p1', 1);

      const updates = result.participantsToUpdate.get('p2');
      expect(updates?.actionTaken).toBe(false);
      expect(updates?.bonusActionTaken).toBe(false);
      expect(updates?.reactionTaken).toBe(false);
      expect(updates?.movementUsed).toBe(0);
    });
  });

  describe('resetTurnState', () => {
    it('should reset turn state for participant', () => {
      const participant: CombatParticipant = {
        ...createMockParticipant('p1', 10),
        actionTaken: true,
        bonusActionTaken: true,
        reactionTaken: true,
        movementUsed: 30,
      };

      const reset = resetTurnState(participant);

      expect(reset.actionTaken).toBe(false);
      expect(reset.bonusActionTaken).toBe(false);
      expect(reset.reactionTaken).toBe(false);
      expect(reset.movementUsed).toBe(0);
    });
  });

  describe('getCurrentParticipant', () => {
    it('should return current participant', () => {
      const participants = [
        createMockParticipant('p1', 10),
        createMockParticipant('p2', 10),
      ];

      const current = getCurrentParticipant(participants, 'p2');

      expect(current?.id).toBe('p2');
    });

    it('should return undefined if no current participant', () => {
      const participants = [createMockParticipant('p1', 10)];

      const current = getCurrentParticipant(participants, undefined);

      expect(current).toBeUndefined();
    });
  });

  describe('isParticipantsTurn', () => {
    it('should return true if it is the participant\'s turn', () => {
      expect(isParticipantsTurn('p1', 'p1')).toBe(true);
    });

    it('should return false if it is not the participant\'s turn', () => {
      expect(isParticipantsTurn('p1', 'p2')).toBe(false);
    });
  });

  describe('getTurnOrderNumber', () => {
    it('should return 1-indexed turn order', () => {
      const participants = [
        createMockParticipant('p1', 10),
        createMockParticipant('p2', 10),
        createMockParticipant('p3', 10),
      ];

      expect(getTurnOrderNumber(participants, 'p1')).toBe(1);
      expect(getTurnOrderNumber(participants, 'p2')).toBe(2);
      expect(getTurnOrderNumber(participants, 'p3')).toBe(3);
    });

    it('should return 0 for unknown participant', () => {
      const participants = [createMockParticipant('p1', 10)];

      expect(getTurnOrderNumber(participants, 'unknown')).toBe(0);
    });
  });
});
