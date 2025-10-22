import { Request, Response, NextFunction } from 'express';
import { getBearerToken, AuthTokenPayload } from '../lib/jwt.js';
import { verifySupabaseToken } from '../lib/supabase.js';
<<<<<<< HEAD
=======
import { createClient } from '../lib/db.js';
>>>>>>> integration/campaign-centric-flow

declare global {
  namespace Express {
    interface Request {
      user?: AuthTokenPayload;
    }
  }
}

<<<<<<< HEAD
=======
async function resolveUserPlan(userId: string, req: Request): Promise<string> {
  // 1) Explicit header override (useful for tests): X-Plan: free|pro|enterprise
  const hdr = (req.headers['x-plan'] as string | undefined)?.toLowerCase();
  if (hdr) return hdr;

  // 2) Try to resolve from Postgres users table if configured
  try {
    if (process.env.DATABASE_URL) {
      const db = createClient();
      const client = await db.connect();
      try {
        const { rows } = await client.query('SELECT plan FROM users WHERE id = $1 LIMIT 1', [userId]);
        client.release();
        if (rows?.[0]?.plan) return String(rows[0].plan).toLowerCase();
      } catch {
        try { client.release(); } catch {}
      } finally {
        try { await db.end(); } catch {}
      }
    }
  } catch {}

  // 3) Default
  return 'free';
}

>>>>>>> integration/campaign-centric-flow
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = getBearerToken(req.headers.authorization || null);
  if (!token) return res.status(401).json({ error: 'Missing token' });

  try {
    const supabaseUser = await verifySupabaseToken(token);
    if (!supabaseUser) return res.status(401).json({ error: 'Invalid token' });
<<<<<<< HEAD
    req.user = {
      userId: supabaseUser.userId,
      email: supabaseUser.email,
      plan: 'free',
=======
    const plan = await resolveUserPlan(supabaseUser.userId, req);
    req.user = {
      userId: supabaseUser.userId,
      email: supabaseUser.email,
      plan,
>>>>>>> integration/campaign-centric-flow
    } as AuthTokenPayload;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

