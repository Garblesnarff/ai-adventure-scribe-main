import type { Character, CharacterClass, CharacterRace, Subrace, Spell } from '@/types/character';

/**
 * Spell Test Helpers
 *
 * Reusable test utilities for spell selection testing:
 * - Mock character data
 * - Mock spell data
 * - Test helper functions
 * - Validation helpers
 */

// Mock Character Classes
export const mockWizard: CharacterClass = {
  id: 'wizard',
  name: 'Wizard',
  description: 'A master of arcane magic',
  hitDie: 6,
  primaryAbility: 'intelligence',
  savingThrowProficiencies: ['intelligence', 'wisdom'],
  skillChoices: ['Arcana', 'History', 'Insight', 'Investigation', 'Medicine', 'Religion'],
  numSkillChoices: 2,
  spellcasting: {
    ability: 'intelligence',
    cantripsKnown: 3,
    spellsKnown: 6,
    ritualCasting: true,
    spellbook: true,
  },
  classFeatures: [],
  armorProficiencies: ['Light armor'],
  weaponProficiencies: ['Daggers', 'darts', 'slings', 'quarterstaffs', 'light crossbows'],
};

export const mockCleric: CharacterClass = {
  id: 'cleric',
  name: 'Cleric',
  description: 'A divine spellcaster',
  hitDie: 8,
  primaryAbility: 'wisdom',
  savingThrowProficiencies: ['wisdom', 'charisma'],
  skillChoices: ['History', 'Insight', 'Medicine', 'Persuasion', 'Religion'],
  numSkillChoices: 2,
  spellcasting: {
    ability: 'wisdom',
    cantripsKnown: 3,
    ritualCasting: true,
  },
  classFeatures: [],
  armorProficiencies: ['Light armor', 'medium armor', 'shields'],
  weaponProficiencies: ['Simple weapons'],
};

export const mockBard: CharacterClass = {
  id: 'bard',
  name: 'Bard',
  description: 'A master of song, speech, and the magic they contain',
  hitDie: 8,
  primaryAbility: 'charisma',
  savingThrowProficiencies: ['dexterity', 'charisma'],
  skillChoices: ['Any'],
  numSkillChoices: 3,
  spellcasting: {
    ability: 'charisma',
    cantripsKnown: 2,
    spellsKnown: 4,
    ritualCasting: false,
  },
  classFeatures: [],
  armorProficiencies: ['Light armor'],
  weaponProficiencies: ['Simple weapons', 'hand crossbows', 'longswords', 'rapiers', 'shortswords'],
};

export const mockSorcerer: CharacterClass = {
  id: 'sorcerer',
  name: 'Sorcerer',
  description: 'A spellcaster with innate magical ability',
  hitDie: 6,
  primaryAbility: 'charisma',
  savingThrowProficiencies: ['constitution', 'charisma'],
  skillChoices: ['Arcana', 'Deception', 'Insight', 'Intimidation', 'Persuasion', 'Religion'],
  numSkillChoices: 2,
  spellcasting: {
    ability: 'charisma',
    cantripsKnown: 4,
    spellsKnown: 2,
    ritualCasting: false,
  },
  classFeatures: [],
  armorProficiencies: [],
  weaponProficiencies: ['Daggers', 'darts', 'slings', 'quarterstaffs', 'light crossbows'],
};

export const mockWarlock: CharacterClass = {
  id: 'warlock',
  name: 'Warlock',
  description: 'A wielder of magic derived from a bargain with an extraplanar entity',
  hitDie: 8,
  primaryAbility: 'charisma',
  savingThrowProficiencies: ['wisdom', 'charisma'],
  skillChoices: [
    'Arcana',
    'Deception',
    'History',
    'Intimidation',
    'Investigation',
    'Nature',
    'Religion',
  ],
  numSkillChoices: 2,
  spellcasting: {
    ability: 'charisma',
    cantripsKnown: 2,
    spellsKnown: 2,
    pactMagic: true,
    ritualCasting: false,
  },
  classFeatures: [],
  armorProficiencies: ['Light armor'],
  weaponProficiencies: ['Simple weapons'],
};

