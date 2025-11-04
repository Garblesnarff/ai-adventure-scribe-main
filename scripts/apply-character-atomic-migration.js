/**
 * Script to Apply Character Atomic Creation Migration
 *
 * This script manually applies the atomic character creation migration
 * to the Supabase database.
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: Missing Supabase credentials');
  console.error('Please ensure VITE_SUPABASE_URL and SUPABASE_SERVICE_KEY are set in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyMigration() {
  console.log('📦 Reading migration file...');

  const migrationPath = path.join(
    __dirname,
    '../supabase/migrations/20251103_create_character_atomic_function.sql'
  );

  if (!fs.existsSync(migrationPath)) {
    console.error('❌ Migration file not found:', migrationPath);
    process.exit(1);
  }

  const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

  console.log('🚀 Applying migration to database...');
  console.log('Migration:', path.basename(migrationPath));
  console.log('');

  try {
    // Execute the migration SQL
    const { data, error } = await supabase.rpc('exec', {
      sql: migrationSQL
    }).catch(async () => {
      // If rpc('exec') doesn't exist, try direct SQL execution
      // Split the SQL into individual statements and execute them
      const statements = migrationSQL
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));

      for (const statement of statements) {
        const { error: stmtError } = await supabase.rpc('query', {
          query: statement + ';'
        });

        if (stmtError) {
          throw stmtError;
        }
      }

      return { data: null, error: null };
    });

    if (error) {
      console.error('❌ Migration failed:', error.message);
      console.error('');
      console.error('Details:', error);
      process.exit(1);
    }

    console.log('✅ Migration applied successfully!');
    console.log('');
    console.log('Created functions:');
    console.log('  - create_character_atomic(character_data jsonb, stats_data jsonb, equipment_data jsonb)');
    console.log('  - update_character_spells(character_id uuid, spell_ids uuid[], class_name text)');
    console.log('');
    console.log('You can now use these functions for atomic character creation.');

  } catch (err) {
    console.error('❌ Unexpected error:', err.message);
    console.error('');
    console.error('Note: This script requires service role access to create functions.');
    console.error('Please ensure SUPABASE_SERVICE_KEY is set in .env.local');
    console.error('');
    console.error('Alternatively, you can apply the migration manually using:');
    console.log('  1. Go to Supabase Dashboard > SQL Editor');
    console.log('  2. Copy the contents of:', migrationPath);
    console.log('  3. Paste and execute the SQL');
    process.exit(1);
  }
}

// Run the migration
applyMigration();
