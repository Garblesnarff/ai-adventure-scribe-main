/**
 * Attack Rolls Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  rollAttack,
  doesAttackHit,
  rollDamage,
  getCriticalMultiplier,
} from '../AttackRolls';
import * as diceRolls from '@/utils/diceRolls';

vi.mock('@/utils/diceRolls', () => ({
  rollDie: vi.fn(),
}));

describe('AttackRolls', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rollAttack', () => {
    it('should roll a normal attack', () => {
      vi.mocked(diceRolls.rollDie).mockReturnValue(15);

      const { roll } = rollAttack(5);

      expect(roll.total).toBe(20);
      expect(roll.naturalRoll).toBe(15);
      expect(roll.advantage).toBeUndefined();
      expect(roll.disadvantage).toBeUndefined();
    });

    it('should handle advantage', () => {
      vi.mocked(diceRolls.rollDie).mockReturnValueOnce(10).mockReturnValueOnce(15);

      const { roll } = rollAttack(5, { advantage: true });

      expect(roll.advantage).toBe(true);
      expect(roll.results).toEqual([10, 15]);
      expect(roll.keptResults).toEqual([15]);
      expect(roll.total).toBe(20);
    });

    it('should handle disadvantage', () => {
      vi.mocked(diceRolls.rollDie).mockReturnValueOnce(10).mockReturnValueOnce(15);

      const { roll } = rollAttack(5, { disadvantage: true });

      expect(roll.disadvantage).toBe(true);
      expect(roll.keptResults).toEqual([10]);
      expect(roll.total).toBe(15);
    });

    it('should mark natural 20 as critical', () => {
      vi.mocked(diceRolls.rollDie).mockReturnValue(20);

      const { roll } = rollAttack(5);

      expect(roll.critical).toBe(true);
      expect(roll.naturalRoll).toBe(20);
    });
  });

  describe('doesAttackHit', () => {
    it('should hit if roll meets or exceeds AC', () => {
      const roll = {
        dieType: 20,
        count: 1,
        modifier: 5,
        results: [15],
        keptResults: [15],
        total: 20,
        naturalRoll: 15,
      };

      expect(doesAttackHit(roll, 20)).toBe(true);
      expect(doesAttackHit(roll, 19)).toBe(true);
    });

    it('should miss if roll is below AC', () => {
      const roll = {
        dieType: 20,
        count: 1,
        modifier: 5,
        results: [10],
        keptResults: [10],
        total: 15,
        naturalRoll: 10,
      };

      expect(doesAttackHit(roll, 16)).toBe(false);
    });

    it('should always hit on natural 20', () => {
      const roll = {
        dieType: 20,
        count: 1,
        modifier: 0,
        results: [20],
        keptResults: [20],
        total: 20,
        critical: true,
        naturalRoll: 20,
      };

      expect(doesAttackHit(roll, 30)).toBe(true);
    });

    it('should always miss on natural 1', () => {
      const roll = {
        dieType: 20,
        count: 1,
        modifier: 10,
        results: [1],
        keptResults: [1],
        total: 11,
        naturalRoll: 1,
      };

      expect(doesAttackHit(roll, 10)).toBe(false);
    });
  });

  describe('rollDamage', () => {
    it('should roll damage dice', () => {
      vi.mocked(diceRolls.rollDie).mockReturnValueOnce(5);

      const roll = rollDamage('1d8+3', false);

      expect(roll.count).toBe(1);
      expect(roll.dieType).toBe(8);
      expect(roll.modifier).toBe(3);
      expect(roll.total).toBe(8);
    });

    it('should double dice on critical hit', () => {
      vi.mocked(diceRolls.rollDie).mockReturnValueOnce(5).mockReturnValueOnce(3);

      const roll = rollDamage('1d8+3', true);

      expect(roll.count).toBe(2);
      expect(roll.total).toBe(11);
      expect(roll.critical).toBe(true);
    });

    it('should handle multiple dice', () => {
      vi.mocked(diceRolls.rollDie)
        .mockReturnValueOnce(6)
        .mockReturnValueOnce(4);

      const roll = rollDamage('2d6+2', false);

      expect(roll.count).toBe(2);
      expect(roll.total).toBe(12);
    });
  });

  describe('getCriticalMultiplier', () => {
    it('should return 2x for base critical', () => {
      expect(getCriticalMultiplier()).toBe(2);
    });
  });
});