export const mockPaladin: CharacterClass = {
  id: 'paladin',
  name: 'Paladin',
  description: 'A holy warrior bound to a sacred oath',
  hitDie: 10,
  primaryAbility: 'strength',
  savingThrowProficiencies: ['wisdom', 'charisma'],
  skillChoices: ['Athletics', 'Insight', 'Intimidation', 'Medicine', 'Persuasion', 'Religion'],
  numSkillChoices: 2,
  spellcasting: {
    ability: 'charisma',
    cantripsKnown: 0,
    ritualCasting: false,
  },
  classFeatures: [],
  armorProficiencies: ['All armor', 'shields'],
  weaponProficiencies: ['Simple weapons', 'martial weapons'],
};

export const mockRanger: CharacterClass = {
  id: 'ranger',
  name: 'Ranger',
  description: 'A warrior of the wilderness',
  hitDie: 10,
  primaryAbility: 'dexterity',
  savingThrowProficiencies: ['strength', 'dexterity'],
  skillChoices: [
    'Animal Handling',
    'Athletics',
    'Insight',
    'Investigation',
    'Nature',
    'Perception',
    'Stealth',
    'Survival',
  ],
  numSkillChoices: 3,
  spellcasting: {
    ability: 'wisdom',
    cantripsKnown: 0,
    ritualCasting: false,
  },
  classFeatures: [],
  armorProficiencies: ['Light armor', 'medium armor', 'shields'],
  weaponProficiencies: ['Simple weapons', 'martial weapons'],
};

export const mockFighter: CharacterClass = {
  id: 'fighter',
  name: 'Fighter',
  description: 'A master of martial combat',
  hitDie: 10,
  primaryAbility: 'strength',
  savingThrowProficiencies: ['strength', 'constitution'],
  skillChoices: [
    'Acrobatics',
    'Animal Handling',
    'Athletics',
    'History',
    'Insight',
    'Intimidation',
    'Perception',
    'Survival',
  ],
  numSkillChoices: 2,
  classFeatures: [],
  armorProficiencies: ['All armor', 'shields'],
  weaponProficiencies: ['Simple weapons', 'martial weapons'],
};

// Mock Races
export const mockHuman: CharacterRace = {
  id: 'human',
  name: 'Human',
  description: 'The most adaptable and ambitious people among the common races',
  abilityScoreIncrease: {
    strength: 1,
    dexterity: 1,
    constitution: 1,
    intelligence: 1,
    wisdom: 1,
    charisma: 1,
  },
  speed: 30,
  traits: ['Versatile'],
  languages: ['Common'],
};

export const mockElf: CharacterRace = {
  id: 'elf',
  name: 'Elf',
  description: 'A magical people of otherworldly grace',
  abilityScoreIncrease: { dexterity: 2 },
  speed: 30,
  traits: ['Darkvision', 'Keen Senses', 'Fey Ancestry', 'Trance'],
  languages: ['Common', 'Elvish'],
};

// Mock Subraces
export const mockHighElfSubrace: Subrace = {
  id: 'high-elf',
  name: 'High Elf',
  description: 'High elves possess a keen mind and mastery of basic magic',
  abilityScoreIncrease: { intelligence: 1 },
  traits: ['Elf Weapon Training', 'Extra Language'],
  bonusCantrip: {
    source: 'wizard',
    count: 1,
  },
  weaponProficiencies: ['Longswords', 'shortbows', 'longbows'],
  languages: ['One extra language'],
};

export const mockWoodElfSubrace: Subrace = {
  id: 'wood-elf',
  name: 'Wood Elf',
  description: 'Wood elves have keen senses and intuition, and fleet feet',
  abilityScoreIncrease: { wisdom: 1 },
  traits: ['Elf Weapon Training', 'Fleet of Foot', 'Mask of the Wild'],
  speed: 35,
  weaponProficiencies: ['Longswords', 'shortbows', 'longbows'],
};

export const mockDrowSubrace: Subrace = {
  id: 'drow',
  name: 'Drow',
  description: 'Drow are a subterranean people with innate magical abilities',
  abilityScoreIncrease: { charisma: 1 },
  traits: ['Superior Darkvision', 'Sunlight Sensitivity', 'Drow Magic'],
  cantrips: ['dancing-lights'],
  spells: ['faerie-fire', 'darkness'], // Gained at higher levels
  weaponProficiencies: ['Rapiers', 'shortswords', 'hand crossbows'],
};

