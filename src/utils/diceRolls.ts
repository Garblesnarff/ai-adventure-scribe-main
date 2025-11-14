/**
 * Simulates rolling a die with the specified number of sides
 * @param sides Number of sides on the die
 * @returns Random number between 1 and sides
 */
export const rollDie = (sides: number): number => {
  if (sides <= 1) return 1;
  return Math.floor(Math.random() * sides) + 1;
};

/**
 * Represents the result of rolling 4d6 and dropping the lowest
 */
export interface Roll4d6Result {
  /** The sum of the three highest rolls */
  total: number;
  /** All four individual rolls */
  rolls: [number, number, number, number];
  /** The lowest roll that was dropped */
  dropped: number;
  /** The three highest rolls that were kept */
  kept: [number, number, number];
}

/**
 * Simulates rolling 4d6 and dropping the lowest roll
 * Standard D&D 5E ability score generation method
 * @returns Sum of the three highest rolls and roll details
 */
export const roll4d6DropLowest = (): number => {
  const rolls = Array.from({ length: 4 }, () => rollDie(6));
  const sortedRolls = rolls.sort((a, b) => b - a);
  return sortedRolls.slice(0, 3).reduce((sum, roll) => sum + roll, 0);
};

/**
 * Simulates rolling 4d6 and dropping the lowest roll with detailed results
 * @returns Object containing total, individual rolls, dropped roll, and kept rolls
 */
export const roll4d6DropLowestDetailed = (): Roll4d6Result => {
  const rolls: [number, number, number, number] = [rollDie(6), rollDie(6), rollDie(6), rollDie(6)];

  const sortedRolls = [...rolls].sort((a, b) => b - a);
  const dropped = sortedRolls[3]; // Lowest roll
  const kept: [number, number, number] = [sortedRolls[0], sortedRolls[1], sortedRolls[2]];
  const total = kept.reduce((sum, roll) => sum + roll, 0);

  return { total, rolls, dropped, kept };
};

/**
 * Represents a complete set of ability score rolls with details
 */
export interface AbilityScoreRollResult {
  /** Array of 6 ability scores */
  scores: number[];
  /** Detailed roll information for each ability score */
  details: Roll4d6Result[];
  /** Timestamp when the rolls were generated */
  timestamp: Date;
}

/**
 * Generates a complete set of ability scores using 4d6 drop lowest
 * @returns Array of 6 ability scores
 */
export const generateAbilityScores = (): number[] => {
  return Array.from({ length: 6 }, roll4d6DropLowest);
};

/**
 * Generates a complete set of ability scores with detailed roll information
 * @returns Object containing scores, roll details, and timestamp
 */
export const generateAbilityScoresDetailed = (): AbilityScoreRollResult => {
  const details = Array.from({ length: 6 }, roll4d6DropLowestDetailed);
  const scores = details.map((detail) => detail.total);

  return {
    scores,
    details,
    timestamp: new Date(),
  };
};

/**
 * Rerolls a single ability score while keeping the others
 * @param currentScores Array of current ability scores
 * @param index Index of the score to reroll (0-5)
 * @returns New array with the specified score rerolled
 */
export const rerollSingleScore = (currentScores: number[], index: number): number[] => {
  if (index < 0 || index > 5) {
    throw new Error('Invalid score index. Must be between 0 and 5.');
  }

  const newScores = [...currentScores];
  newScores[index] = roll4d6DropLowest();
  return newScores;
};

/**
 * Rerolls a single ability score with detailed results
 * @param currentScores Array of current ability scores
 * @param currentDetails Array of current roll details
 * @param index Index of the score to reroll (0-5)
 * @returns Updated roll result with new score and details
 */
export const rerollSingleScoreDetailed = (
  currentScores: number[],
  currentDetails: Roll4d6Result[],
  index: number,
): AbilityScoreRollResult => {
  if (index < 0 || index > 5) {
    throw new Error('Invalid score index. Must be between 0 and 5.');
  }

  const newDetails = [...currentDetails];
  newDetails[index] = roll4d6DropLowestDetailed();

  const newScores = [...currentScores];
  newScores[index] = newDetails[index].total;

  return {
    scores: newScores,
    details: newDetails,
    timestamp: new Date(),
  };
};

/**
 * Simulates rolling a 20-sided die
 * @returns Random number between 1 and 20
 */
export const d20 = (): number => {
  return Math.floor(Math.random() * 20) + 1;
};
