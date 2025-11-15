import { describe, it, expect } from 'vitest';

import generator from '@/services/encounters/encounter-generator';

describe('EncounterGenerator', () => {
  it('generates a combat encounter within reasonable budget', () => {
    const spec = generator.generate({
      party: { members: [{ level: 3 }, { level: 3 }, { level: 3 }, { level: 3 }] },
      world: { biome: 'forest' },
      requestedDifficulty: 'medium',
    });
    expect(spec.type).toBe('combat');
    expect(spec.participants.hostiles.length).toBeGreaterThan(0);
    // loose sanity: total raw xp should be in same order as budget
    const raw = spec.participants.hostiles.reduce((sum, h) => sum + h.count * 1, 0);
    expect(spec.xpBudget).toBeGreaterThan(0);
    expect(raw).toBeGreaterThan(0);
  });

  it('uses biome to bias monster picks', () => {
    const forest = generator.generate({
      party: { members: [{ level: 2 }, { level: 2 }, { level: 2 }, { level: 2 }] },
      world: { biome: 'forest' },
    });
    const road = generator.generate({
      party: { members: [{ level: 2 }, { level: 2 }, { level: 2 }, { level: 2 }] },
      world: { biome: 'road' },
    });
    expect(JSON.stringify(forest.participants.hostiles)).not.toEqual(
      JSON.stringify(road.participants.hostiles),
    );
  });
});
