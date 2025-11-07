import { Router, Request, Response } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { planRateLimit } from '../../middleware/rate-limit.js';
import { supabaseService } from '../../lib/supabase.js';

export default function characterRouter() {
  const router = Router();
  router.use(requireAuth);
  router.use(planRateLimit('default'));

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
          id, name, race, class, level,
          image_url, avatar_url,
          campaign_id,
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

  router.get('/:id', async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const { id } = req.params;
    try {
      const { data: character, error } = await supabaseService
        .from('characters')
        .select(`
          id, name, description, race, class, level, alignment, experience_points,
          image_url, avatar_url, background_image,
          appearance, personality_traits, backstory_elements, background,
          personality_notes, vision_types, obscurement, is_hidden,
          campaign_id, user_id,
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

      // Validate all spells in a single batch query
      const { data: validClassSpells, error: validationError } = await supabaseService
        .from('class_spells')
        .select('spell_id, spells(id, name)')
        .eq('class_id', classData.id)
        .in('spell_id', spells);

      if (validationError) {
        console.error('Error validating class spells:', validationError);
        return res.status(500).json({ error: 'Failed to validate spells' });
      }

      // Create a Set of valid spell IDs for O(1) lookup
      const validSpellIds = new Set(validClassSpells?.map((cs: any) => cs.spell_id) || []);

      // Find any invalid spells
      const invalidSpells = spells.filter((spellId: string) => !validSpellIds.has(spellId));

      if (invalidSpells.length > 0) {
        // Get spell names for invalid spells to provide helpful error messages
        const { data: invalidSpellData } = await supabaseService
          .from('spells')
          .select('id, name')
          .in('id', invalidSpells);

        const spellNameMap = new Map(
          invalidSpellData?.map((spell: any) => [spell.id, spell.name]) || []
        );

        const validationErrors = invalidSpells.map((spellId: string) =>
          `${className} cannot learn ${spellNameMap.get(spellId) || spellId}`
        );

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
      // Single query to get character and spells (eliminates N+1 query)
      const { data: character, error: charError } = await supabaseService
        .from('characters')
        .select(`
          id,
          class,
          level,
          user_id,
          character_spells (
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
          )
        `)
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

      // Extract character spells from the joined result
      const characterSpells = character.character_spells || [];

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

