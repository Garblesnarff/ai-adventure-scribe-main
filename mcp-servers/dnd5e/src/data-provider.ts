/**
 * Data provider for D&D 5E game data
 * Provides access to classes, spells, equipment, and conditions
 */

import { ClassData, Spell, Condition, Equipment } from './types.js';

/**
 * D&D 5E SRD Class Data
 */
export const classes: Record<string, ClassData> = {
  barbarian: {
    name: 'Barbarian',
    hitDie: '1d12',
    primaryAbility: ['str'],
    savingThrowProficiencies: ['str', 'con'],
    armorProficiencies: ['Light armor', 'Medium armor', 'Shields'],
    weaponProficiencies: ['Simple weapons', 'Martial weapons'],
    toolProficiencies: [],
    skillChoices: {
      choose: 2,
      from: ['Animal Handling', 'Athletics', 'Intimidation', 'Nature', 'Perception', 'Survival'],
    },
    features: [
      { level: 1, name: 'Rage', description: 'Enter a rage as a bonus action, gaining damage bonus and resistance to physical damage.' },
      { level: 1, name: 'Unarmored Defense', description: 'While not wearing armor, AC equals 10 + Dex modifier + Con modifier.' },
      { level: 2, name: 'Reckless Attack', description: 'Gain advantage on melee attacks, but attacks against you have advantage.' },
      { level: 2, name: 'Danger Sense', description: 'Advantage on Dex saves against effects you can see.' },
    ],
  },
  cleric: {
    name: 'Cleric',
    hitDie: '1d8',
    primaryAbility: ['wis'],
    savingThrowProficiencies: ['wis', 'cha'],
    armorProficiencies: ['Light armor', 'Medium armor', 'Shields'],
    weaponProficiencies: ['Simple weapons'],
    toolProficiencies: [],
    skillChoices: {
      choose: 2,
      from: ['History', 'Insight', 'Medicine', 'Persuasion', 'Religion'],
    },
    features: [
      { level: 1, name: 'Spellcasting', description: 'Cast cleric spells using Wisdom as spellcasting ability.' },
      { level: 1, name: 'Divine Domain', description: 'Choose a domain that grants domain spells and features.' },
      { level: 2, name: 'Channel Divinity', description: 'Channel divine energy to fuel magical effects.' },
    ],
  },
  fighter: {
    name: 'Fighter',
    hitDie: '1d10',
    primaryAbility: ['str', 'dex'],
    savingThrowProficiencies: ['str', 'con'],
    armorProficiencies: ['Light armor', 'Medium armor', 'Heavy armor', 'Shields'],
    weaponProficiencies: ['Simple weapons', 'Martial weapons'],
    toolProficiencies: [],
    skillChoices: {
      choose: 2,
      from: ['Acrobatics', 'Animal Handling', 'Athletics', 'History', 'Insight', 'Intimidation', 'Perception', 'Survival'],
    },
    features: [
      { level: 1, name: 'Fighting Style', description: 'Adopt a fighting style that gives you bonuses in combat.' },
      { level: 1, name: 'Second Wind', description: 'Regain hit points as a bonus action.' },
      { level: 2, name: 'Action Surge', description: 'Take an additional action on your turn.' },
    ],
  },
  rogue: {
    name: 'Rogue',
    hitDie: '1d8',
    primaryAbility: ['dex'],
    savingThrowProficiencies: ['dex', 'int'],
    armorProficiencies: ['Light armor'],
    weaponProficiencies: ['Simple weapons', 'Hand crossbows', 'Longswords', 'Rapiers', 'Shortswords'],
    toolProficiencies: ["Thieves' tools"],
    skillChoices: {
      choose: 4,
      from: ['Acrobatics', 'Athletics', 'Deception', 'Insight', 'Intimidation', 'Investigation', 'Perception', 'Performance', 'Persuasion', 'Sleight of Hand', 'Stealth'],
    },
    features: [
      { level: 1, name: 'Expertise', description: 'Double proficiency bonus for two skill proficiencies.' },
      { level: 1, name: 'Sneak Attack', description: 'Deal extra damage when you have advantage or an ally is near the target.' },
      { level: 2, name: 'Cunning Action', description: 'Take Dash, Disengage, or Hide as a bonus action.' },
    ],
  },
  wizard: {
    name: 'Wizard',
    hitDie: '1d6',
    primaryAbility: ['int'],
    savingThrowProficiencies: ['int', 'wis'],
    armorProficiencies: [],
    weaponProficiencies: ['Daggers', 'Darts', 'Slings', 'Quarterstaffs', 'Light crossbows'],
    toolProficiencies: [],
    skillChoices: {
      choose: 2,
      from: ['Arcana', 'History', 'Insight', 'Investigation', 'Medicine', 'Religion'],
    },
    features: [
      { level: 1, name: 'Spellcasting', description: 'Cast wizard spells using Intelligence as spellcasting ability.' },
      { level: 1, name: 'Arcane Recovery', description: 'Recover spell slots during a short rest.' },
      { level: 2, name: 'Arcane Tradition', description: 'Choose an arcane tradition that shapes your magical practice.' },
    ],
  },
};

