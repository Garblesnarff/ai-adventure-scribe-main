import { describe, it, expect } from 'vitest';
import { resolveAction } from '@/rules/rules-engine';
import { Actor, Encounter, RulesActionRequest } from '@/rules/state';

const actorA: Actor = {
  id: 'A',
  name: 'Mover',
  level: 1,
  size: 'medium',
  abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
  ac: { base: 10 },
  maxHp: 10,
  currentHp: 10,
  speed: 30,
};

const actorB: Actor = {
  id: 'B',
  name: 'Reactor',
  level: 1,
  size: 'medium',
  abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
  ac: { base: 10 },
  maxHp: 10,
  currentHp: 10,
  speed: 30,
};

describe('Opportunity attack trigger', () => {
  it('triggers when leaving reach and reaction available', () => {
    const req: RulesActionRequest = {
      encounter: { id: 'e', round: 1 },
      actors: { A: actorA, B: actorB },
      action: 'opportunityAttack',
      payload: { moverId: 'A', reactorId: 'B', inReachBefore: true, inReachAfter: false },
    };
    const out = resolveAction(req);
    if (out.type !== 'opportunityAttack') throw new Error('wrong type');
    expect(out.triggered).toBe(true);
  });

  it('does not trigger when entering or staying in reach', () => {
    const req2: RulesActionRequest = {
      encounter: { id: 'e', round: 1 },
      actors: { A: actorA, B: actorB },
      action: 'opportunityAttack',
      payload: { moverId: 'A', reactorId: 'B', inReachBefore: true, inReachAfter: true },
    };
    const out2 = resolveAction(req2);
    if (out2.type !== 'opportunityAttack') throw new Error('wrong type');
    expect(out2.triggered).toBe(false);
  });
});