export const mockTieflingSubrace: Subrace = {
  id: 'tiefling',
  name: 'Tiefling',
  description: 'Tieflings are derived from human bloodlines touched by fiendish influence',
  abilityScoreIncrease: { charisma: 2, intelligence: 1 },
  traits: ['Darkvision', 'Hellish Resistance', 'Infernal Legacy'],
  cantrips: ['thaumaturgy'],
  spells: ['hellish-rebuke', 'darkness'], // Gained at higher levels
};

export const mockForestGnomeSubrace: Subrace = {
  id: 'forest-gnome',
  name: 'Forest Gnome',
  description: 'Forest gnomes have natural kinship with beasts of the forest',
  abilityScoreIncrease: { dexterity: 1 },
  traits: ['Natural Illusionist', 'Speak with Small Beasts'],
  cantrips: ['minor-illusion'],
};

// Mock Spells
export const mockCantrips: Spell[] = [
  {
    id: 'mage-hand',
    name: 'Mage Hand',
    level: 0,
    school: 'Conjuration',
    castingTime: '1 action',
    range: '30 feet',
    components: 'V, S',
    verbal: true,
    somatic: true,
    duration: 'Concentration, up to 1 minute',
    description: 'A spectral, floating hand appears at a point you choose within range.',
    concentration: true,
  },
  {
    id: 'prestidigitation',
    name: 'Prestidigitation',
    level: 0,
    school: 'Transmutation',
    castingTime: '1 action',
    range: '10 feet',
    components: 'V, S',
    verbal: true,
    somatic: true,
    duration: 'Up to 1 hour',
    description: 'This spell is a minor magical trick that novice spellcasters use for practice.',
  },
  {
    id: 'light',
    name: 'Light',
    level: 0,
    school: 'Evocation',
    castingTime: '1 action',
    range: 'Touch',
    components: 'V, M (a firefly or phosphorescent moss)',
    verbal: true,
    material: true,
    materialDescription: 'a firefly or phosphorescent moss',
    duration: '1 hour',
    description: 'You touch one object that is no larger than 10 feet in any dimension.',
  },
  {
    id: 'minor-illusion',
    name: 'Minor Illusion',
    level: 0,
    school: 'Illusion',
    castingTime: '1 action',
    range: '30 feet',
    components: 'S, M (a bit of fleece)',
    somatic: true,
    material: true,
    materialDescription: 'a bit of fleece',
    duration: '1 minute',
    description: 'You create a sound or an image of an object within range.',
  },
  {
    id: 'guidance',
    name: 'Guidance',
    level: 0,
    school: 'Divination',
    castingTime: '1 action',
    range: 'Touch',
    components: 'V, S',
    verbal: true,
    somatic: true,
    duration: 'Concentration, up to 1 minute',
    description: 'You touch one willing creature and choose a skill.',
    concentration: true,
  },
  {
    id: 'thaumaturgy',
    name: 'Thaumaturgy',
    level: 0,
    school: 'Transmutation',
    castingTime: '1 action',
    range: '30 feet',
    components: 'V',
    verbal: true,
    duration: '1 minute',
    description: 'You manifest a minor wonder, a sign of supernatural power, within range.',
  },
  {
    id: 'dancing-lights',
    name: 'Dancing Lights',
    level: 0,
    school: 'Evocation',
    castingTime: '1 action',
    range: '120 feet',
    components: 'V, S, M (a bit of phosphorus or wychwood, or a glowworm)',
    verbal: true,
    somatic: true,
    material: true,
    materialDescription: 'a bit of phosphorus or wychwood, or a glowworm',
    duration: 'Concentration, up to 1 minute',
    description: 'You create up to four torch-sized lights within range.',
    concentration: true,
  },
];

