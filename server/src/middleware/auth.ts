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

  console.log('🔑 Auth middleware: Token received, length:', token.length);

  try {
    // Try custom JWT token first
    console.log('🔑 Auth middleware: Trying custom JWT verification...');
    const payload = verifyToken(token);
    console.log('🔑 Auth middleware: Custom JWT verification successful');
    req.user = payload;
    next();
  } catch (err) {
    console.log('🔑 Auth middleware: Custom JWT failed:', err instanceof Error ? err.message : String(err));

    // If custom JWT fails, try Supabase token
    try {
      console.log('🔑 Auth middleware: Trying Supabase token verification...');
      const supabaseUser = await verifySupabaseToken(token);
      if (supabaseUser) {
        console.log('🔑 Auth middleware: Supabase verification successful for user:', supabaseUser.userId);
        req.user = {
          userId: supabaseUser.userId,
          email: supabaseUser.email,
          plan: 'free' // Default plan for Supabase users
        };
        next();
      } else {
        console.log('🔑 Auth middleware: Supabase verification returned null');
        return res.status(401).json({ error: 'Invalid token' });
      }
    } catch (supabaseErr) {
      console.log('🔑 Auth middleware: Supabase verification threw error:', supabaseErr instanceof Error ? supabaseErr.message : String(supabaseErr));
      return res.status(401).json({ error: 'Invalid token' });
    }
  }
}

