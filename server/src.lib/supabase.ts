/**
 * SUPABASE INTEGRATION (SERVER-SIDE)
 *
 * WHAT IS SUPABASE:
 * - A Backend-as-a-Service provider that gives us a PostgreSQL database, authentication, and more.
 *
 * CONNECTION (Server-Side):
 * - URL: The project-specific Supabase URL (from an environment variable).
 * - Key: The "service role" key (from an environment variable). This key is highly privileged and MUST be kept secret. It bypasses all RLS policies.
 *
 * USAGE PATTERN (Server-Side):
 * - The `supabaseService` object is used for all server-side interactions with the database.
 * - Because this client uses the service role key, it bypasses RLS. This is necessary for administrative tasks, but it also means that EVERY query MUST be carefully written to include its own security checks (e.g., `...where('user_id', '=', userId)`).
 *
 * KEY DIFFERENCE:
 * - Client-side: RLS is enforced by Supabase automatically.
 * - Server-side: RLS is BYPASSED. The developer is responsible for enforcing data isolation.
 *
 * COMMON BUGS:
 * - Forgetting to add a `where` clause to a server-side query, accidentally exposing or modifying data for all users instead of just the intended user. This is a CRITICAL security risk.
 * - Using the service role key on the client side. This would be a catastrophic security vulnerability.
 */
import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Prefer anon key for the standard client; fall back to service role if anon is not set (dev convenience)
const SUPABASE_CLIENT_KEY = SUPABASE_ANON_KEY || SUPABASE_SERVICE_ROLE_KEY;

export const supabase = createClient(SUPABASE_URL, SUPABASE_CLIENT_KEY);
export const supabaseService = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY
);

const JWT_SECRET = process.env.SUPABASE_JWT_SECRET || '';

export async function verifySupabaseToken(token: string): Promise<{ userId: string; email?: string } | null> {
  if (JWT_SECRET) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      if (decoded?.sub) {
        return {
          userId: decoded.sub,
          email: decoded.email,
        };
      }
    } catch {
      // Fall through and attempt verification via Supabase service client
    }
  }

  try {
    const { data, error } = await supabaseService.auth.getUser(token);
    if (error || !data?.user) {
      return null;
    }

    return {
      userId: data.user.id,
      email: data.user.email ?? undefined,
    };
  } catch {
    return null;
  }
}
