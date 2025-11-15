import { describe, it, expect, vi } from 'vitest';

import { rollDie, roll4d6DropLowest, generateAbilityScores } from './diceRolls';

describe('diceRolls utilities', () => {
  describe('rollDie', () => {
    it('should return a number between 1 and the number of sides (inclusive)', () => {
      const sides = 6;
      const result = rollDie(sides);
      expect(result).toBeGreaterThanOrEqual(1);
      expect(result).toBeLessThanOrEqual(sides);
    });

    it('should return 1 when rolling a 1-sided die', () => {
      expect(rollDie(1)).toBe(1);
    });

    it('should produce a distribution of rolls (stochastic test)', () => {
      const sides = 6;
      const rolls = Array.from({ length: 1000 }, () => rollDie(sides));
      const counts = new Array(sides + 1).fill(0);
      rolls.forEach((roll) => {
        counts[roll]++;
      });
      // Check if all numbers from 1 to sides appear
      for (let i = 1; i <= sides; i++) {
        expect(counts[i]).toBeGreaterThan(0);
      }
      // Check that no numbers outside the range appear
      expect(counts[0]).toBe(0);
      for (let i = sides + 1; i < counts.length; i++) {
        expect(counts[i]).toBe(0);
      }
    });

    it('should handle invalid input (e.g. 0 sides) gracefully or throw error', () => {
      // Current implementation of Math.random() * 0 is 0, +1 is 1. This might be acceptable.
      // If specific error handling is desired, the function should be changed.
      expect(rollDie(0)).toBe(1); // Based on current behavior
      expect(rollDie(-1)).toBe(1); // Based on current behavior
    });
  });

  describe('roll4d6DropLowest', () => {
    it('should return a sum between 3 (four 1s, drop one 1 -> 1+1+1) and 18 (four 6s, drop one 6 -> 6+6+6)', () => {
      const result = roll4d6DropLowest();
      expect(result).toBeGreaterThanOrEqual(3);
      expect(result).toBeLessThanOrEqual(18);
    });

    it('should correctly drop the lowest roll', () => {
      // Mock Math.random to control the rolls
      const mockMath = Object.create(global.Math);
      mockMath.random = vi
        .fn()
        .mockReturnValueOnce(0 / 6) // roll 1 (0/6 * 6 + 1 = 1)
        .mockReturnValueOnce(1 / 6) // roll 2 (1/6 * 6 + 1 = 2)
        .mockReturnValueOnce(2 / 6) // roll 3 (2/6 * 6 + 1 = 3)
        .mockReturnValueOnce(3 / 6); // roll 4 (3/6 * 6 + 1 = 4)
      global.Math = mockMath;

      // Rolls are 1, 2, 3, 4. Lowest (1) is dropped. Sum = 2+3+4 = 9.
      expect(roll4d6DropLowest()).toBe(9);

      // Restore original Math object
      global.Math = Object.getPrototypeOf(mockMath);
    });

    it('should handle cases where multiple dice have the same lowest value', () => {
      const mockMath = Object.create(global.Math);
      mockMath.random = vi
        .fn()
        .mockReturnValueOnce(0 / 6) // roll 1
        .mockReturnValueOnce(0 / 6) // roll 1
        .mockReturnValueOnce(5 / 6) // roll 6
        .mockReturnValueOnce(4 / 6); // roll 5
      global.Math = mockMath;

      // Rolls are 1, 1, 6, 5. One 1 is dropped. Sum = 1+6+5 = 12.
      expect(roll4d6DropLowest()).toBe(12);
      global.Math = Object.getPrototypeOf(mockMath);
    });
  });

  describe('generateAbilityScores', () => {
    it('should return an array of 6 scores', () => {
      const scores = generateAbilityScores();
      expect(scores).toBeInstanceOf(Array);
      expect(scores).toHaveLength(6);
    });

    it('each score should be between 3 and 18', () => {
      const scores = generateAbilityScores();
      scores.forEach((score) => {
        expect(score).toBeGreaterThanOrEqual(3);
        expect(score).toBeLessThanOrEqual(18);
      });
    });
  });
});
