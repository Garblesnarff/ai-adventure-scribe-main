/**
 * Generates the cleanup SQL for Supabase SQL Editor
 * Provides formatted SQL ready to copy-paste
 *
 * Run with: node scripts/generate-cleanup-sql.js
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const CLEANUP_MIGRATION = join(__dirname, '..', 'supabase', 'migrations', '20251103_cleanup_duplicate_sessions.sql');
const CONSTRAINTS_MIGRATION = join(__dirname, '..', 'supabase', 'migrations', '20251103_add_session_constraints.sql');

console.log('╔════════════════════════════════════════════════════════════════╗');
console.log('║     SESSION CONSTRAINTS MIGRATION - SQL GENERATOR              ║');
console.log('╚════════════════════════════════════════════════════════════════╝\n');

console.log('This script will generate SQL ready for the Supabase SQL Editor.\n');

// Read both migration files
const cleanupSQL = readFileSync(CLEANUP_MIGRATION, 'utf-8');
const constraintsSQL = readFileSync(CONSTRAINTS_MIGRATION, 'utf-8');

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('STEP 1: CLEANUP DUPLICATE SESSIONS');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

console.log('Copy the SQL below and paste it into Supabase SQL Editor:\n');
console.log('┌────────────────────────────────────────────────────────────────┐');
console.log(cleanupSQL);
console.log('└────────────────────────────────────────────────────────────────┘\n');

console.log('After running, verify cleanup with this query:\n');
console.log('┌────────────────────────────────────────────────────────────────┐');
console.log('SELECT campaign_id, character_id, COUNT(*) as active_count');
console.log('FROM game_sessions');
console.log('WHERE status = \'active\'');
console.log('GROUP BY campaign_id, character_id');
console.log('HAVING COUNT(*) > 1;');
console.log('└────────────────────────────────────────────────────────────────┘\n');
console.log('Expected result: 0 rows\n');

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('STEP 2: ADD CONSTRAINTS AND INDEXES');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

console.log('After verification, copy and run this SQL:\n');
console.log('┌────────────────────────────────────────────────────────────────┐');
console.log(constraintsSQL);
console.log('└────────────────────────────────────────────────────────────────┘\n');

console.log('After running, verify constraint with this query:\n');
console.log('┌────────────────────────────────────────────────────────────────┐');
console.log('-- Try to create duplicate active session (should fail)');
console.log('INSERT INTO game_sessions (campaign_id, character_id, session_number, status, start_time)');
console.log('SELECT campaign_id, character_id, 999, \'active\', NOW()');
console.log('FROM game_sessions');
console.log('WHERE status = \'active\'');
console.log('LIMIT 1;');
console.log('└────────────────────────────────────────────────────────────────┘\n');
console.log('Expected result: ERROR - duplicate key value violates unique constraint\n');

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('SUPABASE SQL EDITOR LINK');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

// Try to extract project ID from .env.local
try {
  const envPath = join(__dirname, '..', '.env.local');
  const envContent = readFileSync(envPath, 'utf-8');
  const urlMatch = envContent.match(/VITE_SUPABASE_URL=https:\/\/([^.]+)\.supabase\.co/);

  if (urlMatch) {
    const projectId = urlMatch[1];
    console.log(`https://supabase.com/dashboard/project/${projectId}/sql/new\n`);
  } else {
    console.log('https://supabase.com/dashboard (navigate to your project → SQL Editor)\n');
  }
} catch (e) {
  console.log('https://supabase.com/dashboard (navigate to your project → SQL Editor)\n');
}

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('TESTING');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

console.log('Run comprehensive tests:');
console.log('$ node scripts/test-session-constraints.js\n');

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
