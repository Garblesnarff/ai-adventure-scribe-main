/**
 * Inventory API Routes
 *
 * REST endpoints for D&D 5E inventory management:
 * - Item CRUD operations
 * - Consumable and ammunition usage
 * - Equipment management
 * - Weight and encumbrance tracking
 * - Attunement management
 */

import { Router, Request, Response } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { planRateLimit } from '../../middleware/rate-limit.js';
import { InventoryService } from '../../services/inventory-service.js';
import type {
  CreateInventoryItemInput,
  UpdateInventoryItemInput,
  UseConsumableInput,
  GetInventoryOptions,
  ItemType,
} from '../../types/inventory.js';

export default function inventoryRouter() {
  const router = Router();
  router.use(requireAuth);
  router.use(planRateLimit('default'));

  // ==========================================
  // Inventory Management
  // ==========================================

  /**
   * GET /v1/characters/:characterId/inventory
   * Get character inventory with optional filters
   */
  router.get('/:characterId/inventory', async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const { characterId } = req.params;
    const { itemType, equipped } = req.query;

    try {
      // Validate characterId
      if (!characterId) {
        return res.status(400).json({ error: 'Character ID is required' });
      }

      // Verify character ownership (basic check via service will happen)
      const options: GetInventoryOptions = {};

      if (itemType && typeof itemType === 'string') {
        options.itemType = itemType as ItemType;
      }
      if (equipped !== undefined) {
        options.equipped = equipped === 'true';
      }

      const inventory = await InventoryService.getInventory(characterId, options);

      return res.json(inventory);
    } catch (error) {
      console.error('[INVENTORY_GET] Error fetching inventory:', error);
      return res.status(500).json({
        error: 'Failed to fetch inventory',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * POST /v1/characters/:characterId/inventory
   * Add item to character inventory
   */
  router.post('/:characterId/inventory', async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const { characterId } = req.params;
    const itemData = req.body;

    try {
      // Validate characterId
      if (!characterId) {
        return res.status(400).json({ error: 'Character ID is required' });
      }

      // Validate required fields
      if (!itemData.name || !itemData.itemType) {
        return res.status(400).json({
          error: 'Missing required fields: name and itemType',
        });
      }

      const input: CreateInventoryItemInput = {
        characterId,
        name: itemData.name,
        itemType: itemData.itemType,
        quantity: itemData.quantity,
        weight: itemData.weight,
        description: itemData.description,
        properties: itemData.properties,
        isEquipped: itemData.isEquipped,
        isAttuned: itemData.isAttuned,
        requiresAttunement: itemData.requiresAttunement,
      };

      const item = await InventoryService.addItem(input);

      return res.status(201).json({ item });
    } catch (error) {
      console.error('[INVENTORY_ADD] Error adding item:', error);
      return res.status(500).json({
        error: 'Failed to add item',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * PATCH /v1/characters/:characterId/inventory/:itemId
   * Update inventory item
   */
  router.patch('/:characterId/inventory/:itemId', async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const { characterId, itemId } = req.params;
    const updates = req.body;

    try {
      // Validate parameters
      if (!characterId) {
        return res.status(400).json({ error: 'Character ID is required' });
      }
      if (!itemId) {
        return res.status(400).json({ error: 'Item ID is required' });
      }

      const input: UpdateInventoryItemInput = {};

      if (updates.name !== undefined) input.name = updates.name;
      if (updates.quantity !== undefined) input.quantity = updates.quantity;
      if (updates.weight !== undefined) input.weight = updates.weight;
      if (updates.description !== undefined) input.description = updates.description;
      if (updates.properties !== undefined) input.properties = updates.properties;
      if (updates.isEquipped !== undefined) input.isEquipped = updates.isEquipped;
      if (updates.isAttuned !== undefined) input.isAttuned = updates.isAttuned;

      const item = await InventoryService.updateItem(itemId, input);

      if (!item) {
        return res.status(404).json({ error: 'Item not found' });
      }

      return res.json({ item });
    } catch (error) {
      console.error('[INVENTORY_UPDATE] Error updating item:', error);
      return res.status(500).json({
        error: 'Failed to update item',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * DELETE /v1/characters/:characterId/inventory/:itemId
   * Remove item from inventory
   */
  router.delete('/:characterId/inventory/:itemId', async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const { characterId, itemId } = req.params;

    try {
      // Validate parameters
      if (!characterId) {
        return res.status(400).json({ error: 'Character ID is required' });
      }
      if (!itemId) {
        return res.status(400).json({ error: 'Item ID is required' });
      }

      const deleted = await InventoryService.removeItem(itemId);

      if (!deleted) {
        return res.status(404).json({ error: 'Item not found' });
      }

      return res.json({ deleted: true });
    } catch (error) {
      console.error('[INVENTORY_DELETE] Error deleting item:', error);
      return res.status(500).json({
        error: 'Failed to delete item',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // ==========================================
  // Consumable & Ammunition Usage
  // ==========================================

  /**
   * POST /v1/characters/:characterId/inventory/:itemId/use
   * Use consumable or ammunition
   */
  router.post('/:characterId/inventory/:itemId/use', async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const { characterId, itemId } = req.params;
    const { quantity, sessionId, context } = req.body;

    try {
      // Validate parameters
      if (!characterId) {
        return res.status(400).json({ error: 'Character ID is required' });
      }
      if (!itemId) {
        return res.status(400).json({ error: 'Item ID is required' });
      }

      const input: UseConsumableInput = {
        characterId,
        itemId,
        quantity,
        sessionId,
        context,
      };

      const result = await InventoryService.useConsumable(input);

      return res.json({
        remainingQuantity: result.remainingQuantity,
        itemDeleted: result.itemDeleted,
      });
    } catch (error) {
      console.error('[INVENTORY_USE] Error using item:', error);
      return res.status(400).json({
        error: 'Failed to use item',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // ==========================================
  // Weight & Encumbrance
  // ==========================================

  /**
   * GET /v1/characters/:characterId/encumbrance
   * Get encumbrance status
   */
  router.get('/:characterId/encumbrance', async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const { characterId } = req.params;

    try {
      // Validate characterId
      if (!characterId) {
        return res.status(400).json({ error: 'Character ID is required' });
      }

      const encumbrance = await InventoryService.checkEncumbrance(characterId);

      return res.json(encumbrance);
    } catch (error) {
      console.error('[ENCUMBRANCE_CHECK] Error checking encumbrance:', error);
      return res.status(500).json({
        error: 'Failed to check encumbrance',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // ==========================================
  // Attunement Management
  // ==========================================

  /**
   * POST /v1/characters/:characterId/attune/:itemId
   * Attune to a magic item
   */
  router.post('/:characterId/attune/:itemId', async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const { characterId, itemId } = req.params;

    try {
      // Validate parameters
      if (!characterId) {
        return res.status(400).json({ error: 'Character ID is required' });
      }
      if (!itemId) {
        return res.status(400).json({ error: 'Item ID is required' });
      }

      const result = await InventoryService.attuneItem(characterId, itemId);

      if (!result.success) {
        return res.status(400).json({
          error: result.error,
          currentAttunedCount: result.currentAttunedCount,
          maxAttunedCount: result.maxAttunedCount,
        });
      }

      return res.json({
        success: true,
        attunedItem: result.attunedItem,
        currentAttunedCount: result.currentAttunedCount,
        maxAttunedCount: result.maxAttunedCount,
      });
    } catch (error) {
      console.error('[ATTUNE] Error attuning to item:', error);
      return res.status(500).json({
        error: 'Failed to attune to item',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * DELETE /v1/characters/:characterId/attune/:itemId
   * Break attunement with a magic item
   */
  router.delete('/:characterId/attune/:itemId', async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const { characterId, itemId } = req.params;

    try {
      // Validate parameters
      if (!characterId) {
        return res.status(400).json({ error: 'Character ID is required' });
      }
      if (!itemId) {
        return res.status(400).json({ error: 'Item ID is required' });
      }

      const item = await InventoryService.unattuneItem(itemId);

      if (!item) {
        return res.status(404).json({ error: 'Item not found' });
      }

      return res.json({ success: true, item });
    } catch (error) {
      console.error('[UNATTUNE] Error unattuning item:', error);
      return res.status(500).json({
        error: 'Failed to unattune item',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * GET /v1/characters/:characterId/attuned
   * Get all attuned items
   */
  router.get('/:characterId/attuned', async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const { characterId } = req.params;

    try {
      // Validate characterId
      if (!characterId) {
        return res.status(400).json({ error: 'Character ID is required' });
      }

      const items = await InventoryService.getAttunedItems(characterId);

      return res.json({ items });
    } catch (error) {
      console.error('[ATTUNED_ITEMS] Error fetching attuned items:', error);
      return res.status(500).json({
        error: 'Failed to fetch attuned items',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // ==========================================
  // Equipment Management
  // ==========================================

  /**
   * POST /v1/characters/:characterId/inventory/:itemId/equip
   * Equip weapon or armor
   */
  router.post('/:characterId/inventory/:itemId/equip', async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const { characterId, itemId } = req.params;

    try {
      // Validate parameters
      if (!characterId) {
        return res.status(400).json({ error: 'Character ID is required' });
      }
      if (!itemId) {
        return res.status(400).json({ error: 'Item ID is required' });
      }

      const result = await InventoryService.equipItem(characterId, itemId);

      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }

      return res.json({ success: true, item: result.equippedItem });
    } catch (error) {
      console.error('[EQUIP_ITEM] Error equipping item:', error);
      return res.status(500).json({
        error: 'Failed to equip item',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * POST /v1/characters/:characterId/inventory/:itemId/unequip
   * Unequip item
   */
  router.post('/:characterId/inventory/:itemId/unequip', async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const { characterId, itemId } = req.params;

    try {
      // Validate parameters
      if (!characterId) {
        return res.status(400).json({ error: 'Character ID is required' });
      }
      if (!itemId) {
        return res.status(400).json({ error: 'Item ID is required' });
      }

      const item = await InventoryService.unequipItem(itemId);

      if (!item) {
        return res.status(404).json({ error: 'Item not found' });
      }

      return res.json({ success: true, item });
    } catch (error) {
      console.error('[UNEQUIP_ITEM] Error unequipping item:', error);
      return res.status(500).json({
        error: 'Failed to unequip item',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // ==========================================
  // Usage History
  // ==========================================

  /**
   * GET /v1/characters/:characterId/usage-history
   * Get consumable usage history
   */
  router.get('/:characterId/usage-history', async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const { characterId } = req.params;
    const { itemId, sessionId, limit } = req.query;

    try {
      // Validate characterId
      if (!characterId) {
        return res.status(400).json({ error: 'Character ID is required' });
      }

      const history = await InventoryService.getUsageHistory({
        characterId,
        itemId: itemId as string | undefined,
        sessionId: sessionId as string | undefined,
        limit: limit ? parseInt(limit as string) : undefined,
      });

      return res.json({ history });
    } catch (error) {
      console.error('[USAGE_HISTORY] Error fetching usage history:', error);
      return res.status(500).json({
        error: 'Failed to fetch usage history',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  return router;
}
