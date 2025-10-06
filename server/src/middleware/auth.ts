import { Request, Response, NextFunction } from 'express';
import { getBearerToken, AuthTokenPayload } from '../lib/jwt.js';
import { verifySupabaseToken } from '../lib/supabase.js';

declare global {
  namespace Express {
    interface Request {
      user?: AuthTokenPayload;
    }
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = getBearerToken(req.headers.authorization || null);
  if (!token) return res.status(401).json({ error: 'Missing token' });

  try {
    const supabaseUser = await verifySupabaseToken(token);
    if (!supabaseUser) return res.status(401).json({ error: 'Invalid token' });
    req.user = {
      userId: supabaseUser.userId,
      email: supabaseUser.email,
      plan: 'free',
    } as AuthTokenPayload;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

