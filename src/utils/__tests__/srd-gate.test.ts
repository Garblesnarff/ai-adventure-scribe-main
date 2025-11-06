import { describe, expect, it } from 'vitest';

import {
  ensureSrdEntity,
  filterToSrd,
  getCanonicalSrdName,
  isSrdEntity,
  listSrdCategories,
  validateSrdEntities,
  SrdViolationError,
} from '@/utils/srd/srdGate';

describe('srdGate', () => {
  it('exposes SRD categories', () => {
    const categories = listSrdCategories();
    expect(categories.length).toBeGreaterThan(0);
    expect(categories).toContain('classes');
    expect(categories).not.toContain('license');
  });

  it('matches canonical entries case-insensitively', () => {
    expect(isSrdEntity('classes', 'wizard')).toBe(true);
    expect(isSrdEntity('classes', 'Wizard')).toBe(true);
    expect(isSrdEntity('classes', 'WIZARD')).toBe(true);
  });

  it('returns canonical name when variants are provided', () => {
    expect(getCanonicalSrdName('monsters', 'vampire (mist form)')).toBe('Vampire, Mist Form');
    expect(getCanonicalSrdName('monsters', '  vampire  mist   form  ')).toBe('Vampire, Mist Form');
  });

  it('rejects non-SRD entities', () => {
    expect(isSrdEntity('classes', 'Artificer')).toBe(false);
    expect(getCanonicalSrdName('classes', 'Artificer')).toBeNull();
  });

  it('validates collections and separates disallowed entries', () => {
    const result = validateSrdEntities('spells', ['Shield', 'Fake Spell', 'magic missile']);
    expect(result.allowed).toEqual(['Shield', 'magic missile']);
    expect(result.canonical).toEqual(['Shield', 'Magic Missile']);
    expect(result.disallowed).toEqual(['Fake Spell']);
  });

  it('filters input values to canonical SRD entries', () => {
    expect(filterToSrd('spells', ['shield', 'Fake Spell', 'MAGIC MISSILE'])).toEqual([
      'Shield',
      'Magic Missile',
    ]);
  });

  it('throws a descriptive error when ensureSrdEntity fails', () => {
    expect(() => ensureSrdEntity('classes', 'Artificer')).toThrowError(SrdViolationError);
  });
});
