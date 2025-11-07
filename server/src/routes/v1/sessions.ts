/**
 * Game Sessions API Routes
 *
 * RESTful endpoints for game session management.
 * Now using Drizzle ORM via SessionService for type-safe queries.
 */

import { Router, Request, Response } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { SessionService } from '../../services/session-service.js';

export default function sessionRouter() {
  const router = Router();
  router.use(requireAuth);

  /**
   * POST /sessions
   * Create a new game session
   */
  router.post('/', async (req: Request, res: Response) => {
    const { campaign_id, character_id, session_number } = req.body;

    try {
      const session = await SessionService.createSession({
        campaignId: campaign_id || null,
        characterId: character_id || null,
        sessionNumber: session_number || 1,
        status: 'active',
      });

      return res.status(201).json(session);
    } catch (e) {
      console.error('Error creating session:', e);
      return res.status(500).json({ error: 'Failed to create session' });
    }
  });

  /**
   * GET /sessions/:id
   * Get session by ID
   */
  router.get('/:id', async (req: Request, res: Response) => {
    const { id } = req.params;

    try {
      const session = await SessionService.getSessionById(id);

      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }

      return res.json(session);
    } catch (e) {
      console.error('Error fetching session:', e);
      return res.status(500).json({ error: 'Failed to fetch session' });
    }
  });

  /**
   * GET /sessions/:id/messages
   * Get session with message history (paginated)
   */
  router.get('/:id/messages', async (req: Request, res: Response) => {
    const { id } = req.params;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    try {
      const result = await SessionService.getSessionWithMessages(id, {
        limit,
        offset,
      });

      if (!result.session) {
        return res.status(404).json({ error: 'Session not found' });
      }

      return res.json({
        session: result.session,
        messages: result.messages,
        total: result.total,
        hasMore: offset + limit < result.total,
      });
    } catch (e) {
      console.error('Error fetching session messages:', e);
      return res.status(500).json({ error: 'Failed to fetch messages' });
    }
  });

  /**
   * POST /sessions/:id/complete
   * Mark session as completed
   */
  router.post('/:id/complete', async (req: Request, res: Response) => {
    const { id } = req.params;
    const { summary } = req.body as { summary?: string };

    try {
      const session = await SessionService.completeSession(id, summary);

      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }

      return res.json(session);
    } catch (e) {
      console.error('Error completing session:', e);
      return res.status(500).json({ error: 'Failed to complete session' });
    }
  });

  /**
   * POST /sessions/:id/messages
   * Add a message to session
   */
  router.post('/:id/messages', async (req: Request, res: Response) => {
    const { id } = req.params;
    const { speaker_type, speaker_id, message, context, images } = req.body;

    try {
      if (!message) {
        return res.status(400).json({ error: 'Message content required' });
      }

      const msg = await SessionService.addMessage({
        sessionId: id,
        speakerType: speaker_type,
        speakerId: speaker_id,
        message,
        context,
        images,
      });

      return res.status(201).json(msg);
    } catch (e) {
      console.error('Error adding message:', e);
      return res.status(500).json({ error: 'Failed to add message' });
    }
  });

  /**
   * PATCH /sessions/:id/state
   * Update session state (JSONB)
   */
  router.patch('/:id/state', async (req: Request, res: Response) => {
    const { id } = req.params;
    const stateUpdate = req.body;

    try {
      const session = await SessionService.updateSessionState(id, stateUpdate);

      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }

      return res.json(session);
    } catch (e) {
      console.error('Error updating session state:', e);
      return res.status(500).json({ error: 'Failed to update session state' });
    }
  });

  return router;
}
