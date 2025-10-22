import { describe, it, expect } from 'vitest';
import { getProficiencyBonus, passivePerception, coverACBonus, Actor } from '@/rules/state';
import { calculateDCFromSpellcasting } from '@/rules/actions';

const actor: Actor = {
  id: 'p',
  name: 'Perceptive',
  level: 9,
  size: 'medium',
  abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 16, cha: 10 },
  ac: { base: 12 },
  maxHp: 10,
  currentHp: 10,
  speed: 30,
  skillProficiencies: { perception: true },
};

describe('Helpers and derived values', () => {
  it('computes proficiency bonus by level', () => {
    expect(getProficiencyBonus(1)).toBe(2);
    expect(getProficiencyBonus(5)).toBe(3);
    expect(getProficiencyBonus(9)).toBe(4);
    expect(getProficiencyBonus(13)).toBe(5);
    expect(getProficiencyBonus(17)).toBe(6);
  });

  it('computes passive perception', () => {
    const pp = passivePerception(actor);
    // 10 + WIS(16)=+3 + PROF(9th level = +4)
    expect(pp).toBe(10 + 3 + 4);
  });

  it('applies cover AC bonus mapping', () => {
    expect(coverACBonus('none')).toBe(0);
    expect(coverACBonus('half')).toBe(2);
    expect(coverACBonus('three-quarters')).toBe(5);
    expect(coverACBonus('full')).toBe(999);
  });

  it('calculates spell save DC', () => {
    const dc = calculateDCFromSpellcasting('cha', { ...actor, abilities: { ...actor.abilities, cha: 18 } });
    // 8 + CHA(18)=+4 + PROF(9th=+4) => 16
    expect(dc).toBe(16);
  });
});
