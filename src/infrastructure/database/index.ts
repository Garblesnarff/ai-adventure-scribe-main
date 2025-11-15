/**
 * Infrastructure Database Layer - Public API
 *
 * Central export point for all database clients and utilities.
 * This layer abstracts database connection details and provides
 * a clean interface for the rest of the application.
 *
 * @example
 * ```typescript
 * // Import Supabase client
 * import { supabase, supabaseService } from '@/infrastructure/database';
 *
 * // Import Drizzle ORM
 * import { db } from '@/infrastructure/database';
 *
 * // Import PostgreSQL pool
 * import { createPgClient } from '@/infrastructure/database';
 * ```
 */

// Supabase clients and utilities
export { supabase, supabaseService, verifySupabaseToken } from './supabase-client.js';

// Drizzle ORM client
export { db, pgPool } from './drizzle-client.js';
export type { DrizzleDb } from './drizzle-client.js';

// PostgreSQL client factory
export { createClient as createPgClient } from './pg-client.js';
export type { Db as PgDb } from './pg-client.js';

// Shared types
export type { PgPool, SupabaseClientType, TokenVerificationResult } from './types.js';
