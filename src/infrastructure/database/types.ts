/**
 * Database Layer Type Definitions
 *
 * Shared types for database clients and connections.
 */

import type { Pool } from 'pg';
import type { SupabaseClient } from '@supabase/supabase-js';

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
