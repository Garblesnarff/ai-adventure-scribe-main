/**
 * Inventory Service
 *
 * Handles D&D 5E inventory management including:
 * - Item tracking (weapons, armor, consumables, ammunition, equipment, treasure)
 * - Ammunition and consumable usage
 * - Weight and encumbrance calculations (PHB pg. 176)
 * - Attunement tracking (DMG pg. 136, max 3 items)
 * - Equipment management
 *
 * @module server/services/inventory-service
 */

import { db } from '../../../db/client.js';
import {
  inventoryItems,
  consumableUsageLog,
  characters,
  characterStats,
  type InventoryItem,
  type NewInventoryItem,
  type ConsumableUsageLog,
} from '../../../db/schema/index.js';
import { eq, and, desc, sql } from 'drizzle-orm';
import type {
  CreateInventoryItemInput,
  UpdateInventoryItemInput,
  UseConsumableInput,
  UseConsumableResult,
  EncumbranceStatus,
  InventorySummary,
  AttunementResult,
  EquipResult,
  GetInventoryOptions,
  GetUsageHistoryInput,
  ItemType,
  EncumbranceLevel,
  ItemProperties,
} from '../types/inventory.js';
import {
  MAX_ATTUNED_ITEMS,
  ENCUMBRANCE_THRESHOLDS,
  SPEED_PENALTIES,
} from '../types/inventory.js';
import { NotFoundError, BusinessLogicError, ForbiddenError, InternalServerError } from '../lib/errors.js';

export class InventoryService {
  // ==========================================
  // Inventory Management
  // ==========================================

  /**
   * Get character inventory with optional filters
   * @param characterId - Character ID
   * @param options - Filter options (itemType, equipped, attuned)
   * @returns Inventory summary with items and total weight
   */
  static async getInventory(
    characterId: string,
    options: GetInventoryOptions = {}
  ): Promise<InventorySummary> {
    const conditions = [eq(inventoryItems.characterId, characterId)];

    if (options.itemType) {
      conditions.push(eq(inventoryItems.itemType, options.itemType));
    }
    if (options.equipped !== undefined) {
      conditions.push(eq(inventoryItems.isEquipped, options.equipped));
    }
    if (options.attuned !== undefined) {
      conditions.push(eq(inventoryItems.isAttuned, options.attuned));
    }

    const items = await db.query.inventoryItems.findMany({
      where: and(...conditions),
      orderBy: [desc(inventoryItems.createdAt)],
    });

    const totalWeight = items.reduce((sum, item) => {
      const weight = parseFloat(item.weight || '0');
      return sum + weight * item.quantity;
    }, 0);

    return {
      items,
      totalWeight: Math.round(totalWeight * 100) / 100, // Round to 2 decimal places
      totalItems: items.length,
    };
  }

  /**
   * Add item to character inventory
   * @param input - Item creation data
   * @returns Created inventory item
   */
  static async addItem(input: CreateInventoryItemInput): Promise<InventoryItem> {
    const itemData: NewInventoryItem = {
      characterId: input.characterId,
      name: input.name,
      itemType: input.itemType,
      quantity: input.quantity ?? 1,
      weight: input.weight?.toString() ?? '0',
      description: input.description ?? null,
      properties: input.properties ? JSON.stringify(input.properties) : null,
      isEquipped: input.isEquipped ?? false,
      isAttuned: input.isAttuned ?? false,
      requiresAttunement: input.requiresAttunement ?? false,
    };

    const [item] = await db.insert(inventoryItems).values(itemData).returning();

    if (!item) {
      throw new InternalServerError('Failed to create inventory item');
    }

    return item;
  }

