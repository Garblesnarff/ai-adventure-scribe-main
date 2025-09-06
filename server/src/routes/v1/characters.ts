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
        `SELECT id, name, description, race, class, level, alignment, experience_points, 
         image_url, appearance, personality_traits, backstory_elements, background,
         created_at, updated_at 
         FROM characters WHERE user_id = $1 ORDER BY created_at DESC`,
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
    
    const client = await db.connect();
    try {
      const result = await client.query(
        `INSERT INTO characters (
          user_id, name, description, race, class, level, alignment, experience_points,
          image_url, appearance, personality_traits, backstory_elements, background
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
        [
          userId, 
          name, 
          description || null, 
          race, 
          charClass, 
          level || 1, 
          alignment || null,
          experience_points || 0,
          image_url || null,
          appearance || null,
          personality_traits || null,
          backstory_elements || null,
          background || null
        ]
      );
      return res.status(201).json(result.rows[0]);
    } catch (e) {
      return res.status(500).json({ error: 'Failed to create character' });
    } finally {
      client.release();
    }
  });

  router.get('/:id', async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const { id } = req.params;
    const client = await db.connect();
    try {
      const result = await client.query(
        `SELECT id, name, description, race, class, level, alignment, experience_points, 
         image_url, appearance, personality_traits, backstory_elements, background,
         created_at, updated_at 
         FROM characters WHERE id = $1 AND user_id = $2`,
        [id, userId]
      );
      if (!result.rows[0]) return res.status(404).json({ error: 'Character not found' });
      return res.json(result.rows[0]);
    } catch (e) {
      return res.status(500).json({ error: 'Failed to fetch character' });
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
    
    const client = await db.connect();
    try {
      const result = await client.query(
        `UPDATE characters SET 
          name = $3, description = $4, race = $5, class = $6, level = $7, 
          alignment = $8, experience_points = $9, image_url = $10, 
          appearance = $11, personality_traits = $12, backstory_elements = $13, 
          background = $14, updated_at = NOW()
         WHERE id = $1 AND user_id = $2 RETURNING *`,
        [
          id, userId, name, description || null, race, charClass, level || 1,
          alignment || null, experience_points || 0, image_url || null,
          appearance || null, personality_traits || null, backstory_elements || null,
          background || null
        ]
      );
      if (!result.rows[0]) return res.status(404).json({ error: 'Character not found' });
      return res.json(result.rows[0]);
    } catch (e) {
      return res.status(500).json({ error: 'Failed to update character' });
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

