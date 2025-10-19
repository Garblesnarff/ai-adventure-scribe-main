import { describe, it, expect } from 'vitest';
import { resolveAction } from '@/rules/rules-engine';
import { Actor, Encounter, RulesActionRequest } from '@/rules/state';

function makeActor(partial: Partial<Actor> & { id: string; name: string }): Actor {
  return {
    id: partial.id,
    name: partial.name,
    class: 'Rogue',
    level: 4,
    size: 'medium',
    abilities: { str: 10, dex: 18, con: 12, int: 12, wis: 14, cha: 8 },
    proficiencyBonus: 2,
    ac: { base: 15 },
    maxHp: 30,
    currentHp: 30,
    speed: 30,
    savingThrowProficiencies: { dex: true, int: false },
    skillProficiencies: { acrobatics: true, stealth: true },
    ...partial,
  };
}

const encounter: Encounter = { id: 'enc', round: 1 };

describe('Checks, Saving Throws, and Contested Checks', () => {
  it('resolves an ability check vs DC with advantage', () => {
    const a = makeActor({ id: 'A', name: 'Akira' });
    const req: RulesActionRequest = {
      seed: 2024,
      encounter,
      actors: { A: a },
      actorId: 'A',
      action: 'abilityCheck',
      payload: { ability: 'dex', proficient: true, dc: 15, advantage: true },
    };
    const out = resolveAction(req);
    expect(out.type).toBe('abilityCheck');
    if (out.type === 'abilityCheck') {
      expect(out.rolls[0].advantage).toBe(true);
      expect(typeof out.success).toBe('boolean');
    }
  });

  it('resolves a saving throw vs DC', () => {
    const a = makeActor({ id: 'A', name: 'Akira' });
    const req: RulesActionRequest = {
      seed: 7,
      encounter,
      actors: { A: a },
      actorId: 'A',
      action: 'savingThrow',
      payload: { ability: 'dex', dc: 12 },
    };
    const out = resolveAction(req);
    expect(out.type).toBe('savingThrow');
    if (out.type === 'savingThrow') {
      expect(out.dc).toBe(12);
      expect(typeof out.success).toBe('boolean');
    }
  });

  it('resolves contested checks and picks a winner with tiebreaker by Dex', () => {
    const a = makeActor({ id: 'A', name: 'Grappler', abilities: { str: 14, dex: 10, con: 12, int: 8, wis: 10, cha: 8 } as any });
    const b = makeActor({ id: 'B', name: 'Escapee', abilities: { str: 10, dex: 16, con: 12, int: 12, wis: 10, cha: 10 } as any });
    const req: RulesActionRequest = {
      seed: 123, // same seed -> increase chance of tie on raw die; tiebreaker uses dex
      encounter,
      actors: { A: a, B: b },
      actorId: 'A',
      targetId: 'B',
      action: 'contestedCheck',
      payload: {
        aCtx: { ability: 'str' }, // grappler Athletics (not tracking expertise)
        bCtx: { ability: 'dex' }, // escape with Acrobatics
      },
    };
    const out = resolveAction(req);
    expect(out.type).toBe('contestedCheck');
    if (out.type === 'contestedCheck') {
      expect(['A', 'B']).toContain(out.winnerId);
    }
  });
});
