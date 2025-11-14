/**
 * Character Test Fixtures
 *
 * Pre-configured character data for unit tests
 */

import type { Character, CharacterStats } from '../../../../db/schema/index.js';

/**
 * Level 5 Fighter - Standard melee combatant
 */
export const fighterLevel5: Partial<Character> = {
  id: 'fixture-fighter-5',
  userId: 'fixture-user-1',
  campaignId: 'fixture-campaign-1',
  name: 'Test Fighter',
  race: 'Human',
  class: 'Fighter',
  level: 5,
  experiencePoints: 6500,
  alignment: 'Lawful Good',
  background: 'Soldier',
  appearance: 'A sturdy warrior with battle scars',
  personalityTraits: 'Brave and loyal',
  imageUrl: null,
  avatarUrl: null,
  backgroundImage: null,
  cantrips: null,
  knownSpells: null,
  preparedSpells: null,
  ritualSpells: null,
  visionTypes: ['normal'],
  obscurement: null,
  isHidden: false,
  createdAt: new Date('2024-01-01T00:00:00Z'),
  updatedAt: new Date('2024-01-01T00:00:00Z'),
};

/**
 * Stats for Level 5 Fighter
 */
export const fighterLevel5Stats: Partial<CharacterStats> = {
  id: 'fixture-fighter-5-stats',
  characterId: 'fixture-fighter-5',
  strength: 16,
  dexterity: 14,
  constitution: 15,
  intelligence: 10,
  wisdom: 12,
  charisma: 8,
  createdAt: new Date('2024-01-01T00:00:00Z'),
  updatedAt: new Date('2024-01-01T00:00:00Z'),
};

/**
 * Level 5 Wizard - Full spellcaster
 */
export const wizardLevel5: Partial<Character> = {
  id: 'fixture-wizard-5',
  userId: 'fixture-user-1',
  campaignId: 'fixture-campaign-1',
  name: 'Test Wizard',
  race: 'High Elf',
  class: 'Wizard',
  level: 5,
  experiencePoints: 6500,
  alignment: 'Neutral Good',
  background: 'Sage',
  appearance: 'A scholarly figure in robes',
  personalityTraits: 'Curious and analytical',
  imageUrl: null,
  avatarUrl: null,
  backgroundImage: null,
  cantrips: 'Fire Bolt,Mage Hand,Prestidigitation',
  knownSpells: 'Magic Missile,Shield,Fireball,Counterspell,Detect Magic,Identify',
  preparedSpells: 'Magic Missile,Shield,Fireball,Counterspell',
  ritualSpells: 'Detect Magic,Identify',
  visionTypes: ['darkvision'],
  obscurement: null,
  isHidden: false,
  createdAt: new Date('2024-01-01T00:00:00Z'),
  updatedAt: new Date('2024-01-01T00:00:00Z'),
};

/**
 * Stats for Level 5 Wizard
 */
export const wizardLevel5Stats: Partial<CharacterStats> = {
  id: 'fixture-wizard-5-stats',
  characterId: 'fixture-wizard-5',
  strength: 8,
  dexterity: 14,
  constitution: 12,
  intelligence: 18,
  wisdom: 13,
  charisma: 10,
  createdAt: new Date('2024-01-01T00:00:00Z'),
  updatedAt: new Date('2024-01-01T00:00:00Z'),
};

/**
 * Level 3 Rogue - Skill specialist
 */
export const rogueLevel3: Partial<Character> = {
  id: 'fixture-rogue-3',
  userId: 'fixture-user-1',
  campaignId: 'fixture-campaign-1',
  name: 'Test Rogue',
  race: 'Halfling',
  class: 'Rogue',
  level: 3,
  experiencePoints: 900,
  alignment: 'Chaotic Neutral',
  background: 'Criminal',
  appearance: 'A nimble figure in dark clothing',
  personalityTraits: 'Cunning and quick-witted',
  imageUrl: null,
  avatarUrl: null,
  backgroundImage: null,
  cantrips: null,
  knownSpells: null,
  preparedSpells: null,
  ritualSpells: null,
  visionTypes: ['normal'],
  obscurement: null,
  isHidden: false,
  createdAt: new Date('2024-01-01T00:00:00Z'),
  updatedAt: new Date('2024-01-01T00:00:00Z'),
};

