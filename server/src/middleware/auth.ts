import { Request, Response, NextFunction } from 'express';
import { getBearerToken, verifyToken, AuthTokenPayload } from '../lib/jwt.js';
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
    // Try custom JWT token first
    const payload = verifyToken(token);
    req.user = payload;
    next();
  } catch (err) {
    // If custom JWT fails, try Supabase token
    try {
      const supabaseUser = await verifySupabaseToken(token);
      if (supabaseUser) {
        req.user = {
          userId: supabaseUser.userId,
          email: supabaseUser.email,
          plan: 'free' // Default plan for Supabase users
        };
        next();
      } else {
        return res.status(401).json({ error: 'Invalid token' });
      }
    } catch (supabaseErr) {
      return res.status(401).json({ error: 'Invalid token' });
    }
  }
}

