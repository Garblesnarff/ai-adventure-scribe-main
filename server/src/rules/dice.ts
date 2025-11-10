import { Ability, AbilityScores } from './state.js';

// Deterministic RNG helpers
export type RNG = () => number; // returns [0,1)

// Mulberry32 PRNG for deterministic testing
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

export type AdvantageState = { advantage?: boolean; disadvantage?: boolean };

export function rollD20(rng: RNG, adv: AdvantageState = {}): { roll: number; second?: number } {
  const a = d20(rng);
  if (adv.advantage || adv.disadvantage) {
    const b = d20(rng);
    if (adv.advantage && !adv.disadvantage) {
      return { roll: Math.max(a, b), second: Math.min(a, b) };
    }
    if (adv.disadvantage && !adv.advantage) {
      return { roll: Math.min(a, b), second: Math.max(a, b) };
    }
    // both -> normal
    return { roll: a, second: b };
  }
  return { roll: a };
}

// Generic dice roller for damage dice like 2d6, 1d8 etc.
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

export function abilityModFromScores(scores: AbilityScores, ability: Ability): number {
  const val = scores[ability];
  return Math.floor((val - 10) / 2);
}
