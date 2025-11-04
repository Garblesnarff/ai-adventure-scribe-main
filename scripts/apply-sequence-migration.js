#!/usr/bin/env node

/**
 * Apply database migration to add sequence_number column to dialogue_history
 * This ensures proper message ordering even with concurrent multi-tab inserts
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
config({ path: resolve(__dirname, '../.env') });
config({ path: resolve(__dirname, '../.env.local') });

async function applyMigration() {
  console.log('🚀 Applying message sequence number migration...\n');

  // Create Supabase admin client
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    console.error('❌ Missing VITE_SUPABASE_URL environment variable');
    process.exit(1);
  }

  if (!serviceRoleKey) {
    console.error('❌ Missing SUPABASE_SERVICE_ROLE_KEY environment variable');
    console.error('   This migration requires admin privileges.');
    console.error('   Please set SUPABASE_SERVICE_ROLE_KEY in your .env or .env.local file\n');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  try {
    // Read migration file
    const migrationPath = resolve(__dirname, '../supabase/migrations/20251103151855_add_message_sequence_numbers.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf8');

    console.log('📝 Migration SQL loaded from:');
    console.log(`   ${migrationPath}\n`);
    console.log('📊 Migration summary:');
    console.log('   - Adds sequence_number column to dialogue_history');
    console.log('   - Creates trigger for automatic sequence assignment');
    console.log('   - Backfills existing messages with sequence numbers');
    console.log('   - Adds unique constraint on (session_id, sequence_number)\n');

    console.log('⚙️  Executing migration...');

    // Try to use MCP tool if available (for Supabase projects with MCP)
    const { error } = await supabase.rpc('exec_sql', {
      sql: migrationSQL
    });

    if (error) {
      if (error.message.includes('function') && error.message.includes('does not exist')) {
        console.log('⚠️  exec_sql RPC not available, using alternative method...\n');
        console.log('📋 Please run the following SQL manually in your Supabase SQL Editor:');
        console.log('   Dashboard → SQL Editor → New Query\n');
        console.log('=' .repeat(70));
        console.log(migrationSQL);
        console.log('=' .repeat(70));
        console.log('\nOr use the Supabase MCP tool:');
        console.log(`   mcp__supabase__apply_migration("add_message_sequence_numbers", "${migrationSQL.replace(/"/g, '\\"')}")\n`);
        process.exit(1);
      } else {
        throw error;
      }
    }

    console.log('✅ Migration executed successfully!\n');

    // Verify the column exists and has data
    console.log('🔍 Verifying migration...');

    const { data: sample, error: sampleError } = await supabase
      .from('dialogue_history')
      .select('id, session_id, sequence_number, message')
      .not('sequence_number', 'is', null)
      .limit(5);

    if (sampleError) {
      console.error('❌ Verification failed:', sampleError.message);
      process.exit(1);
    }

    console.log(`✅ Found ${sample?.length || 0} messages with sequence numbers`);

    if (sample && sample.length > 0) {
      console.log('\n📋 Sample messages:');
      sample.forEach(msg => {
        console.log(`   Seq ${msg.sequence_number}: ${msg.message.substring(0, 50)}...`);
      });
    }

    console.log('\n🎉 Migration completed successfully!');
    console.log('\n📌 What changed:');
    console.log('   ✓ Messages now have sequence_number for reliable ordering');
    console.log('   ✓ Concurrent inserts from multiple tabs are now safe');
    console.log('   ✓ No timestamp-based race conditions\n');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('\nPlease run the migration SQL manually in Supabase SQL Editor:');
    console.error(`   File: supabase/migrations/20251103151855_add_message_sequence_numbers.sql\n`);
    process.exit(1);
  }
}

// Run the migration
applyMigration();
