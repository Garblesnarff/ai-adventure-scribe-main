import { describe, expect, it } from 'vitest';

import { getAppearanceOptions } from './appearanceOptions';

describe('getAppearanceOptions', () => {
  it('returns default options for unknown race', () => {
    const options = getAppearanceOptions('unknown');
    expect(options.eyeColors).toContain('brown');
    expect(options.skinColors).toContain('olive');
    expect(options.hairColors).toContain('black');
  });

  it('normalizes race names and returns race-specific options', () => {
    const options = getAppearanceOptions('High Elf');
    expect(options.eyeColors).toEqual(['blue', 'green', 'silver', 'violet']);
    expect(options.skinColors).toEqual(['alabaster', 'bronze', 'golden']);
    expect(options.hairColors).toEqual(['blonde', 'gold', 'silver', 'white']);
  });

  it('applies subrace overrides when provided', () => {
    const options = getAppearanceOptions('Elf', 'drow');
    expect(options.eyeColors).toEqual(['crimson', 'lavender', 'pale pink', 'white']);
    expect(options.skinColors).toEqual(['charcoal', 'ebony', 'obsidian']);
    expect(options.hairColors).toEqual(['silver', 'white']);
  });

  it('handles dragonborn scale coloration', () => {
    const options = getAppearanceOptions('Dragonborn');
    expect(options.skinColors).toContain('red');
    expect(options.skinColors.length).toBeGreaterThanOrEqual(10);
    expect(options.eyeColors).toEqual(['brass', 'bronze', 'copper', 'gold', 'silver']);
  });
});
