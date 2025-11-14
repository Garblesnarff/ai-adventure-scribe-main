import { Pool } from 'pg';

export function createClient(): Pool {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.PGSSL === 'true' ? { rejectUnauthorized: false } : undefined,
    max: Number(process.env.PGPOOL_MAX || 10),
  });
  return pool;
}

export type Db = Pool;
