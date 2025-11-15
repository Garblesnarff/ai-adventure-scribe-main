/**
 * Test Fixtures
 *
 * Reusable test data for integration tests.
 * Provides consistent test characters, monsters, campaigns, and sessions.
 */

import type { NewCampaign, NewCharacter, NewCharacterStats, NewGameSession, NewNPC } from '../../../../db/schema/index.js';

/**
 * Test user ID
 */
export const TEST_USER_ID = 'test-user-integration-1';

/**
 * Test campaign fixtures
 */
export const testCampaigns: Record<string, Partial<NewCampaign>> = {
  default: {
    userId: TEST_USER_ID,
    name: 'Test Campaign',
    description: 'Integration test campaign',
    genre: 'Fantasy',
    status: 'active',
  },
};

/**
 * Test character fixtures
 */
export const testCharacters = {
  fighter: {
    character: {
      userId: TEST_USER_ID,
      name: 'Test Fighter',
      class: 'Fighter',
      race: 'Human',
      level: 5,
      alignment: 'Lawful Good',
      experiencePoints: 6500,
      background: 'Soldier',
    } as Partial<NewCharacter>,
    stats: {
      strength: 16,
      dexterity: 14,
      constitution: 15,
      intelligence: 10,
      wisdom: 12,
      charisma: 8,
    } as Omit<NewCharacterStats, 'id' | 'characterId' | 'createdAt' | 'updatedAt'>,
    maxHp: 45,
    armorClass: 18,
    speed: 30,
  },
  wizard: {
    character: {
      userId: TEST_USER_ID,
      name: 'Test Wizard',
      class: 'Wizard',
      race: 'Elf',
      level: 5,
      alignment: 'Neutral Good',
      experiencePoints: 6500,
      background: 'Sage',
    } as Partial<NewCharacter>,
    stats: {
      strength: 8,
      dexterity: 14,
      constitution: 12,
      intelligence: 18,
      wisdom: 13,
      charisma: 10,
    } as Omit<NewCharacterStats, 'id' | 'characterId' | 'createdAt' | 'updatedAt'>,
    maxHp: 22,
    armorClass: 12,
    speed: 30,
  },
  rogue: {
    character: {
      userId: TEST_USER_ID,
      name: 'Test Rogue',
      class: 'Rogue',
      race: 'Halfling',
      level: 3,
      alignment: 'Chaotic Neutral',
      experiencePoints: 900,
      background: 'Criminal',
    } as Partial<NewCharacter>,
    stats: {
      strength: 10,
      dexterity: 18,
      constitution: 12,
      intelligence: 13,
      wisdom: 11,
      charisma: 14,
    } as Omit<NewCharacterStats, 'id' | 'characterId' | 'createdAt' | 'updatedAt'>,
    maxHp: 18,
    armorClass: 15,
    speed: 25,
  },
  cleric: {
    character: {
      userId: TEST_USER_ID,
      name: 'Test Cleric',
      class: 'Cleric',
      race: 'Dwarf',
      level: 4,
      alignment: 'Lawful Good',
      experiencePoints: 2700,
      background: 'Acolyte',
    } as Partial<NewCharacter>,
    stats: {
      strength: 14,
      dexterity: 10,
      constitution: 14,
      intelligence: 11,
      wisdom: 17,
      charisma: 12,
    } as Omit<NewCharacterStats, 'id' | 'characterId' | 'createdAt' | 'updatedAt'>,
    maxHp: 28,
    armorClass: 16,
    speed: 25,
  },
  lowLevelWizard: {
    character: {
      userId: TEST_USER_ID,
      name: 'Test Wizard Level 3',
      class: 'Wizard',
      race: 'Human',
      level: 3,
      alignment: 'Neutral',
      experiencePoints: 0,
      background: 'Sage',
    } as Partial<NewCharacter>,
    stats: {
      strength: 8,
      dexterity: 13,
      constitution: 12,
      intelligence: 16,
      wisdom: 12,
      charisma: 10,
    } as Omit<NewCharacterStats, 'id' | 'characterId' | 'createdAt' | 'updatedAt'>,
    maxHp: 15,
    armorClass: 11,
    speed: 30,
  },
};

/**
 * Test monster/NPC fixtures
 */
