/**
 * Drizzle Kit Configuration
 *
 * This configuration file is used by drizzle-kit for:
 * - Generating TypeScript types from schema
 * - Creating database migrations
 * - Managing schema introspection
 */

import type { Config } from 'drizzle-kit';

export default {
  schema: './db/schema.ts',
  out: './db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
} satisfies Config;
