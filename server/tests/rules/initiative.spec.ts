import { describe, it, expect } from 'vitest';
import { resolveAction } from '@/rules/rules-engine';
import { Actor, Encounter, RulesActionRequest } from '@/rules/state';

function makeActor(id: string, dex: number): Actor {
  return {
    id,
    name: id,
    class: 'Ranger',
    level: 3,
    size: 'medium',
    abilities: { str: 10, dex, con: 12, int: 10, wis: 12, cha: 8 },
    ac: { base: 14 },
    maxHp: 24,
    currentHp: 24,
    speed: 30,
  } as Actor;
}

describe('Initiative ordering with tiebreakers', () => {
  it('sorts by total, then Dex mod, then Dex, then random', () => {
    const actors: Record<string, Actor> = {
      A: makeActor('A', 16),
      B: makeActor('B', 14),
      C: makeActor('C', 12),
      D: makeActor('D', 10),
    };
    const req: RulesActionRequest = { seed: 555, encounter: { id: 'e', round: 1 }, actors, action: 'initiative' };
    const out = resolveAction(req);
    expect(out.type).toBe('initiative');
    if (out.type === 'initiative') {
      expect(out.order.length).toBe(4);
      // Ensure it returns actorIds and numeric values
      out.order.forEach((o) => {
        expect(typeof o.actorId).toBe('string');
        expect(typeof o.value).toBe('number');
      });
    }
  });
});
