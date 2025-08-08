import { Router, Request, Response } from 'express';
import { Pool } from 'pg';
import { requireAuth } from '../../middleware/auth';

export default function sessionRouter(db: Pool) {
  const router = Router();
  router.use(requireAuth);

  router.post('/', async (req: Request, res: Response) => {
    const { campaign_id, character_id, session_number } = req.body;
    const client = await db.connect();
    try {
      const result = await client.query(
        'INSERT INTO game_sessions (campaign_id, character_id, session_number, status, start_time) VALUES ($1,$2,$3,$4,NOW()) RETURNING *',
        [campaign_id || null, character_id || null, session_number || 1, 'active']
      );
      return res.status(201).json(result.rows[0]);
    } catch (e) {
      return res.status(500).json({ error: 'Failed to create session' });
    } finally {
      client.release();
    }
  });

  router.get('/:id', async (req: Request, res: Response) => {
    const { id } = req.params;
    const client = await db.connect();
    try {
      const result = await client.query('SELECT * FROM game_sessions WHERE id=$1', [id]);
      if (!result.rows[0]) return res.status(404).json({ error: 'Not found' });
      return res.json(result.rows[0]);
    } catch (e) {
      return res.status(500).json({ error: 'Failed to fetch session' });
    } finally {
      client.release();
    }
  });

  router.post('/:id/complete', async (req: Request, res: Response) => {
    const { id } = req.params;
    const { summary } = req.body as { summary?: string };
    const client = await db.connect();
    try {
      const result = await client.query(
        'UPDATE game_sessions SET end_time=NOW(), status=$1, summary=$2 WHERE id=$3 RETURNING *',
        ['completed', summary || null, id]
      );
      if (!result.rows[0]) return res.status(404).json({ error: 'Not found' });
      return res.json(result.rows[0]);
    } catch (e) {
      return res.status(500).json({ error: 'Failed to complete session' });
    } finally {
      client.release();
    }
  });

  return router;
}

