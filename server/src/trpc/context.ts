/**
 * tRPC Context
 *
 * Creates the context for each tRPC request, including:
 * - Authenticated user information from Supabase tokens
 * - Drizzle database client for type-safe queries
 * - Express request and response objects
 *
 * The context is available in all tRPC procedures and middleware.
 */

import type { CreateExpressContextOptions } from '@trpc/server/adapters/express';
import { db } from '../../../db/client.js';
import { getBearerToken } from '../lib/jwt.js';
import { verifySupabaseToken, createPgClient } from '../../../src/infrastructure/database/index.js';

/**
 * Authenticated user payload extracted from Supabase token
 */
export interface AuthUser {
  userId: string;
  email?: string;
  plan: string;
}

/**
 * Resolves user's subscription plan from database or headers
 */
async function resolveUserPlan(
  userId: string,
  headers: Record<string, string | string[] | undefined>
): Promise<string> {
  // 1) Check for explicit header override (useful for tests)
  const planHeader = headers['x-plan'];
  const hdr = (typeof planHeader === 'string' ? planHeader : planHeader?.[0])?.toLowerCase();
  if (hdr) return hdr;

  // 2) Try to resolve from Postgres users table
  try {
    if (process.env.DATABASE_URL) {
      const pgClient = createPgClient();
      const client = await pgClient.connect();
      try {
        const { rows } = await client.query(
          'SELECT plan FROM users WHERE id = $1 LIMIT 1',
          [userId]
        );
        if (rows?.[0]?.plan) return String(rows[0].plan).toLowerCase();
      } finally {
        try {
          client.release();
        } catch {
          // Ignore release errors
        }
        try {
          await pgClient.end();
        } catch {
          // Ignore cleanup errors
        }
      }
    }
  } catch {
    // Fall through to default
  }

  // 3) Default plan
  return 'free';
}

/**
 * Creates context for tRPC requests
 * Extracts and validates Supabase auth token if present
 */
export async function createContext({ req, res }: CreateExpressContextOptions) {
  // Extract bearer token from Authorization header
  const token = getBearerToken(req.headers.authorization);

  let user: AuthUser | null = null;

  // Attempt to authenticate user if token is present
  if (token) {
    try {
      const supabaseUser = await verifySupabaseToken(token);
      if (supabaseUser) {
        const plan = await resolveUserPlan(supabaseUser.userId, req.headers);
        user = {
          userId: supabaseUser.userId,
          email: supabaseUser.email,
          plan,
        };
      }
    } catch {
      // Invalid token - user remains null
    }
  }

  return {
    req,
    res,
    db, // Drizzle ORM client
    user, // Authenticated user or null
  };
}

/**
 * Type of the tRPC context
 */
export type Context = Awaited<ReturnType<typeof createContext>>;
