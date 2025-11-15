/**
 * Database Layer Type Definitions
 *
 * Shared types for database clients and connections.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Pool } from 'pg';

/**
 * PostgreSQL connection pool type
 */
export type PgPool = Pool;

/**
 * Supabase client type
 */
export type SupabaseClientType = SupabaseClient;

/**
 * Token verification result
 */
export interface TokenVerificationResult {
  userId: string;
  email?: string;
}
