import { Router, Request, Response } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { supabaseService } from '../../lib/supabase.js';

export default function characterRouter() {
  const router = Router();
  router.use(requireAuth);

  /**
   * GET /v1/characters
   *
   * BUSINESS PURPOSE:
   * - Returns all characters belonging to the authenticated user.
   * - Used in: Character list page, campaign character selection, etc.
   * - WHO CAN USE: Any authenticated user.
   *
   * REQUEST:
   * - Method: GET
   * - Auth: Required (Bearer token)
   * - Headers: Authorization: Bearer <jwt>
   *
   * RESPONSE SUCCESS (200 OK):
   * [
   *   {
   *     "id": "char_123",
   *     "name": "Aragorn",
   *     "race": "Human",
   *     "class": "Fighter",
   *     "level": 5
   *   },
   *   ...
   * ]
   *
   * RESPONSE ERRORS:
   * - 401 Unauthorized: No token or invalid token.
   * - 500 Internal Server Error: Database connection failed.
   *
   * BUSINESS LOGIC:
   * - The user_id from the JWT is used to filter the characters, ensuring a user can only see their own.
   * - Returns an empty array if the user has no characters.
   *
   * PERFORMANCE:
   * - Query is indexed on user_id for fast lookups.
   * - Should complete in <200ms for a typical user.
   */
  router.get('/', async (req: Request, res: Response) => {
    const userId = req.user!.userId;

    console.log('[CHARACTERS_LIST] Request details:', {
      userId,
      timestamp: new Date().toISOString()
    });

    try {
      const { data: characters, error } = await supabaseService
        .from('characters')
        .select(`
          id, name, description, race, class, level, alignment, experience_points,
          image_url, appearance, personality_traits, backstory_elements, background,
          created_at, updated_at
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[CHARACTERS_LIST] Database error:', error);
        return res.status(500).json({ error: 'Failed to fetch characters' });
      }

      console.log('[CHARACTERS_LIST] Response:', {
        userId,
        characterCount: characters?.length || 0,
        characters: characters?.map(c => ({ id: c.id, name: c.name }))
      });

      return res.json(characters || []);
    } catch (e) {
      console.error('[CHARACTERS_LIST] Error fetching characters:', e);
      return res.status(500).json({ error: 'Failed to fetch characters' });
    }
  });

  /**
   * POST /v1/characters
   *
   * BUSINESS PURPOSE:
   * - Creates a new character for the authenticated user.
   * - This is the final step in the character creation wizard.
   *
   * REQUEST:
   * - Method: POST
   * - Auth: Required (Bearer token)
   * - Body: { "name": "Bilbo", "race": "Hobbit", "class": "Rogue", ... }
   *
   * RESPONSE SUCCESS (201 Created):
   * {
   *   "id": "char_456",
   *   "name": "Bilbo",
   *   "race": "Hobbit",
   *   "class": "Rogue",
   *   ...
   * }
   *
   * RESPONSE ERRORS:
   * - 401 Unauthorized: No token or invalid token.
   * - 400 Bad Request: Missing required fields (e.g., name, race, class).
   * - 500 Internal Server Error: Database insert failed.
   *
   * MONETIZATION:
   * - Before inserting, this endpoint should check the user's plan and character count to enforce the character limit for the free tier.
   * - If the user is at their limit, a 402 Payment Required response should be returned.
   */
  router.post('/', async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const {
      name,
      description,
      race,
      class: charClass,
      level,
      alignment,
      experience_points,
      image_url,
      appearance,
      personality_traits,
      backstory_elements,
      background
    } = req.body;

    try {
      const { data: character, error } = await supabaseService
        .from('characters')
        .insert({
          user_id: userId,
          name,
          description: description || null,
          race,
          class: charClass,
          level: level || 1,
          alignment: alignment || null,
          experience_points: experience_points || 0,
          image_url: image_url || null,
          appearance: appearance || null,
          personality_traits: personality_traits || null,
          backstory_elements: backstory_elements || null,
          background: background || null
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating character:', error);
        return res.status(500).json({ error: 'Failed to create character' });
      }

      return res.status(201).json(character);
    } catch (e) {
      console.error('Error creating character:', e);
      return res.status(500).json({ error: 'Failed to create character' });
    }
  });

  /**
   * GET /v1/characters/:id
   *
   * BUSINESS PURPOSE:
   * - Retrieves a single character by its ID.
   * - Used when a user selects a character to view or edit.
   *
   * REQUEST:
   * - Method: GET
   * - Auth: Required (Bearer token)
   *
   * RESPONSE SUCCESS (200 OK):
   * {
   *   "id": "char_123",
   *   "name": "Aragorn",
   *   ...
   * }
   *
   * RESPONSE ERRORS:
   * - 401 Unauthorized: No token or invalid token.
   * - 404 Not Found: The character does not exist, or does not belong to the user.
   * - 500 Internal Server Error: Database query failed.
   *
   * SECURITY:
   * - The query includes a `where` clause for both the character ID and the user ID from the JWT.
   *   This is CRITICAL to prevent a user from accessing another user's character by guessing its ID.
   */
  router.get('/:id', async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const { id } = req.params;
    try {
      const { data: character, error } = await supabaseService
        .from('characters')
        .select(`
          id, name, description, race, class, level, alignment, experience_points,
          image_url, appearance, personality_traits, backstory_elements, background,
          created_at, updated_at
        `)
        .eq('id', id)
        .eq('user_id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return res.status(404).json({ error: 'Character not found' });
        }
        console.error('Error fetching character:', error);
        return res.status(500).json({ error: 'Failed to fetch character' });
      }

      return res.json(character);
    } catch (e) {
      console.error('Error fetching character:', e);
      return res.status(500).json({ error: 'Failed to fetch character' });
    }
  });

  /**
   * PUT /v1/characters/:id
   *
   * BUSINESS PURPOSE:
   * - Updates an existing character.
   *
   * REQUEST:
   * - Method: PUT
   * - Auth: Required (Bearer token)
   * - Body: { "name": "Strider", "level": 6, ... }
   *
   * RESPONSE SUCCESS (200 OK):
   * {
   *   "id": "char_123",
   *   "name": "Strider",
   *   "level": 6,
   *   ...
   * }
   *
   * RESPONSE ERRORS:
   * - 401 Unauthorized: No token or invalid token.
   * - 404 Not Found: The character does not exist, or does not belong to the user.
   * - 500 Internal Server Error: Database update failed.
   *
   * SECURITY:
   * - The `update` query is scoped to the character ID and the user ID from the JWT to prevent unauthorized modification of other users' characters.
   */
  router.put('/:id', async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const { id } = req.params;
    const {
      name,
      description,
      race,
      class: charClass,
      level,
      alignment,
      experience_points,
      image_url,
      appearance,
      personality_traits,
      backstory_elements,
      background
    } = req.body;

    try {
      const { data: character, error } = await supabaseService
        .from('characters')
        .update({
          name,
          description: description || null,
          race,
          class: charClass,
          level: level || 1,
          alignment: alignment || null,
          experience_points: experience_points || 0,
          image_url: image_url || null,
          appearance: appearance || null,
          personality_traits: personality_traits || null,
          backstory_elements: backstory_elements || null,
          background: background || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return res.status(404).json({ error: 'Character not found' });
        }
        console.error('Error updating character:', error);
        return res.status(500).json({ error: 'Failed to update character' });
      }

      return res.json(character);
    } catch (e) {
      console.error('Error updating character:', e);
      return res.status(500).json({ error: 'Failed to update character' });
    }
  });

  /**
   * DELETE /v1/characters/:id
   *
   * BUSINESS PURPOSE:
   * - Deletes a character.
   *
   * REQUEST:
   * - Method: DELETE
   * - Auth: Required (Bearer token)
   *
   * RESPONSE SUCCESS (200 OK):
   * { "ok": true }
   *
   * RESPONSE ERRORS:
   * - 401 Unauthorized: No token or invalid token.
   * - 404 Not Found: The character does not exist, or does not belong to the user.
   * - 500 Internal Server Error: Database deletion failed.
   *
   * SECURITY:
   * - The `delete` query is scoped to the character ID and the user ID from the JWT to prevent unauthorized deletion of other users' characters.
   */
  router.delete('/:id', async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const { id } = req.params;
    try {
      const { data: character, error } = await supabaseService
        .from('characters')
        .delete()
        .eq('id', id)
        .eq('user_id', userId)
        .select('id')
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return res.status(404).json({ error: 'Character not found' });
        }
        console.error('Error deleting character:', error);
        return res.status(500).json({ error: 'Failed to delete character' });
      }

      return res.json({ ok: true });
    } catch (e) {
      console.error('Error deleting character:', e);
      return res.status(500).json({ error: 'Failed to delete character' });
    }
  });

  // Validate and save character spells
  router.post('/:id/spells', async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const characterId = req.params.id;
    const { spells, className } = req.body;

    if (!spells || !className) {
      return res.status(400).json({ error: 'Missing required fields: spells and className' });
    }

    try {
      // Verify character ownership
      const { data: character, error: charError } = await supabaseService
        .from('characters')
        .select('id, class')
        .eq('id', characterId)
        .eq('user_id', userId)
        .single();

      if (charError || !character) {
        return res.status(404).json({ error: 'Character not found' });
      }

      // Get class ID
      const { data: classData, error: classError } = await supabaseService
        .from('classes')
        .select('id')
        .eq('name', className)
        .single();

      if (classError || !classData) {
        return res.status(400).json({ error: 'Invalid class name' });
      }

      // Validate each spell against class spell list
      const validationErrors: string[] = [];

      for (const spellId of spells) {
        const { data: classSpell, error: spellError } = await supabaseService
          .from('class_spells')
          .select('id')
          .eq('class_id', classData.id)
          .eq('spell_id', spellId)
          .single();

        if (spellError || !classSpell) {
          // Get spell name for error message
          const { data: spellData } = await supabaseService
            .from('spells')
            .select('name')
            .eq('id', spellId)
            .single();

          validationErrors.push(`${className} cannot learn ${spellData?.name || spellId}`);
        }
      }

      if (validationErrors.length > 0) {
        return res.status(400).json({
          error: 'Invalid spell selection',
          details: validationErrors
        });
      }

      // Clear existing spells for this character and class
      await supabaseService
        .from('character_spells')
        .delete()
        .eq('character_id', characterId)
        .eq('source_class_id', classData.id);

      // Insert validated spells
      if (spells.length > 0) {
        const spellInserts = spells.map((spellId: string) => ({
          character_id: characterId,
          spell_id: spellId,
          source_class_id: classData.id,
          is_prepared: true,
          source_feature: 'base'
        }));

        const { error: insertError } = await supabaseService
          .from('character_spells')
          .insert(spellInserts);

        if (insertError) {
          console.error('Error inserting character spells:', insertError);
          return res.status(500).json({ error: 'Failed to save character spells' });
        }
      }

      return res.json({ success: true, message: 'Character spells saved successfully' });
    } catch (error) {
      console.error('Error validating character spells:', error);
      return res.status(500).json({ error: 'Failed to validate character spells' });
    }
  });

  // Get character spells with full spell data
  router.get('/:id/spells', async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const characterId = req.params.id;

    console.log('[CHARACTER_SPELLS] Request details:', {
      userId,
      characterId,
      timestamp: new Date().toISOString()
    });

    try {
      // Verify character ownership with detailed logging
      const { data: character, error: charError } = await supabaseService
        .from('characters')
        .select('id, class, level, user_id')  // Include user_id for debugging
        .eq('id', characterId)
        .eq('user_id', userId)
        .single();

      if (charError) {
        console.log('[CHARACTER_SPELLS] Database error:', charError);
        return res.status(404).json({ error: 'Character not found' });
      }

      if (!character) {
        console.log('[CHARACTER_SPELLS] No character found for:', { characterId, userId });
        return res.status(404).json({ error: 'Character not found' });
      }

      console.log('[CHARACTER_SPELLS] Character found:', {
        characterId: character.id,
        class: character.class,
        level: character.level,
        ownerId: character.user_id
      });

      // Get character spells with full spell data
      const { data: characterSpells, error: spellsError } = await supabaseService
        .from('character_spells')
        .select(`
          spell_id,
          is_prepared,
          source_feature,
          spells (
            id,
            name,
            level,
            school,
            casting_time,
            range_text,
            components_verbal,
            components_somatic,
            components_material,
            material_components,
            duration,
            concentration,
            ritual,
            description,
            higher_level_text
          )
        `)
        .eq('character_id', characterId);

      if (spellsError) {
        console.error('[CHARACTER_SPELLS] Error fetching character spells:', spellsError);
        return res.status(500).json({ error: 'Failed to fetch character spells' });
      }

      console.log('[CHARACTER_SPELLS] Raw spells data:', {
        spellCount: characterSpells?.length || 0,
        spells: characterSpells?.map((cs: any) => ({
          spellName: Array.isArray(cs.spells) ? cs.spells[0]?.name : cs.spells?.name,
          level: Array.isArray(cs.spells) ? cs.spells[0]?.level : cs.spells?.level,
          prepared: cs.is_prepared
        }))
      });

      // Transform the data to a more usable format
      const spells = characterSpells?.map((cs: any) => ({
        ...cs.spells,
        is_prepared: cs.is_prepared,
        source_feature: cs.source_feature
      })) || [];

      // Separate cantrips (level 0) from leveled spells
      const cantrips = spells.filter((spell: any) => spell.level === 0);
      const leveledSpells = spells.filter((spell: any) => spell.level > 0);

      const response = {
        character: {
          id: character.id,
          class: character.class,
          level: character.level
        },
        cantrips,
        spells: leveledSpells,
        total_spells: spells.length
      };

      console.log('[CHARACTER_SPELLS] Response:', {
        characterId: response.character.id,
        cantripCount: response.cantrips.length,
        spellCount: response.spells.length,
        totalSpells: response.total_spells
      });

      return res.json(response);
    } catch (error) {
      console.error('Error fetching character spells:', error);
      return res.status(500).json({ error: 'Failed to fetch character spells' });
    }
  });

  return router;
}
