/**
 * Inventory Test Fixtures
 *
 * Pre-configured inventory items and consumables for unit tests
 */

import type { InventoryItem, ConsumableUsageLog } from '../../../../db/schema/index.js';

/**
 * Fighter's longsword - equipped weapon
 */
export const longsword: Partial<InventoryItem> = {
  id: 'fixture-item-longsword',
  characterId: 'fixture-fighter-5',
  name: 'Longsword',
  itemType: 'weapon',
  quantity: 1,
  weight: '3',
  description: 'A versatile martial weapon',
  properties: JSON.stringify({
    damage: '1d8',
    damageType: 'slashing',
    properties: ['versatile (1d10)'],
  }),
  isEquipped: true,
  isAttuned: false,
  requiresAttunement: false,
  createdAt: new Date('2024-01-01T00:00:00Z'),
  updatedAt: new Date('2024-01-01T00:00:00Z'),
};

/**
 * Fighter's plate armor - equipped armor
 */
export const plateArmor: Partial<InventoryItem> = {
  id: 'fixture-item-plate-armor',
  characterId: 'fixture-fighter-5',
  name: 'Plate Armor',
  itemType: 'armor',
  quantity: 1,
  weight: '65',
  description: 'Heavy armor providing excellent protection',
  properties: JSON.stringify({
    armorClass: 18,
    stealthDisadvantage: true,
    strengthRequirement: 15,
  }),
  isEquipped: true,
  isAttuned: false,
  requiresAttunement: false,
  createdAt: new Date('2024-01-01T00:00:00Z'),
  updatedAt: new Date('2024-01-01T00:00:00Z'),
};

/**
 * Healing potions - consumable
 */
export const healingPotions: Partial<InventoryItem> = {
  id: 'fixture-item-healing-potion',
  characterId: 'fixture-fighter-5',
  name: 'Potion of Healing',
  itemType: 'consumable',
  quantity: 3,
  weight: '0.5',
  description: 'Restores 2d4 + 2 hit points when consumed',
  properties: JSON.stringify({
    healing: '2d4+2',
    consumable: true,
  }),
  isEquipped: false,
  isAttuned: false,
  requiresAttunement: false,
  createdAt: new Date('2024-01-01T00:00:00Z'),
  updatedAt: new Date('2024-01-01T00:00:00Z'),
};

/**
 * Magic arrows - ammunition
 */
export const magicArrows: Partial<InventoryItem> = {
  id: 'fixture-item-magic-arrows',
  characterId: 'fixture-rogue-3',
  name: '+1 Arrow',
  itemType: 'ammunition',
  quantity: 20,
  weight: '0.05',
  description: 'Magical arrows with +1 bonus to attack and damage',
  properties: JSON.stringify({
    bonus: 1,
    ammunitionType: 'arrow',
  }),
  isEquipped: false,
  isAttuned: false,
  requiresAttunement: false,
  createdAt: new Date('2024-01-01T00:00:00Z'),
  updatedAt: new Date('2024-01-01T00:00:00Z'),
};

/**
 * Ring of Protection - attuned magic item
 */
export const ringOfProtection: Partial<InventoryItem> = {
  id: 'fixture-item-ring-protection',
  characterId: 'fixture-wizard-5',
  name: 'Ring of Protection',
  itemType: 'equipment',
  quantity: 1,
  weight: '0',
  description: 'Grants +1 bonus to AC and saving throws',
  properties: JSON.stringify({
    acBonus: 1,
    savingThrowBonus: 1,
    rarity: 'rare',
  }),
  isEquipped: true,
  isAttuned: true,
  requiresAttunement: true,
  createdAt: new Date('2024-01-01T00:00:00Z'),
  updatedAt: new Date('2024-01-01T00:00:00Z'),
};

/**
 * Bag of Holding - magic container
 */
export const bagOfHolding: Partial<InventoryItem> = {
  id: 'fixture-item-bag-holding',
  characterId: 'fixture-wizard-5',
  name: 'Bag of Holding',
  itemType: 'equipment',
  quantity: 1,
  weight: '15',
  description: 'Magical bag that can hold 500 pounds in a 64 cubic foot space',
  properties: JSON.stringify({
    capacity: 500,
    volume: 64,
    rarity: 'uncommon',
  }),
  isEquipped: false,
  isAttuned: false,
  requiresAttunement: false,
  createdAt: new Date('2024-01-01T00:00:00Z'),
  updatedAt: new Date('2024-01-01T00:00:00Z'),
};

/**
 * Gold pieces - treasure
 */
export const goldPieces: Partial<InventoryItem> = {
  id: 'fixture-item-gold',
  characterId: 'fixture-fighter-5',
  name: 'Gold Pieces',
  itemType: 'treasure',
  quantity: 250,
  weight: '0.02',
  description: 'Standard gold currency',
  properties: null,
  isEquipped: false,
  isAttuned: false,
  requiresAttunement: false,
  createdAt: new Date('2024-01-01T00:00:00Z'),
  updatedAt: new Date('2024-01-01T00:00:00Z'),
};

/**
 * Thieves' tools - equipment
 */
export const thievesTools: Partial<InventoryItem> = {
  id: 'fixture-item-thieves-tools',
  characterId: 'fixture-rogue-3',
  name: "Thieves' Tools",
  itemType: 'equipment',
  quantity: 1,
  weight: '1',
  description: 'Professional lockpicking and trap disarming tools',
  properties: JSON.stringify({
    proficiencyRequired: true,
    toolType: 'thieves',
  }),
  isEquipped: false,
  isAttuned: false,
  requiresAttunement: false,
  createdAt: new Date('2024-01-01T00:00:00Z'),
  updatedAt: new Date('2024-01-01T00:00:00Z'),
};

/**
 * Consumable usage log - healing potion used
 */
export const usageLog1: Partial<ConsumableUsageLog> = {
  id: 'fixture-usage-log-1',
  characterId: 'fixture-fighter-5',
  itemId: 'fixture-item-healing-potion',
  quantityUsed: 1,
  sessionId: 'fixture-session-1',
  context: 'Used during combat against goblins',
  timestamp: new Date('2024-01-01T10:00:00Z'),
};

/**
 * Consumable usage log - magic arrow used
 */
export const usageLog2: Partial<ConsumableUsageLog> = {
  id: 'fixture-usage-log-2',
  characterId: 'fixture-rogue-3',
  itemId: 'fixture-item-magic-arrows',
  quantityUsed: 5,
  sessionId: 'fixture-session-1',
  context: 'Fired during dragon fight',
  timestamp: new Date('2024-01-01T10:30:00Z'),
};

/**
 * Exported collection of all inventory fixtures
 */
export const inventory = {
  // Weapons
  longsword,

  // Armor
  plateArmor,

  // Consumables
  healingPotions,
  magicArrows,

  // Magic items
  ringOfProtection,
  bagOfHolding,

  // Treasure
  goldPieces,

  // Tools
  thievesTools,

  // Usage logs
  usageLog1,
  usageLog2,
};

/**
 * Helper to create a basic fighter inventory
 */
export function createFighterInventory() {
  return [longsword, plateArmor, healingPotions, goldPieces];
}

/**
 * Helper to create a basic wizard inventory
 */
export function createWizardInventory() {
  return [ringOfProtection, bagOfHolding, healingPotions];
}

/**
 * Helper to create a basic rogue inventory
 */
export function createRogueInventory() {
  return [magicArrows, thievesTools, healingPotions];
}
