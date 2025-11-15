/**
 * Cost table for point-buy system following D&D 5E rules
 * Maps ability scores to their point cost
 */
export const POINT_BUY_COSTS: { [key: number]: number } = {
  8: 0,
  9: 1,
  10: 2,
  11: 3,
  12: 4,
  13: 5,
  14: 7,
  15: 9,
};

/**
 * Calculates ability score modifier according to D&D 5E rules
 * @param score - The ability score value
 * @returns The calculated modifier
 */
export const calculateModifier = (score: number): number => {
  return Math.floor((score - 10) / 2);
};

/**
 * Calculates the difference in point cost between two ability scores
 * @param currentScore - The starting ability score
 * @param targetScore - The target ability score
 * @returns The point cost difference
 */
export const getPointCostDifference = (currentScore: number, targetScore: number): number => {
  return POINT_BUY_COSTS[targetScore] - POINT_BUY_COSTS[currentScore];
};
