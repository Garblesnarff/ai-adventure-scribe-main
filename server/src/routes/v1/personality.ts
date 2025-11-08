import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { planRateLimit } from '../../middleware/rate-limit.js';
import { supabase } from '../../lib/supabase.js';

const router = Router();

// SECURITY: Require authentication - personality data is for authenticated users creating characters
router.use(requireAuth);
router.use(planRateLimit('default'));

/**
 * GET /personality/random/:type
 * Get a random personality element of the specified type
 * Query params:
 * - background: Filter by background ID (optional)
 * - alignment: Filter by alignment for ideals (optional)
 */
router.get('/random/:type', async (req, res): Promise<void> => {
  try {
    const { type } = req.params;
    const { background, alignment } = req.query;

    // Validate type parameter
    const validTypes = ['traits', 'ideals', 'bonds', 'flaws'];
    if (!validTypes.includes(type)) {
      res.status(400).json({
        error: 'Invalid type parameter',
        message: 'Type must be one of: traits, ideals, bonds, flaws'
      });
      return;
    }

    // Map type to table name
    const tableMap: Record<string, string> = {
      traits: 'personality_traits',
      ideals: 'personality_ideals',
      bonds: 'personality_bonds',
      flaws: 'personality_flaws'
    };

    const tableName = tableMap[type];
    if (!tableName) {
      res.status(500).json({ error: 'Internal error: invalid table mapping' });
      return;
    }

    // Build query with optional filters
    let query = supabase
      .from(tableName)
      .select('*');

    // Add background filter if provided (only for traits table)
    // SECURITY: Validate background parameter to prevent injection
    if (background && typeof background === 'string' && tableName === 'personality_traits') {
      const validBackground = /^[a-zA-Z0-9_-]+$/.test(background);
      if (!validBackground) {
        res.status(400).json({
          error: 'Invalid background parameter',
          message: 'Background must contain only alphanumeric characters, hyphens, and underscores'
        });
        return;
      }
      query = query.or(`background.eq.${background},background.is.null`);
    }

    // Add alignment filter for ideals only (if alignment column exists)
    // Note: Current ideals table doesn't have alignment column, so this is disabled
    // if (type === 'ideals' && alignment && typeof alignment === 'string') {
    //   const ethicalAxis = alignment.split(' ')[0];
    //   query = query.or(`alignment.eq.${ethicalAxis},alignment.is.null`);
    // }

    const { data, error } = await query;

    if (error) {
      console.error(`Error fetching random ${type}:`, error);
      res.status(500).json({
        error: 'Database error',
        message: `Failed to fetch ${type}`
      });
      return;
    }

    if (!data || data.length === 0) {
      res.status(404).json({
        error: 'No data found',
        message: `No ${type} found matching the criteria`
      });
      return;
    }

    // Return a random item from the results
    const randomIndex = Math.floor(Math.random() * data.length);
    const randomItem = data[randomIndex];

    res.json({
      success: true,
      data: randomItem
    });

  } catch (error) {
    console.error(`Error in GET /personality/random/${req.params.type}:`, error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'An unexpected error occurred'
    });
  }
});

/**
 * GET /personality/batch/random
 * Get random personality elements for all types at once
 * Query params:
 * - background: Filter by background ID (optional)
 * - alignment: Filter by alignment for ideals (optional)
 */
router.get('/batch/random', async (req, res): Promise<void> => {
  try {
    const { background, alignment } = req.query;

    const results: Record<string, any> = {};
    const types = ['traits', 'ideals', 'bonds', 'flaws'];

    // Fetch random items for each type
    for (const type of types) {
      const tableMap: Record<string, string> = {
        traits: 'personality_traits',
        ideals: 'personality_ideals',
        bonds: 'personality_bonds',
        flaws: 'personality_flaws'
      };

      const tableName = tableMap[type];
      if (!tableName) continue;

      let query = supabase
        .from(tableName)
        .select('*');

      // Add background filter if provided (only for traits table)
      // SECURITY: Validate background parameter to prevent injection
      if (background && typeof background === 'string' && tableName === 'personality_traits') {
        const validBackground = /^[a-zA-Z0-9_-]+$/.test(background);
        if (!validBackground) {
          res.status(400).json({
            error: 'Invalid background parameter',
            message: 'Background must contain only alphanumeric characters, hyphens, and underscores'
          });
          return;
        }
        query = query.or(`background.eq.${background},background.is.null`);
      }

      // Add alignment filter for ideals only (if alignment column exists)
      // Note: Current ideals table doesn't have alignment column, so this is disabled
      // if (type === 'ideals' && alignment && typeof alignment === 'string') {
      //   const ethicalAxis = alignment.split(' ')[0];
      //   query = query.or(`alignment.eq.${ethicalAxis},alignment.is.null`);
      // }

      const { data, error } = await query;

      if (error) {
        console.error(`Error fetching random ${type}:`, error);
        res.status(500).json({
          error: 'Database error',
          message: `Failed to fetch ${type}`
        });
        return;
      }

      if (data && data.length > 0) {
        const randomIndex = Math.floor(Math.random() * data.length);
        results[type] = data[randomIndex];
      }

      // For traits, get a second random trait
      if (type === 'traits' && data && data.length > 1) {
        let secondRandomIndex;
        do {
          secondRandomIndex = Math.floor(Math.random() * data.length);
        } while (secondRandomIndex === Math.floor(Math.random() * data.length));

        results.traits2 = data[secondRandomIndex];
      }
    }

    res.json({
      success: true,
      data: results
    });

  } catch (error) {
    console.error('Error in GET /personality/batch/random:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'An unexpected error occurred'
    });
  }
});

/**
 * GET /personality/:type
 * Get all personality elements of the specified type
 * Query params:
 * - background: Filter by background ID (optional)
 * - limit: Limit number of results (optional, default 100)
 */
router.get('/:type', async (req, res): Promise<void> => {
  try {
    const { type } = req.params;
    const { background, limit = '100' } = req.query;

    // Validate type parameter
    const validTypes = ['traits', 'ideals', 'bonds', 'flaws'];
    if (!validTypes.includes(type)) {
      res.status(400).json({
        error: 'Invalid type parameter',
        message: 'Type must be one of: traits, ideals, bonds, flaws'
      });
      return;
    }

    // Map type to table name
    const tableMap: Record<string, string> = {
      traits: 'personality_traits',
      ideals: 'personality_ideals',
      bonds: 'personality_bonds',
      flaws: 'personality_flaws'
    };

    const tableName = tableMap[type];
    if (!tableName) {
      res.status(500).json({ error: 'Internal error: invalid table mapping' });
      return;
    }

    // SECURITY: Validate and bound limit parameter
    const limitRaw = parseInt(limit as string) || 100;
    const boundedLimit = Math.max(1, Math.min(limitRaw, 1000)); // Max 1000 results

    let query = supabase
      .from(tableName)
      .select('*')
      .limit(boundedLimit);

    // Add background filter if provided (only for traits table)
    if (background && typeof background === 'string' && tableName === 'personality_traits') {
      query = query.eq('background', background);
    }

    const { data, error } = await query;

    if (error) {
      console.error(`Error fetching ${type}:`, error);
      res.status(500).json({
        error: 'Database error',
        message: `Failed to fetch ${type}`
      });
      return;
    }

    res.json({
      success: true,
      data: data || []
    });

  } catch (error) {
    console.error(`Error in GET /personality/${req.params.type}:`, error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'An unexpected error occurred'
    });
  }
});

export default router;
