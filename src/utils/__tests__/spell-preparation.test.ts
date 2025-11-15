import { describe, it, expect, vi, beforeEach } from 'vitest';

import type { Character, CharacterClass } from '@/types/character';

import {
  getSpellPreparationType,
  calculateSpellPreparationLimits,
  validateSpellPreparation,
  getAvailableRitualSpells,
  canCastRituals,
  getSpellPreparationInfo,
} from '@/utils/spell-preparation';

vi.mock('@/services/spellApi', () => {
  return {
    spellApi: {
      getClassSpells: vi.fn(async (className: string) => {
        if (className === 'Cleric') {
          return {
            cantrips: [
              { id: 'guidance', name: 'Guidance', level: 0 } as any,
              { id: 'sacred-flame', name: 'Sacred Flame', level: 0 } as any,
            ],
            spells: [
              { id: 'cure-wounds', name: 'Cure Wounds', level: 1 } as any,
              { id: 'bless', name: 'Bless', level: 1 } as any,
            ],
          };
        }
        if (className === 'Bard') {
          return {
            cantrips: [{ id: 'vicious-mockery', name: 'Vicious Mockery', level: 0 } as any],
            spells: [
              { id: 'healing-word', name: 'Healing Word', level: 1 } as any,
              { id: 'faerie-fire', name: 'Faerie Fire', level: 1 } as any,
            ],
          };
        }
        // Wizard
        return {
          cantrips: [
            { id: 'mage-hand', name: 'Mage Hand', level: 0 } as any,
            { id: 'prestidigitation', name: 'Prestidigitation', level: 0 } as any,
          ],
          spells: [
            { id: 'magic-missile', name: 'Magic Missile', level: 1 } as any,
            { id: 'shield', name: 'Shield', level: 1 } as any,
          ],
        };
      }),
      getAllSpells: vi.fn(async (_filters?: any) => {
        // A few ritual and non-ritual spells for intersection checks
        return [
          { id: 'detect-magic', name: 'Detect Magic', ritual: true, level: 1 } as any,
          { id: 'identify', name: 'Identify', ritual: true, level: 1 } as any,
          { id: 'shield', name: 'Shield', ritual: false, level: 1 } as any,
        ];
      }),
    },
  };
});

