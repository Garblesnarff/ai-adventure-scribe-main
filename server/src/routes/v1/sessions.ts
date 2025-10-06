import { Router, Request, Response } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { supabaseService } from '../../lib/supabase.js';

export default function sessionRouter() {
  const router = Router();
  router.use(requireAuth);

  router.post('/', async (req: Request, res: Response) => {
    const { campaign_id, character_id, session_number } = req.body;
    try {
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
      return res.status(500).json({ error: 'Failed to create session' });
    }
  });

  router.get('/:id', async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
      const { data, error } = await supabaseService
        .from('game_sessions')
        .select('*')
        .eq('id', id)
        .single();
      if (error) {
        if ((error as any).code === 'PGRST116') return res.status(404).json({ error: 'Not found' });
        throw error;
      }
      if (!data) return res.status(404).json({ error: 'Not found' });
      return res.json(data);
    } catch (e) {
      return res.status(500).json({ error: 'Failed to fetch session' });
    }
  });

  router.post('/:id/complete', async (req: Request, res: Response) => {
    const { id } = req.params;
    const { summary } = req.body as { summary?: string };
    try {
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
      if (error) {
        if ((error as any).code === 'PGRST116') return res.status(404).json({ error: 'Not found' });
        throw error;
      }
      if (!data) return res.status(404).json({ error: 'Not found' });
      return res.json(data);
    } catch (e) {
      return res.status(500).json({ error: 'Failed to complete session' });
    }
  });

  return router;
}

