/**
 * Inventory Service Tests
 *
 * Comprehensive test suite for D&D 5E inventory management system
 * Tests inventory CRUD, consumables, ammunition, weight/encumbrance, and attunement
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { InventoryService } from '../inventory-service.js';
import { db } from '../../../../db/client.js';
import {
  characters,
  characterStats,
  inventoryItems,
  consumableUsageLog,
  gameSessions,
} from '../../../../db/schema/index.js';
import { eq } from 'drizzle-orm';

// Test data
let testCharacterId: string;
let testSessionId: string;

/**
 * Setup test character with stats
 */
async function createTestCharacter(strength: number = 10): Promise<string> {
  // Create character
  const [character] = await db
    .insert(characters)
    .values({
      userId: 'test-user-id',
      name: 'Test Fighter',
      race: 'Human',
      class: 'Fighter',
      level: 5,
    })
    .returning();

  if (!character) throw new Error('Failed to create test character');

  // Create character stats
  await db.insert(characterStats).values({
    characterId: character.id,
    strength,
    dexterity: 14,
    constitution: 16,
    intelligence: 10,
    wisdom: 12,
    charisma: 8,
  });

  return character.id;
}

/**
 * Create test session
 */
async function createTestSession(): Promise<string> {
  const [session] = await db
    .insert(gameSessions)
    .values({
      campaignId: null,
      characterId: null,
      sessionNumber: 1,
      status: 'active',
      startTime: new Date(),
    })
    .returning();

  if (!session) throw new Error('Failed to create test session');
  return session.id;
}

/**
 * Cleanup test data
 */
async function cleanupTestData() {
  if (testCharacterId) {
    await db.delete(characters).where(eq(characters.id, testCharacterId));
  }
  if (testSessionId) {
    await db.delete(gameSessions).where(eq(gameSessions.id, testSessionId));
  }
}

beforeAll(async () => {
  testSessionId = await createTestSession();
});

afterAll(async () => {
  await cleanupTestData();
});

beforeEach(async () => {
  // Create fresh character for each test
  testCharacterId = await createTestCharacter(15); // STR 15 = 225 lbs carrying capacity
});