/**
 * D&D 5E SRD Spell Data (Sample)
 */
export const spells: Record<number, Spell[]> = {
  0: [
    {
      id: 'fire-bolt',
      name: 'Fire Bolt',
      level: 0,
      school: 'Evocation',
      castingTime: '1 action',
      range: '120 feet',
      components: 'V, S',
      duration: 'Instantaneous',
      description: 'You hurl a mote of fire at a creature or object within range. Make a ranged spell attack. On a hit, the target takes 1d10 fire damage.',
      damageType: 'fire',
    },
    {
      id: 'mage-hand',
      name: 'Mage Hand',
      level: 0,
      school: 'Conjuration',
      castingTime: '1 action',
      range: '30 feet',
      components: 'V, S',
      duration: '1 minute',
      description: 'A spectral, floating hand appears at a point you choose within range.',
    },
  ],
  1: [
    {
      id: 'magic-missile',
      name: 'Magic Missile',
      level: 1,
      school: 'Evocation',
      castingTime: '1 action',
      range: '120 feet',
      components: 'V, S',
      duration: 'Instantaneous',
      description: 'You create three glowing darts of magical force. Each dart hits a creature of your choice that you can see within range. A dart deals 1d4 + 1 force damage to its target.',
      damageType: 'force',
    },
    {
      id: 'shield',
      name: 'Shield',
      level: 1,
      school: 'Abjuration',
      castingTime: '1 reaction',
      range: 'Self',
      components: 'V, S',
      duration: '1 round',
      description: 'An invisible barrier of magical force appears and protects you. Until the start of your next turn, you have a +5 bonus to AC.',
    },
  ],
};

/**
 * D&D 5E SRD Conditions
 */
export const conditions: Condition[] = [
  {
    name: 'Blinded',
    description: 'A blinded creature can\'t see and automatically fails any ability check that requires sight.',
    effects: [
      'Attack rolls against the creature have advantage',
      'The creature\'s attack rolls have disadvantage',
    ],
  },
  {
    name: 'Charmed',
    description: 'A charmed creature can\'t attack the charmer or target the charmer with harmful abilities or magical effects.',
    effects: [
      'The charmer has advantage on ability checks to interact socially with the creature',
    ],
  },
  {
    name: 'Frightened',
    description: 'A frightened creature has disadvantage on ability checks and attack rolls while the source of its fear is within line of sight.',
    effects: [
      'The creature can\'t willingly move closer to the source of its fear',
    ],
  },
  {
    name: 'Grappled',
    description: 'A grappled creature\'s speed becomes 0, and it can\'t benefit from any bonus to its speed.',
    effects: [
      'The condition ends if the grappler is incapacitated',
      'The condition ends if an effect removes the grappled creature from the reach of the grappler',
    ],
  },
  {
    name: 'Paralyzed',
    description: 'A paralyzed creature is incapacitated and can\'t move or speak.',
    effects: [
      'The creature automatically fails Strength and Dexterity saving throws',
      'Attack rolls against the creature have advantage',
      'Any attack that hits the creature is a critical hit if the attacker is within 5 feet',
    ],
  },
  {
    name: 'Poisoned',
    description: 'A poisoned creature has disadvantage on attack rolls and ability checks.',
    effects: [],
  },
  {
    name: 'Prone',
    description: 'A prone creature\'s only movement option is to crawl, unless it stands up.',
    effects: [
      'The creature has disadvantage on attack rolls',
      'An attack roll against the creature has advantage if the attacker is within 5 feet',
      'Otherwise, the attack roll has disadvantage',
    ],
  },
  {
    name: 'Restrained',
    description: 'A restrained creature\'s speed becomes 0, and it can\'t benefit from any bonus to its speed.',
    effects: [
      'Attack rolls against the creature have advantage',
      'The creature\'s attack rolls have disadvantage',
      'The creature has disadvantage on Dexterity saving throws',
    ],
  },
  {
    name: 'Stunned',
    description: 'A stunned creature is incapacitated, can\'t move, and can speak only falteringly.',
    effects: [
      'The creature automatically fails Strength and Dexterity saving throws',
      'Attack rolls against the creature have advantage',
    ],
  },
  {
    name: 'Unconscious',
    description: 'An unconscious creature is incapacitated, can\'t move or speak, and is unaware of its surroundings.',
    effects: [
      'The creature drops whatever it\'s holding and falls prone',
      'The creature automatically fails Strength and Dexterity saving throws',
      'Attack rolls against the creature have advantage',
      'Any attack that hits the creature is a critical hit if the attacker is within 5 feet',
    ],
  },
];

