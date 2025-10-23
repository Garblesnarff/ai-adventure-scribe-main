import { Router, Request, Response } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { supabaseService } from '../../lib/supabase.js';

export default function campaignRouter() {
  const router = Router();

  router.use(requireAuth);

  /**
   * GET /v1/campaigns
   *
   * BUSINESS PURPOSE:
   * - Retrieves a list of all campaigns created by the authenticated user.
   * - Used to populate the user's dashboard or campaign selection screen.
   *
   * REQUEST:
   * - Method: GET
   * - Auth: Required (Bearer token)
   *
   * RESPONSE SUCCESS (200 OK):
   * [
   *   {
   *     "id": "camp_123",
   *     "name": "The Lost Mines of Phandelver",
   *     "description": "A classic D&D adventure.",
   *     "status": "active",
   *     ...
   *   }
   * ]
   *
   * RESPONSE ERRORS:
   * - 401 Unauthorized: No token or invalid token.
   * - 500 Internal Server Error: Database query failed.
   */
  router.get('/', async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    try {
      const { data, error } = await supabaseService
        .from('campaigns')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return res.json(data || []);
    } catch (e) {
      return res.status(500).json({ error: 'Failed to fetch campaigns' });
    }
  });

  /**
   * POST /v1/campaigns
   *
   * BUSINESS PURPOSE:
   * - Creates a new campaign for the authenticated user.
   *
   * REQUEST:
   * - Method: POST
   * - Auth: Required (Bearer token)
   * - Body: { "name": "Curse of Strahd", "description": "A gothic horror adventure." }
   *
   * RESPONSE SUCCESS (201 Created):
   * {
   *   "id": "camp_456",
   *   "name": "Curse of Strahd",
   *   ...
   * }
   *
   * RESPONSE ERRORS:
   * - 401 Unauthorized: No token or invalid token.
   * - 400 Bad Request: Missing required 'name' field.
   * - 500 Internal Server Error: Database insert failed.
   *
   * MONETIZATION:
   * - Before creating the campaign, this endpoint should check the user's plan and current campaign count.
   * - If a free-tier user already has a campaign, a 402 Payment Required response should be returned.
   */
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

  /**
   * GET /v1/campaigns/:id
   *
   * BUSINESS PURPOSE:
   * - Retrieves the details of a single campaign.
   *
   * REQUEST:
   * - Method: GET
   * - Auth: Required (Bearer token)
   *
   * RESPONSE SUCCESS (200 OK):
   * {
   *   "id": "camp_123",
   *   "name": "The Lost Mines of Phandelver",
   *   ...
   * }
   *
   * RESPONSE ERRORS:
   * - 401 Unauthorized: No token or invalid token.
   * - 404 Not Found: The campaign does not exist or does not belong to the user.
   * - 500 Internal Server Error: Database query failed.
   *
   * SECURITY:
   * - The query is scoped by both campaign ID and the user ID from the JWT to prevent unauthorized access.
   */
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

  /**
   * PUT /v1/campaigns/:id
   *
   * BUSINESS PURPOSE:
   * - Updates the details of an existing campaign.
   *
   * REQUEST:
   * - Method: PUT
   * - Auth: Required (Bearer token)
   * - Body: { "name": "The Sunless Citadel", "status": "completed" }
   *
   * RESPONSE SUCCESS (200 OK):
   * {
   *   "id": "camp_789",
   *   "name": "The Sunless Citadel",
   *   "status": "completed",
   *   ...
   * }
   *
   * RESPONSE ERRORS:
   * - 401 Unauthorized: No token or invalid token.
   * - 404 Not Found: The campaign does not exist or does not belong to the user.
   * - 500 Internal Server Error: Database update failed.
   *
   * SECURITY:
   * - The query is scoped by both campaign ID and the user ID from the JWT to prevent unauthorized modification.
   */
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

  /**
   * DELETE /v1/campaigns/:id
   *
   * BUSINESS PURPOSE:
   * - Deletes a campaign and all associated data (characters, sessions, etc.).
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
   * - 404 Not Found: The campaign does not exist or does not belong to the user.
   * - 500 Internal Server Error: Database deletion failed.
   *
   * SECURITY:
   * - The query is scoped by both campaign ID and the user ID from the JWT to prevent unauthorized deletion.
   * - Database foreign key constraints with `ON DELETE CASCADE` should be used to ensure all related data is properly deleted.
   */
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