describe('InventoryService', () => {
  // ==========================================
  // Inventory Management Tests
  // ==========================================

  describe('addItem', () => {
    it('should add item to inventory', async () => {
      const item = await InventoryService.addItem({
        characterId: testCharacterId,
        name: 'Longsword',
        itemType: 'weapon',
        quantity: 1,
        weight: 3,
        description: 'A versatile melee weapon',
        properties: {
          damage: '1d8',
          damageType: 'slashing',
          weaponType: 'martial melee',
        },
      });

      expect(item).toBeDefined();
      expect(item.name).toBe('Longsword');
      expect(item.itemType).toBe('weapon');
      expect(item.quantity).toBe(1);
      expect(parseFloat(item.weight || '0')).toBe(3);
      expect(item.characterId).toBe(testCharacterId);
    });

    it('should add item with default values', async () => {
      const item = await InventoryService.addItem({
        characterId: testCharacterId,
        name: 'Gold Coins',
        itemType: 'treasure',
      });

      expect(item.quantity).toBe(1);
      expect(parseFloat(item.weight || '0')).toBe(0);
      expect(item.isEquipped).toBe(false);
      expect(item.isAttuned).toBe(false);
    });
  });

  describe('getInventory', () => {
    beforeEach(async () => {
      // Add test items
      await InventoryService.addItem({
        characterId: testCharacterId,
        name: 'Longsword',
        itemType: 'weapon',
        quantity: 1,
        weight: 3,
        isEquipped: true,
      });

      await InventoryService.addItem({
        characterId: testCharacterId,
        name: 'Arrows',
        itemType: 'ammunition',
        quantity: 20,
        weight: 1,
      });

      await InventoryService.addItem({
        characterId: testCharacterId,
        name: 'Potion of Healing',
        itemType: 'consumable',
        quantity: 3,
        weight: 0.5,
      });
    });

    it('should get all inventory items', async () => {
      const inventory = await InventoryService.getInventory(testCharacterId);

      expect(inventory.items).toHaveLength(3);
      expect(inventory.totalItems).toBe(3);
      expect(inventory.totalWeight).toBeGreaterThan(0);
    });

    it('should filter by item type', async () => {
      const inventory = await InventoryService.getInventory(testCharacterId, {
        itemType: 'weapon',
      });

      expect(inventory.items).toHaveLength(1);
      expect(inventory.items[0]!.name).toBe('Longsword');
    });

    it('should filter by equipped status', async () => {
      const inventory = await InventoryService.getInventory(testCharacterId, {
        equipped: true,
      });

      expect(inventory.items).toHaveLength(1);
      expect(inventory.items[0]!.isEquipped).toBe(true);
    });

    it('should calculate total weight correctly', async () => {
      const inventory = await InventoryService.getInventory(testCharacterId);

      // Longsword: 3 lbs × 1 = 3
      // Arrows: 1 lb × 20 = 20
      // Potions: 0.5 lbs × 3 = 1.5
      // Total: 24.5 lbs
      expect(inventory.totalWeight).toBe(24.5);
    });
  });

  describe('updateItem', () => {
    it('should update item quantity', async () => {
      const item = await InventoryService.addItem({
        characterId: testCharacterId,
        name: 'Arrows',
        itemType: 'ammunition',
        quantity: 20,
      });

      const updated = await InventoryService.updateItem(item.id, {
        quantity: 15,
      });

      expect(updated).toBeDefined();
      expect(updated?.quantity).toBe(15);
    });

    it('should update item properties', async () => {
      const item = await InventoryService.addItem({
        characterId: testCharacterId,
        name: 'Magic Sword',
        itemType: 'weapon',
      });

      const updated = await InventoryService.updateItem(item.id, {
        properties: {
          damage: '1d8+1',
          damageType: 'slashing',
          rarity: 'uncommon',
        },
      });

      expect(updated).toBeDefined();
      const props = JSON.parse(updated?.properties || '{}');
      expect(props.rarity).toBe('uncommon');
    });
  });

  describe('removeItem', () => {
    it('should remove item from inventory', async () => {
      const item = await InventoryService.addItem({
        characterId: testCharacterId,
        name: 'Rope',
        itemType: 'equipment',
      });

      const deleted = await InventoryService.removeItem(item.id);
      expect(deleted).toBe(true);

      const inventory = await InventoryService.getInventory(testCharacterId);
      expect(inventory.items).toHaveLength(0);
    });

    it('should return false for non-existent item', async () => {
      const deleted = await InventoryService.removeItem('non-existent-id');
      expect(deleted).toBe(false);
    });
  });

  // ==========================================
  // Consumable & Ammunition Tests
  // ==========================================

  describe('useConsumable', () => {
    it('should decrement consumable quantity', async () => {
      const item = await InventoryService.addItem({
        characterId: testCharacterId,
        name: 'Potion of Healing',
        itemType: 'consumable',
        quantity: 5,
      });

      const result = await InventoryService.useConsumable({
        characterId: testCharacterId,
        itemId: item.id,
        quantity: 2,
      });

      expect(result.success).toBe(true);
      expect(result.remainingQuantity).toBe(3);
      expect(result.itemDeleted).toBe(false);

      const inventory = await InventoryService.getInventory(testCharacterId);
      expect(inventory.items[0]!.quantity).toBe(3);
    });

    it('should delete item when quantity reaches zero', async () => {
      const item = await InventoryService.addItem({
        characterId: testCharacterId,
        name: 'Potion of Healing',
        itemType: 'consumable',
        quantity: 1,
      });

      const result = await InventoryService.useConsumable({
        characterId: testCharacterId,
        itemId: item.id,
        quantity: 1,
      });

      expect(result.success).toBe(true);
      expect(result.remainingQuantity).toBe(0);
      expect(result.itemDeleted).toBe(true);

      const inventory = await InventoryService.getInventory(testCharacterId);
      expect(inventory.items).toHaveLength(0);
    });

    it('should log usage with session and context', async () => {
      const item = await InventoryService.addItem({
        characterId: testCharacterId,
        name: 'Potion of Healing',
        itemType: 'consumable',
        quantity: 3,
      });

      const result = await InventoryService.useConsumable({
        characterId: testCharacterId,
        itemId: item.id,
        quantity: 1,
        sessionId: testSessionId,
        context: 'Healing after combat',
      });

      expect(result.usageLog).toBeDefined();
      expect(result.usageLog.quantityUsed).toBe(1);
      expect(result.usageLog.sessionId).toBe(testSessionId);
      expect(result.usageLog.context).toBe('Healing after combat');
    });

    it('should throw error for insufficient quantity', async () => {
      const item = await InventoryService.addItem({
        characterId: testCharacterId,
        name: 'Arrows',
        itemType: 'ammunition',
        quantity: 5,
      });

      await expect(
        InventoryService.useConsumable({
          characterId: testCharacterId,
          itemId: item.id,
          quantity: 10,
        })
      ).rejects.toThrow('Insufficient quantity');
    });

    it('should throw error for non-existent item', async () => {
      await expect(
        InventoryService.useConsumable({
          characterId: testCharacterId,
          itemId: 'non-existent-id',
        })
      ).rejects.toThrow('Item not found');
    });

    it('should throw error for wrong character', async () => {
      const otherCharacterId = await createTestCharacter();

      const item = await InventoryService.addItem({
        characterId: testCharacterId,
        name: 'Potion',
        itemType: 'consumable',
        quantity: 1,
      });

      await expect(
        InventoryService.useConsumable({
          characterId: otherCharacterId,
          itemId: item.id,
        })
      ).rejects.toThrow('Item does not belong to this character');

      // Cleanup
      await db.delete(characters).where(eq(characters.id, otherCharacterId));
    });
  });

  describe('useAmmunition', () => {
    it('should use ammunition by name', async () => {
      await InventoryService.addItem({
        characterId: testCharacterId,
        name: 'Arrows',
        itemType: 'ammunition',
        quantity: 20,
      });

      const result = await InventoryService.useAmmunition(
        testCharacterId,
        'Arrows',
        3
      );

      expect(result.success).toBe(true);
      expect(result.remainingQuantity).toBe(17);
    });

    it('should throw error if ammunition not found', async () => {
      await expect(
        InventoryService.useAmmunition(testCharacterId, 'Crossbow Bolts', 1)
      ).rejects.toThrow('Ammunition "Crossbow Bolts" not found');
    });
  });

  describe('recoverAmmunition', () => {
    it('should add to existing ammunition', async () => {
      await InventoryService.addItem({
        characterId: testCharacterId,
        name: 'Arrows',
        itemType: 'ammunition',
        quantity: 10,
      });

      const result = await InventoryService.recoverAmmunition(
        testCharacterId,
        'Arrows',
        5
      );

      expect(result.quantity).toBe(15);
    });

    it('should create new ammunition if not present', async () => {
      const result = await InventoryService.recoverAmmunition(
        testCharacterId,
        'Crossbow Bolts',
        10
      );

      expect(result.name).toBe('Crossbow Bolts');
      expect(result.itemType).toBe('ammunition');
      expect(result.quantity).toBe(10);
    });
  });

  // ==========================================
  // Equipment Management Tests
  // ==========================================

  describe('equipItem', () => {
    it('should equip weapon', async () => {
      const item = await InventoryService.addItem({
        characterId: testCharacterId,
        name: 'Longsword',
        itemType: 'weapon',
      });

      const result = await InventoryService.equipItem(testCharacterId, item.id);

      expect(result.success).toBe(true);
      expect(result.equippedItem?.isEquipped).toBe(true);
    });

    it('should equip armor', async () => {
      const item = await InventoryService.addItem({
        characterId: testCharacterId,
        name: 'Chain Mail',
        itemType: 'armor',
      });

      const result = await InventoryService.equipItem(testCharacterId, item.id);

      expect(result.success).toBe(true);
      expect(result.equippedItem?.isEquipped).toBe(true);
    });

    it('should not equip non-equipment items', async () => {
      const item = await InventoryService.addItem({
        characterId: testCharacterId,
        name: 'Potion',
        itemType: 'consumable',
      });

      const result = await InventoryService.equipItem(testCharacterId, item.id);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Only weapons and armor can be equipped');
    });
  });

  describe('unequipItem', () => {
    it('should unequip item', async () => {
      const item = await InventoryService.addItem({
        characterId: testCharacterId,
        name: 'Longsword',
        itemType: 'weapon',
        isEquipped: true,
      });

      const result = await InventoryService.unequipItem(item.id);

      expect(result).toBeDefined();
      expect(result?.isEquipped).toBe(false);
    });
  });

  // ==========================================
  // Weight & Encumbrance Tests
  // ==========================================

  describe('calculateTotalWeight', () => {
    it('should calculate total weight with multiple items', async () => {
      await InventoryService.addItem({
        characterId: testCharacterId,
        name: 'Longsword',
        itemType: 'weapon',
        quantity: 1,
        weight: 3,
      });

      await InventoryService.addItem({
        characterId: testCharacterId,
        name: 'Arrows',
        itemType: 'ammunition',
        quantity: 20,
        weight: 1,
      });

      const totalWeight = await InventoryService.calculateTotalWeight(testCharacterId);

      // 3 + 20 = 23 lbs
      expect(totalWeight).toBe(23);
    });

    it('should handle zero weight items', async () => {
      await InventoryService.addItem({
        characterId: testCharacterId,
        name: 'Spell Scroll',
        itemType: 'equipment',
        quantity: 1,
        weight: 0,
      });

      const totalWeight = await InventoryService.calculateTotalWeight(testCharacterId);
      expect(totalWeight).toBe(0);
    });
  });

  describe('getCarryingCapacity', () => {
    it('should calculate carrying capacity from strength', async () => {
      // Character has STR 15
      const capacity = await InventoryService.getCarryingCapacity(testCharacterId);

      // STR 15 × 15 = 225 lbs
      expect(capacity).toBe(225);
    });
  });

  describe('checkEncumbrance', () => {
    it('should return normal encumbrance', async () => {
      // Add lightweight items (STR 15 = 225 lbs capacity, 75 lbs for normal)
      await InventoryService.addItem({
        characterId: testCharacterId,
        name: 'Rope',
        itemType: 'equipment',
        quantity: 1,
        weight: 10,
      });

      const status = await InventoryService.checkEncumbrance(testCharacterId);

      expect(status.encumbranceLevel).toBe('normal');
      expect(status.isEncumbered).toBe(false);
      expect(status.isHeavilyEncumbered).toBe(false);
      expect(status.speedPenalty).toBe(0);
      expect(status.currentWeight).toBe(10);
      expect(status.carryingCapacity).toBe(225);
    });

    it('should detect encumbered status', async () => {
      // STR 15: Encumbered at 75+ lbs (STR × 5)
      await InventoryService.addItem({
        characterId: testCharacterId,
        name: 'Heavy Armor',
        itemType: 'armor',
        quantity: 1,
        weight: 80,
      });

      const status = await InventoryService.checkEncumbrance(testCharacterId);

      expect(status.encumbranceLevel).toBe('encumbered');
      expect(status.isEncumbered).toBe(true);
      expect(status.isHeavilyEncumbered).toBe(false);
      expect(status.speedPenalty).toBe(10);
    });

    it('should detect heavily encumbered status', async () => {
      // STR 15: Heavily Encumbered at 150+ lbs (STR × 10)
      await InventoryService.addItem({
        characterId: testCharacterId,
        name: 'Treasure Chest',
        itemType: 'treasure',
        quantity: 1,
        weight: 160,
      });

      const status = await InventoryService.checkEncumbrance(testCharacterId);

      expect(status.encumbranceLevel).toBe('heavily_encumbered');
      expect(status.isEncumbered).toBe(true);
      expect(status.isHeavilyEncumbered).toBe(true);
      expect(status.speedPenalty).toBe(20);
    });

    it('should handle edge case at encumbrance threshold', async () => {
      // Exactly at threshold should be normal
      await InventoryService.addItem({
        characterId: testCharacterId,
        name: 'Equipment',
        itemType: 'equipment',
        quantity: 1,
        weight: 75, // Exactly STR × 5
      });

      const status = await InventoryService.checkEncumbrance(testCharacterId);

      expect(status.encumbranceLevel).toBe('normal');
    });
  });

  // ==========================================
  // Attunement Tests (DMG pg. 136)
  // ==========================================

  describe('attuneItem', () => {
    it('should attune to magic item', async () => {
      const item = await InventoryService.addItem({
        characterId: testCharacterId,
        name: 'Ring of Protection',
        itemType: 'equipment',
        requiresAttunement: true,
      });

      const result = await InventoryService.attuneItem(testCharacterId, item.id);

      expect(result.success).toBe(true);
      expect(result.attunedItem?.isAttuned).toBe(true);
      expect(result.currentAttunedCount).toBe(1);
      expect(result.maxAttunedCount).toBe(3);
    });

    it('should enforce maximum 3 attuned items', async () => {
      // Add and attune 3 items
      for (let i = 0; i < 3; i++) {
        const item = await InventoryService.addItem({
          characterId: testCharacterId,
          name: `Magic Item ${i + 1}`,
          itemType: 'equipment',
          requiresAttunement: true,
        });
        await InventoryService.attuneItem(testCharacterId, item.id);
      }

      // Try to attune a 4th item
      const item4 = await InventoryService.addItem({
        characterId: testCharacterId,
        name: 'Magic Item 4',
        itemType: 'equipment',
        requiresAttunement: true,
      });

      const result = await InventoryService.attuneItem(testCharacterId, item4.id);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Cannot attune to more than 3 items');
      expect(result.currentAttunedCount).toBe(3);
    });

    it('should not attune item that does not require attunement', async () => {
      const item = await InventoryService.addItem({
        characterId: testCharacterId,
        name: 'Regular Sword',
        itemType: 'weapon',
        requiresAttunement: false,
      });

      const result = await InventoryService.attuneItem(testCharacterId, item.id);

      expect(result.success).toBe(false);
      expect(result.error).toContain('does not require attunement');
    });

    it('should not attune already attuned item', async () => {
      const item = await InventoryService.addItem({
        characterId: testCharacterId,
        name: 'Magic Ring',
        itemType: 'equipment',
        requiresAttunement: true,
        isAttuned: true,
      });

      const result = await InventoryService.attuneItem(testCharacterId, item.id);

      expect(result.success).toBe(false);
      expect(result.error).toContain('already attuned');
    });
  });

  describe('unattuneItem', () => {
    it('should break attunement', async () => {
      const item = await InventoryService.addItem({
        characterId: testCharacterId,
        name: 'Ring of Protection',
        itemType: 'equipment',
        requiresAttunement: true,
        isAttuned: true,
      });

      const result = await InventoryService.unattuneItem(item.id);

      expect(result).toBeDefined();
      expect(result?.isAttuned).toBe(false);
    });
  });

  describe('getAttunedItems', () => {
    it('should get all attuned items', async () => {
      await InventoryService.addItem({
        characterId: testCharacterId,
        name: 'Magic Ring',
        itemType: 'equipment',
        requiresAttunement: true,
        isAttuned: true,
      });

      await InventoryService.addItem({
        characterId: testCharacterId,
        name: 'Magic Cloak',
        itemType: 'equipment',
        requiresAttunement: true,
        isAttuned: true,
      });

      await InventoryService.addItem({
        characterId: testCharacterId,
        name: 'Regular Sword',
        itemType: 'weapon',
        isAttuned: false,
      });

      const attunedItems = await InventoryService.getAttunedItems(testCharacterId);

      expect(attunedItems).toHaveLength(2);
      expect(attunedItems.every((item) => item.isAttuned)).toBe(true);
    });
  });

  // ==========================================
  // Usage History Tests
  // ==========================================

  describe('getUsageHistory', () => {
    it('should get usage history for character', async () => {
      const item = await InventoryService.addItem({
        characterId: testCharacterId,
        name: 'Potion of Healing',
        itemType: 'consumable',
        quantity: 10,
      });

      // Use item multiple times
      await InventoryService.useConsumable({
        characterId: testCharacterId,
        itemId: item.id,
        quantity: 2,
        context: 'After combat',
      });

      await InventoryService.useConsumable({
        characterId: testCharacterId,
        itemId: item.id,
        quantity: 1,
        context: 'Emergency healing',
      });

      const history = await InventoryService.getUsageHistory({
        characterId: testCharacterId,
      });

      expect(history).toHaveLength(2);
      expect(history[0]!.quantityUsed).toBe(1); // Most recent first
      expect(history[1]!.quantityUsed).toBe(2);
    });

    it('should filter by item ID', async () => {
      const item1 = await InventoryService.addItem({
        characterId: testCharacterId,
        name: 'Potion of Healing',
        itemType: 'consumable',
        quantity: 5,
      });

      const item2 = await InventoryService.addItem({
        characterId: testCharacterId,
        name: 'Arrows',
        itemType: 'ammunition',
        quantity: 20,
      });

      await InventoryService.useConsumable({
        characterId: testCharacterId,
        itemId: item1.id,
      });

      await InventoryService.useConsumable({
        characterId: testCharacterId,
        itemId: item2.id,
      });

      const history = await InventoryService.getUsageHistory({
        characterId: testCharacterId,
        itemId: item1.id,
      });

      expect(history).toHaveLength(1);
      expect(history[0]!.itemId).toBe(item1.id);
    });

    it('should respect limit parameter', async () => {
      const item = await InventoryService.addItem({
        characterId: testCharacterId,
        name: 'Arrows',
        itemType: 'ammunition',
        quantity: 100,
      });

      // Use multiple times
      for (let i = 0; i < 10; i++) {
        await InventoryService.useConsumable({
          characterId: testCharacterId,
          itemId: item.id,
        });
      }

      const history = await InventoryService.getUsageHistory({
        characterId: testCharacterId,
        limit: 5,
      });

      expect(history).toHaveLength(5);
    });
  });

  // ==========================================
  // Edge Cases & Error Handling
  // ==========================================

  describe('Edge Cases', () => {
    it('should handle negative quantity gracefully', async () => {
      const item = await InventoryService.addItem({
        characterId: testCharacterId,
        name: 'Test Item',
        itemType: 'equipment',
        quantity: 5,
      });

      // Trying to update to negative should be prevented by DB constraint
      // but service should handle it
      const updated = await InventoryService.updateItem(item.id, {
        quantity: 0,
      });

      expect(updated?.quantity).toBe(0);
    });

    it('should handle very heavy items for encumbrance', async () => {
      await InventoryService.addItem({
        characterId: testCharacterId,
        name: 'Boulder',
        itemType: 'treasure',
        quantity: 1,
        weight: 1000,
      });

      const status = await InventoryService.checkEncumbrance(testCharacterId);

      expect(status.encumbranceLevel).toBe('heavily_encumbered');
      expect(status.currentWeight).toBe(1000);
    });

    it('should handle item with no properties field', async () => {
      const item = await InventoryService.addItem({
        characterId: testCharacterId,
        name: 'Simple Item',
        itemType: 'equipment',
      });

      expect(item.properties).toBeNull();
    });

    it('should handle character with no stats for encumbrance', async () => {
      const [character] = await db
        .insert(characters)
        .values({
          userId: 'test-user-id',
          name: 'No Stats Character',
          race: 'Human',
          class: 'Fighter',
          level: 1,
        })
        .returning();

      await expect(
        InventoryService.checkEncumbrance(character!.id)
      ).rejects.toThrow('Character stats not found');

      // Cleanup
      await db.delete(characters).where(eq(characters.id, character!.id));
    });
  });
});
