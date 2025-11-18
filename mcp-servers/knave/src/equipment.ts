/**
 * Knave equipment, armor, gear, and spells database
 * Provides resources for equipment lookups
 */

import type { Weapon, Armor, Item, Spell } from './types.js';

/**
 * Knave weapons
 * Format: damage dice, ability requirement, and optional properties
 */
export const KNAVE_WEAPONS: Record<string, Weapon> = {
  dagger: {
    name: 'Dagger',
    description: 'A small, handheld blade. Common for melee or throwing.',
    type: 'weapon',
    ability: 'dex',
    damageDice: '1d4',
    properties: ['light', 'thrown'],
    weight: 1,
  },
  mace: {
    name: 'Mace',
    description: 'A heavy club with a spiked head. Good for bashing armor.',
    type: 'weapon',
    ability: 'str',
    damageDice: '1d6',
    properties: ['one-handed'],
    weight: 4,
  },
  longsword: {
    name: 'Longsword',
    description: 'A versatile blade suitable for one or two-handed use.',
    type: 'weapon',
    ability: 'str',
    damageDice: '1d8',
    properties: ['one-handed', 'versatile'],
    weight: 3,
  },
  greatsword: {
    name: 'Greatsword',
    description: 'A massive two-handed sword requiring strength to wield.',
    type: 'weapon',
    ability: 'str',
    damageDice: '1d12',
    properties: ['two-handed', 'heavy'],
    weight: 6,
  },
  shortbow: {
    name: 'Shortbow',
    description: 'A bow for ranged attacks. Requires arrows.',
    type: 'weapon',
    ability: 'dex',
    damageDice: '1d6',
    properties: ['ranged', 'two-handed'],
    weight: 2,
  },
  longbow: {
    name: 'Longbow',
    description: 'A powerful ranged weapon for distance. Requires arrows.',
    type: 'weapon',
    ability: 'dex',
    damageDice: '1d8',
    properties: ['ranged', 'two-handed', 'powerful'],
    weight: 3,
  },
  spear: {
    name: 'Spear',
    description: 'A shaft with a pointed head. Can be thrown or used in melee.',
    type: 'weapon',
    ability: 'str',
    damageDice: '1d6',
    properties: ['one-handed', 'thrown', 'versatile'],
    weight: 3,
  },
  handaxe: {
    name: 'Hand Axe',
    description: 'A small axe designed for throwing or melee combat.',
    type: 'weapon',
    ability: 'str',
    damageDice: '1d6',
    properties: ['light', 'thrown'],
    weight: 2,
  },
  staff: {
    name: 'Staff',
    description: 'A wooden pole useful for arcane focus or melee.',
    type: 'weapon',
    ability: 'str',
    damageDice: '1d6',
    properties: ['two-handed', 'arcane-focus'],
    weight: 4,
  },
  rapier: {
    name: 'Rapier',
    description: 'A finesse weapon for precise strikes.',
    type: 'weapon',
    ability: 'dex',
    damageDice: '1d8',
    properties: ['one-handed', 'finesse'],
    weight: 2,
  },
};

/**
 * Knave armor types
 */
export const KNAVE_ARMOR: Record<string, Armor> = {
  leather: {
    name: 'Leather Armor',
    description: 'Light, supple leather provides basic protection.',
    type: 'armor',
    acBonus: 1,
    weight: 10,
  },
  studded_leather: {
    name: 'Studded Leather',
    description: 'Leather reinforced with metal studs for better protection.',
    type: 'armor',
    acBonus: 2,
    weight: 13,
  },
  chainmail: {
    name: 'Chainmail',
    description: 'Interlocking metal rings provide excellent protection.',
    type: 'armor',
    acBonus: 3,
    weight: 55,
  },
  plate: {
    name: 'Plate Armor',
    description: 'Full metal plating offers the best protection available.',
    type: 'armor',
    acBonus: 4,
    weight: 65,
  },
  shield: {
    name: 'Shield',
    description: 'A protective device that increases AC.',
    type: 'armor',
    acBonus: 1,
    weight: 6,
  },
};

/**
 * General gear and items
 */
