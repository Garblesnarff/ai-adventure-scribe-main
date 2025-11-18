/**
 * Dice utilities for Knave RPG
 * Provides deterministic PRNG for reproducible rolls
 */

export type RNG = () => number; // returns [0,1)

/**
 * Mulberry32 PRNG for deterministic testing
 * Allows reproducible dice rolls with a seed
 */
export function mulberry32(seed: number): RNG {
  let t = (seed >>> 0) || 0x12345678;
  return function () {
    t += 0x6D2B79F5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Hash a seed string or number to a consistent number
 */
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

/**
 * Build an RNG from a seed
 */
export function buildRNG(seed?: string | number): RNG {
  return mulberry32(hashSeed(seed));
}

/**
 * Roll a d20 (1-20)
 */
export function rollD20(rng: RNG): number {
  return Math.floor(rng() * 20) + 1;
}

/**
 * Roll dice with a given expression (e.g., "1d6", "2d8+3")
 */
export function rollDice(rng: RNG, dice: string): number {
  const match = /^(\d+)d(\d+)([+-]\d+)?$/i.exec(dice.trim());
  if (!match || !match[1] || !match[2]) {
    throw new Error(`Invalid dice expression: ${dice}`);
  }
  const count = parseInt(match[1], 10);
  const sides = parseInt(match[2], 10);
  const mod = match[3] ? parseInt(match[3], 10) : 0;
  let total = 0;
  for (let i = 0; i < count; i++) {
    total += Math.floor(rng() * sides) + 1;
  }
  return total + mod;
}

/**
 * Roll a coin flip
 */
export function coinFlip(rng: RNG): 'heads' | 'tails' {
  return rng() < 0.5 ? 'heads' : 'tails';
}
