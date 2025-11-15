import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import type { Character, CharacterClass, CharacterRace, Subrace } from '@/types/character';

import {
  isSpellValidForClassAsync,
  calculateMulticlassCasterLevel,
  getEnhancedSpellcastingInfo,
  validateMulticlassSpellSelection,
  validateSpellSelectionAsync,
  getSpellcastingInfo,
} from '@/utils/spell-validation';

// Mock spellApi used by calculateMulticlassCasterLevel
vi.mock('@/services/spellApi', () => {
  return {
    spellApi: {
      calculateMulticlassCasterLevel: vi.fn(
        async (classLevels: { className: string; level: number }[]) => {
          const total = classLevels.reduce((s, c) => s + c.level, 0);
          return {
            totalCasterLevel: total,
            spellSlots: {
              caster_level: total,
              spell_slots_1: 2,
              spell_slots_2: 0,
              spell_slots_3: 0,
              spell_slots_4: 0,
              spell_slots_5: 0,
              spell_slots_6: 0,
              spell_slots_7: 0,
              spell_slots_8: 0,
              spell_slots_9: 0,
            },
            pactMagicSlots: total >= 2 ? { level: 1, slots: 1 } : null,
          } as any;
        },
      ),
    },
  };
});

describe('spell-validation async/multiclass utilities', () => {
  let wizard: CharacterClass;
  let fighter: CharacterClass;
  let warlock: CharacterClass;
  let human: CharacterRace;
  let tiefling: Subrace;

  beforeEach(() => {
    wizard = {
      id: 'wizard',
      name: 'Wizard',
      description: 'Arcane',
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
    fighter = {
      id: 'fighter',
      name: 'Fighter',
      description: 'Warrior',
      hitDie: 10,
      primaryAbility: 'strength',
      savingThrowProficiencies: ['strength', 'constitution'],
      skillChoices: [],
      numSkillChoices: 2,
      classFeatures: [],
      armorProficiencies: [],
      weaponProficiencies: [],
    } as any;
    warlock = {
      id: 'warlock',
      name: 'Warlock',
      description: 'Pact',
      hitDie: 8,
      primaryAbility: 'charisma',
      savingThrowProficiencies: ['wisdom', 'charisma'],
      skillChoices: [],
      numSkillChoices: 2,
      spellcasting: {
        ability: 'charisma',
        cantripsKnown: 2,
        spellsKnown: 2,
        ritualCasting: false,
      } as any,
      classFeatures: [],
      armorProficiencies: [],
      weaponProficiencies: [],
    };
    human = {
      id: 'human',
      name: 'Human',
      description: '',
      abilityScoreIncrease: {},
      speed: 30,
      traits: [],
      languages: ['Common'],
    };
    tiefling = {
      id: 'tiefling',
      name: 'Tiefling',
      description: '',
      abilityScoreIncrease: { charisma: 2 },
      traits: ['Infernal Legacy'],
      cantrips: ['thaumaturgy'],
    };
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it('isSpellValidForClassAsync returns true on ok response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: true, json: async () => ({ isValid: true }) })) as any,
    );
    await expect(isSpellValidForClassAsync('magic-missile', 'Wizard')).resolves.toBe(true);
  });

  it('isSpellValidForClassAsync returns false on non-ok response', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, statusText: 'Bad' })) as any);
    await expect(isSpellValidForClassAsync('magic-missile', 'Wizard')).resolves.toBe(false);
  });

  it('isSpellValidForClassAsync returns false on fetch error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('network');
      }) as any,
    );
    await expect(isSpellValidForClassAsync('magic-missile', 'Wizard')).resolves.toBe(false);
  });

  it('calculateMulticlassCasterLevel aggregates levels', async () => {
    const calc = await calculateMulticlassCasterLevel([
      { className: 'Wizard', level: 1 },
      { className: 'Warlock', level: 2 },
    ]);
    expect(calc.totalCasterLevel).toBe(3);
    expect(calc.spellSlots?.caster_level).toBe(3);
    expect(calc.pactMagicSlots).toEqual({ level: 1, slots: 1 });
  });

  it('getEnhancedSpellcastingInfo returns base with multiclass info for multiclass char', async () => {
    const ch: Character = {
      id: 'c',
      name: 'MC',
      level: 3,
      class: wizard,
      race: human,
      abilityScores: {
        strength: { score: 10, modifier: 0, savingThrow: false },
        dexterity: { score: 10, modifier: 0, savingThrow: false },
        constitution: { score: 10, modifier: 0, savingThrow: false },
        intelligence: { score: 14, modifier: 2, savingThrow: false },
        wisdom: { score: 12, modifier: 1, savingThrow: false },
        charisma: { score: 12, modifier: 1, savingThrow: false },
      },
      classLevels: [
        { classId: 'wizard', className: 'Wizard', level: 2, hitDie: 6, features: [] },
        { classId: 'warlock', className: 'Warlock', level: 1, hitDie: 8, features: [] },
      ],
    };
    const info = await getEnhancedSpellcastingInfo(ch);
    expect(info?.cantripsKnown).toBe(getSpellcastingInfo(wizard)!.cantripsKnown);
    expect(info?.multiclassInfo?.totalCasterLevel).toBe(3);
  });

  it('validateMulticlassSpellSelection returns warnings and valid for multiclass', async () => {
    const ch: Character = {
      id: 'c',
      name: 'MC',
      level: 3,
      class: wizard,
      race: human,
      abilityScores: {
        strength: { score: 10, modifier: 0, savingThrow: false },
        dexterity: { score: 10, modifier: 0, savingThrow: false },
        constitution: { score: 10, modifier: 0, savingThrow: false },
        intelligence: { score: 14, modifier: 2, savingThrow: false },
        wisdom: { score: 12, modifier: 1, savingThrow: false },
        charisma: { score: 12, modifier: 1, savingThrow: false },
      },
      classLevels: [
        { classId: 'wizard', className: 'Wizard', level: 2, hitDie: 6, features: [] },
        { classId: 'warlock', className: 'Warlock', level: 1, hitDie: 8, features: [] },
      ],
    };
    const res = await validateMulticlassSpellSelection(
      ch,
      ['mage-hand', 'prestidigitation', 'light'],
      ['magic-missile', 'shield', 'detect-magic', 'burning-hands', 'sleep', 'color-spray'],
    );
    expect(res.valid).toBe(true);
    expect(res.warnings.some((w) => w.includes('Multiclass caster level: 3'))).toBe(true);
    expect(res.warnings.some((w) => w.includes('Pact Magic'))).toBe(true);
  });

  it('validateMulticlassSpellSelection remains valid but warns when calculation fails', async () => {
    const spy = (await import('@/services/spellApi')).spellApi
      .calculateMulticlassCasterLevel as any;
    spy.mockRejectedValueOnce(new Error('fail'));
    const ch: Character = {
      id: 'c2',
      name: 'Bad',
      level: 3,
      class: wizard,
      race: human,
      abilityScores: {
        strength: { score: 10, modifier: 0, savingThrow: false },
        dexterity: { score: 10, modifier: 0, savingThrow: false },
        constitution: { score: 10, modifier: 0, savingThrow: false },
        intelligence: { score: 14, modifier: 2, savingThrow: false },
        wisdom: { score: 12, modifier: 1, savingThrow: false },
        charisma: { score: 12, modifier: 1, savingThrow: false },
      },
      classLevels: [
        { classId: 'wizard', className: 'Wizard', level: 2, hitDie: 6, features: [] },
        { classId: 'warlock', className: 'Warlock', level: 1, hitDie: 8, features: [] },
      ],
    };
    const res = await validateMulticlassSpellSelection(ch);
    expect(res.valid).toBe(true);
    expect(res.warnings.some((w) => w.includes('Multiclass caster level: 0'))).toBe(true);
  });

  it('validateMulticlassSpellSelection falls back for single-class', async () => {
    const ch: Character = {
      id: 'c3',
      name: 'Single',
      level: 1,
      class: wizard,
      race: human,
      abilityScores: {
        strength: { score: 10, modifier: 0, savingThrow: false },
        dexterity: { score: 10, modifier: 0, savingThrow: false },
        constitution: { score: 10, modifier: 0, savingThrow: false },
        intelligence: { score: 14, modifier: 2, savingThrow: false },
        wisdom: { score: 12, modifier: 1, savingThrow: false },
        charisma: { score: 12, modifier: 1, savingThrow: false },
      },
    };
    const res = await validateMulticlassSpellSelection(
      ch,
      ['mage-hand', 'prestidigitation', 'light'],
      ['magic-missile', 'shield', 'detect-magic', 'burning-hands', 'sleep', 'color-spray'],
    );
    expect(res.valid).toBe(true);
    expect(res.errors).toHaveLength(0);
  });

  describe('validateSpellSelectionAsync', () => {
    it('validates non-spellcaster with racial cantrip', async () => {
      const ch: Character = {
        id: 'f1',
        name: 'Tiefling Fighter',
        level: 1,
        class: fighter,
        race: human,
        subrace: tiefling,
        abilityScores: {
          strength: { score: 10, modifier: 0, savingThrow: false },
          dexterity: { score: 10, modifier: 0, savingThrow: false },
          constitution: { score: 10, modifier: 0, savingThrow: false },
          intelligence: { score: 10, modifier: 0, savingThrow: false },
          wisdom: { score: 10, modifier: 0, savingThrow: false },
          charisma: { score: 10, modifier: 0, savingThrow: false },
        },
      } as any;
      const res = await validateSpellSelectionAsync(ch, ['thaumaturgy'], [], [], []);
      expect(res.valid).toBe(true);
    });

    it('rejects racial cantrip count mismatch for non-spellcaster', async () => {
      const ch: Character = {
        id: 'f2',
        name: 'Tiefling Fighter',
        level: 1,
        class: fighter,
        race: human,
        subrace: tiefling,
        abilityScores: {
          strength: { score: 10, modifier: 0, savingThrow: false },
          dexterity: { score: 10, modifier: 0, savingThrow: false },
          constitution: { score: 10, modifier: 0, savingThrow: false },
          intelligence: { score: 10, modifier: 0, savingThrow: false },
          wisdom: { score: 10, modifier: 0, savingThrow: false },
          charisma: { score: 10, modifier: 0, savingThrow: false },
        },
      } as any;
      const res = await validateSpellSelectionAsync(ch, [], [], [], []);
      expect(res.valid).toBe(false);
      expect(res.errors.some((e) => e.type === 'COUNT_MISMATCH')).toBe(true);
    });

    it('flags invalid cantrip with availableCantripIds', async () => {
      const ch: Character = {
        id: 'w1',
        name: 'Wizard',
        level: 1,
        class: wizard,
        race: human,
        abilityScores: {
          strength: { score: 10, modifier: 0, savingThrow: false },
          dexterity: { score: 10, modifier: 0, savingThrow: false },
          constitution: { score: 10, modifier: 0, savingThrow: false },
          intelligence: { score: 14, modifier: 2, savingThrow: false },
          wisdom: { score: 12, modifier: 1, savingThrow: false },
          charisma: { score: 10, modifier: 0, savingThrow: false },
        },
      };
      const res = await validateSpellSelectionAsync(
        ch,
        ['mage-hand', 'prestidigitation', 'guidance'],
        [],
        ['mage-hand', 'prestidigitation'],
        [],
      );
      expect(res.valid).toBe(false);
      expect(res.errors.some((e) => e.type === 'INVALID_SPELL' && e.spellId === 'guidance')).toBe(
        true,
      );
    });

    it('enforces spells known count and invalid spell with availableSpellIds', async () => {
      const ch: Character = {
        id: 'w2',
        name: 'Wizard',
        level: 1,
        class: wizard,
        race: human,
        abilityScores: {
          strength: { score: 10, modifier: 0, savingThrow: false },
          dexterity: { score: 10, modifier: 0, savingThrow: false },
          constitution: { score: 10, modifier: 0, savingThrow: false },
          intelligence: { score: 14, modifier: 2, savingThrow: false },
          wisdom: { score: 12, modifier: 1, savingThrow: false },
          charisma: { score: 10, modifier: 0, savingThrow: false },
        },
      };
      const spells = ['magic-missile', 'shield', 'detect-magic', 'burning-hands', 'sleep']; // 5 instead of 6
      const res = await validateSpellSelectionAsync(
        ch,
        ['mage-hand', 'prestidigitation', 'light'],
        spells,
        ['mage-hand', 'prestidigitation', 'light'],
        ['magic-missile', 'shield'],
      );
      expect(res.valid).toBe(false);
      expect(res.errors.some((e) => e.type === 'COUNT_MISMATCH')).toBe(true);
      // Also should complain that detect-magic etc. aren't in availableSpellIds
      expect(res.errors.some((e) => e.type === 'INVALID_SPELL')).toBe(true);
    });
  });
});
