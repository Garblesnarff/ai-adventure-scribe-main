/**
 * Inventory System Type Definitions
 *
 * Type-safe interfaces for D&D 5E inventory management, ammunition tracking,
 * consumables, weight/encumbrance, and attunement tracking.
 */

import { InventoryItem, ConsumableUsageLog } from '../../../db/schema/index.js';

/**
 * Item type discriminator
 */
export type ItemType = 'weapon' | 'armor' | 'consumable' | 'ammunition' | 'equipment' | 'treasure';

/**
 * Encumbrance status levels (PHB pg. 176)
 */
export type EncumbranceLevel = 'normal' | 'encumbered' | 'heavily_encumbered';

/**
 * Item properties for different item types
 */
export interface ItemProperties {
  // Weapon properties
  damage?: string; // e.g., "1d8"
  damageType?: string; // e.g., "slashing"
  attackBonus?: number;
  range?: string; // e.g., "5 ft" or "30/120 ft"
  weaponType?: string; // e.g., "simple melee", "martial ranged"

  // Armor properties
  armorClass?: number;
  armorType?: string; // e.g., "light", "medium", "heavy", "shield"
  stealthDisadvantage?: boolean;

  // Consumable properties
  effectDescription?: string;
  healingDice?: string; // e.g., "2d4+2"
  duration?: string; // e.g., "1 hour", "instantaneous"

  // Attunement properties
  attunementRequirements?: string; // e.g., "requires attunement by a spellcaster"

  // Magical properties
  rarity?: 'common' | 'uncommon' | 'rare' | 'very rare' | 'legendary' | 'artifact';
  magicalEffects?: string;

  // Additional custom properties
  [key: string]: any;
}

/**
 * Input for creating a new inventory item
 */
export interface CreateInventoryItemInput {
  characterId: string;
  name: string;
  itemType: ItemType;
  quantity?: number;
  weight?: number;
  description?: string;
  properties?: ItemProperties;
  isEquipped?: boolean;
  isAttuned?: boolean;
  requiresAttunement?: boolean;
}

/**
 * Input for updating an inventory item
 */
export interface UpdateInventoryItemInput {
  name?: string;
  quantity?: number;
  weight?: number;
  description?: string;
  properties?: ItemProperties;
  isEquipped?: boolean;
  isAttuned?: boolean;
}

/**
 * Input for using a consumable or ammunition
 */
export interface UseConsumableInput {
  characterId: string;
  itemId: string;
  quantity?: number;
  sessionId?: string;
  context?: string;
}

/**
 * Result of using a consumable
 */
export interface UseConsumableResult {
  success: boolean;
  remainingQuantity: number;
  itemDeleted: boolean;
  usageLog: ConsumableUsageLog;
}

/**
 * Encumbrance status result (PHB pg. 176)
 */
export interface EncumbranceStatus {
  currentWeight: number;
  carryingCapacity: number;
  encumbranceLevel: EncumbranceLevel;
  isEncumbered: boolean;
  isHeavilyEncumbered: boolean;
  speedPenalty: number;
  strengthScore: number;
}

/**
 * Inventory summary with total weight
 */
export interface InventorySummary {
  items: InventoryItem[];
  totalWeight: number;
  totalItems: number;
}

/**
 * Attunement result
 */
export interface AttunementResult {
  success: boolean;
  attunedItem?: InventoryItem;
  currentAttunedCount: number;
  maxAttunedCount: number;
  error?: string;
}

/**
 * Result of equipping an item
 */
export interface EquipResult {
  success: boolean;
  equippedItem?: InventoryItem;
  error?: string;
}

/**
 * Query options for getting inventory
 */
export interface GetInventoryOptions {
  itemType?: ItemType;
  equipped?: boolean;
  attuned?: boolean;
}

/**
 * Input for usage history query
 */
export interface GetUsageHistoryInput {
  characterId: string;
  itemId?: string;
  sessionId?: string;
  limit?: number;
}

/**
 * Common D&D 5E ammunition types
 */
export const AMMUNITION_TYPES = {
  ARROWS: 'Arrows',
  CROSSBOW_BOLTS: 'Crossbow Bolts',
  SLING_BULLETS: 'Sling Bullets',
  BLOWGUN_NEEDLES: 'Blowgun Needles',
} as const;

/**
 * Common D&D 5E healing potions
 */
export const HEALING_POTIONS = {
  HEALING: { name: 'Potion of Healing', dice: '2d4+2' },
  GREATER_HEALING: { name: 'Potion of Greater Healing', dice: '4d4+4' },
  SUPERIOR_HEALING: { name: 'Potion of Superior Healing', dice: '8d4+8' },
  SUPREME_HEALING: { name: 'Potion of Supreme Healing', dice: '10d4+20' },
} as const;

/**
 * Carrying capacity multipliers by size (PHB pg. 176)
 */
export const CARRYING_CAPACITY_MULTIPLIERS = {
  TINY: 0.5,
  SMALL: 1,
  MEDIUM: 1,
  LARGE: 2,
  HUGE: 4,
  GARGANTUAN: 8,
} as const;

/**
 * Maximum attuned items (DMG pg. 136)
 */
export const MAX_ATTUNED_ITEMS = 3;

/**
 * Encumbrance variant rule thresholds (PHB pg. 176)
 */
export const ENCUMBRANCE_THRESHOLDS = {
  NORMAL: 1,
  ENCUMBERED: 5,
  HEAVILY_ENCUMBERED: 10,
} as const;

/**
 * Speed penalties for encumbrance (PHB pg. 176)
 */
export const SPEED_PENALTIES = {
  NORMAL: 0,
  ENCUMBERED: 10,
  HEAVILY_ENCUMBERED: 20,
} as const;