export const mockSpells: Spell[] = [
  {
    id: 'magic-missile',
    name: 'Magic Missile',
    level: 1,
    school: 'Evocation',
    castingTime: '1 action',
    range: '120 feet',
    components: 'V, S',
    verbal: true,
    somatic: true,
    duration: 'Instantaneous',
    description: 'You create three glowing darts of magical force.',
    damage: '1d4 + 1',
  },
  {
    id: 'shield',
    name: 'Shield',
    level: 1,
    school: 'Abjuration',
    castingTime: '1 reaction',
    range: 'Self',
    components: 'V, S',
    verbal: true,
    somatic: true,
    duration: '1 round',
    description: 'An invisible barrier of magical force appears and protects you.',
  },
  {
    id: 'detect-magic',
    name: 'Detect Magic',
    level: 1,
    school: 'Divination',
    castingTime: '1 action',
    range: 'Self',
    components: 'V, S',
    verbal: true,
    somatic: true,
    duration: 'Concentration, up to 10 minutes',
    description: 'For the duration, you sense the presence of magic within 30 feet of you.',
    ritual: true,
    concentration: true,
  },
  {
    id: 'cure-wounds',
    name: 'Cure Wounds',
    level: 1,
    school: 'Evocation',
    castingTime: '1 action',
    range: 'Touch',
    components: 'V, S',
    verbal: true,
    somatic: true,
    duration: 'Instantaneous',
    description:
      'A creature you touch regains a number of hit points equal to 1d8 + your spellcasting ability modifier.',
  },
  {
    id: 'burning-hands',
    name: 'Burning Hands',
    level: 1,
    school: 'Evocation',
    castingTime: '1 action',
    range: 'Self (15-foot cone)',
    components: 'V, S',
    verbal: true,
    somatic: true,
    duration: 'Instantaneous',
    description:
      'As you hold your hands with thumbs touching and fingers spread, a thin sheet of flames shoots forth.',
    damage: '3d6',
  },
  {
    id: 'sleep',
    name: 'Sleep',
    level: 1,
    school: 'Enchantment',
    castingTime: '1 action',
    range: '90 feet',
    components: 'V, S, M (a pinch of fine sand, rose petals, or a cricket)',
    verbal: true,
    somatic: true,
    material: true,
    materialDescription: 'a pinch of fine sand, rose petals, or a cricket',
    duration: 'Up to 1 minute',
    description: 'This spell sends creatures into a magical slumber.',
  },
];

// Helper Functions
export function createMockCharacter(
  name: string,
  characterClass: CharacterClass,
  race: CharacterRace,
  subrace?: Subrace,
  level: number = 1,
  cantrips?: string[],
  knownSpells?: string[],
): Character {
  return {
    id: `${name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`,
    name,
    level,
    class: characterClass,
    race,
    subrace,
    cantrips,
    knownSpells,
    abilityScores: {
      strength: { score: 10, modifier: 0, savingThrow: false },
      dexterity: { score: 14, modifier: 2, savingThrow: false },
      constitution: { score: 13, modifier: 1, savingThrow: false },
      intelligence: {
        score: 15,
        modifier: 2,
        savingThrow: characterClass.savingThrowProficiencies.includes('intelligence'),
      },
      wisdom: {
        score: 12,
        modifier: 1,
        savingThrow: characterClass.savingThrowProficiencies.includes('wisdom'),
      },
      charisma: {
        score: 8,
        modifier: -1,
        savingThrow: characterClass.savingThrowProficiencies.includes('charisma'),
      },
    },
  };
}

export function createMockWizard(
  name: string = 'Test Wizard',
  cantrips?: string[],
  spells?: string[],
): Character {
  return createMockCharacter(name, mockWizard, mockHuman, undefined, 1, cantrips, spells);
}

export function createMockCleric(
  name: string = 'Test Cleric',
  cantrips?: string[],
  spells?: string[],
): Character {
  return createMockCharacter(name, mockCleric, mockHuman, undefined, 1, cantrips, spells);
}

export function createMockFighter(name: string = 'Test Fighter'): Character {
  return createMockCharacter(name, mockFighter, mockHuman, undefined, 1);
}

export function createMockHighElfWizard(
  name: string = 'High Elf Wizard',
  cantrips?: string[],
  spells?: string[],
): Character {
  return createMockCharacter(name, mockWizard, mockElf, mockHighElfSubrace, 1, cantrips, spells);
}

export function createMockTieflingWarlock(
  name: string = 'Tiefling Warlock',
  cantrips?: string[],
  spells?: string[],
): Character {
  return createMockCharacter(
    name,
    mockWarlock,
    mockHuman,
    mockTieflingSubrace,
    1,
    cantrips,
    spells,
  );
}