/**
 * Stats for Level 3 Rogue
 */
export const rogueLevel3Stats: Partial<CharacterStats> = {
  id: 'fixture-rogue-3-stats',
  characterId: 'fixture-rogue-3',
  strength: 10,
  dexterity: 18,
  constitution: 14,
  intelligence: 12,
  wisdom: 13,
  charisma: 14,
  createdAt: new Date('2024-01-01T00:00:00Z'),
  updatedAt: new Date('2024-01-01T00:00:00Z'),
};

/**
 * Level 10 Paladin - Half caster with multiclass potential
 */
export const paladinLevel10: Partial<Character> = {
  id: 'fixture-paladin-10',
  userId: 'fixture-user-1',
  campaignId: 'fixture-campaign-1',
  name: 'Test Paladin',
  race: 'Dragonborn',
  class: 'Paladin',
  level: 10,
  experiencePoints: 64000,
  alignment: 'Lawful Good',
  background: 'Noble',
  appearance: 'A radiant holy warrior',
  personalityTraits: 'Righteous and protective',
  imageUrl: null,
  avatarUrl: null,
  backgroundImage: null,
  cantrips: null,
  knownSpells: 'Cure Wounds,Bless,Lesser Restoration,Aid',
  preparedSpells: 'Cure Wounds,Bless,Lesser Restoration',
  ritualSpells: null,
  visionTypes: ['normal'],
  obscurement: null,
  isHidden: false,
  createdAt: new Date('2024-01-01T00:00:00Z'),
  updatedAt: new Date('2024-01-01T00:00:00Z'),
};

/**
 * Stats for Level 10 Paladin
 */
export const paladinLevel10Stats: Partial<CharacterStats> = {
  id: 'fixture-paladin-10-stats',
  characterId: 'fixture-paladin-10',
  strength: 18,
  dexterity: 10,
  constitution: 16,
  intelligence: 10,
  wisdom: 12,
  charisma: 16,
  createdAt: new Date('2024-01-01T00:00:00Z'),
  updatedAt: new Date('2024-01-01T00:00:00Z'),
};

/**
 * Level 1 Cleric - Starting character
 */
export const clericLevel1: Partial<Character> = {
  id: 'fixture-cleric-1',
  userId: 'fixture-user-1',
  campaignId: 'fixture-campaign-1',
  name: 'Test Cleric',
  race: 'Dwarf',
  class: 'Cleric',
  level: 1,
  experiencePoints: 0,
  alignment: 'Neutral Good',
  background: 'Acolyte',
  appearance: 'A devoted healer',
  personalityTraits: 'Compassionate and faithful',
  imageUrl: null,
  avatarUrl: null,
  backgroundImage: null,
  cantrips: 'Sacred Flame,Guidance,Thaumaturgy',
  knownSpells: null,
  preparedSpells: 'Cure Wounds,Bless,Shield of Faith',
  ritualSpells: null,
  visionTypes: ['darkvision'],
  obscurement: null,
  isHidden: false,
  createdAt: new Date('2024-01-01T00:00:00Z'),
  updatedAt: new Date('2024-01-01T00:00:00Z'),
};

/**
 * Stats for Level 1 Cleric
 */
export const clericLevel1Stats: Partial<CharacterStats> = {
  id: 'fixture-cleric-1-stats',
  characterId: 'fixture-cleric-1',
  strength: 14,
  dexterity: 10,
  constitution: 14,
  intelligence: 10,
  wisdom: 16,
  charisma: 12,
  createdAt: new Date('2024-01-01T00:00:00Z'),
  updatedAt: new Date('2024-01-01T00:00:00Z'),
};

/**
 * Exported collection of all character fixtures
 */
export const characters = {
  fighterLevel5,
  wizardLevel5,
  rogueLevel3,
  paladinLevel10,
  clericLevel1,
};

/**
 * Exported collection of all character stats fixtures
 */
export const characterStats = {
  fighterLevel5: fighterLevel5Stats,
  wizardLevel5: wizardLevel5Stats,
  rogueLevel3: rogueLevel3Stats,
  paladinLevel10: paladinLevel10Stats,
  clericLevel1: clericLevel1Stats,
};