export const testMonsters = {
  goblin: {
    npc: {
      name: 'Goblin',
      race: 'Goblin',
      description: 'A small, mischievous goblin',
      alignment: 'Neutral Evil',
      backstory: 'A creature of the dark',
      isHostile: true,
    } as Partial<NewNPC>,
    maxHp: 7,
    armorClass: 15,
    speed: 30,
    initiativeModifier: 2,
  },
  orc: {
    npc: {
      name: 'Orc Warrior',
      race: 'Orc',
      description: 'A fierce orc warrior',
      alignment: 'Chaotic Evil',
      backstory: 'A tribal warrior',
      isHostile: true,
    } as Partial<NewNPC>,
    maxHp: 15,
    armorClass: 13,
    speed: 30,
    initiativeModifier: 0,
  },
  dragon: {
    npc: {
      name: 'Young Red Dragon',
      race: 'Dragon',
      description: 'A fearsome young red dragon',
      alignment: 'Chaotic Evil',
      backstory: 'A dragon seeking treasure',
      isHostile: true,
    } as Partial<NewNPC>,
    maxHp: 178,
    armorClass: 18,
    speed: 40,
    initiativeModifier: 2,
  },
  friendly_npc: {
    npc: {
      name: 'Helpful Merchant',
      race: 'Human',
      description: 'A friendly merchant',
      alignment: 'Neutral Good',
      backstory: 'A traveling merchant',
      isHostile: false,
    } as Partial<NewNPC>,
    maxHp: 10,
    armorClass: 10,
    speed: 30,
    initiativeModifier: 0,
  },
};

/**
 * Test session fixture
 */
export const testSession: Partial<NewGameSession> = {
  sessionNumber: 1,
  status: 'active',
  currentSceneDescription: 'A test combat session',
  turnCount: 0,
};

/**
 * Test weapon attacks
 */
export const testWeapons = {
  longsword: {
    name: 'Longsword',
    attackBonus: 7, // +3 prof + +3 STR + +1 magic
    damageDice: '1d8',
    damageBonus: 3,
    damageType: 'slashing' as const,
    properties: ['versatile'],
    description: 'A well-crafted longsword',
  },
  dagger: {
    name: 'Dagger',
    attackBonus: 6, // +3 prof + +4 DEX - 1
    damageDice: '1d4',
    damageBonus: 4,
    damageType: 'piercing' as const,
    properties: ['finesse', 'thrown'],
    description: 'A small, sharp dagger',
  },
  firebolt: {
    name: 'Fire Bolt',
    attackBonus: 7, // +3 prof + +4 INT
    damageDice: '2d10',
    damageBonus: 0,
    damageType: 'fire' as const,
    properties: ['cantrip'],
    description: 'A bolt of fire',
  },
};

/**
 * Test damage types for resistance/vulnerability testing
 */
export const testDamageTypes = {
  physical: ['slashing', 'piercing', 'bludgeoning'] as const,
  elemental: ['fire', 'cold', 'lightning', 'acid', 'thunder'] as const,
  magical: ['force', 'radiant', 'necrotic', 'psychic', 'poison'] as const,
};

/**
 * Test conditions
 */
export const testConditions = {
  blinded: {
    name: 'Blinded',
    description: 'A blinded creature can\'t see and automatically fails ability checks that require sight.',
    mechanicalEffects: 'Attack rolls against the creature have advantage, and the creature\'s attack rolls have disadvantage.',
  },
  poisoned: {
    name: 'Poisoned',
    description: 'A poisoned creature has disadvantage on attack rolls and ability checks.',
    mechanicalEffects: 'Disadvantage on attack rolls and ability checks.',
  },
  stunned: {
    name: 'Stunned',
    description: 'A stunned creature is incapacitated, can\'t move, and can speak only falteringly.',
    mechanicalEffects: 'Incapacitated, can\'t move, automatically fails STR and DEX saves, attacks against have advantage.',
  },
};

/**
 * Test spell data
 */
export const testSpells = {
  magicMissile: {
    name: 'Magic Missile',
    level: 1,
    school: 'Evocation',
    castingTime: '1 action',
    range: '120 feet',
    components: 'V, S',
    duration: 'Instantaneous',
  },
  fireball: {
    name: 'Fireball',
    level: 3,
    school: 'Evocation',
    castingTime: '1 action',
    range: '150 feet',
    components: 'V, S, M',
    duration: 'Instantaneous',
  },
  shield: {
    name: 'Shield',
    level: 1,
    school: 'Abjuration',
    castingTime: '1 reaction',
    range: 'Self',
    components: 'V, S',
    duration: '1 round',
  },
};

/**
 * XP rewards for common encounters
 */
export const testXPRewards = {
  goblin: 50,
  orc: 100,
  goblinBand: 200, // 4 goblins
  mixedEncounter: 450, // 2 orcs + 2 goblins
  dragon: 2300,
  quest: 500,
  roleplaying: 100,
};
