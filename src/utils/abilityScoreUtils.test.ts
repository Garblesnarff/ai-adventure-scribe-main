import { describe, it, expect } from 'vitest';

import { POINT_BUY_COSTS, calculateModifier, getPointCostDifference } from './abilityScoreUtils';

describe('abilityScoreUtils', () => {
  describe('POINT_BUY_COSTS', () => {
    it('should have correct costs for standard scores', () => {
      expect(POINT_BUY_COSTS[8]).toBe(0);
      expect(POINT_BUY_COSTS[10]).toBe(2);
      expect(POINT_BUY_COSTS[13]).toBe(5);
      expect(POINT_BUY_COSTS[15]).toBe(9);
    });

    it('should not have entries for scores outside the typical point buy range directly in the table', () => {
      expect(POINT_BUY_COSTS[7]).toBeUndefined();
      expect(POINT_BUY_COSTS[16]).toBeUndefined();
    });
  });

  describe('calculateModifier', () => {
    it('should calculate correct modifiers for various scores', () => {
      expect(calculateModifier(10)).toBe(0);
      expect(calculateModifier(11)).toBe(0); // 11-10 = 1, floor(1/2) = 0
      expect(calculateModifier(12)).toBe(1);
      expect(calculateModifier(13)).toBe(1);
      expect(calculateModifier(14)).toBe(2);
      expect(calculateModifier(15)).toBe(2);
      expect(calculateModifier(16)).toBe(3);
      expect(calculateModifier(1)).toBe(-5); // 1-10 = -9, floor(-9/2) = -5
      expect(calculateModifier(8)).toBe(-1);
      expect(calculateModifier(9)).toBe(-1);
      expect(calculateModifier(20)).toBe(5);
    });
  });

  describe('getPointCostDifference', () => {
    it('should calculate correct point cost differences', () => {
      // Increase
      expect(getPointCostDifference(8, 9)).toBe(POINT_BUY_COSTS[9] - POINT_BUY_COSTS[8]); // 1 - 0 = 1
      expect(getPointCostDifference(10, 12)).toBe(POINT_BUY_COSTS[12] - POINT_BUY_COSTS[10]); // 4 - 2 = 2
      expect(getPointCostDifference(13, 15)).toBe(POINT_BUY_COSTS[15] - POINT_BUY_COSTS[13]); // 9 - 5 = 4

      // Decrease
      expect(getPointCostDifference(15, 14)).toBe(POINT_BUY_COSTS[14] - POINT_BUY_COSTS[15]); // 7 - 9 = -2
      expect(getPointCostDifference(10, 8)).toBe(POINT_BUY_COSTS[8] - POINT_BUY_COSTS[10]); // 0 - 2 = -2
    });

    it('should return NaN if scores are outside the POINT_BUY_COSTS table', () => {
      // This relies on POINT_BUY_COSTS[undefined] behavior leading to NaN
      expect(getPointCostDifference(7, 8)).toBeNaN();
      expect(getPointCostDifference(15, 16)).toBeNaN();
      expect(getPointCostDifference(7, 16)).toBeNaN();
    });

    it('should return 0 if scores are the same', () => {
      expect(getPointCostDifference(10, 10)).toBe(0);
      expect(getPointCostDifference(15, 15)).toBe(0);
    });
  });
});
