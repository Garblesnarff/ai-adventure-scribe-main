import { OSEAbility, AbilityScores } from './state.js';

// Deterministic RNG helpers (same as parent)
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

export function d6(rng: RNG): number {
  return Math.floor(rng() * 6) + 1;
}

export function rollD20(rng: RNG): { roll: number } {
  // OSE doesn't have advantage/disadvantage, so this is simpler than D&D 5E
  return { roll: d20(rng) };
}

export function rollD6(rng: RNG): { roll: number } {
  // For initiative and other d6 rolls
  return { roll: d6(rng) };
}

// Generic dice roller for damage dice like 2d6, 1d8, etc.
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

export function abilityModFromScores(scores: AbilityScores, ability: OSEAbility): number {
  const val = scores[ability];
  // OSE ability modifiers (different from D&D 5E)
  if (val <= 3) return -3;
  if (val <= 5) return -2;
  if (val <= 8) return -1;
  if (val <= 12) return 0;
  if (val <= 15) return +1;
  if (val <= 17) return +2;
  return +3; // 18+
}

// Roll under ability check (common in OSE)
export function rollUnderAbility(rng: RNG, abilityScore: number): { success: boolean; roll: number } {
  const roll = d20(rng);
  return {
    success: roll <= abilityScore,
    roll,
  };
}

// Roll 2d6 for reaction rolls
export function rollReaction(rng: RNG, charismaBonus: number = 0): { roll: number; total: number; reaction: string } {
  const roll = rollDice(rng, '2d6');
  const total = roll + charismaBonus;

  let reaction: string;
  if (total <= 2) reaction = 'Hostile, attacks';
  else if (total <= 5) reaction = 'Unfriendly, may attack';
  else if (total <= 8) reaction = 'Neutral, uncertain';
  else if (total <= 11) reaction = 'Indifferent, uninterested';
  else reaction = 'Friendly, helpful';

  return { roll, total, reaction };
}

// Roll for morale (2d6)
export function rollMorale(rng: RNG, moraleScore: number): { roll: number; pass: boolean } {
  const roll = rollDice(rng, '2d6');
  return {
    roll,
    pass: roll <= moraleScore,
  };
}
