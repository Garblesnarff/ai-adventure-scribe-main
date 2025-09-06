import { Router, Request, Response } from 'express';
import { Pool } from 'pg';
import { requireAuth } from '../../middleware/auth';

export default function campaignRouter(db: Pool) {
  const router = Router();

  router.use(requireAuth);

  router.get('/', async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const client = await db.connect();
    try {
      const result = await client.query('SELECT * FROM campaigns WHERE user_id = $1 ORDER BY created_at DESC', [userId]);
      return res.json(result.rows);
    } catch (e) {
      return res.status(500).json({ error: 'Failed to fetch campaigns' });
    } finally {
      client.release();
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
    const client = await db.connect();
    try {
      const result = await client.query(
        `INSERT INTO campaigns (user_id, name, description, genre, difficulty_level, campaign_length, tone, era, location, atmosphere, setting_details, thematic_elements, status, background_image)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
         RETURNING *`,
        [
          userId,
          name,
          description || null,
          genre || null,
          difficulty_level || null,
          campaign_length || null,
          tone || null,
          setting?.era || null,
          setting?.location || null,
          setting?.atmosphere || null,
          setting || null,
          thematic_elements || null,
          status || 'active',
          background_image || null,
        ]
      );
      return res.status(201).json(result.rows[0]);
    } catch (e) {
      return res.status(500).json({ error: 'Failed to create campaign' });
    } finally {
      client.release();
    }
  });

  router.get('/:id', async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const { id } = req.params;
    const client = await db.connect();
    try {
      const result = await client.query('SELECT * FROM campaigns WHERE id = $1 AND user_id = $2', [id, userId]);
      if (!result.rows[0]) return res.status(404).json({ error: 'Not found' });
      return res.json(result.rows[0]);
    } catch (e) {
      return res.status(500).json({ error: 'Failed to fetch campaign' });
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
      genre,
      difficulty_level,
      campaign_length,
      tone,
      setting,
      thematic_elements,
      status,
      background_image,
    } = req.body;
    const client = await db.connect();
    try {
      const result = await client.query(
        `UPDATE campaigns SET name=$1, description=$2, genre=$3, difficulty_level=$4, campaign_length=$5, tone=$6, era=$7, location=$8, atmosphere=$9, setting_details=$10, thematic_elements=$11, status=$12, background_image=$13, updated_at=NOW()
         WHERE id=$14 AND user_id=$15 RETURNING *`,
        [
          name,
          description || null,
          genre || null,
          difficulty_level || null,
          campaign_length || null,
          tone || null,
          setting?.era || null,
          setting?.location || null,
          setting?.atmosphere || null,
          setting || null,
          thematic_elements || null,
          status || 'active',
          background_image || null,
          id,
          userId,
        ]
      );
      if (!result.rows[0]) return res.status(404).json({ error: 'Not found' });
      return res.json(result.rows[0]);
    } catch (e) {
      return res.status(500).json({ error: 'Failed to update campaign' });
    } finally {
      client.release();
    }
  });

  router.delete('/:id', async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const { id } = req.params;
    const client = await db.connect();
    try {
      const result = await client.query('DELETE FROM campaigns WHERE id=$1 AND user_id=$2 RETURNING id', [id, userId]);
      if (!result.rows[0]) return res.status(404).json({ error: 'Not found' });
      return res.json({ ok: true });
    } catch (e) {
      return res.status(500).json({ error: 'Failed to delete campaign' });
    } finally {
      client.release();
    }
  });

  return router;
}

