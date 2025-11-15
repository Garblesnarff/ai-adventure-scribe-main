import { describe, it, expect } from 'vitest';

import type { Character } from '@/types/character';

import {
  buildCharacterDescriptionPrompt,
  buildCharacterImagePrompt,
  toCharacterPromptData,
  type CharacterPromptData,
} from '@/services/prompts/characterPrompts';

describe('characterPrompts', () => {
  it('injects mandatory physical traits into description prompts', () => {
    const promptData: CharacterPromptData = {
      name: 'Elaria Moonshadow',
      race: 'Wood Elf',
      class: 'Ranger',
      height: 68,
      weight: 150,
      eyes: 'hazel',
      skin: 'sun-kissed copper',
      hair: 'auburn',
    };

    const prompt = buildCharacterDescriptionPrompt(promptData, {
      includeAppearance: true,
    });

    expect(prompt).toContain('Physical Traits (MANDATORY):');
    expect(prompt).toContain('Height: 5\'8" (173 cm)');
    expect(prompt).toContain('Weight: 150 lbs (68 kg)');
    expect(prompt).toContain('Eye Color: hazel');
    expect(prompt).toContain('Skin Tone: sun-kissed copper');
    expect(prompt).toContain('Hair: auburn');
  });

  it('adds exact physical traits to image prompts for dragonborn', () => {
    const promptData: CharacterPromptData = {
      name: 'Tharion Flamecrest',
      race: 'Dragonborn',
      class: 'Paladin',
      height: 80,
      weight: 320,
      eyes: ' molten gold ',
      skin: 'burnished bronze scales',
      hair: '',
    };

    const prompt = buildCharacterImagePrompt(promptData, {
      style: 'full-body',
      artStyle: 'fantasy-art',
      theme: 'celestial forge',
    });

    expect(prompt.toLowerCase()).toContain('dragonborn features');
    expect(prompt).toContain('exact physical traits: Height: 6\'8" (203 cm);');
    expect(prompt).toContain('Weight: 320 lbs (145 kg)');
    expect(prompt).toContain('Eye Color: molten gold');
    expect(prompt).toContain('Skin Tone: burnished bronze scales');
  });

  it('builds prompt data from character object including physical fields', () => {
    const character: Character = {
      name: 'Vorik Stonebinder',
      race: {
        id: 'dwarf',
        name: 'Dwarf',
        description: '',
        abilityScoreIncrease: {},
        speed: 25,
        traits: [],
        languages: [],
      },
      subrace: null,
      class: {
        id: 'fighter',
        name: 'Fighter',
        description: '',
        hitDie: 10,
        primaryAbility: 'strength',
        savingThrowProficiencies: ['strength', 'constitution'],
        skillChoices: [],
        numSkillChoices: 0,
        classFeatures: [],
        armorProficiencies: [],
        weaponProficiencies: [],
      },
      background: null,
      level: 4,
      alignment: 'Lawful Good',
      abilityScores: {
        strength: { score: 18, modifier: 4, savingThrow: true },
        dexterity: { score: 12, modifier: 1, savingThrow: false },
        constitution: { score: 16, modifier: 3, savingThrow: true },
        intelligence: { score: 10, modifier: 0, savingThrow: false },
        wisdom: { score: 11, modifier: 0, savingThrow: false },
        charisma: { score: 8, modifier: -1, savingThrow: false },
      },
      height: 54,
      weight: 190,
      eyes: 'steel gray',
      skin: 'weathered russet',
      hair: 'braided copper',
      description: 'A stalwart defender of the clan halls.',
      personalityTraits: ['Stoic in battle', 'Loyal to a fault'],
      ideals: ['Honor above all'],
      bonds: ['Sworn to guard the ancestral forge'],
      flaws: ['Slow to trust outsiders'],
      enhancementSelections: [],
      enhancementEffects: {},
      user_id: '',
      levelHistory: [],
      experience: 0,
      inspiration: false,
      personalityNotes: '',
      personalityIntegration: { activeTraits: [], inspirationTriggers: [], inspirationHistory: [] },
      equipment: [],
      skillProficiencies: [],
      toolProficiencies: [],
      savingThrowProficiencies: [],
      languages: [],
      cantrips: [],
      knownSpells: [],
      preparedSpells: [],
      ritualSpells: [],
    };

    const promptData = toCharacterPromptData(character);

    expect(promptData.race).toBe('Dwarf');
    expect(promptData.class).toBe('Fighter');
    expect(promptData.height).toBe(54);
    expect(promptData.weight).toBe(190);
    expect(promptData.eyes).toBe('steel gray');
    expect(promptData.ability_scores).toMatchObject({ strength: 18, constitution: 16 });
  });
});
