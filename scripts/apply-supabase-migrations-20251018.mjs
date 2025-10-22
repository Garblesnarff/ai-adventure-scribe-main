#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import url from 'url';
import dotenv from 'dotenv';
import { Client } from 'pg';

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env from project .env (contains DATABASE_URL for Supabase)
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const DATABASE_URL = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL || '';
if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL not found in .env; cannot run migrations');
  process.exit(1);
}

const MIGRATIONS_DIR = path.join(__dirname, '..', 'supabase', 'migrations');
const filesInOrder = [
  '20251018_add_campaign_id_and_style_config.sql',
  '20251018_create_campaign_members_and_policies.sql',
  '20251018_backfill_character_campaign_ids.sql',
  '20251018_enforce_campaign_id_not_null_on_characters.sql',
];

async function run() {
  const client = new Client({ connectionString: DATABASE_URL, ssl: process.env.PGSSL === 'true' ? { rejectUnauthorized: false } : undefined });
  try {
    console.log('📡 Connecting to database...');
    await client.connect();
    console.log('✅ Connected');

    // sanity check access
    const { rows: pingRows } = await client.query('select current_database() as db, current_user as usr');
    console.log(`🔍 DB: ${pingRows[0].db}, User: ${pingRows[0].usr}`);

    for (const fname of filesInOrder) {
      const fpath = path.join(MIGRATIONS_DIR, fname);
      console.log(`\n📝 Applying migration: ${fname}`);
      const sql = fs.readFileSync(fpath, 'utf8');
      try {
        await client.query('BEGIN');
        await client.query(sql);
        await client.query('COMMIT');
        console.log(`✅ Migration applied: ${fname}`);
      } catch (e) {
        await client.query('ROLLBACK');
        console.error(`❌ Migration failed: ${fname}`);
        console.error(e.message);
        process.exit(1);
      }
    }

    // Verification
    const { rows: remaining } = await client.query('select count(*)::int as c from characters where campaign_id is null');
    console.log(`\n📊 Remaining characters with NULL campaign_id: ${remaining[0].c}`);

    const { rows: cmExists } = await client.query("select to_regclass('public.campaign_members') is not null as exists");
    console.log(`📐 campaign_members table present: ${cmExists[0].exists}`);

    console.log('\n🎉 All migrations applied successfully.');
  } finally {
    await client.end().catch(() => {});
  }
}

run().catch(err => {
  console.error('🚨 Unexpected failure applying migrations:', err?.message || err);
  process.exit(1);
});
