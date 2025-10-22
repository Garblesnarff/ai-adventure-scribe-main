#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import url from 'url';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const MIGRATIONS_DIR = path.join(__dirname, '..', 'supabase', 'migrations');
const filesInOrder = [
  '20251018_add_campaign_id_and_style_config.sql',
  '20251018_create_campaign_members_and_policies.sql',
  '20251018_backfill_character_campaign_ids.sql',
  '20251018_enforce_campaign_id_not_null_on_characters.sql',
];

async function execSQL(sql) {
  const { error } = await supabase.rpc('exec_sql', { sql });
  if (error) throw new Error(error.message);
}

async function run() {
  console.log('🔧 Applying migrations via exec_sql RPC...');
  for (const fname of filesInOrder) {
    const fpath = path.join(MIGRATIONS_DIR, fname);
    console.log(`\n📝 ${fname}`);
    const sql = fs.readFileSync(fpath, 'utf8');
    try {
      await execSQL(sql);
      console.log('✅ Applied');
    } catch (e) {
      console.error(`❌ Failed on ${fname}: ${e.message}`);
      process.exit(1);
    }
  }
  console.log('\n🎉 All migrations applied.');
}

run().catch((e) => {
  console.error('🚨 Unexpected failure:', e?.message || e);
  process.exit(1);
});
