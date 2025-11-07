import { Router, Request, Response } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { supabaseService } from '../../../src/infrastructure/database/index.js';
import { CharacterService } from '../../services/character-service.js';

export default function characterRouter() {
  const router = Router();
  router.use(requireAuth);

  router.get('/', async (req: Request, res: Response) => {
    const userId = req.user!.userId;

    console.log('[CHARACTERS_LIST] Request details:', {
      userId,
      timestamp: new Date().toISOString()
    });

    try {
      const characters = await CharacterService.listForUser(userId);

      console.log('[CHARACTERS_LIST] Response:', {
        userId,
        characterCount: characters.length,
        characters: characters.map(c => ({ id: c.id, name: c.name }))
      });

      // Transform to match API response format (snake_case)
      const formattedCharacters = characters.map(c => ({
        id: c.id,
        name: c.name,
        race: c.race,
        class: c.class,
        level: c.level,
        image_url: c.imageUrl,
        avatar_url: c.avatarUrl,
        campaign_id: c.campaignId,
        created_at: c.createdAt,
        updated_at: c.updatedAt,
      }));

      return res.json(formattedCharacters);
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
      const character = await CharacterService.create(userId, {
        name,
        description,
        race,
        class: charClass,
        level,
        alignment,
        experiencePoints: experience_points,
        imageUrl: image_url,
        appearance,
        personalityTraits: personality_traits,
        backstoryElements: backstory_elements,
        background,
      });

      // Transform to match API response format (snake_case)
      const formattedCharacter = {
        id: character.id,
        user_id: character.userId,
        name: character.name,
        description: character.description,
        race: character.race,
        class: character.class,
        level: character.level,
        alignment: character.alignment,
        experience_points: character.experiencePoints,
        image_url: character.imageUrl,
        avatar_url: character.avatarUrl,
        background_image: character.backgroundImage,
        appearance: character.appearance,
        personality_traits: character.personalityTraits,
        personality_notes: character.personalityNotes,
        backstory_elements: character.backstoryElements,
        background: character.background,
        campaign_id: character.campaignId,
        created_at: character.createdAt,
        updated_at: character.updatedAt,
      };

      return res.status(201).json(formattedCharacter);
    } catch (e) {
      console.error('Error creating character:', e);
      return res.status(500).json({ error: 'Failed to create character' });
    }
  });

  router.get('/:id', async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const { id } = req.params;
    try {
      const character = await CharacterService.getById(id, userId);

      if (!character) {
        return res.status(404).json({ error: 'Character not found' });
      }

      // Transform to match API response format (snake_case)
      const formattedCharacter = {
        id: character.id,
        user_id: character.userId,
        name: character.name,
        description: character.description,
        race: character.race,
        class: character.class,
        level: character.level,
        alignment: character.alignment,
        experience_points: character.experiencePoints,
        image_url: character.imageUrl,
        avatar_url: character.avatarUrl,
        background_image: character.backgroundImage,
        appearance: character.appearance,
        personality_traits: character.personalityTraits,
        personality_notes: character.personalityNotes,
        backstory_elements: character.backstoryElements,
        background: character.background,
        vision_types: character.visionTypes,
        obscurement: character.obscurement,
        is_hidden: character.isHidden,
        campaign_id: character.campaignId,
        created_at: character.createdAt,
        updated_at: character.updatedAt,
      };

      return res.json(formattedCharacter);
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
      const character = await CharacterService.update(id, userId, {
        name,
        description,
        race,
        class: charClass,
        level,
        alignment,
        experiencePoints: experience_points,
        imageUrl: image_url,
        appearance,
        personalityTraits: personality_traits,
        backstoryElements: backstory_elements,
        background,
      });

      if (!character) {
        return res.status(404).json({ error: 'Character not found' });
      }

      // Transform to match API response format (snake_case)
      const formattedCharacter = {
        id: character.id,
        user_id: character.userId,
        name: character.name,
        description: character.description,
        race: character.race,
        class: character.class,
        level: character.level,
        alignment: character.alignment,
        experience_points: character.experiencePoints,
        image_url: character.imageUrl,
        avatar_url: character.avatarUrl,
        background_image: character.backgroundImage,
        appearance: character.appearance,
        personality_traits: character.personalityTraits,
        personality_notes: character.personalityNotes,
        backstory_elements: character.backstoryElements,
        background: character.background,
        campaign_id: character.campaignId,
        created_at: character.createdAt,
        updated_at: character.updatedAt,
      };

      return res.json(formattedCharacter);
    } catch (e) {
      console.error('Error updating character:', e);
      return res.status(500).json({ error: 'Failed to update character' });
    }
  });

  router.delete('/:id', async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const { id } = req.params;
    try {
      const deleted = await CharacterService.delete(id, userId);

      if (!deleted) {
        return res.status(404).json({ error: 'Character not found' });
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
      // Use Drizzle - kept Supabase for now due to complex spell validation logic
      // TODO: Migrate fully to Drizzle in future iteration
      const { data: character, error: charError } = await supabaseService
        .from('characters')
        .select('id, class')
        .eq('id', characterId)
        .eq('user_id', userId)
        .single();

      if (charError || !character) {
        return res.status(404).json({ error: 'Character not found' });
      }

      const { data: classData, error: classError } = await supabaseService
        .from('classes')
        .select('id')
        .eq('name', className)
        .single();

      if (classError || !classData) {
        return res.status(400).json({ error: 'Invalid class name' });
      }

      const { data: validClassSpells, error: validationError } = await supabaseService
        .from('class_spells')
        .select('spell_id, spells(id, name)')
        .eq('class_id', classData.id)
        .in('spell_id', spells);

      if (validationError) {
        console.error('Error validating class spells:', validationError);
        return res.status(500).json({ error: 'Failed to validate spells' });
      }

      const validSpellIds = new Set(validClassSpells?.map((cs: any) => cs.spell_id) || []);
      const invalidSpells = spells.filter((spellId: string) => !validSpellIds.has(spellId));

      if (invalidSpells.length > 0) {
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

      await supabaseService
        .from('character_spells')
        .delete()
        .eq('character_id', characterId)
        .eq('source_class_id', classData.id);

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

