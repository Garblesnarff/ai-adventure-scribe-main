/**
 * Rest Routes
 *
 * RESTful API endpoints for D&D 5E rest mechanics including short rests,
 * long rests, and hit dice management.
 */

import { Router, Request, Response } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { planRateLimit } from '../../middleware/rate-limit.js';
import { RestService } from '../../services/rest-service.js';
import { supabaseService } from '../../lib/supabase.js';

export default function restRouter() {
  const router = Router();
  router.use(requireAuth);
  router.use(planRateLimit('default'));

  /**
   * @openapi
   * /v1/rest/characters/{characterId}/short:
   *   post:
   *     summary: Take a short rest
   *     description: Character rests for 1 hour and can spend hit dice to recover HP
   *     tags:
   *       - Rest
   *     parameters:
   *       - in: path
   *         name: characterId
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *     requestBody:
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               hitDiceToSpend:
   *                 type: integer
   *                 minimum: 0
   *                 description: Number of hit dice to spend during the rest
   *               sessionId:
   *                 type: string
   *                 format: uuid
   *               notes:
   *                 type: string
   *           examples:
   *             withHitDice:
   *               summary: Short rest with hit dice
   *               value:
   *                 hitDiceToSpend: 2
   *                 sessionId: "session-123"
   *                 notes: "Rested after goblin fight"
   *     responses:
   *       200:
   *         description: Short rest completed successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 hpRestored:
   *                   type: integer
   *                 hitDiceSpent:
   *                   type: integer
   *                 hitDiceRemaining:
   *                   type: integer
   *                 featuresRestored:
   *                   type: array
   *                   items:
   *                     type: string
   *       404:
   *         $ref: '#/components/responses/NotFound'
   *       403:
   *         $ref: '#/components/responses/Forbidden'
   *       500:
   *         $ref: '#/components/responses/ServerError'
   */
  router.post('/characters/:characterId/short', async (req: Request, res: Response) => {
    const { characterId } = req.params;
    const { hitDiceToSpend, sessionId, notes } = req.body as {
      hitDiceToSpend?: number;
      sessionId?: string;
      notes?: string;
    };
    const userId = req.user!.userId;

    // Validate characterId
    if (!characterId) {
      return res.status(400).json({ error: 'characterId is required' });
    }

    try {
      // Verify user owns the character
      const { data: character, error: characterErr } = await supabaseService
        .from('characters')
        .select('*')
        .eq('id', characterId)
        .single();

      if (characterErr || !character) {
        return res.status(404).json({ error: 'Character not found' });
      }

      if (character.user_id !== userId) {
        return res.status(403).json({ error: 'Access denied' });
      }

      // Take short rest
      const result = await RestService.takeShortRest(
        characterId,
        hitDiceToSpend || 0,
        sessionId,
        notes
      );

      return res.status(200).json(result);
    } catch (e) {
      console.error('Short rest error:', e);
      const errorMessage = e instanceof Error ? e.message : 'Failed to complete short rest';
      return res.status(500).json({ error: errorMessage });
    }
  });

  /**
   * POST /v1/characters/:characterId/rest/long
   * Take a long rest (8 hours, restore all HP, spell slots, and half hit dice)
   */
  router.post('/characters/:characterId/long', async (req: Request, res: Response) => {
    const { characterId } = req.params;
    const { sessionId, notes } = req.body as {
      sessionId?: string;
      notes?: string;
    };
    const userId = req.user!.userId;

    // Validate characterId
    if (!characterId) {
      return res.status(400).json({ error: 'characterId is required' });
    }

    try {
      // Verify user owns the character
      const { data: character, error: characterErr } = await supabaseService
        .from('characters')
        .select('*')
        .eq('id', characterId)
        .single();

      if (characterErr || !character) {
        return res.status(404).json({ error: 'Character not found' });
      }

      if (character.user_id !== userId) {
        return res.status(403).json({ error: 'Access denied' });
      }

      // Take long rest
      const result = await RestService.takeLongRest(characterId, sessionId, notes);

      return res.status(200).json(result);
    } catch (e) {
      console.error('Long rest error:', e);
      const errorMessage = e instanceof Error ? e.message : 'Failed to complete long rest';
      return res.status(500).json({ error: errorMessage });
    }
  });

  /**
   * GET /v1/characters/:characterId/hit-dice
   * Get all hit dice for a character
   */
  router.get('/characters/:characterId/hit-dice', async (req: Request, res: Response) => {
    const { characterId } = req.params;
    const userId = req.user!.userId;

    // Validate characterId
    if (!characterId) {
      return res.status(400).json({ error: 'characterId is required' });
    }

    try {
      // Verify user owns the character
      const { data: character, error: characterErr } = await supabaseService
        .from('characters')
        .select('*')
        .eq('id', characterId)
        .single();

      if (characterErr || !character) {
        return res.status(404).json({ error: 'Character not found' });
      }

      if (character.user_id !== userId) {
        return res.status(403).json({ error: 'Access denied' });
      }

      // Get hit dice
      const hitDice = await RestService.getHitDice(characterId);

      return res.status(200).json({ hitDice });
    } catch (e) {
      console.error('Get hit dice error:', e);
      return res.status(500).json({ error: 'Failed to get hit dice' });
    }
  });

  /**
   * POST /v1/characters/:characterId/hit-dice/spend
   * Spend hit dice to recover HP
   */
  router.post('/characters/:characterId/hit-dice/spend', async (req: Request, res: Response) => {
    const { characterId } = req.params;
    const { count, roll } = req.body as {
      count: number;
      roll?: number;
    };
    const userId = req.user!.userId;

    // Validate characterId
    if (!characterId) {
      return res.status(400).json({ error: 'characterId is required' });
    }

    try {
      // Verify user owns the character
      const { data: character, error: characterErr } = await supabaseService
        .from('characters')
        .select('*')
        .eq('id', characterId)
        .single();

      if (characterErr || !character) {
        return res.status(404).json({ error: 'Character not found' });
      }

      if (character.user_id !== userId) {
        return res.status(403).json({ error: 'Access denied' });
      }

      // Validate count
      if (!count || count < 1) {
        return res.status(400).json({ error: 'Count must be at least 1' });
      }

      // Spend hit dice
      const result = await RestService.spendHitDice(characterId, count, roll ? [roll] : undefined);

      return res.status(200).json({
        hpRestored: result.hpRestored,
        hitDiceSpent: result.hitDiceSpent,
        rolls: result.rolls,
        remaining: result.hitDiceRemaining,
      });
    } catch (e) {
      console.error('Spend hit dice error:', e);
      const errorMessage = e instanceof Error ? e.message : 'Failed to spend hit dice';
      return res.status(500).json({ error: errorMessage });
    }
  });

  /**
   * GET /v1/characters/:characterId/rest-history
   * Get rest history for a character
   */
  router.get('/characters/:characterId/rest-history', async (req: Request, res: Response) => {
    const { characterId } = req.params;
    const { sessionId, limit } = req.query as {
      sessionId?: string;
      limit?: string;
    };
    const userId = req.user!.userId;

    // Validate characterId
    if (!characterId) {
      return res.status(400).json({ error: 'characterId is required' });
    }

    try {
      // Verify user owns the character
      const { data: character, error: characterErr } = await supabaseService
        .from('characters')
        .select('*')
        .eq('id', characterId)
        .single();

      if (characterErr || !character) {
        return res.status(404).json({ error: 'Character not found' });
      }

      if (character.user_id !== userId) {
        return res.status(403).json({ error: 'Access denied' });
      }

      // Get rest history
      const rests = await RestService.getRestHistory(
        characterId,
        sessionId,
        limit ? parseInt(limit) : undefined
      );

      return res.status(200).json({ rests });
    } catch (e) {
      console.error('Get rest history error:', e);
      return res.status(500).json({ error: 'Failed to get rest history' });
    }
  });

  /**
   * POST /v1/characters/:characterId/hit-dice/initialize
   * Initialize hit dice for a character (used when creating/leveling character)
   */
  router.post('/characters/:characterId/hit-dice/initialize', async (req: Request, res: Response) => {
    const { characterId } = req.params;
    const { className, level } = req.body as {
      className: string;
      level: number;
    };
    const userId = req.user!.userId;

    // Validate characterId
    if (!characterId) {
      return res.status(400).json({ error: 'characterId is required' });
    }

    try {
      // Verify user owns the character
      const { data: character, error: characterErr } = await supabaseService
        .from('characters')
        .select('*')
        .eq('id', characterId)
        .single();

      if (characterErr || !character) {
        return res.status(404).json({ error: 'Character not found' });
      }

      if (character.user_id !== userId) {
        return res.status(403).json({ error: 'Access denied' });
      }

      // Validate input
      if (!className || !level || level < 1 || level > 20) {
        return res.status(400).json({
          error: 'Valid className and level (1-20) are required',
        });
      }

      // Initialize hit dice
      const hitDice = await RestService.initializeHitDice(characterId, className, level);

      return res.status(201).json({ hitDice });
    } catch (e) {
      console.error('Initialize hit dice error:', e);
      const errorMessage = e instanceof Error ? e.message : 'Failed to initialize hit dice';
      return res.status(500).json({ error: errorMessage });
    }
  });

  return router;
}