  /**
   * Update an existing inventory item
   * @param itemId - Item ID to update
   * @param updates - Fields to update
   * @returns Updated item or null if not found
   */
  static async updateItem(
    itemId: string,
    updates: UpdateInventoryItemInput
  ): Promise<InventoryItem | null> {
    const updateData: Partial<NewInventoryItem> = {};

    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.quantity !== undefined) updateData.quantity = updates.quantity;
    if (updates.weight !== undefined) updateData.weight = updates.weight.toString();
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.properties !== undefined) {
      updateData.properties = JSON.stringify(updates.properties);
    }
    if (updates.isEquipped !== undefined) updateData.isEquipped = updates.isEquipped;
    if (updates.isAttuned !== undefined) updateData.isAttuned = updates.isAttuned;

    const [updated] = await db
      .update(inventoryItems)
      .set(updateData)
      .where(eq(inventoryItems.id, itemId))
      .returning();

    return updated || null;
  }

  /**
   * Remove item from inventory
   * @param itemId - Item ID to delete
   * @returns True if deleted, false if not found
   */
  static async removeItem(itemId: string): Promise<boolean> {
    const result = await db
      .delete(inventoryItems)
      .where(eq(inventoryItems.id, itemId))
      .returning({ id: inventoryItems.id });

    return result.length > 0;
  }

  /**
   * Get a single inventory item by ID
   * @param itemId - Item ID
   * @returns Item or null if not found
   */
  static async getItemById(itemId: string): Promise<InventoryItem | null> {
    const item = await db.query.inventoryItems.findFirst({
      where: eq(inventoryItems.id, itemId),
    });

    return item || null;
  }

  // ==========================================
  // Consumable & Ammunition Usage
  // ==========================================

  /**
   * Use consumable or ammunition
   * Decrements quantity and logs usage
   * @param input - Usage input data
   * @returns Usage result with remaining quantity
   */
  static async useConsumable(input: UseConsumableInput): Promise<UseConsumableResult> {
    const item = await this.getItemById(input.itemId);

    if (!item) {
      throw new NotFoundError('Inventory item', input.itemId);
    }

    if (item.characterId !== input.characterId) {
      throw new ForbiddenError('Item does not belong to this character');
    }

    const quantityToUse = input.quantity ?? 1;

    if (item.quantity < quantityToUse) {
      throw new BusinessLogicError(
        `Insufficient quantity. Available: ${item.quantity}, Requested: ${quantityToUse}`,
        { available: item.quantity, requested: quantityToUse, itemId: input.itemId }
      );
    }

    // Log the usage
    const [usageLog] = await db
      .insert(consumableUsageLog)
      .values({
        characterId: input.characterId,
        itemId: input.itemId,
        quantityUsed: quantityToUse,
        sessionId: input.sessionId ?? null,
        context: input.context ?? null,
      })
      .returning();

    if (!usageLog) {
      throw new InternalServerError('Failed to log consumable usage');
    }

    const newQuantity = item.quantity - quantityToUse;
    let itemDeleted = false;

    // Update or delete item based on remaining quantity
    if (newQuantity <= 0) {
      await this.removeItem(input.itemId);
      itemDeleted = true;
    } else {
      await this.updateItem(input.itemId, { quantity: newQuantity });
    }

    return {
      success: true,
      remainingQuantity: Math.max(0, newQuantity),
      itemDeleted,
      usageLog,
    };
  }

  /**
   * Use ammunition (convenience method for ranged attacks)
   * @param characterId - Character ID
   * @param ammoType - Ammunition type/name
   * @param count - Number to use (default 1)
   * @returns Usage result
   */
  static async useAmmunition(
    characterId: string,
    ammoType: string,
    count: number = 1
  ): Promise<UseConsumableResult> {
    // Find ammunition by name
    const items = await db.query.inventoryItems.findMany({
      where: and(
        eq(inventoryItems.characterId, characterId),
        eq(inventoryItems.itemType, 'ammunition'),
        eq(inventoryItems.name, ammoType)
      ),
    });

    if (items.length === 0) {
      throw new NotFoundError(`Ammunition "${ammoType}"`, characterId);
    }

    const item = items[0];
    if (!item) {
      throw new NotFoundError(`Ammunition "${ammoType}"`, characterId);
    }

    return this.useConsumable({
      characterId,
      itemId: item.id,
      quantity: count,
      context: 'Ranged attack',
    });
  }

  /**
   * Recover ammunition after combat
   * @param characterId - Character ID
   * @param ammoType - Ammunition type/name
   * @param count - Number to recover
   * @returns Updated item
   */
  static async recoverAmmunition(
    characterId: string,
    ammoType: string,
    count: number
  ): Promise<InventoryItem> {
    // Find or create ammunition
    const items = await db.query.inventoryItems.findMany({
      where: and(
        eq(inventoryItems.characterId, characterId),
        eq(inventoryItems.itemType, 'ammunition'),
        eq(inventoryItems.name, ammoType)
      ),
    });

    if (items.length > 0) {
      // Add to existing
      const item = items[0];
      if (!item) {
        throw new InternalServerError('Failed to find ammunition item');
      }
      const updated = await this.updateItem(item.id, {
        quantity: item.quantity + count,
      });
      if (!updated) throw new InternalServerError('Failed to update ammunition');
      return updated;
    } else {
      // Create new ammunition entry
      return this.addItem({
        characterId,
        name: ammoType,
        itemType: 'ammunition',
        quantity: count,
        weight: 0.05, // Default weight per arrow/bolt
      });
    }
  }

  // ==========================================
  // Equipment Management
  // ==========================================

  /**
   * Equip weapon or armor
   * @param characterId - Character ID
   * @param itemId - Item ID to equip
   * @returns Equip result
   */
  static async equipItem(characterId: string, itemId: string): Promise<EquipResult> {
    const item = await this.getItemById(itemId);

    if (!item) {
      return { success: false, error: 'Item not found' };
    }

    if (item.characterId !== characterId) {
      return { success: false, error: 'Item does not belong to this character' };
    }

    if (item.itemType !== 'weapon' && item.itemType !== 'armor') {
      return { success: false, error: 'Only weapons and armor can be equipped' };
    }

    const updated = await this.updateItem(itemId, { isEquipped: true });

    if (!updated) {
      return { success: false, error: 'Failed to equip item' };
    }

    return {
      success: true,
      equippedItem: updated,
    };
  }

  /**
   * Unequip item
   * @param itemId - Item ID to unequip
   * @returns Updated item
   */
  static async unequipItem(itemId: string): Promise<InventoryItem | null> {
    return this.updateItem(itemId, { isEquipped: false });
  }

  // ==========================================
  // Weight & Encumbrance (PHB pg. 176)
  // ==========================================

  /**
   * Calculate total inventory weight
   * @param characterId - Character ID
   * @returns Total weight in pounds
   */
  static async calculateTotalWeight(characterId: string): Promise<number> {
    const { totalWeight } = await this.getInventory(characterId);
    return totalWeight;
  }

  /**
   * Get carrying capacity
   * Carrying capacity = Strength × 15 lbs (PHB pg. 176)
   * @param characterId - Character ID
   * @returns Carrying capacity in pounds
   */
  static async getCarryingCapacity(characterId: string): Promise<number> {
    const stats = await db.query.characterStats.findFirst({
      where: eq(characterStats.characterId, characterId),
    });

    if (!stats) {
      throw new NotFoundError('Character stats', characterId);
    }

    // Base carrying capacity is STR × 15
    // Could be modified by size (Tiny = ×0.5, Small/Medium = ×1, Large = ×2, etc.)
    return stats.strength * 15;
  }

  /**
   * Check encumbrance status
   * Variant rule (PHB pg. 176):
   * - Normal: weight ≤ capacity
   * - Encumbered: weight > capacity × 5, speed -10
   * - Heavily Encumbered: weight > capacity × 10, speed -20, disadvantage on physical checks
   * @param characterId - Character ID
   * @returns Encumbrance status
   */
  static async checkEncumbrance(characterId: string): Promise<EncumbranceStatus> {
    const stats = await db.query.characterStats.findFirst({
      where: eq(characterStats.characterId, characterId),
    });

    if (!stats) {
      throw new NotFoundError('Character stats', characterId);
    }

    const currentWeight = await this.calculateTotalWeight(characterId);
    const carryingCapacity = await this.getCarryingCapacity(characterId);

    // Determine encumbrance level using variant rule
    let encumbranceLevel: EncumbranceLevel = 'normal';
    let speedPenalty = SPEED_PENALTIES.NORMAL as number;

    // Heavily Encumbered: weight > STR × 10
    if (currentWeight > stats.strength * ENCUMBRANCE_THRESHOLDS.HEAVILY_ENCUMBERED) {
      encumbranceLevel = 'heavily_encumbered';
      speedPenalty = SPEED_PENALTIES.HEAVILY_ENCUMBERED as number;
    }
    // Encumbered: weight > STR × 5
    else if (currentWeight > stats.strength * ENCUMBRANCE_THRESHOLDS.ENCUMBERED) {
      encumbranceLevel = 'encumbered';
      speedPenalty = SPEED_PENALTIES.ENCUMBERED as number;
    }

    return {
      currentWeight,
      carryingCapacity,
      encumbranceLevel,
      isEncumbered: encumbranceLevel === 'encumbered' || encumbranceLevel === 'heavily_encumbered',
      isHeavilyEncumbered: encumbranceLevel === 'heavily_encumbered',
      speedPenalty,
      strengthScore: stats.strength,
    };
  }

  // ==========================================
  // Attunement Tracking (DMG pg. 136)
  // ==========================================

  /**
   * Get all attuned items for a character
   * @param characterId - Character ID
   * @returns Array of attuned items
   */
  static async getAttunedItems(characterId: string): Promise<InventoryItem[]> {
    const items = await db.query.inventoryItems.findMany({
      where: and(
        eq(inventoryItems.characterId, characterId),
        eq(inventoryItems.isAttuned, true)
      ),
    });

    return items;
  }

  /**
   * Attune to a magic item
   * Maximum 3 items can be attuned at once (DMG pg. 136)
   * @param characterId - Character ID
   * @param itemId - Item ID to attune
   * @returns Attunement result
   */
  static async attuneItem(characterId: string, itemId: string): Promise<AttunementResult> {
    const item = await this.getItemById(itemId);

    if (!item) {
      return {
        success: false,
        currentAttunedCount: 0,
        maxAttunedCount: MAX_ATTUNED_ITEMS,
        error: 'Item not found',
      };
    }

    if (item.characterId !== characterId) {
      return {
        success: false,
        currentAttunedCount: 0,
        maxAttunedCount: MAX_ATTUNED_ITEMS,
        error: 'Item does not belong to this character',
      };
    }

    if (!item.requiresAttunement) {
      return {
        success: false,
        currentAttunedCount: 0,
        maxAttunedCount: MAX_ATTUNED_ITEMS,
        error: 'Item does not require attunement',
      };
    }

    if (item.isAttuned) {
      return {
        success: false,
        currentAttunedCount: 0,
        maxAttunedCount: MAX_ATTUNED_ITEMS,
        error: 'Item is already attuned',
      };
    }

    // Check current attuned count
    const attunedItems = await this.getAttunedItems(characterId);

    if (attunedItems.length >= MAX_ATTUNED_ITEMS) {
      return {
        success: false,
        currentAttunedCount: attunedItems.length,
        maxAttunedCount: MAX_ATTUNED_ITEMS,
        error: `Cannot attune to more than ${MAX_ATTUNED_ITEMS} items. Unattune from another item first.`,
      };
    }

    // Attune to the item
    const updated = await this.updateItem(itemId, { isAttuned: true });

    if (!updated) {
      return {
        success: false,
        currentAttunedCount: attunedItems.length,
        maxAttunedCount: MAX_ATTUNED_ITEMS,
        error: 'Failed to attune to item',
      };
    }

    return {
      success: true,
      attunedItem: updated,
      currentAttunedCount: attunedItems.length + 1,
      maxAttunedCount: MAX_ATTUNED_ITEMS,
    };
  }

  /**
   * Break attunement with a magic item
   * @param itemId - Item ID to unattune
   * @returns Updated item or null
   */
  static async unattuneItem(itemId: string): Promise<InventoryItem | null> {
    return this.updateItem(itemId, { isAttuned: false });
  }

  // ==========================================
  // Usage History
  // ==========================================

  /**
   * Get consumable usage history
   * @param input - Query parameters
   * @returns Array of usage log entries
   */
  static async getUsageHistory(input: GetUsageHistoryInput): Promise<ConsumableUsageLog[]> {
    const conditions = [eq(consumableUsageLog.characterId, input.characterId)];

    if (input.itemId) {
      conditions.push(eq(consumableUsageLog.itemId, input.itemId));
    }
    if (input.sessionId) {
      conditions.push(eq(consumableUsageLog.sessionId, input.sessionId));
    }

    const query = db.query.consumableUsageLog.findMany({
      where: and(...conditions),
      orderBy: [desc(consumableUsageLog.timestamp)],
      limit: input.limit ?? 100,
    });

    return query;
  }
}
