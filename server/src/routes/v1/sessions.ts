import { Router, Request, Response } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { supabaseService } from '../../lib/supabase.js';

export default function sessionRouter() {
  const router = Router();
  router.use(requireAuth);

  /**
   * POST /v1/sessions
   *
   * BUSINESS PURPOSE:
   * - Creates a new game session.
   *
   * REQUEST:
   * - Method: POST
   * - Auth: Required
   * - Body: { "campaign_id": "...", "character_id": "...", "session_number": 1 }
   *
   * RESPONSE SUCCESS (201 Created):
   * { "id": "...", "status": "active", ... }
   */
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

  /**
   * GET /v1/sessions/:id
   *
   * BUSINESS PURPOSE:
   * - Retrieves the details of a single game session.
   */
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

  /**
   * POST /v1/sessions/:id/complete
   *
   * BUSINESS PURPOSE:
   * - Marks a game session as complete and records a summary.
   *
   * REQUEST:
   * - Method: POST
   * - Auth: Required
   * - Body: { "summary": "The party defeated the goblins..." }
   *
   * RESPONSE SUCCESS (200 OK):
   * { "id": "...", "status": "completed", ... }
   */
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
