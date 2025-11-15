import { describe, it, expect } from 'vitest';
import { validateEncounterSpec } from '@/agents/rules/validators/encounter-validator';
import { defaultMonsters } from '@/services/encounters/monster-catalog';

describe('Encounter validation with party composition', () => {
  it('warns when party lacks counters to immunities', () => {
    const mons = [
      ...defaultMonsters,
      {
        id: 'srd:ghost',
        name: 'Ghost',
        cr: 4,
        xp: 1100,
        immunities: ['nonmagical'],
        tags: [],
      } as any,
    ];
    const spec: any = {
      type: 'combat',
      difficulty: 'hard',
      xpBudget: 1100,
      participants: { hostiles: [{ ref: 'srd:ghost', count: 1 }], friendlies: [] },
      terrain: { features: [] },
      objectives: [],
      startState: { initiative: 'roll', surprise: false },
    };
    const party = { members: [{ level: 5, damageTypes: ['slashing'] }] } as any;
    const res = validateEncounterSpec(spec, mons, party);
    expect(res.ok).toBe(false);
    expect(res.issues.join(' ')).toContain('immune');
  });
});
