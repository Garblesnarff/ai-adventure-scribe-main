import { Router, Request, Response } from 'express';
import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import { signToken } from '../../lib/jwt.js';

export default function authRouter(db: Pool) {
  const router = Router();

  router.post('/register', async (req: Request, res: Response) => {
    const { email, password } = req.body as { email: string; password: string };
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

    const hash = await bcrypt.hash(password, 10);
    const client = await db.connect();
    try {
      const result = await client.query(
        'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email',
        [email, hash]
      );
      const user = result.rows[0];
      const token = signToken({ userId: user.id, email: user.email, plan: 'free' });
      return res.json({ token, user });
    } catch (e: any) {
      if (e.code === '23505') {
        return res.status(409).json({ error: 'Email already registered' });
      }
      return res.status(500).json({ error: 'Registration failed' });
    } finally {
      client.release();
    }
  });

  router.post('/login', async (req: Request, res: Response) => {
    const { email, password } = req.body as { email: string; password: string };
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

    const client = await db.connect();
    try {
      const result = await client.query(
        'SELECT id, email, password_hash, plan FROM users WHERE email = $1',
        [email]
      );
      const user = result.rows[0];
      if (!user) return res.status(401).json({ error: 'Invalid credentials' });
      const match = await bcrypt.compare(password, user.password_hash);
      if (!match) return res.status(401).json({ error: 'Invalid credentials' });
      const token = signToken({ userId: user.id, email: user.email, plan: user.plan || 'free' });
      return res.json({ token, user: { id: user.id, email: user.email, plan: user.plan } });
    } catch (e) {
      return res.status(500).json({ error: 'Login failed' });
    } finally {
      client.release();
    }
  });

  return router;
}

