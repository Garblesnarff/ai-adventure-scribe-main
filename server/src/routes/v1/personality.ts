import { Router } from 'express';
import { supabase } from '../../lib/supabase.js';

const router = Router();

/**
 * GET /v1/personality/random/:type
 *
 * BUSINESS PURPOSE:
 * - Fetches a single random personality element (trait, ideal, bond, or flaw).
 * - Used during character creation to provide suggestions and inspiration to the player.
 *
 * REQUEST:
 * - Method: GET
 * - Path Param: type - one of 'traits', 'ideals', 'bonds', 'flaws'
 * - Query Params:
 *   - background (optional): Filter traits by a specific background.
 *   - alignment (optional, future): Filter ideals by alignment.
 *
 * RESPONSE SUCCESS (200 OK):
 * {
 *   "success": true,
 *   "data": {
 *     "id": "...",
 *     "description": "I am always polite and respectful."
 *   }
 * }
 *
 * RESPONSE ERRORS:
 * - 400 Bad Request: Invalid 'type' parameter.
 * - 404 Not Found: No data found for the given criteria.
 * - 500 Internal Server Error: Database query failed.
 */
router.get('/random/:type', async (req, res) => {
  try {
    const { type } = req.params;
    const { background, alignment } = req.query;

    // Validate type parameter
    const validTypes = ['traits', 'ideals', 'bonds', 'flaws'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        error: 'Invalid type parameter',
        message: 'Type must be one of: traits, ideals, bonds, flaws'
      });
    }

    // Map type to table name
    const tableMap: Record<string, string> = {
      traits: 'personality_traits',
      ideals: 'personality_ideals',
      bonds: 'personality_bonds',
      flaws: 'personality_flaws'
    };

    const tableName = tableMap[type];

    // Build query with optional filters
    let query = supabase
      .from(tableName)
      .select('*');

    // Add background filter if provided (only for traits table)
    if (background && typeof background === 'string' && tableName === 'personality_traits') {
      query = query.or(`background.eq.${background},background.is.null`);
    }

    const { data, error } = await query;

    if (error) {
      console.error(`Error fetching random ${type}:`, error);
      return res.status(500).json({
        error: 'Database error',
        message: `Failed to fetch ${type}`
      });
    }

    if (!data || data.length === 0) {
      return res.status(404).json({
        error: 'No data found',
        message: `No ${type} found matching the criteria`
      });
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
 * GET /v1/personality/batch/random
 *
 * BUSINESS PURPOSE:
 * - Fetches a batch of random personality elements (one of each type, plus a second trait).
 * - A convenience endpoint to populate the entire personality section of the character creator at once.
 *
 * RESPONSE SUCCESS (200 OK):
 * {
 *   "success": true,
 *   "data": {
 *     "traits": { ... },
 *     "ideals": { ... },
 *     "bonds": { ... },
 *     "flaws": { ... },
 *     "traits2": { ... }
 *   }
 * }
 */
router.get('/batch/random', async (req, res) => {
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

      let query = supabase
        .from(tableName)
        .select('*');

      // Add background filter if provided (only for traits table)
      if (background && typeof background === 'string' && tableName === 'personality_traits') {
        query = query.or(`background.eq.${background},background.is.null`);
      }

      const { data, error } = await query;

      if (error) {
        console.error(`Error fetching random ${type}:`, error);
        return res.status(500).json({
          error: 'Database error',
          message: `Failed to fetch ${type}`
        });
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
 * GET /v1/personality/:type
 *
 * BUSINESS PURPOSE:
 * - Fetches all available personality elements of a given type.
 * - Used to populate selection lists in the character creator.
 */
router.get('/:type', async (req, res) => {
  try {
    const { type } = req.params;
    const { background, limit = '100' } = req.query;

    // Validate type parameter
    const validTypes = ['traits', 'ideals', 'bonds', 'flaws'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        error: 'Invalid type parameter',
        message: 'Type must be one of: traits, ideals, bonds, flaws'
      });
    }

    // Map type to table name
    const tableMap: Record<string, string> = {
      traits: 'personality_traits',
      ideals: 'personality_ideals',
      bonds: 'personality_bonds',
      flaws: 'personality_flaws'
    };

    const tableName = tableMap[type];

    let query = supabase
      .from(tableName)
      .select('*')
      .limit(parseInt(limit as string));

    // Add background filter if provided (only for traits table)
    if (background && typeof background === 'string' && tableName === 'personality_traits') {
      query = query.eq('background', background);
    }

    const { data, error } = await query;

    if (error) {
      console.error(`Error fetching ${type}:`, error);
      return res.status(500).json({
        error: 'Database error',
        message: `Failed to fetch ${type}`
      });
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
