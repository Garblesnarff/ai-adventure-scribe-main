import { describe, it, expect } from 'vitest';

import { validateEncounterSpec } from '@/agents/rules/validators/encounter-validator';

describe('Hazard save/DC validation', () => {
  it('flags out-of-bounds DC and invalid timing', () => {
    const spec: any = {
      type: 'exploration',
      difficulty: 'medium',
      xpBudget: 0,
      participants: { hostiles: [], friendlies: [] },
      terrain: { features: [] },
      objectives: [],
      startState: { initiative: 'fixed', surprise: false },
      hazards: [{ save: { ability: 'dex', dc: 40, timing: 'weird' } }],
    };
    const res = validateEncounterSpec(spec, []);
    expect(res.ok).toBe(false);
    expect(res.issues.join(' ')).toMatch(/DC/);
    expect(res.issues.join(' ')).toMatch(/timing/);
  });
});
