/**
 * Progression Routes
 *
 * RESTful API endpoints for D&D 5E experience points, leveling system,
 * and character progression tracking.
 */

import { Router, Request, Response } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { planRateLimit } from '../../middleware/rate-limit.js';
import { ProgressionService } from '../../services/progression-service.js';
import { supabaseService } from '../../lib/supabase.js';
import type {
  XPSource,
  LevelUpInput,
} from '../../types/progression.js';

export default function progressionRouter() {
  const router = Router();
  router.use(requireAuth);
  router.use(planRateLimit('default'));

  /**
   * @openapi
   * /v1/progression/characters/{characterId}/experience/award:
   *   post:
   *     summary: Award experience points to a character
   *     description: Adds XP to a character and checks for level-up eligibility
   *     tags:
   *       - Progression
   *     parameters:
   *       - in: path
   *         name: characterId
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - xp
   *               - source
   *             properties:
   *               xp:
   *                 type: integer
   *                 minimum: 0
   *                 description: Amount of XP to award
   *               source:
   *                 type: string
   *                 enum: [combat, quest, roleplay, milestone, other]
   *               description:
   *                 type: string
   *               sessionId:
   *                 type: string
   *                 format: uuid
   *           examples:
   *             combatXP:
   *               summary: XP from combat encounter
   *               value:
   *                 xp: 450
   *                 source: "combat"
   *                 description: "Defeated goblin war band"
   *                 sessionId: "session-123"
   *     responses:
   *       200:
   *         description: XP awarded successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 totalXP:
   *                   type: integer
   *                 currentLevel:
   *                   type: integer
   *                 canLevelUp:
   *                   type: boolean
   *                 xpForNextLevel:
   *                   type: integer
   *       400:
   *         $ref: '#/components/responses/ValidationError'
   *       404:
   *         $ref: '#/components/responses/NotFound'
   *       500:
   *         $ref: '#/components/responses/ServerError'
   */
  router.post('/characters/:characterId/experience/award', async (req: Request, res: Response) => {
    const { characterId } = req.params;
    const { xp, source, description, sessionId } = req.body as {
      xp: number;
      source: XPSource;
      description?: string;
      sessionId?: string;
    };
    const userId = req.user!.userId;

    try {
      // Validate characterId
      if (!characterId) {
        return res.status(400).json({ error: 'Character ID is required' });
      }

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

      // Validate XP
      if (xp === undefined || xp < 0) {
        return res.status(400).json({ error: 'XP must be a non-negative number' });
      }

      // Validate source
      const validSources: XPSource[] = ['combat', 'quest', 'roleplay', 'milestone', 'other'];
      if (!source || !validSources.includes(source)) {
        return res.status(400).json({ error: 'Valid source is required (combat, quest, roleplay, milestone, other)' });
      }

      // Award XP
      const result = await ProgressionService.awardXP(
        characterId,
        xp,
        source,
        description,
        sessionId
      );

      return res.status(200).json(result);
    } catch (e) {
      console.error('Award XP error:', e);
      const errorMessage = e instanceof Error ? e.message : 'Failed to award XP';
      return res.status(500).json({ error: errorMessage });
    }
  });

  /**
   * GET /v1/characters/:characterId/progression
   * Get character's current progression status
   */
  router.get('/characters/:characterId/progression', async (req: Request, res: Response) => {
    const { characterId } = req.params;
    const userId = req.user!.userId;

    try {
      // Validate characterId
      if (!characterId) {
        return res.status(400).json({ error: 'Character ID is required' });
      }

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

      // Get progression
      const progression = await ProgressionService.getProgression(characterId);

      return res.status(200).json(progression);
    } catch (e) {
      console.error('Get progression error:', e);
      return res.status(500).json({ error: 'Failed to get progression' });
    }
  });

  /**
   * POST /v1/characters/:characterId/level-up
   * Perform a level-up
   */
  router.post('/characters/:characterId/level-up', async (req: Request, res: Response) => {
    const { characterId } = req.params;
    const input = req.body as Omit<LevelUpInput, 'characterId'>;
    const userId = req.user!.userId;

    try {
      // Validate characterId
      if (!characterId) {
        return res.status(400).json({ error: 'Character ID is required' });
      }

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

      // Check if character can level up
      const canLevel = await ProgressionService.canLevelUp(characterId);
      if (!canLevel) {
        return res.status(400).json({ error: 'Character does not have enough XP to level up' });
      }

      // Perform level-up
      const result = await ProgressionService.levelUp({
        characterId,
        ...input,
      });

      return res.status(200).json(result);
    } catch (e) {
      console.error('Level-up error:', e);
      const errorMessage = e instanceof Error ? e.message : 'Failed to level up';
      return res.status(500).json({ error: errorMessage });
    }
  });

  /**
   * GET /v1/characters/:characterId/level-up-options
   * Get available options for leveling up
   */
  router.get('/characters/:characterId/level-up-options', async (req: Request, res: Response) => {
    const { characterId } = req.params;
    const { newLevel } = req.query as { newLevel?: string };
    const userId = req.user!.userId;

    try {
      // Validate characterId
      if (!characterId) {
        return res.status(400).json({ error: 'Character ID is required' });
      }

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

      // Validate newLevel
      if (!newLevel) {
        return res.status(400).json({ error: 'newLevel query parameter is required' });
      }

      const level = parseInt(newLevel);
      if (isNaN(level) || level < 1 || level > 20) {
        return res.status(400).json({ error: 'newLevel must be between 1 and 20' });
      }

      // Get level-up options
      const options = await ProgressionService.getLevelUpOptions(characterId, level);

      return res.status(200).json(options);
    } catch (e) {
      console.error('Get level-up options error:', e);
      const errorMessage = e instanceof Error ? e.message : 'Failed to get level-up options';
      return res.status(500).json({ error: errorMessage });
    }
  });

  /**
   * GET /v1/characters/:characterId/experience-history
   * Get XP history for a character
   */
  router.get('/characters/:characterId/experience-history', async (req: Request, res: Response) => {
    const { characterId } = req.params;
    const { sessionId, limit } = req.query as {
      sessionId?: string;
      limit?: string;
    };
    const userId = req.user!.userId;

    try {
      // Validate characterId
      if (!characterId) {
        return res.status(400).json({ error: 'Character ID is required' });
      }

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

      // Get history
      const events = await ProgressionService.getXPHistory(
        characterId,
        sessionId,
        limit ? parseInt(limit) : undefined
      );

      return res.status(200).json({ events });
    } catch (e) {
      console.error('Get XP history error:', e);
      return res.status(500).json({ error: 'Failed to get XP history' });
    }
  });

  /**
   * POST /v1/characters/:characterId/milestone-level
   * Set character level directly (milestone leveling)
   */
  router.post('/characters/:characterId/milestone-level', async (req: Request, res: Response) => {
    const { characterId } = req.params;
    const { level, reason } = req.body as {
      level: number;
      reason?: string;
    };
    const userId = req.user!.userId;

    try {
      // Validate characterId
      if (!characterId) {
        return res.status(400).json({ error: 'Character ID is required' });
      }

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

      // Validate level
      if (level === undefined || level < 1 || level > 20) {
        return res.status(400).json({ error: 'Level must be between 1 and 20' });
      }

      // Set level
      const result = await ProgressionService.setLevel(characterId, level, reason);

      return res.status(200).json(result);
    } catch (e) {
      console.error('Milestone level error:', e);
      const errorMessage = e instanceof Error ? e.message : 'Failed to set milestone level';
      return res.status(500).json({ error: errorMessage });
    }
  });

  /**
   * GET /v1/progression/xp-table
   * Get the D&D 5E XP threshold table
   */
  router.get('/xp-table', async (req: Request, res: Response) => {
    try {
      const xpTable = ProgressionService.getXPTable();
      return res.status(200).json({ xpTable });
    } catch (e) {
      console.error('Get XP table error:', e);
      return res.status(500).json({ error: 'Failed to get XP table' });
    }
  });

  return router;
}
