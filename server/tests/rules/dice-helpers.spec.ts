import { describe, it, expect } from 'vitest';
import { mulberry32, hashSeed, rollD20, rollDice, abilityModFromScores } from '@/rules/dice';

describe('Deterministic dice helpers', () => {
  it('hashSeed creates deterministic PRNG seeds', () => {
    const a = hashSeed('abc');
    const b = hashSeed('abc');
    expect(a).toBe(b);
  });

  it('mulberry32 produces numbers in [0,1)', () => {
    const rng = mulberry32(123);
    const x = rng();
    expect(x).toBeGreaterThanOrEqual(0);
    expect(x).toBeLessThan(1);
  });

  it('rollD20 supports advantage and disadvantage', () => {
    const rng = mulberry32(42);
    const adv = rollD20(rng, { advantage: true });
    const rng2 = mulberry32(42);
    const dis = rollD20(rng2, { disadvantage: true });
    // same underlying two rolls, but one picks max, one picks min
    expect(adv.roll).toBeGreaterThanOrEqual(dis.roll);
  });

  it('rollDice parses NdM+K expressions', () => {
    const rng = mulberry32(1);
    const total = rollDice(rng, '2d6+1');
    expect(typeof total).toBe('number');
  });

  it('abilityModFromScores computes modifiers', () => {
    const mod = abilityModFromScores({ str: 8, dex: 12, con: 14, int: 10, wis: 10, cha: 10 }, 'str');
    expect(mod).toBe(-1);
  });
});
