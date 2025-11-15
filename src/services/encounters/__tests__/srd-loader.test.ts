import { describe, it, expect } from 'vitest';

import { loadMonsters } from '@/services/encounters/srd-loader';

describe('SRD Loader', () => {
  it('loads monsters from JSON fallback', () => {
    const mons = loadMonsters();
    expect(Array.isArray(mons)).toBe(true);
    expect(mons.length).toBeGreaterThan(3);
    expect(mons[0]).toHaveProperty('id');
  });
});
