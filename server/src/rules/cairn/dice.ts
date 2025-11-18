// Deterministic RNG and dice utilities for Cairn RPG

export type RNG = () => number; // returns [0,1)

// Mulberry32 PRNG for deterministic testing (same as D&D 5E)
export function mulberry32(seed: number): RNG {
  let t = (seed >>> 0) || 0x12345678;
  return function () {
    t += 0x6D2B79F5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashSeed(input: string | number | undefined): number {
  if (typeof input === 'number') return input;
  if (!input) return 0xABCDEF01;
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h += (h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24);
  }
  return h >>> 0;
}

export function d20(rng: RNG): number {
  return Math.floor(rng() * 20) + 1;
}

export function d100(rng: RNG): number {
  return Math.floor(rng() * 100) + 1;
}

export type AdvantageState = { advantage?: boolean; disadvantage?: boolean };

// Cairn saving throws: roll d20, must be ≤ ability score
// Natural 1 = always success, natural 20 = always failure
export function rollCairnSave(rng: RNG, target: number, adv: AdvantageState = {}): {
  roll: number;
  second?: number;
  success: boolean;
  automatic?: boolean;
} {
  const roll1 = d20(rng);

  // Check for advantage/disadvantage
  if (adv.advantage || adv.disadvantage) {
    const roll2 = d20(rng);
    let finalRoll: number;
    let secondRoll: number;

    if (adv.advantage && !adv.disadvantage) {
      // Advantage: take the lower roll (better for roll-under)
      finalRoll = Math.min(roll1, roll2);
      secondRoll = Math.max(roll1, roll2);
    } else if (adv.disadvantage && !adv.advantage) {
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
    const success = finalRoll === 1 ? true : finalRoll === 20 ? false : finalRoll <= target;

    return { roll: finalRoll, second: secondRoll, success, automatic };
  }

  // No advantage/disadvantage
  const automatic = roll1 === 1 || roll1 === 20;
  const success = roll1 === 1 ? true : roll1 === 20 ? false : roll1 <= target;

  return { roll: roll1, success, automatic };
}

// Generic dice roller for damage dice like 1d6, 1d8, 2d6, etc.
export function rollDice(rng: RNG, dice: string): number {
  const match = /^(\d+)d(\d+)([+-]\d+)?$/i.exec(dice.trim());
  if (!match || !match[1] || !match[2]) throw new Error(`Invalid dice expression: ${dice}`);
  const count = parseInt(match[1], 10);
  const sides = parseInt(match[2], 10);
  const mod = match[3] ? parseInt(match[3], 10) : 0;
  let total = 0;
  for (let i = 0; i < count; i++) {
    total += Math.floor(rng() * sides) + 1;
  }
  return total + mod;
}

// Roll damage with impaired (disadvantage) or enhanced (advantage)
// Impaired: roll twice, take lower
// Enhanced: roll twice, take higher
export function rollCairnDamage(rng: RNG, dice: string, impaired?: boolean, enhanced?: boolean): {
  damage: number;
  rolls: number[];
} {
  const roll1 = rollDice(rng, dice);

  if (impaired && !enhanced) {
    const roll2 = rollDice(rng, dice);
    return { damage: Math.min(roll1, roll2), rolls: [roll1, roll2] };
  }

  if (enhanced && !impaired) {
    const roll2 = rollDice(rng, dice);
    return { damage: Math.max(roll1, roll2), rolls: [roll1, roll2] };
  }

  return { damage: roll1, rolls: [roll1] };
}

// Roll for initiative (d20 + DEX modifier for tiebreakers)
export function rollInitiative(rng: RNG, dexScore: number): number {
  // In Cairn, initiative is often handled narratively or with simple d20
  // We'll use d20 + dex/10 for tiebreaking
  const roll = d20(rng);
  const dexBonus = dexScore / 100; // small tiebreaker
  return roll + dexBonus;
}

// Roll on scar table (d100)
export function rollScarTable(rng: RNG): number {
  return d100(rng);
}

// Build RNG from seed
export function buildCairnRNG(seed?: string | number): RNG {
  return mulberry32(hashSeed(seed));
}
