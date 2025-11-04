/**
 * Migration script to apply session constraints and performance indexes
 * Prevents race conditions when creating duplicate active game sessions
 *
 * Run with: node scripts/apply-session-constraints-migration.js
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env.local') });

const MIGRATION_FILE = join(__dirname, '..', 'supabase', 'migrations', '20251103_add_session_constraints.sql');

async function applyMigration() {
  console.log('🚀 Starting session constraints migration...\n');

  // Check for required environment variables
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('❌ Missing required environment variables:');
    console.error('   - VITE_SUPABASE_URL');
    console.error('   - SUPABASE_SERVICE_ROLE_KEY');
    console.error('\nPlease ensure .env.local file is configured correctly.');
    process.exit(1);
  }

  // Create Supabase client with service role key for admin operations
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  try {
    // Read the migration SQL file
    console.log('📖 Reading migration file...');
    const migrationSQL = readFileSync(MIGRATION_FILE, 'utf-8');

    // Extract just the SQL commands (remove comments and verification queries)
    const sqlCommands = migrationSQL
      .split('\n')
      .filter(line => {
        const trimmed = line.trim();
        // Keep lines that aren't comments or verification section
        return trimmed &&
               !trimmed.startsWith('--') &&
               !trimmed.includes('VERIFICATION QUERIES');
      })
      .join('\n');

    console.log('📝 Migration SQL loaded successfully\n');

    // Check if tables exist
    console.log('🔍 Checking table structure...');

    const { data: gameSessionsCheck, error: gsError } = await supabase
      .from('game_sessions')
      .select('id')
      .limit(1);

    if (gsError) {
      console.error('❌ game_sessions table check failed:', gsError.message);
      throw gsError;
    }
    console.log('✓ game_sessions table exists');

    const { data: dialogueCheck, error: dhError } = await supabase
      .from('dialogue_history')
      .select('id')
      .limit(1);

    if (dhError) {
      console.error('❌ dialogue_history table check failed:', dhError.message);
      throw dhError;
    }
    console.log('✓ dialogue_history table exists');

    const { data: spellsCheck, error: csError } = await supabase
      .from('character_spells')
      .select('id')
      .limit(1);

    if (csError) {
      console.error('❌ character_spells table check failed:', csError.message);
      throw csError;
    }
    console.log('✓ character_spells table exists\n');

    // Check for existing active sessions to identify potential duplicates
    console.log('🔍 Checking for existing duplicate active sessions...');
    const { data: activeSessions, error: activeCheckError } = await supabase
      .from('game_sessions')
      .select('campaign_id, character_id, status')
      .eq('status', 'active');

    if (activeCheckError) {
      console.error('❌ Failed to check active sessions:', activeCheckError.message);
      throw activeCheckError;
    }

    if (activeSessions) {
      const duplicates = activeSessions.reduce((acc, session) => {
        const key = `${session.campaign_id}-${session.character_id}`;
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {});

      const dupeCount = Object.values(duplicates).filter(count => count > 1).length;

      if (dupeCount > 0) {
        console.warn('⚠️  WARNING: Found', dupeCount, 'campaign+character combinations with multiple active sessions');
        console.warn('   These will need to be resolved before the unique constraint can be applied.');
        console.warn('   Please mark old sessions as "completed" or "expired" before applying this migration.\n');

        // Show details of duplicates
        console.log('   Duplicate combinations:');
        Object.entries(duplicates).forEach(([key, count]) => {
          if (count > 1) {
            console.log(`   - ${key}: ${count} active sessions`);
          }
        });
        console.log('');

        console.log('💡 Recommended action:');
        console.log('   Run this query in Supabase SQL Editor to fix duplicates:');
        console.log(`
   -- Mark older duplicate sessions as completed
   UPDATE game_sessions
   SET status = 'completed', end_time = NOW()
   WHERE id IN (
     SELECT id
     FROM (
       SELECT id,
              ROW_NUMBER() OVER (PARTITION BY campaign_id, character_id ORDER BY start_time DESC) as rn
       FROM game_sessions
       WHERE status = 'active'
     ) t
     WHERE rn > 1
   );
        `);

        process.exit(1);
      }

      console.log('✓ No duplicate active sessions found\n');
    }

    // Apply the migration
    console.log('🔧 Applying migration SQL...');
    console.log('   (This will create indexes and constraints)\n');

    // Note: We can't execute raw SQL directly via the Supabase client library
    // The user needs to apply this via the SQL Editor or Supabase CLI
    console.log('⚠️  IMPORTANT: The Supabase JS client cannot execute DDL statements.');
    console.log('   Please apply the migration manually using one of these methods:\n');

    console.log('   Method 1: Supabase Dashboard SQL Editor');
    console.log('   ----------------------------------------');
    console.log('   1. Go to: ' + supabaseUrl.replace('https://', 'https://supabase.com/dashboard/project/') + '/sql');
    console.log('   2. Copy the contents of: supabase/migrations/20251103_add_session_constraints.sql');
    console.log('   3. Paste into the SQL Editor and click "Run"\n');

    console.log('   Method 2: Supabase CLI (if installed)');
    console.log('   -------------------------------------');
    console.log('   $ supabase db push\n');

    console.log('📋 Migration file location:');
    console.log('   ' + MIGRATION_FILE + '\n');

    console.log('✅ Pre-migration checks completed successfully!');
    console.log('   No duplicate active sessions found.');
    console.log('   Ready to apply the migration.\n');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    console.error('\nError details:', error.message);
    process.exit(1);
  }
}

applyMigration();
