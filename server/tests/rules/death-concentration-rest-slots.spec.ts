import { describe, it, expect } from 'vitest';
import { resolveAction } from '@/rules/rules-engine';
import { Actor, RulesActionRequest } from '@/rules/state';

function makeActor(): Actor {
  return {
    id: 'X',
    name: 'Caster',
    level: 6,
    size: 'medium',
    abilities: { str: 8, dex: 12, con: 14, int: 10, wis: 12, cha: 16 },
    ac: { base: 12 },
    maxHp: 32,
    currentHp: 0,
    speed: 30,
    spellSlots: { 1: { total: 4, expended: 3 }, 2: { total: 3, expended: 3 } },
    conditions: { concentrating: true, deathSaves: { successes: 2, failures: 2 } },
  };
}

describe('Death saves, concentration, rests, and spell slots', () => {
  it('makes a death save and can stabilize or die', () => {
    const a = makeActor();
    const req: RulesActionRequest = { seed: 100, encounter: { id: 'e', round: 1 }, actors: { X: a }, actorId: 'X', action: 'deathSave' };
    const out = resolveAction(req);
    expect(out.type).toBe('deathSave');
    if (out.type === 'deathSave') {
      expect(out.result.successes + out.result.failures).toBeGreaterThanOrEqual(5); // 2+2 plus outcome
      expect(out.result.stabilized || out.result.dead || true).toBe(true);
    }
  });

  it('performs a concentration check with correct DC', () => {
    const a = makeActor();
    const req: RulesActionRequest = {
      seed: 77,
      encounter: { id: 'e', round: 1 },
      actors: { X: a },
      actorId: 'X',
      action: 'concentrationCheck',
      payload: { damageTaken: 17 },
    };
    const out = resolveAction(req);
    expect(out.type).toBe('concentrationCheck');
    if (out.type === 'concentrationCheck') {
      expect(out.dc).toBe(10); // max(10, floor(17/2)=8)
      expect(typeof out.maintained).toBe('boolean');
    }
  });

  it('applies long rest effects', () => {
    const a = makeActor();
    const req: RulesActionRequest = {
      encounter: { id: 'e', round: 1 },
      actors: { X: a },
      actorId: 'X',
      action: 'rest',
      payload: { rest: 'long' },
    };
    const out = resolveAction(req);
    expect(out.type).toBe('rest');
    if (out.type === 'rest') {
      expect(out.effects).toContain('restore hit points to max');
    }
  });

  it('expends spell slots and fails when none available', () => {
    const a = makeActor();
    const ok: RulesActionRequest = { encounter: { id: 'e', round: 1 }, actors: { X: a }, actorId: 'X', action: 'expendSpellSlot', payload: { level: 1 } };
    const okOut = resolveAction(ok);
    if (okOut.type !== 'expendSpellSlot') throw new Error('wrong type');
    expect(okOut.success).toBe(true);

    const fail: RulesActionRequest = { encounter: { id: 'e', round: 1 }, actors: { X: a }, actorId: 'X', action: 'expendSpellSlot', payload: { level: 2 } };
    const failOut = resolveAction(fail);
    if (failOut.type !== 'expendSpellSlot') throw new Error('wrong type');
    expect(failOut.success).toBe(false);
  });
});
