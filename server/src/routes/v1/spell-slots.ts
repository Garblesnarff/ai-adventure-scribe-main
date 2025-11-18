/**
 * Spell Slots Routes
 *
 * RESTful API endpoints for D&D 5E spell slot tracking and management
 * Work Unit: 2.1a
 */

import { Router, Request, Response } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { planRateLimit } from '../../middleware/rate-limit.js';
import { SpellSlotsService } from '../../services/spell-slots-service.js';
import { supabaseService } from '../../lib/supabase.js';
import type {
  UseSpellSlotInput,
  RestoreSpellSlotsInput,
  CalculateSpellSlotsInput,
  CalculateMulticlassSpellSlotsInput,
  SpellSlotUsageQuery,
  ClassName,
} from '../../types/spell-slots.js';

export default function spellSlotsRouter() {
  const router = Router();
  router.use(requireAuth);
  router.use(planRateLimit('default'));

  /**
   * @openapi
   * /v1/characters/{characterId}/spell-slots:
   *   get:
   *     summary: Get all spell slots for a character
   *     description: Retrieves current and maximum spell slots for all levels (1-9)
   *     tags:
   *       - Spell Slots
   *     parameters:
   *       - in: path
   *         name: characterId
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *         description: Character ID
   *     responses:
   *       200:
   *         description: Spell slots retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items:
   *                 type: object
   *                 properties:
   *                   level:
   *                     type: integer
   *                     minimum: 1
   *                     maximum: 9
   *                   current:
   *                     type: integer
   *                     minimum: 0
   *                   max:
   *                     type: integer
   *                     minimum: 0
   *       404:
   *         $ref: '#/components/responses/NotFound'
   *       403:
   *         $ref: '#/components/responses/Forbidden'
   *       500:
   *         $ref: '#/components/responses/ServerError'
   */
  router.get('/characters/:characterId/spell-slots', async (req: Request, res: Response) => {
    const { characterId } = req.params;
    const userId = req.user!.userId;

    // Validate characterId
    if (!characterId) {
      return res.status(400).json({ error: 'characterId is required' });
    }

    try {
      // Verify user owns the character
      const { data: character, error: charErr } = await supabaseService
        .from('characters')
        .select('user_id')
        .eq('id', characterId)
        .single();

      if (charErr || !character) {
        return res.status(404).json({ error: 'Character not found' });
      }

      if (character.user_id !== userId) {
        return res.status(403).json({ error: 'Access denied' });
      }

      // Get spell slots
      const spellSlots = await SpellSlotsService.getCharacterSpellSlots(characterId);

      return res.json(spellSlots);
    } catch (e) {
      console.error('Get spell slots error:', e);
      const message = e instanceof Error ? e.message : 'Failed to get spell slots';
      return res.status(500).json({ error: message });
    }
  });

  /**
   * POST /v1/characters/:characterId/spell-slots/use
   * Use a spell slot
   */
  router.post('/characters/:characterId/spell-slots/use', async (req: Request, res: Response) => {
    const { characterId } = req.params;
    const { spellName, spellLevel, slotLevelUsed, sessionId } = req.body as Omit<
      UseSpellSlotInput,
      'characterId'
    >;
    const userId = req.user!.userId;

    // Validate characterId
    if (!characterId) {
      return res.status(400).json({ error: 'characterId is required' });
    }

    try {
      // Verify user owns the character
      const { data: character, error: charErr } = await supabaseService
        .from('characters')
        .select('user_id')
        .eq('id', characterId)
        .single();

      if (charErr || !character) {
        return res.status(404).json({ error: 'Character not found' });
      }

      if (character.user_id !== userId) {
        return res.status(403).json({ error: 'Access denied' });
      }

      // Validate input
      if (!spellName) {
        return res.status(400).json({ error: 'spellName is required' });
      }

      if (spellLevel === undefined || spellLevel < 0 || spellLevel > 9) {
        return res.status(400).json({ error: 'spellLevel must be between 0 and 9' });
      }

      if (slotLevelUsed === undefined || slotLevelUsed < 1 || slotLevelUsed > 9) {
        return res.status(400).json({ error: 'slotLevelUsed must be between 1 and 9' });
      }

      // Use spell slot
      const result = await SpellSlotsService.useSpellSlot({
        characterId,
        spellName,
        spellLevel,
        slotLevelUsed,
        sessionId,
      });

      return res.json(result);
    } catch (e) {
      console.error('Use spell slot error:', e);
      const message = e instanceof Error ? e.message : 'Failed to use spell slot';
      return res.status(500).json({ error: message });
    }
  });

  /**
   * POST /v1/characters/:characterId/spell-slots/restore
   * Restore spell slots (long rest or specific restoration)
   */
  router.post('/characters/:characterId/spell-slots/restore', async (req: Request, res: Response) => {
    const { characterId } = req.params;
    const { level, amount } = req.body as Omit<RestoreSpellSlotsInput, 'characterId'>;
    const userId = req.user!.userId;

    // Validate characterId
    if (!characterId) {
      return res.status(400).json({ error: 'characterId is required' });
    }

    try {
      // Verify user owns the character
      const { data: character, error: charErr } = await supabaseService
        .from('characters')
        .select('user_id')
        .eq('id', characterId)
        .single();

      if (charErr || !character) {
        return res.status(404).json({ error: 'Character not found' });
      }

      if (character.user_id !== userId) {
        return res.status(403).json({ error: 'Access denied' });
      }

      // Restore spell slots
      const result = await SpellSlotsService.restoreSpellSlots({
        characterId,
        level,
        amount,
      });

      return res.json(result);
    } catch (e) {
      console.error('Restore spell slots error:', e);
      const message = e instanceof Error ? e.message : 'Failed to restore spell slots';
      return res.status(500).json({ error: message });
    }
  });

  /**
   * GET /v1/characters/:characterId/spell-slots/history
   * Get spell slot usage history
   */
  router.get('/characters/:characterId/spell-slots/history', async (req: Request, res: Response) => {
    const { characterId } = req.params;
    const { sessionId, limit, offset } = req.query;
    const userId = req.user!.userId;

    // Validate characterId
    if (!characterId) {
      return res.status(400).json({ error: 'characterId is required' });
    }

    try {
      // Verify user owns the character
      const { data: character, error: charErr } = await supabaseService
        .from('characters')
        .select('user_id')
        .eq('id', characterId)
        .single();

      if (charErr || !character) {
        return res.status(404).json({ error: 'Character not found' });
      }

      if (character.user_id !== userId) {
        return res.status(403).json({ error: 'Access denied' });
      }

      // Parse query parameters
      const query: SpellSlotUsageQuery = {
        characterId,
        sessionId: sessionId as string | undefined,
        limit: limit ? parseInt(limit as string, 10) : 50,
        offset: offset ? parseInt(offset as string, 10) : 0,
      };

      // Get usage history
      const history = await SpellSlotsService.getSpellSlotUsageHistory(query);

      return res.json(history);
    } catch (e) {
      console.error('Get spell slot history error:', e);
      const message = e instanceof Error ? e.message : 'Failed to get spell slot history';
      return res.status(500).json({ error: message });
    }
  });

  /**
   * GET /v1/spell-slots/calculate
   * Calculate spell slots for preview (doesn't save to database)
   * Query params: className, level
   */
  router.get('/spell-slots/calculate', async (req: Request, res: Response) => {
    const { className, level } = req.query;

    try {
      // Validate input
      if (!className) {
        return res.status(400).json({ error: 'className is required' });
      }

      if (!level) {
        return res.status(400).json({ error: 'level is required' });
      }

      const parsedLevel = parseInt(level as string, 10);

      if (isNaN(parsedLevel) || parsedLevel < 1 || parsedLevel > 20) {
        return res.status(400).json({ error: 'level must be between 1 and 20' });
      }

      // Calculate spell slots
      const calculation = SpellSlotsService.calculateSpellSlots(
        className as ClassName,
        parsedLevel
      );

      return res.json(calculation);
    } catch (e) {
      console.error('Calculate spell slots error:', e);
      const message = e instanceof Error ? e.message : 'Failed to calculate spell slots';
      return res.status(500).json({ error: message });
    }
  });

  /**
   * POST /v1/spell-slots/calculate-multiclass
   * Calculate multiclass spell slots for preview
   */
  router.post('/spell-slots/calculate-multiclass', async (req: Request, res: Response) => {
    const { classes } = req.body as CalculateMulticlassSpellSlotsInput;

    try {
      // Validate input
      if (!classes || !Array.isArray(classes) || classes.length === 0) {
        return res.status(400).json({ error: 'classes array is required' });
      }

      for (const classInfo of classes) {
        if (!classInfo.className) {
          return res.status(400).json({ error: 'className is required for each class' });
        }

        if (!classInfo.level || classInfo.level < 1 || classInfo.level > 20) {
          return res.status(400).json({ error: 'level must be between 1 and 20 for each class' });
        }
      }

      // Calculate multiclass spell slots
      const calculation = SpellSlotsService.calculateMulticlassSpellSlots(classes);

      return res.json(calculation);
    } catch (e) {
      console.error('Calculate multiclass spell slots error:', e);
      const message = e instanceof Error ? e.message : 'Failed to calculate multiclass spell slots';
      return res.status(500).json({ error: message });
    }
  });

  /**
   * POST /v1/characters/:characterId/spell-slots/initialize
   * Initialize spell slots for a character based on their class(es) and level(s)
   */
  router.post('/characters/:characterId/spell-slots/initialize', async (req: Request, res: Response) => {
    const { characterId } = req.params;
    const { classes } = req.body as { classes: Array<{ className: ClassName; level: number }> };
    const userId = req.user!.userId;

    // Validate characterId
    if (!characterId) {
      return res.status(400).json({ error: 'characterId is required' });
    }

    try {
      // Verify user owns the character
      const { data: character, error: charErr } = await supabaseService
        .from('characters')
        .select('user_id')
        .eq('id', characterId)
        .single();

      if (charErr || !character) {
        return res.status(404).json({ error: 'Character not found' });
      }

      if (character.user_id !== userId) {
        return res.status(403).json({ error: 'Access denied' });
      }

      // Validate input
      if (!classes || !Array.isArray(classes) || classes.length === 0) {
        return res.status(400).json({ error: 'classes array is required' });
      }

      // Initialize spell slots
      const spellSlots = await SpellSlotsService.initializeSpellSlots(characterId, classes);

      return res.status(201).json(spellSlots);
    } catch (e) {
      console.error('Initialize spell slots error:', e);
      const message = e instanceof Error ? e.message : 'Failed to initialize spell slots';
      return res.status(500).json({ error: message });
    }
  });

  /**
   * GET /v1/spell-slots/can-upcast
   * Check if a spell can be upcast
   * Query params: spellName, baseLevel, targetLevel
   */
  router.get('/spell-slots/can-upcast', async (req: Request, res: Response) => {
    const { spellName, baseLevel, targetLevel } = req.query;

    try {
      // Validate input
      if (!spellName) {
        return res.status(400).json({ error: 'spellName is required' });
      }

      if (baseLevel === undefined) {
        return res.status(400).json({ error: 'baseLevel is required' });
      }

      if (targetLevel === undefined) {
        return res.status(400).json({ error: 'targetLevel is required' });
      }

      const parsedBaseLevel = parseInt(baseLevel as string, 10);
      const parsedTargetLevel = parseInt(targetLevel as string, 10);

      if (isNaN(parsedBaseLevel) || parsedBaseLevel < 0 || parsedBaseLevel > 9) {
        return res.status(400).json({ error: 'baseLevel must be between 0 and 9' });
      }

      if (isNaN(parsedTargetLevel) || parsedTargetLevel < 1 || parsedTargetLevel > 9) {
        return res.status(400).json({ error: 'targetLevel must be between 1 and 9' });
      }

      // Check if can upcast
      const validation = SpellSlotsService.canUpcast(
        spellName as string,
        parsedBaseLevel,
        parsedTargetLevel
      );

      return res.json(validation);
    } catch (e) {
      console.error('Can upcast error:', e);
      const message = e instanceof Error ? e.message : 'Failed to check upcast';
      return res.status(500).json({ error: message });
    }
  });

  return router;
}
