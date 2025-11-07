import { Request, Response, NextFunction } from 'express';
import { getBearerToken, AuthTokenPayload } from '../lib/jwt.js';
import { verifySupabaseToken } from '../lib/supabase.js';
import { createClient } from '../lib/db.js';

declare global {
  namespace Express {
    interface Request {
      user?: AuthTokenPayload;
    }
  }
}

async function resolveUserPlan(userId: string, req: Request): Promise<string> {
  // SECURITY: X-Plan header only allowed in test/development environments
  // This prevents plan manipulation in production
  const isTestOrDev = process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'development';
  if (isTestOrDev) {
    const hdr = (req.headers['x-plan'] as string | undefined)?.toLowerCase();
    if (hdr) return hdr;
  }

  // Try to resolve from Postgres users table if configured
  try {
    if (process.env.DATABASE_URL) {
      const db = createClient();
      const client = await db.connect();
      try {
        const { rows } = await client.query('SELECT plan FROM users WHERE id = $1 LIMIT 1', [userId]);
        if (rows?.[0]?.plan) return String(rows[0].plan).toLowerCase();
      } finally {
        try { client.release(); } catch {}
        // Don't call db.end() - using singleton pool
      }
    }
  } catch (err) {
    // Log error but continue with default plan
    console.error('Error resolving user plan:', err);
  }

  // Default to free plan
  return 'free';
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = getBearerToken(req.headers.authorization || null);
  if (!token) return res.status(401).json({ error: 'Missing token' });

  try {
    const supabaseUser = await verifySupabaseToken(token);
    if (!supabaseUser) return res.status(401).json({ error: 'Invalid token' });
    const plan = await resolveUserPlan(supabaseUser.userId, req);
    req.user = {
      userId: supabaseUser.userId,
      email: supabaseUser.email,
      plan,
    } as AuthTokenPayload;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

