/**
 * Class Features Routes
 *
 * RESTful API endpoints for D&D 5E class features system including feature library,
 * character features, subclass management, and feature usage tracking.
 */

import { Router, Request, Response } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { planRateLimit } from '../../middleware/rate-limit.js';
import { ClassFeaturesService } from '../../services/class-features-service.js';
import { supabaseService } from '../../lib/supabase.js';

export default function classFeaturesRouter() {
  const router = Router();
  router.use(requireAuth);
  router.use(planRateLimit('default'));

  /**
   * GET /v1/class-features
   * Get features from the library
   * Query params: className, subclass, level
   */
  router.get('/', async (req: Request, res: Response) => {
    const { className, subclass, level } = req.query as {
      className?: string;
      subclass?: string;
      level?: string;
    };

    try {
      const features = await ClassFeaturesService.getFeaturesLibrary({
        className,
        subclass,
        level: level ? parseInt(level) : undefined,
      });

      return res.status(200).json({ features });
    } catch (e) {
      console.error('Get features library error:', e);
      const errorMessage = e instanceof Error ? e.message : 'Failed to get features';
      return res.status(500).json({ error: errorMessage });
    }
  });

  /**
   * GET /v1/class-features/:featureId
   * Get a specific feature by ID
   */
  router.get('/:featureId', async (req: Request, res: Response) => {
    const { featureId } = req.params;

    try {
      // Validate featureId
      if (!featureId) {
        return res.status(400).json({ error: 'Feature ID is required' });
      }

      const feature = await ClassFeaturesService.getFeatureById(featureId);

      if (!feature) {
        return res.status(404).json({ error: 'Feature not found' });
      }

      return res.status(200).json({ feature });
    } catch (e) {
      console.error('Get feature error:', e);
      const errorMessage = e instanceof Error ? e.message : 'Failed to get feature';
      return res.status(500).json({ error: errorMessage });
    }
  });

  /**
   * GET /v1/class-features/subclasses/:className
   * Get available subclasses for a class
   */
  router.get('/subclasses/:className', async (req: Request, res: Response) => {
    const { className } = req.params;

    try {
      // Validate className
      if (!className) {
        return res.status(400).json({ error: 'Class name is required' });
      }

      const result = ClassFeaturesService.getAvailableSubclasses(className);
      return res.status(200).json(result);
    } catch (e) {
      console.error('Get subclasses error:', e);
      const errorMessage = e instanceof Error ? e.message : 'Failed to get subclasses';
      return res.status(500).json({ error: errorMessage });
    }
  });

  /**
   * GET /v1/characters/:characterId/features
   * Get all features for a character
   */
  router.get('/characters/:characterId/features', async (req: Request, res: Response) => {
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

      // Get character features with usage information
      const result = await ClassFeaturesService.getCharacterFeaturesWithUsage(characterId);

      return res.status(200).json(result);
    } catch (e) {
      console.error('Get character features error:', e);
      const errorMessage = e instanceof Error ? e.message : 'Failed to get character features';
      return res.status(500).json({ error: errorMessage });
    }
  });

  /**
   * POST /v1/characters/:characterId/features/:featureId/grant
   * Grant a feature to a character
   */
  router.post('/characters/:characterId/features/:featureId/grant', async (req: Request, res: Response) => {
    const { characterId, featureId } = req.params;
    const { acquiredAtLevel } = req.body as { acquiredAtLevel: number };
    const userId = req.user!.userId;

    try {
      // Validate parameters
      if (!characterId) {
        return res.status(400).json({ error: 'Character ID is required' });
      }
      if (!featureId) {
        return res.status(400).json({ error: 'Feature ID is required' });
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

      if (!acquiredAtLevel || acquiredAtLevel < 1 || acquiredAtLevel > 20) {
        return res.status(400).json({ error: 'Invalid level (must be 1-20)' });
      }

      // Grant the feature
      const result = await ClassFeaturesService.grantFeature({
        characterId,
        featureId,
        acquiredAtLevel,
      });

      return res.status(201).json(result);
    } catch (e) {
      console.error('Grant feature error:', e);
      const errorMessage = e instanceof Error ? e.message : 'Failed to grant feature';
      return res.status(500).json({ error: errorMessage });
    }
  });

  /**
   * POST /v1/characters/:characterId/features/:featureId/use
   * Use a feature
   */
  router.post('/characters/:characterId/features/:featureId/use', async (req: Request, res: Response) => {
    const { characterId, featureId } = req.params;
    const { context, sessionId } = req.body as {
      context?: string;
      sessionId?: string;
    };
    const userId = req.user!.userId;

    try {
      // Validate parameters
      if (!characterId) {
        return res.status(400).json({ error: 'Character ID is required' });
      }
      if (!featureId) {
        return res.status(400).json({ error: 'Feature ID is required' });
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

      // Use the feature
      const result = await ClassFeaturesService.useFeature({
        characterId,
        featureId,
        context,
        sessionId,
      });

      if (!result.success) {
        return res.status(400).json(result);
      }

      return res.status(200).json(result);
    } catch (e) {
      console.error('Use feature error:', e);
      const errorMessage = e instanceof Error ? e.message : 'Failed to use feature';
      return res.status(500).json({ error: errorMessage });
    }
  });

  /**
   * POST /v1/characters/:characterId/features/restore
   * Restore features after rest
   */
  router.post('/characters/:characterId/features/restore', async (req: Request, res: Response) => {
    const { characterId } = req.params;
    const { restType } = req.body as { restType: 'short' | 'long' };
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

      if (!restType || (restType !== 'short' && restType !== 'long')) {
        return res.status(400).json({ error: 'Invalid rest type (must be "short" or "long")' });
      }

      // Restore features
      const result = await ClassFeaturesService.restoreFeatures({
        characterId,
        restType,
      });

      return res.status(200).json(result);
    } catch (e) {
      console.error('Restore features error:', e);
      const errorMessage = e instanceof Error ? e.message : 'Failed to restore features';
      return res.status(500).json({ error: errorMessage });
    }
  });

  /**
   * POST /v1/characters/:characterId/subclass
   * Set character's subclass
   */
  router.post('/characters/:characterId/subclass', async (req: Request, res: Response) => {
    const { characterId } = req.params;
    const { className, subclassName, level } = req.body as {
      className: string;
      subclassName: string;
      level: number;
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

      if (!className || !subclassName || !level) {
        return res.status(400).json({ error: 'Missing required fields: className, subclassName, level' });
      }

      if (level < 1 || level > 20) {
        return res.status(400).json({ error: 'Invalid level (must be 1-20)' });
      }

      // Set the subclass
      const result = await ClassFeaturesService.setSubclass({
        characterId,
        className,
        subclassName,
        level,
      });

      return res.status(201).json(result);
    } catch (e) {
      console.error('Set subclass error:', e);
      const errorMessage = e instanceof Error ? e.message : 'Failed to set subclass';
      return res.status(500).json({ error: errorMessage });
    }
  });

  /**
   * GET /v1/characters/:characterId/subclass/:className
   * Get character's subclass for a class
   */
  router.get('/characters/:characterId/subclass/:className', async (req: Request, res: Response) => {
    const { characterId, className } = req.params;
    const userId = req.user!.userId;

    try {
      // Validate parameters
      if (!characterId) {
        return res.status(400).json({ error: 'Character ID is required' });
      }
      if (!className) {
        return res.status(400).json({ error: 'Class name is required' });
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

      // Get the subclass
      const subclass = await ClassFeaturesService.getCharacterSubclass(characterId, className);

      if (!subclass) {
        return res.status(404).json({ error: 'Subclass not found for this class' });
      }

      return res.status(200).json({ subclass });
    } catch (e) {
      console.error('Get character subclass error:', e);
      const errorMessage = e instanceof Error ? e.message : 'Failed to get subclass';
      return res.status(500).json({ error: errorMessage });
    }
  });

  /**
   * GET /v1/characters/:characterId/features/history
   * Get feature usage history
   */
  router.get('/characters/:characterId/features/history', async (req: Request, res: Response) => {
    const { characterId } = req.params;
    const { featureId, sessionId, limit } = req.query as {
      featureId?: string;
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

      // Get usage history
      const history = await ClassFeaturesService.getFeatureUsageHistory({
        characterId,
        featureId,
        sessionId,
        limit: limit ? parseInt(limit) : 50,
      });

      return res.status(200).json({ history });
    } catch (e) {
      console.error('Get feature history error:', e);
      const errorMessage = e instanceof Error ? e.message : 'Failed to get feature history';
      return res.status(500).json({ error: errorMessage });
    }
  });

  return router;
}
