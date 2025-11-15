import { describe, it, expect } from 'vitest';

import generator from '@/services/encounters/encounter-generator';

describe('Non-combat templates', () => {
  it('generates social encounter when requested', () => {
    const spec = generator.generate({
      type: 'social',
      party: { members: [{ level: 3 }] },
      world: { biome: 'city' },
    });
    expect(spec.type).toBe('social');
    expect(spec.participants.hostiles.length).toBe(0);
  });

  it('generates exploration encounter when requested', () => {
    const spec = generator.generate({
      type: 'exploration',
      party: { members: [{ level: 3 }] },
      world: { biome: 'forest' },
    });
    expect(spec.type).toBe('exploration');
    expect(spec.objectives[0]).toContain('hazard');
  });
});