describe('Spell Preparation Utilities', () => {
  let wizard: CharacterClass;
  let cleric: CharacterClass;
  let bard: CharacterClass;

  beforeEach(() => {
    wizard = {
      id: 'wizard',
      name: 'Wizard',
      description: 'Arcane caster',
      hitDie: 6,
      primaryAbility: 'intelligence',
      savingThrowProficiencies: ['intelligence', 'wisdom'],
      skillChoices: [],
      numSkillChoices: 2,
      spellcasting: {
        ability: 'intelligence',
        cantripsKnown: 3,
        spellsKnown: 6,
        ritualCasting: true,
        spellbook: true,
      },
      classFeatures: [],
      armorProficiencies: [],
      weaponProficiencies: [],
    };

    cleric = {
      id: 'cleric',
      name: 'Cleric',
      description: 'Divine caster',
      hitDie: 8,
      primaryAbility: 'wisdom',
      savingThrowProficiencies: ['wisdom', 'charisma'],
      skillChoices: [],
      numSkillChoices: 2,
      spellcasting: { ability: 'wisdom', cantripsKnown: 3, ritualCasting: true } as any,
      classFeatures: [],
      armorProficiencies: [],
      weaponProficiencies: [],
    };

    bard = {
      id: 'bard',
      name: 'Bard',
      description: 'Performer caster',
      hitDie: 8,
      primaryAbility: 'charisma',
      savingThrowProficiencies: ['dexterity', 'charisma'],
      skillChoices: [],
      numSkillChoices: 3,
      spellcasting: { ability: 'charisma', cantripsKnown: 2, spellsKnown: 4 } as any,
      classFeatures: [],
      armorProficiencies: [],
      weaponProficiencies: [],
    };
  });

  const makeCharacter = (cls: CharacterClass, level = 3): Character => ({
    id: 'c1',
    name: 'Test',
    level,
    class: cls,
    abilityScores: {
      strength: { score: 10, modifier: 0, savingThrow: false },
      dexterity: { score: 10, modifier: 0, savingThrow: false },
      constitution: { score: 10, modifier: 0, savingThrow: false },
      intelligence: { score: 14, modifier: 2, savingThrow: false },
      wisdom: { score: 14, modifier: 2, savingThrow: false },
      charisma: { score: 12, modifier: 1, savingThrow: false },
    },
  });

  it('getSpellPreparationType maps classes correctly', () => {
    expect(getSpellPreparationType('Wizard')).toBe('spellbook');
    expect(getSpellPreparationType('Cleric')).toBe('prepared');
    expect(getSpellPreparationType('Bard')).toBe('known');
    expect(getSpellPreparationType('Fighter')).toBe('none');
  });

  it('calculateSpellPreparationLimits computes prepared/known counts', () => {
    const clericChar = makeCharacter(cleric, 3); // wis mod 2 + level 3 => 5
    const limitsPrepared = calculateSpellPreparationLimits(clericChar);
    expect(limitsPrepared.cantripsKnown).toBeGreaterThanOrEqual(0);
    expect(limitsPrepared.spellsPrepared).toBe(5);

    const bardChar = makeCharacter(bard, 1);
    const limitsKnown = calculateSpellPreparationLimits(bardChar);
    expect(limitsKnown.spellsKnown).toBe(4);

    const wizChar = makeCharacter(wizard, 2);
    const limitsWiz = calculateSpellPreparationLimits(wizChar);
    expect(limitsWiz.spellsKnown).toBe(6);
    expect(limitsWiz.spellsPrepared).toBe(4); // int mod 2 + level 2 => 4
    expect(limitsWiz.spellsPrepared ?? 0).toBeGreaterThanOrEqual(1);
  });

  it('validateSpellPreparation enforces availability and counts', async () => {
    const clericChar = makeCharacter(cleric, 3);

    // Too many prepared spells
    const tooMany = await validateSpellPreparation(clericChar, [
      'cure-wounds',
      'bless',
      'extra-1',
      'extra-2',
      'extra-3',
      'extra-4',
    ]);
    expect(tooMany.valid).toBe(false);
    expect(tooMany.errors.some((e) => e.includes('Can only prepare'))).toBe(true);

    // Invalid prepared spell not in class list
    const invalid = await validateSpellPreparation(clericChar, ['cure-wounds', 'fireball']);
    expect(invalid.valid).toBe(false);
    expect(invalid.errors.some((e) => e.includes('is not available'))).toBe(true);

    // Bard: known spells count enforced
    const bardChar = makeCharacter(bard, 1);
    const known = await validateSpellPreparation(
      bardChar,
      [],
      ['healing-word', 'faerie-fire', 'extra-1', 'extra-2', 'extra-3'],
    );
    expect(known.valid).toBe(false);
    expect(known.errors.some((e) => e.includes('Can only know'))).toBe(true);

    // Wizard: prepared must be in spellbook
    const wizChar = makeCharacter(wizard, 1);
    const wiz = await validateSpellPreparation(wizChar, ['magic-missile'], [], []);
    // Missing in spellbook
    expect(wiz.valid).toBe(false);
    expect(wiz.errors.some((e) => e.includes('not in spellbook'))).toBe(true);
  });

  it('getAvailableRitualSpells filters to class-available rituals', async () => {
    const wizChar = makeCharacter(wizard, 1);
    const rituals = await getAvailableRitualSpells(wizChar);
    // Should only include rituals that are also in wizard class list
    const ids = rituals.map((r) => r.id);
    expect(ids).not.toContain('shield');
  });

  it('canCastRituals reflects class setting', () => {
    const wizChar = makeCharacter(wizard, 1);
    expect(canCastRituals(wizChar)).toBe(true);
    const bardChar = makeCharacter(bard, 1);
    expect(canCastRituals(bardChar)).toBe(false);
  });

  it('getSpellPreparationInfo returns UI-friendly summary', () => {
    const wizChar = makeCharacter(wizard, 1);
    const info = getSpellPreparationInfo(wizChar);
    expect(info.className).toBe('Wizard');
    expect(info.preparationType).toBe('spellbook');
    expect(info.spellcastingAbility).toBe('intelligence');
  });
});