// Validation Helpers
export function expectValidWizardSelection(
  selectedCantrips: string[],
  selectedSpells: string[],
): void {
  expect(selectedCantrips).toHaveLength(3);
  expect(selectedSpells).toHaveLength(6);
}

export function expectValidClericSelection(
  selectedCantrips: string[],
  selectedSpells: string[],
): void {
  expect(selectedCantrips).toHaveLength(3);
  expect(selectedSpells).toHaveLength(1); // Prepared spells
}

export function expectValidHighElfWizardSelection(
  selectedCantrips: string[],
  selectedSpells: string[],
): void {
  expect(selectedCantrips).toHaveLength(4); // 3 wizard + 1 racial
  expect(selectedSpells).toHaveLength(6);
}

export function expectValidTieflingWarlockSelection(
  selectedCantrips: string[],
  selectedSpells: string[],
): void {
  expect(selectedCantrips).toHaveLength(3); // 2 warlock + 1 racial
  expect(selectedSpells).toHaveLength(2);
}

// Test Data Sets
export const validWizardCantrips = ['mage-hand', 'prestidigitation', 'light'];
export const validWizardSpells = [
  'magic-missile',
  'shield',
  'detect-magic',
  'burning-hands',
  'sleep',
  'color-spray',
];

export const validClericCantrips = ['guidance', 'thaumaturgy', 'sacred-flame'];
export const validClericSpells = ['cure-wounds'];

export const validHighElfWizardCantrips = [
  'mage-hand',
  'prestidigitation',
  'light',
  'minor-illusion',
];
export const validTieflingWarlockCantrips = ['thaumaturgy', 'prestidigitation', 'minor-illusion'];

// Performance Test Data
export function generateLargeSpellDataset(count: number): Spell[] {
  const spells: Spell[] = [];
  const schools = [
    'Abjuration',
    'Conjuration',
    'Divination',
    'Enchantment',
    'Evocation',
    'Illusion',
    'Necromancy',
    'Transmutation',
  ];

  for (let i = 0; i < count; i++) {
    spells.push({
      id: `test-spell-${i}`,
      name: `Test Spell ${i}`,
      level: (i % 9) + 1,
      school: schools[i % schools.length],
      castingTime: '1 action',
      range: '30 feet',
      components: 'V, S',
      verbal: true,
      somatic: true,
      duration: 'Instantaneous',
      description: `This is test spell number ${i} for performance testing.`,
    });
  }

  return spells;
}

// Error Test Cases
export const invalidSpellSelections = {
  tooManyCantrips: ['mage-hand', 'prestidigitation', 'light', 'minor-illusion', 'guidance'],
  tooFewCantrips: ['mage-hand'],
  tooManySpells: [
    'magic-missile',
    'shield',
    'detect-magic',
    'burning-hands',
    'sleep',
    'color-spray',
    'cure-wounds',
  ],
  tooFewSpells: ['magic-missile'],
  invalidCantrips: ['mage-hand', 'prestidigitation', 'guidance'], // guidance not wizard
  invalidSpells: ['magic-missile', 'shield', 'cure-wounds'], // cure-wounds not wizard
};

export default {
  // Classes
  mockWizard,
  mockCleric,
  mockBard,
  mockSorcerer,
  mockWarlock,
  mockPaladin,
  mockRanger,
  mockFighter,

  // Races
  mockHuman,
  mockElf,

  // Subraces
  mockHighElfSubrace,
  mockWoodElfSubrace,
  mockDrowSubrace,
  mockTieflingSubrace,
  mockForestGnomeSubrace,

  // Spells
  mockCantrips,
  mockSpells,

  // Helpers
  createMockCharacter,
  createMockWizard,
  createMockCleric,
  createMockFighter,
  createMockHighElfWizard,
  createMockTieflingWarlock,

  // Validation
  expectValidWizardSelection,
  expectValidClericSelection,
  expectValidHighElfWizardSelection,
  expectValidTieflingWarlockSelection,

  // Data sets
  validWizardCantrips,
  validWizardSpells,
  validClericCantrips,
  validClericSpells,
  validHighElfWizardCantrips,
  validTieflingWarlockCantrips,

  // Performance
  generateLargeSpellDataset,

  // Error cases
  invalidSpellSelections,
};
