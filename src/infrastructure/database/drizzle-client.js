/**
 * Drizzle ORM Database Connection
 *
 * Provides type-safe database access using Drizzle ORM with PostgreSQL.
 * Uses node-postgres as the underlying driver.
 */
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as sessionSchema from '../../../db/session-schema.js';
/**
 * PostgreSQL connection pool
 * Configured via DATABASE_URL environment variable
 */
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.PGSSL === 'true' ? { rejectUnauthorized: false } : undefined,
    max: Number(process.env.PGPOOL_MAX || 10),
});
/**
 * Drizzle database instance with session schema
 * Use this for type-safe session and message queries
 */
export const db = drizzle(pool, {
    schema: sessionSchema,
});
/**
 * Raw PostgreSQL pool for direct queries if needed
 */
export const pgPool = pool;
