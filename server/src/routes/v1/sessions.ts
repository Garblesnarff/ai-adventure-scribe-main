import { Router, Request, Response } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { planRateLimit } from '../../middleware/rate-limit.js';
import { supabaseService } from '../../lib/supabase.js';

export default function sessionRouter() {
  const router = Router();
  router.use(requireAuth);
  router.use(planRateLimit('default'));

  router.post('/', async (req: Request, res: Response) => {
    const { campaign_id, character_id, session_number } = req.body;
    const userId = req.user!.userId;

    try {
      // SECURITY: Verify user owns the campaign or character before creating session
      if (campaign_id) {
        const { data: campaign, error: campErr } = await supabaseService
          .from('campaigns')
          .select('user_id')
          .eq('id', campaign_id)
          .single();

        if (campErr || !campaign || campaign.user_id !== userId) {
          return res.status(403).json({ error: 'Campaign not found or access denied' });
        }
      }

      if (character_id) {
        const { data: character, error: charErr } = await supabaseService
          .from('characters')
          .select('user_id')
          .eq('id', character_id)
          .single();

        if (charErr || !character || character.user_id !== userId) {
          return res.status(403).json({ error: 'Character not found or access denied' });
        }
      }

      // Create session only after ownership verified
      const { data, error } = await supabaseService
        .from('game_sessions')
        .insert({
          campaign_id: campaign_id || null,
          character_id: character_id || null,
          session_number: session_number || 1,
          status: 'active',
          start_time: new Date().toISOString(),
        })
        .select()
        .single();
      if (error) throw error;
      return res.status(201).json(data);
    } catch (e) {
      console.error('Session creation error:', e);
      return res.status(500).json({ error: 'Failed to create session' });
    }
  });

  router.get('/:id', async (req: Request, res: Response) => {
    const { id } = req.params;
    const userId = req.user!.userId;
    try {
      // Fetch session with related campaign and character to verify ownership
      const { data, error } = await supabaseService
        .from('game_sessions')
        .select('*, campaigns!game_sessions_campaign_id_fkey(user_id), characters!game_sessions_character_id_fkey(user_id)')
        .eq('id', id)
        .single();

      if (error) {
        if ((error as any).code === 'PGRST116') return res.status(404).json({ error: 'Not found' });
        throw error;
      }
      if (!data) return res.status(404).json({ error: 'Not found' });

      // Verify ownership through campaign or character
      const campaignOwner = (data as any).campaigns?.user_id;
      const characterOwner = (data as any).characters?.user_id;

      if (campaignOwner !== userId && characterOwner !== userId) {
        return res.status(403).json({ error: 'Access denied' });
      }

      // Remove the joined data before returning
      const { campaigns, characters, ...session } = data as any;
      return res.json(session);
    } catch (e) {
      return res.status(500).json({ error: 'Failed to fetch session' });
    }
  });

  router.post('/:id/complete', async (req: Request, res: Response) => {
    const { id } = req.params;
    const { summary } = req.body as { summary?: string };
    const userId = req.user!.userId;
    try {
      // First verify ownership
      const { data: sessionData, error: fetchError } = await supabaseService
        .from('game_sessions')
        .select('*, campaigns!game_sessions_campaign_id_fkey(user_id), characters!game_sessions_character_id_fkey(user_id)')
        .eq('id', id)
        .single();

      if (fetchError) {
        if ((fetchError as any).code === 'PGRST116') return res.status(404).json({ error: 'Not found' });
        throw fetchError;
      }
      if (!sessionData) return res.status(404).json({ error: 'Not found' });

      // Verify ownership through campaign or character
      const campaignOwner = (sessionData as any).campaigns?.user_id;
      const characterOwner = (sessionData as any).characters?.user_id;

      if (campaignOwner !== userId && characterOwner !== userId) {
        return res.status(403).json({ error: 'Access denied' });
      }

      // Now update the session
      const { data, error } = await supabaseService
        .from('game_sessions')
        .update({
          end_time: new Date().toISOString(),
          status: 'completed',
          summary: summary || null,
        })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      if (!data) return res.status(404).json({ error: 'Not found' });
      return res.json(data);
    } catch (e) {
      return res.status(500).json({ error: 'Failed to complete session' });
    }
  });

  return router;
}

