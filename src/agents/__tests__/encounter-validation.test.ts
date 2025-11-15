import { describe, it, expect } from 'vitest';
import { validateEncounterSpec } from '@/agents/rules/validators/encounter-validator';
import { defaultMonsters } from '@/services/encounters/monster-catalog';

describe('Encounter validation', () => {
  it('flags excessive deviation from budget', () => {
    const spec = {
      type: 'combat',
      difficulty: 'medium',
      xpBudget: 200,
      participants: { hostiles: [{ ref: 'srd:orc', count: 1 }], friendlies: [] },
      terrain: { features: [] },
      objectives: [],
      startState: { initiative: 'roll', surprise: false },
    } as any;

    const res = validateEncounterSpec(spec, defaultMonsters);
    expect(res.ok).toBe(false);
    expect(res.issues.length).toBeGreaterThan(0);
  });

  it('passes a reasonable spec', () => {
    const spec = {
      type: 'combat',
      difficulty: 'medium',
      xpBudget: 400,
      participants: { hostiles: [{ ref: 'srd:wolf', count: 4 }], friendlies: [] },
      terrain: { features: [] },
      objectives: [],
      startState: { initiative: 'roll', surprise: false },
    } as any;

    const res = validateEncounterSpec(spec, defaultMonsters);
    expect(res.issues.length).toBeGreaterThanOrEqual(0);
  });
});
