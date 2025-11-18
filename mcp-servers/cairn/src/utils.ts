// Utility functions for Cairn mechanics

/**
 * Roll a d20
 */
export function d20(): number {
  return Math.floor(Math.random() * 20) + 1;
}

/**
 * Roll a d100
 */
export function d100(): number {
  return Math.floor(Math.random() * 100) + 1;
}

/**
 * Parse and roll dice notation (e.g., "1d6", "2d8", "1d10+2")
 */
export function rollDice(dice: string): number {
  const match = /^(\d+)d(\d+)([+-]\d+)?$/i.exec(dice.trim());
  if (!match || !match[1] || !match[2]) {
    throw new Error(`Invalid dice expression: ${dice}`);
  }

  const count = parseInt(match[1], 10);
  const sides = parseInt(match[2], 10);
  const modifier = match[3] ? parseInt(match[3], 10) : 0;

  let total = 0;
  for (let i = 0; i < count; i++) {
    total += Math.floor(Math.random() * sides) + 1;
  }

  return total + modifier;
}

/**
 * Roll damage with impaired (disadvantage) or enhanced (advantage)
 */
export function rollDamage(dice: string, impaired?: boolean, enhanced?: boolean): {
  damage: number;
  rolls: number[];
} {
  const roll1 = rollDice(dice);

  if (impaired && !enhanced) {
    const roll2 = rollDice(dice);
    return { damage: Math.min(roll1, roll2), rolls: [roll1, roll2] };
  }

  if (enhanced && !impaired) {
    const roll2 = rollDice(dice);
    return { damage: Math.max(roll1, roll2), rolls: [roll1, roll2] };
  }

  return { damage: roll1, rolls: [roll1] };
}

/**
 * Perform a Cairn saving throw (roll d20 ≤ ability score)
 */
export function savingThrow(
  abilityScore: number,
  advantage?: boolean,
  disadvantage?: boolean
): {
  roll: number;
  secondRoll?: number;
  success: boolean;
  automatic?: boolean;
} {
  const roll1 = d20();

  // Check for advantage/disadvantage
  if (advantage || disadvantage) {
    const roll2 = d20();
    let finalRoll: number;
    let secondRoll: number;

    if (advantage && !disadvantage) {
      // Advantage: take the lower roll (better for roll-under)
      finalRoll = Math.min(roll1, roll2);
      secondRoll = Math.max(roll1, roll2);
    } else if (disadvantage && !advantage) {
      // Disadvantage: take the higher roll (worse for roll-under)
      finalRoll = Math.max(roll1, roll2);
      secondRoll = Math.min(roll1, roll2);
    } else {
      // Both cancel out
      finalRoll = roll1;
      secondRoll = roll2;
    }

    // Natural 1 or 20 overrides
    const automatic = finalRoll === 1 || finalRoll === 20;
    const success = finalRoll === 1 ? true : finalRoll === 20 ? false : finalRoll <= abilityScore;

    return { roll: finalRoll, secondRoll, success, automatic };
  }

  // No advantage/disadvantage
  const automatic = roll1 === 1 || roll1 === 20;
  const success = roll1 === 1 ? true : roll1 === 20 ? false : roll1 <= abilityScore;

  return { roll: roll1, success, automatic };
}

/**
 * Apply damage with armor reduction
 */
export function applyDamage(rawDamage: number, armorValue: number = 0): {
  rawDamage: number;
  armorReduction: number;
  finalDamage: number;
} {
  const armorReduction = Math.min(rawDamage, armorValue);
  const finalDamage = Math.max(0, rawDamage - armorReduction);

  return {
    rawDamage,
    armorReduction,
    finalDamage,
  };
}

/**
 * Find scar by roll value
 */
export function findScar(roll: number, scars: any[]): any {
  return scars.find(scar => roll >= scar.range[0] && roll <= scar.range[1]);
}
