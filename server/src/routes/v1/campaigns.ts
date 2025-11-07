import { Router, Request, Response } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { planRateLimit } from '../../middleware/rate-limit.js';
import { supabaseService } from '../../lib/supabase.js';

export default function campaignRouter() {
  const router = Router();

  router.use(requireAuth);
  router.use(planRateLimit('default'));

  router.get('/', async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    try {
      // Only select minimal fields needed for campaign list view
      // Excludes heavy JSONB fields (setting_details, thematic_elements, style_config, rules_config)
      const { data, error } = await supabaseService
        .from('campaigns')
        .select(`
          id, name, description, genre,
          difficulty_level, campaign_length, tone,
          status, background_image, art_style,
          created_at, updated_at
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return res.json(data || []);
    } catch (e) {
      return res.status(500).json({ error: 'Failed to fetch campaigns' });
    }
  });

  router.post('/', async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const {
      name,
      description,
      genre,
      difficulty_level,
      campaign_length,
      tone,
      setting,
      thematic_elements,
      status,
      background_image,
    } = req.body;
    try {
      const { data, error } = await supabaseService
        .from('campaigns')
        .insert({
          user_id: userId,
          name,
          description: description || null,
          genre: genre || null,
          difficulty_level: difficulty_level || null,
          campaign_length: campaign_length || null,
          tone: tone || null,
          era: setting?.era || null,
          location: setting?.location || null,
          atmosphere: setting?.atmosphere || null,
          setting_details: setting || null,
          thematic_elements: thematic_elements || null,
          status: status || 'active',
          background_image: background_image || null,
        })
        .select()
        .single();
      if (error) throw error;
      return res.status(201).json(data);
    } catch (e) {
      return res.status(500).json({ error: 'Failed to create campaign' });
    }
  });

  router.get('/:id', async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const { id } = req.params;
    try {
      const { data, error } = await supabaseService
        .from('campaigns')
        .select('*')
        .eq('id', id)
        .eq('user_id', userId)
        .single();
      if (error) {
        if ((error as any).code === 'PGRST116') return res.status(404).json({ error: 'Not found' });
        throw error;
      }
      if (!data) return res.status(404).json({ error: 'Not found' });
      return res.json(data);
    } catch (e) {
      return res.status(500).json({ error: 'Failed to fetch campaign' });
    }
  });

  router.put('/:id', async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const { id } = req.params;
    const {
      name,
      description,
      genre,
      difficulty_level,
      campaign_length,
      tone,
      setting,
      thematic_elements,
      status,
      background_image,
    } = req.body;
    try {
      const { data, error } = await supabaseService
        .from('campaigns')
        .update({
          name,
          description: description || null,
          genre: genre || null,
          difficulty_level: difficulty_level || null,
          campaign_length: campaign_length || null,
          tone: tone || null,
          era: setting?.era || null,
          location: setting?.location || null,
          atmosphere: setting?.atmosphere || null,
          setting_details: setting || null,
          thematic_elements: thematic_elements || null,
          status: status || 'active',
          background_image: background_image || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('user_id', userId)
        .select()
        .single();
      if (error) {
        if ((error as any).code === 'PGRST116') return res.status(404).json({ error: 'Not found' });
        throw error;
      }
      if (!data) return res.status(404).json({ error: 'Not found' });
      return res.json(data);
    } catch (e) {
      return res.status(500).json({ error: 'Failed to update campaign' });
    }
  });

  router.delete('/:id', async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const { id } = req.params;
    try {
      const { data, error } = await supabaseService
        .from('campaigns')
        .delete()
        .eq('id', id)
        .eq('user_id', userId)
        .select('id')
        .single();
      if (error) {
        if ((error as any).code === 'PGRST116') return res.status(404).json({ error: 'Not found' });
        throw error;
      }
      if (!data) return res.status(404).json({ error: 'Not found' });
      return res.json({ ok: true });
    } catch (e) {
      return res.status(500).json({ error: 'Failed to delete campaign' });
    }
  });

  return router;
}

