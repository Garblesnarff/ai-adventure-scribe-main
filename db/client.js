/**
 * Drizzle Database Client
 *
 * This module initializes the Drizzle ORM client with a postgres connection.
 * The client provides type-safe database queries alongside the existing Supabase client.
 *
 * Usage:
 * ```typescript
 * import { db } from '@/db/client';
 * import { blogPosts } from '@/db/schema';
 *
 * // Type-safe query
 * const posts = await db.select().from(blogPosts).where(eq(blogPosts.status, 'published'));
 * ```
 */
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
// Create postgres connection
// Note: This connection is separate from Supabase's connection pool
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is not set');
}
// Create the postgres client
const client = postgres(connectionString);
// Create Drizzle instance with schema for relational queries
export const db = drizzle(client, { schema });
// Export the client for raw SQL queries if needed
export { client as pgClient };
