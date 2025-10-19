import { describe, it, expect } from 'vitest';
import { resolveAction } from '@/rules/rules-engine';
import { Actor, Encounter, RulesActionRequest, DamageType } from '@/rules/state';

function makeActor(partial: Partial<Actor> & { id: string; name: string }): Actor {
  return {
    id: partial.id,
    name: partial.name,
    class: 'Fighter',
    level: 5,
    size: 'medium',
    abilities: { str: 16, dex: 14, con: 14, int: 10, wis: 10, cha: 10 },
    proficiencyBonus: 3,
    ac: { base: 16 },
    maxHp: 40,
    currentHp: 40,
    speed: 30,
    weapons: [
      { name: 'Longsword', ability: 'str', proficient: true, damageDice: '1d8', damageType: 'slashing' },
      { name: 'Shortbow', ability: 'dex', proficient: true, damageDice: '1d6', damageType: 'piercing', range: { normal: 80, long: 320 } },
    ],
    ...partial,
  };
}

const baseEncounter: Encounter = { id: 'e1', round: 1 };

describe('SRD 5.1 attack resolution', () => {
  it('hits and deals damage accounting for resistances', () => {
    const attacker = makeActor({ id: 'A', name: 'Attacker' });
    const defender = makeActor({ id: 'D', name: 'Defender', resistances: { resistant: ['slashing'] } });
    const actors = { A: attacker, D: defender };

    const req: RulesActionRequest = {
      seed: 1234,
      encounter: baseEncounter,
      actors,
      actorId: 'A',
      targetId: 'D',
      action: 'attack',
      payload: {
        weapon: attacker.weapons![0],
        targetAC: defender.ac.base,
      },
    };

    const out = resolveAction(req);
    expect(out.type).toBe('attack');
    if (out.type === 'attack') {
      expect(out.hit.kind).toMatch(/hit|miss/);
      if (out.damage) {
        // resistance halves damage
        const slashing = out.damage.breakdown.find((b) => b.type === 'slashing');
        expect(slashing?.adjusted).toBeLessThan(slashing!.amount);
        expect(out.damage.totalAfterReduction).toBeLessThanOrEqual(out.damage.totalBeforeReduction);
      }
      // action consumed
      expect(out.expended.actionAvailable).toBe(false);
    }
  });

  it('applies cover and can be blocked by full cover', () => {
    const attacker = makeActor({ id: 'A', name: 'Attacker' });
    const defender = makeActor({ id: 'D', name: 'Defender' });
    const actors = { A: attacker, D: defender };

    // full cover blocks
    const reqFull: RulesActionRequest = {
      seed: 42,
      encounter: baseEncounter,
      actors,
      actorId: 'A',
      targetId: 'D',
      action: 'attack',
      payload: {
        weapon: attacker.weapons![1],
        targetAC: defender.ac.base,
        cover: 'full',
      },
    };

    const outFull = resolveAction(reqFull);
    expect(outFull.type).toBe('attack');
    if (outFull.type === 'attack') {
      expect(outFull.hit.kind).toBe('blocked');
    }

    // half cover increases AC by +2; ensure outcome contains increased targetAC
    const reqHalf: RulesActionRequest = {
      seed: 43,
      encounter: baseEncounter,
      actors,
      actorId: 'A',
      targetId: 'D',
      action: 'attack',
      payload: {
        weapon: attacker.weapons![1],
        targetAC: defender.ac.base,
        cover: 'half',
      },
    };

    const outHalf = resolveAction(reqHalf);
    expect(outHalf.type).toBe('attack');
    if (outHalf.type === 'attack') {
      expect(outHalf.hit.targetAC).toBe(defender.ac.base + 2);
    }
  });

  it('supports critical hits doubling damage dice', () => {
    const attacker = makeActor({ id: 'A', name: 'Attacker' });
    const defender = makeActor({ id: 'D', name: 'Defender' });
    const actors = { A: attacker, D: defender };

    // use a seed that tends to produce high rolls; we will set criticalOn low to force crit
    const req: RulesActionRequest = {
      seed: 1,
      encounter: baseEncounter,
      actors,
      actorId: 'A',
      targetId: 'D',
      action: 'attack',
      payload: {
        weapon: attacker.weapons![0],
        targetAC: defender.ac.base,
        criticalOn: 1, // any roll is critical to test doubling path
      },
    };

    const out = resolveAction(req);
    if (out.type !== 'attack') throw new Error('wrong type');
    expect(out.hit.critical).toBe(true);
    expect(out.damage?.input[0].critical).toBe(true);
    // crude check: with doubling, totalBeforeReduction should be at least > base min
    expect(out.damage!.totalBeforeReduction).toBeGreaterThan(2);
  });

  it('applies immunity and vulnerability', () => {
    const attacker = makeActor({ id: 'A', name: 'Attacker' });
    const defender = makeActor({ id: 'D', name: 'Defender', resistances: { immune: ['slashing'], vulnerable: ['piercing'] } });
    const actors = { A: attacker, D: defender };

    // Add bonus piercing damage to test vulnerability
    const req: RulesActionRequest = {
      seed: 999,
      encounter: baseEncounter,
      actors,
      actorId: 'A',
      targetId: 'D',
      action: 'attack',
      payload: {
        weapon: attacker.weapons![0],
        targetAC: defender.ac.base,
        bonusDamageDice: [{ dice: '1d4', type: 'piercing' as DamageType }],
      },
    };

    const out = resolveAction(req);
    if (out.type !== 'attack') throw new Error('wrong type');
    const slash = out.damage!.breakdown.find((b) => b.type === 'slashing')!;
    const pierce = out.damage!.breakdown.find((b) => b.type === 'piercing')!;
    expect(slash.adjusted).toBe(0);
    expect(pierce.adjusted).toBeGreaterThan(pierce.amount); // vulnerability doubles
  });
});
