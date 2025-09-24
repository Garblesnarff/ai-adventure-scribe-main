import { Router, Request, Response } from 'express';
import { Pool } from 'pg';
import { requireAuth } from '../../middleware/auth.js';
import { supabaseService } from '../../lib/supabase.js';

export default function characterRouter(db: Pool) {
  const router = Router();
  router.use(requireAuth);

  router.get('/', async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const client = await db.connect();
    try {
      const result = await client.query(
        `SELECT id, name, description, race, class, level, alignment, experience_points,
         image_url, appearance, personality_traits, backstory_elements, background,
         created_at, updated_at
         FROM characters WHERE user_id = $1 ORDER BY created_at DESC`,
        [userId]
      );
      return res.json(result.rows);
    } catch (e) {
      return res.status(500).json({ error: 'Failed to fetch characters' });
    } finally {
      client.release();
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
    
    const client = await db.connect();
    try {
      const result = await client.query(
        `INSERT INTO characters (
          user_id, name, description, race, class, level, alignment, experience_points,
          image_url, appearance, personality_traits, backstory_elements, background
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
        [
          userId, 
          name, 
          description || null, 
          race, 
          charClass, 
          level || 1, 
          alignment || null,
          experience_points || 0,
          image_url || null,
          appearance || null,
          personality_traits || null,
          backstory_elements || null,
          background || null
        ]
      );
      return res.status(201).json(result.rows[0]);
    } catch (e) {
      return res.status(500).json({ error: 'Failed to create character' });
    } finally {
      client.release();
    }
  });

  router.get('/:id', async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const { id } = req.params;
    const client = await db.connect();
    try {
      const result = await client.query(
        `SELECT id, name, description, race, class, level, alignment, experience_points, 
         image_url, appearance, personality_traits, backstory_elements, background,
         created_at, updated_at 
         FROM characters WHERE id = $1 AND user_id = $2`,
        [id, userId]
      );
      if (!result.rows[0]) return res.status(404).json({ error: 'Character not found' });
      return res.json(result.rows[0]);
    } catch (e) {
      return res.status(500).json({ error: 'Failed to fetch character' });
    } finally {
      client.release();
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
    
    const client = await db.connect();
    try {
      const result = await client.query(
        `UPDATE characters SET 
          name = $3, description = $4, race = $5, class = $6, level = $7, 
          alignment = $8, experience_points = $9, image_url = $10, 
          appearance = $11, personality_traits = $12, backstory_elements = $13, 
          background = $14, updated_at = NOW()
         WHERE id = $1 AND user_id = $2 RETURNING *`,
        [
          id, userId, name, description || null, race, charClass, level || 1,
          alignment || null, experience_points || 0, image_url || null,
          appearance || null, personality_traits || null, backstory_elements || null,
          background || null
        ]
      );
      if (!result.rows[0]) return res.status(404).json({ error: 'Character not found' });
      return res.json(result.rows[0]);
    } catch (e) {
      return res.status(500).json({ error: 'Failed to update character' });
    } finally {
      client.release();
    }
  });

  router.delete('/:id', async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const { id } = req.params;
    const client = await db.connect();
    try {
      const result = await client.query('DELETE FROM characters WHERE id=$1 AND user_id=$2 RETURNING id', [id, userId]);
      if (!result.rows[0]) return res.status(404).json({ error: 'Not found' });
      return res.json({ ok: true });
    } catch (e) {
      return res.status(500).json({ error: 'Failed to delete character' });
    } finally {
      client.release();
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

    try {
      // Verify character ownership
      const { data: character, error: charError } = await supabaseService
        .from('characters')
        .select('id, class, level')
        .eq('id', characterId)
        .eq('user_id', userId)
        .single();

      if (charError || !character) {
        return res.status(404).json({ error: 'Character not found' });
      }

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
        console.error('Error fetching character spells:', spellsError);
        return res.status(500).json({ error: 'Failed to fetch character spells' });
      }

      // Transform the data to a more usable format
      const spells = characterSpells?.map((cs: any) => ({
        ...cs.spells,
        is_prepared: cs.is_prepared,
        source_feature: cs.source_feature
      })) || [];

      // Separate cantrips (level 0) from leveled spells
      const cantrips = spells.filter((spell: any) => spell.level === 0);
      const leveledSpells = spells.filter((spell: any) => spell.level > 0);

      return res.json({
        character: {
          id: character.id,
          class: character.class,
          level: character.level
        },
        cantrips,
        spells: leveledSpells,
        total_spells: spells.length
      });
    } catch (error) {
      console.error('Error fetching character spells:', error);
      return res.status(500).json({ error: 'Failed to fetch character spells' });
    }
  });

  return router;
}

