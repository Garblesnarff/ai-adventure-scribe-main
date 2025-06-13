/**
 * Simulates rolling a die with the specified number of sides
 * @param sides Number of sides on the die
 * @returns Random number between 1 and sides
 */
export const rollDie = (sides: number): number => {
  return Math.floor(Math.random() * sides) + 1;
};

/**
 * Simulates rolling 4d6 and dropping the lowest roll
 * Standard D&D 5E ability score generation method
 * @returns Sum of the three highest rolls
 */
export const roll4d6DropLowest = (): number => {
  const rolls = Array.from({ length: 4 }, () => rollDie(6));
  const sortedRolls = rolls.sort((a, b) => b - a);
  return sortedRolls.slice(0, 3).reduce((sum, roll) => sum + roll, 0);
};

/**
 * Generates a complete set of ability scores using 4d6 drop lowest
 * @returns Array of 6 ability scores
 */
export const generateAbilityScores = (): number[] => {
  return Array.from({ length: 6 }, roll4d6DropLowest);
};