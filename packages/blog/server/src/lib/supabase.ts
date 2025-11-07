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