export const KNAVE_GEAR: Record<string, Item> = {
  backpack: {
    name: 'Backpack',
    description: 'Leather pack for carrying supplies.',
    type: 'tool',
    weight: 5,
  },
  bedroll: {
    name: 'Bedroll',
    description: 'Basic bedding for rest.',
    type: 'misc',
    weight: 5,
  },
  rope: {
    name: 'Rope (50 ft)',
    description: 'Coiled rope, useful for climbing and securing.',
    type: 'tool',
    weight: 10,
  },
  torch: {
    name: 'Torch',
    description: 'A burning stick for light. Lasts about 1 hour.',
    type: 'tool',
    weight: 1,
  },
  lantern: {
    name: 'Lantern (hooded)',
    description: 'Oil lantern providing steadier light than a torch.',
    type: 'tool',
    weight: 2,
  },
  tinderbox: {
    name: 'Tinderbox',
    description: 'Flint and steel for starting fires.',
    type: 'tool',
    weight: 1,
  },
  rations: {
    name: 'Rations (1 day)',
    description: 'Dried food for one day of travel.',
    type: 'misc',
    weight: 1,
  },
  waterskin: {
    name: 'Waterskin',
    description: 'Container for carrying water.',
    type: 'tool',
    weight: 1,
  },
  lockpicks: {
    name: 'Lockpicks',
    description: 'Tools for opening locks.',
    type: 'tool',
    weight: 1,
  },
  crowbar: {
    name: 'Crowbar',
    description: 'Iron bar for prying open doors and crates.',
    type: 'tool',
    weight: 5,
  },
  chalk: {
    name: 'Chalk (10 sticks)',
    description: 'Colored chalk for marking.',
    type: 'misc',
    weight: 0.1,
  },
  dice: {
    name: 'Dice Set',
    description: 'A set of polyhedral dice.',
    type: 'misc',
    weight: 0.3,
  },
};

/**
 * Spells as items in Knave
 * These can be found as scrolls or prepared by spellcasters
 */
export const KNAVE_SPELLS: Record<string, Spell> = {
  magic_missile: {
    name: 'Magic Missile',
    description: 'Unerring magical projectiles that strike foes.',
    type: 'spell',
    level: 1,
    castingTime: '1 action',
    range: '120 feet',
    components: ['V', 'S'],
    duration: 'Instantaneous',
  },
  burning_hands: {
    name: 'Burning Hands',
    description: 'A cone of flame emanates from your hands.',
    type: 'spell',
    level: 1,
    castingTime: '1 action',
    range: 'Self (15-foot cone)',
    components: ['V', 'S'],
    duration: 'Instantaneous',
  },
  shield: {
    name: 'Shield',
    description: 'Create an invisible barrier to protect yourself.',
    type: 'spell',
    level: 1,
    castingTime: '1 reaction',
    range: 'Self',
    components: ['V', 'S'],
    duration: '1 round',
  },
  sleep: {
    name: 'Sleep',
    description: 'Send creatures into slumber.',
    type: 'spell',
    level: 1,
    castingTime: '1 action',
    range: '90 feet',
    components: ['V', 'S', 'M'],
    duration: '1 minute',
  },
  detect_magic: {
    name: 'Detect Magic',
    description: 'Sense the presence of magic nearby.',
    type: 'spell',
    level: 1,
    castingTime: '1 action',
    range: 'Self',
    components: ['V', 'S'],
    duration: '10 minutes',
  },
  fireball: {
    name: 'Fireball',
    description: 'Hurl an explosion of flame.',
    type: 'spell',
    level: 3,
    castingTime: '1 action',
    range: '150 feet',
    components: ['V', 'S', 'M'],
    duration: 'Instantaneous',
  },
  lightning_bolt: {
    name: 'Lightning Bolt',
    description: 'Strike foes with a line of lightning.',
    type: 'spell',
    level: 3,
    castingTime: '1 action',
    range: 'Self (100-foot line)',
    components: ['V', 'S', 'M'],
    duration: 'Instantaneous',
  },
  invisibility: {
    name: 'Invisibility',
    description: 'Render a creature or object invisible.',
    type: 'spell',
    level: 2,
    castingTime: '1 action',
    range: 'Touch',
    components: ['V', 'S', 'M'],
    duration: '1 hour',
  },
  heal: {
    name: 'Heal',
    description: 'Restore health to an injured creature.',
    type: 'spell',
    level: 6,
    castingTime: '1 action',
    range: '60 feet',
    components: ['V', 'S'],
    duration: 'Instantaneous',
  },
  cure_wounds: {
    name: 'Cure Wounds',
    description: 'Restore hit points to an injured creature.',
    type: 'spell',
    level: 1,
    castingTime: '1 action',
    range: 'Touch',
    components: ['V', 'S'],
    duration: 'Instantaneous',
  },
};

/**
 * Format weapons as JSON resource
 */
export function getWeaponsResource(): string {
  return JSON.stringify(Object.values(KNAVE_WEAPONS), null, 2);
}

/**
 * Format armor as JSON resource
 */
export function getArmorResource(): string {
  return JSON.stringify(Object.values(KNAVE_ARMOR), null, 2);
}

/**
 * Format gear as JSON resource
 */
export function getGearResource(): string {
  return JSON.stringify(Object.values(KNAVE_GEAR), null, 2);
}

/**
 * Format spells as JSON resource
 */
export function getSpellsResource(): string {
  return JSON.stringify(Object.values(KNAVE_SPELLS), null, 2);
}