/**
 * D&D 5E SRD Equipment
 */
export const weapons: Equipment[] = [
  {
    name: 'Club',
    type: 'weapon',
    cost: { amount: 1, unit: 'sp' },
    weight: 2,
    damage: '1d4',
    damageType: 'bludgeoning',
    properties: ['Light'],
  },
  {
    name: 'Dagger',
    type: 'weapon',
    cost: { amount: 2, unit: 'gp' },
    weight: 1,
    damage: '1d4',
    damageType: 'piercing',
    properties: ['Finesse', 'Light', 'Thrown (range 20/60)'],
  },
  {
    name: 'Greataxe',
    type: 'weapon',
    cost: { amount: 30, unit: 'gp' },
    weight: 7,
    damage: '1d12',
    damageType: 'slashing',
    properties: ['Heavy', 'Two-handed'],
  },
  {
    name: 'Longsword',
    type: 'weapon',
    cost: { amount: 15, unit: 'gp' },
    weight: 3,
    damage: '1d8',
    damageType: 'slashing',
    properties: ['Versatile (1d10)'],
  },
  {
    name: 'Shortbow',
    type: 'weapon',
    cost: { amount: 25, unit: 'gp' },
    weight: 2,
    damage: '1d6',
    damageType: 'piercing',
    properties: ['Ammunition (range 80/320)', 'Two-handed'],
  },
];

export const armor: Equipment[] = [
  {
    name: 'Padded',
    type: 'armor',
    cost: { amount: 5, unit: 'gp' },
    weight: 8,
    armorClass: 11,
    properties: ['Light armor', 'Disadvantage on Stealth'],
  },
  {
    name: 'Leather',
    type: 'armor',
    cost: { amount: 10, unit: 'gp' },
    weight: 10,
    armorClass: 11,
    properties: ['Light armor'],
  },
  {
    name: 'Chain Mail',
    type: 'armor',
    cost: { amount: 75, unit: 'gp' },
    weight: 55,
    armorClass: 16,
    properties: ['Heavy armor', 'Disadvantage on Stealth', 'Strength 13 required'],
  },
  {
    name: 'Plate',
    type: 'armor',
    cost: { amount: 1500, unit: 'gp' },
    weight: 65,
    armorClass: 18,
    properties: ['Heavy armor', 'Disadvantage on Stealth', 'Strength 15 required'],
  },
  {
    name: 'Shield',
    type: 'shield',
    cost: { amount: 10, unit: 'gp' },
    weight: 6,
    armorClass: 2,
    properties: ['+2 AC'],
  },
];

/**
 * Get all classes
 */
export function getAllClasses(): ClassData[] {
  return Object.values(classes);
}

/**
 * Get specific class by name
 */
export function getClass(className: string): ClassData | null {
  const normalized = className.toLowerCase();
  return classes[normalized] || null;
}

/**
 * Get spells by level
 */
export function getSpellsByLevel(level: number): Spell[] {
  return spells[level] || [];
}

/**
 * Get specific spell by name
 */
export function getSpell(spellName: string): Spell | null {
  const normalized = spellName.toLowerCase().replace(/\s+/g, '-');
  for (const levelSpells of Object.values(spells)) {
    const spell = levelSpells.find(s => s.id === normalized || s.name.toLowerCase() === spellName.toLowerCase());
    if (spell) return spell;
  }
  return null;
}

/**
 * Get all conditions
 */
export function getAllConditions(): Condition[] {
  return conditions;
}

/**
 * Get all weapons
 */
export function getAllWeapons(): Equipment[] {
  return weapons;
}

/**
 * Get all armor
 */
export function getAllArmor(): Equipment[] {
  return armor;
}
