/**
 * Death Saves Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  rollDeathSave,
  isDead,
  isUnconscious,
  isStable,
  stabilize,
  checkMassiveDamage,
} from '../DeathSaves';
import type { CombatParticipant } from '../types';
import * as diceRolls from '@/utils/diceRolls';

vi.mock('@/utils/diceRolls', () => ({
  rollDie: vi.fn(),
}));

describe('DeathSaves', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const createMockParticipant = (
    currentHP: number = 10,
    deathSaveSuccesses: number = 0,
    deathSaveFailures: number = 0
  ): CombatParticipant => ({
    id: 'p1',
    name: 'Test Participant',
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
    deathSaves: { successes: deathSaveSuccesses, failures: deathSaveFailures },
    damageResistances: [],
    damageImmunities: [],
    damageVulnerabilities: [],
  });

  describe('rollDeathSave', () => {
    it('should throw error if participant is conscious', () => {
      const participant = createMockParticipant(5);
      expect(() => rollDeathSave(participant)).toThrow('Cannot roll death save when conscious');
    });

    it('should handle critical success (nat 20)', () => {
      const participant = createMockParticipant(0);
      vi.mocked(diceRolls.rollDie).mockReturnValue(20);

      const { result, updatedParticipant } = rollDeathSave(participant);

      expect(result).toBe('critical');
      expect(updatedParticipant.currentHitPoints).toBe(1);
      expect(updatedParticipant.deathSaves.successes).toBe(0);
      expect(updatedParticipant.deathSaves.failures).toBe(0);
    });

    it('should handle critical failure (nat 1)', () => {
      const participant = createMockParticipant(0);
      vi.mocked(diceRolls.rollDie).mockReturnValue(1);

      const { result, updatedParticipant } = rollDeathSave(participant);

      expect(result).toBe('failure');
      expect(updatedParticipant.deathSaves.failures).toBe(2);
    });

    it('should handle success (10+)', () => {
      const participant = createMockParticipant(0);
      vi.mocked(diceRolls.rollDie).mockReturnValue(15);

      const { result, updatedParticipant } = rollDeathSave(participant);

      expect(result).toBe('success');
      expect(updatedParticipant.deathSaves.successes).toBe(1);
    });

    it('should handle failure (1-9)', () => {
      const participant = createMockParticipant(0);
      vi.mocked(diceRolls.rollDie).mockReturnValue(5);

      const { result, updatedParticipant } = rollDeathSave(participant);

      expect(result).toBe('failure');
      expect(updatedParticipant.deathSaves.failures).toBe(1);
    });
  });

  describe('isDead', () => {
    it('should return true if 3 failed death saves', () => {
      const participant = createMockParticipant(0, 0, 3);
      expect(isDead(participant)).toBe(true);
    });

    it('should return false if less than 3 failures', () => {
      const participant = createMockParticipant(0, 0, 2);
      expect(isDead(participant)).toBe(false);
    });
  });

  describe('isUnconscious', () => {
    it('should return true if at 0 HP and not dead', () => {
      const participant = createMockParticipant(0, 0, 0);
      expect(isUnconscious(participant)).toBe(true);
    });

    it('should return false if conscious', () => {
      const participant = createMockParticipant(5);
      expect(isUnconscious(participant)).toBe(false);
    });
  });

  describe('isStable', () => {
    it('should return true if marked stable', () => {
      const participant = createMockParticipant(0);
      participant.deathSaves.isStable = true;
      expect(isStable(participant)).toBe(true);
    });

    it('should return true if 3 successes', () => {
      const participant = createMockParticipant(0, 3, 0);
      expect(isStable(participant)).toBe(true);
    });
  });

  describe('stabilize', () => {
    it('should stabilize a dying participant', () => {
      const participant = createMockParticipant(0, 1, 1);
      const stabilized = stabilize(participant);
      expect(stabilized.deathSaves.isStable).toBe(true);
    });
  });

  describe('checkMassiveDamage', () => {
    it('should detect instant death from massive damage', () => {
      const participant = createMockParticipant(10);
      const { instantDeath } = checkMassiveDamage(participant, 25);
      expect(instantDeath).toBe(true);
    });
  });
});
