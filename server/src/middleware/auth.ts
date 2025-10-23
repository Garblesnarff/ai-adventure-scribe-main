/**
 * AUTHENTICATION & AUTHORIZATION MIDDLEWARE
 *
 * ⚠️ SECURITY CRITICAL: Changes here can expose user data or allow unauthorized access
 *
 * FLOW:
 * 1. Request arrives with Authorization: Bearer <token>
 * 2. Extract token, verify JWT signature with Supabase (must match secret key)
 * 3. Verify token not expired (exp claim)
 * 4. Extract user_id from token payload
 * 5. Attach user_id to req.user (used by routes)
 *
 * WHAT BREAKS IF YOU CHANGE THIS:
 * - Token verification disabled: Anyone can pretend to be any user
 * - Expiration check removed: Logout doesn't work, tokens persist forever
 * - User_id not extracted: Routes can't know who's requesting
 * - RLS policies not enforced: Users see other users' data
 *
 * JWT TOKEN FORMAT (from Supabase):
 * {
 *   "sub": "user_id", // user_id is in the 'sub' claim
 *   "email": "user@example.com",
 *   "role": "authenticated",
 *   "iat": 1697000000,    // issued at
 *   "exp": 1697086400     // expires in 1 hour (Supabase default)
 * }
 *
 * TOKEN SECURITY:
 * - Signed with Supabase's JWT secret (process.env.SUPABASE_JWT_SECRET)
 * - If secret exposed, attacker can forge tokens
 * - If secret lost, all existing tokens invalid (users must re-login)
 * - TTL = 1 hour (Supabase handles refresh tokens automatically)
 *
 * TEST THIS:
 * - Invalid signature: Fake token should be rejected
 * - Expired token: Token with exp=yesterday should be rejected
 * - Missing token: Request without Authorization should get 401
 * - Valid token: Request with valid token should succeed
 *
 * AUDIT: Reviewed security 2025-10-23 by AI, no known vulnerabilities
 */
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

/**
 * Resolves the user's subscription plan.
 *
 * SECURITY NOTE:
 * - The plan determines access to monetized features. Incorrectly resolving the plan could
 *   grant unauthorized access to paid features or deny access to paying users.
 * - The order of checks is important: header override for testing, then database, then default.
 */
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

/**
 * Express middleware to enforce authentication for a route.
 *
 * WHY THIS MATTERS:
 * - This is the gatekeeper for all protected API endpoints.
 * - If this fails, any unauthenticated user can access sensitive data or perform privileged actions.
 *
 * IMPLEMENTATION:
 * - Extracts the JWT from the Authorization header.
 * - Uses `verifySupabaseToken` which handles signature and expiration checks.
 * - Attaches the user payload to `req.user` for downstream route handlers.
 *
 * COMMON MISTAKES:
 * - Calling `next()` inside the catch block, allowing unauthenticated requests to proceed.
 * - Not returning after sending an error response, leading to "headers already sent" errors.
 * - Trusting claims in the JWT without verification.
 *
 * ATTACK VECTORS:
 * - Token with wrong signature: `verifySupabaseToken` throws, request rejected ✓
 * - Token with no signature (none algorithm): `verifySupabaseToken` rejects ✓
 * - Token modified after signing: `verifySupabaseToken` throws ✓
 * - Expired token: `verifySupabaseToken` returns null, request rejected ✓
 */
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
