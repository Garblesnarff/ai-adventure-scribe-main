import { Pool } from 'pg';

// Singleton pool instance - never call .end() on this
let poolInstance: Pool | null = null;

export function createClient(): Pool {
  if (!poolInstance) {
    poolInstance = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.PGSSL === 'true' ? { rejectUnauthorized: false } : undefined,
      max: Number(process.env.PGPOOL_MAX || 10),
    });
  }
  return poolInstance;
}

export type Db = Pool;

