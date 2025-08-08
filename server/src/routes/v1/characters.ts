import { Router, Request, Response } from 'express';
import { Pool } from 'pg';
import { requireAuth } from '../../middleware/auth';

export default function characterRouter(db: Pool) {
  const router = Router();
  router.use(requireAuth);

  router.get('/', async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const client = await db.connect();
    try {
      const result = await client.query(
        'SELECT id, name, description, race, class, level, created_at, updated_at FROM characters WHERE user_id = $1 ORDER BY created_at DESC',
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
    const { name, description, race, class: charClass, level } = req.body;
    const client = await db.connect();
    try {
      const result = await client.query(
        'INSERT INTO characters (user_id, name, description, race, class, level) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *',
        [userId, name, description || null, race, charClass, level || 1]
      );
      return res.status(201).json(result.rows[0]);
    } catch (e) {
      return res.status(500).json({ error: 'Failed to create character' });
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

  return router;
}

