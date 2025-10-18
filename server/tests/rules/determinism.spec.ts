import { describe, it, expect } from 'vitest';
import { resolveAction } from '@/rules/rules-engine';
import { Actor, RulesActionRequest } from '@/rules/state';

const a: Actor = {
  id: 'A',
  name: 'SeedTester',
  level: 1,
  size: 'medium',
  abilities: { str: 14, dex: 12, con: 12, int: 8, wis: 10, cha: 10 },
  ac: { base: 12 },
  maxHp: 10,
  currentHp: 10,
  speed: 30,
  weapons: [{ name: 'Club', ability: 'str', proficient: true, damageDice: '1d4', damageType: 'bludgeoning' }],
};

const b: Actor = {
  id: 'B',
  name: 'Dummy',
  level: 1,
  size: 'medium',
  abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
  ac: { base: 10 },
  maxHp: 10,
  currentHp: 10,
  speed: 30,
};

describe('Deterministic RNG via seed', () => {
  it('produces identical outcomes for same seed', () => {
    const req: RulesActionRequest = {
      seed: 'same-seed',
      encounter: { id: 'e', round: 1 },
      actors: { A: a, B: b },
      actorId: 'A',
      targetId: 'B',
      action: 'attack',
      payload: { weapon: a.weapons![0], targetAC: b.ac.base },
    };
    const out1 = resolveAction(req);
    const out2 = resolveAction(req);

    expect(out1.type).toBe('attack');
    expect(out2.type).toBe('attack');
    if (out1.type === 'attack' && out2.type === 'attack') {
      expect(out1.hit.roll).toBe(out2.hit.roll);
      expect(out1.damage?.totalBeforeReduction).toBe(out2.damage?.totalBeforeReduction);
    }
  });
});
