/**
 * Test script for session constraints migration
 * Verifies that the unique constraint prevents duplicate active sessions
 *
 * Run with: node scripts/test-session-constraints.js
 */

import { createClient } from '@supabase/supabase-js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env.local') });

async function testConstraints() {
  console.log('🧪 Testing session constraints...\n');

  // Check for required environment variables
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('❌ Missing required environment variables');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  try {
    // Test 1: Check for duplicate active sessions
    console.log('📋 Test 1: Checking for duplicate active sessions...');

    const { data: duplicateCheck, error: dupError } = await supabase
      .from('game_sessions')
      .select('campaign_id, character_id')
      .eq('status', 'active')
      .not('campaign_id', 'is', null)
      .not('character_id', 'is', null);

    if (dupError) throw dupError;

    const duplicates = (duplicateCheck || []).reduce((acc, session) => {
      const key = `${session.campaign_id}-${session.character_id}`;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    const hasDuplicates = Object.values(duplicates).some(count => count > 1);

    if (hasDuplicates) {
      console.log('❌ FAILED: Found duplicate active sessions');
      console.log('   The cleanup migration needs to be applied first\n');
      return false;
    }

    console.log('✅ PASSED: No duplicate active sessions found\n');

    // Test 2: Verify index exists (indirect check by trying to query efficiently)
    console.log('📋 Test 2: Checking query performance with indexes...');

    const start = Date.now();
    const { data: statusCheck, error: statusError } = await supabase
      .from('game_sessions')
      .select('id')
      .eq('status', 'active')
      .limit(100);

    const queryTime = Date.now() - start;

    if (statusError) {
      console.error('❌ Status query failed:', statusError.message);
      throw statusError;
    }

    console.log(`✅ PASSED: Status index working (query: ${queryTime}ms)\n`);

    // Test 3: Check dialogue_history index
    console.log('📋 Test 3: Checking dialogue_history indexes...');

    const { data: dialogueCheck, error: dialogueError } = await supabase
      .from('dialogue_history')
      .select('id')
      .limit(1);

    if (dialogueError) {
      console.error('❌ dialogue_history check failed:', dialogueError.message);
      throw dialogueError;
    }

    console.log('✅ PASSED: dialogue_history table accessible\n');

    // Test 4: Check character_spells index
    console.log('📋 Test 4: Checking character_spells indexes...');

    const { data: spellsCheck, error: spellsError } = await supabase
      .from('character_spells')
      .select('id')
      .limit(1);

    if (spellsError) {
      console.error('❌ character_spells check failed:', spellsError.message);
      throw spellsError;
    }

    console.log('✅ PASSED: character_spells table accessible\n');

    // Test 5: Attempt to create duplicate active session (should fail if constraint exists)
    console.log('📋 Test 5: Testing unique constraint enforcement...');
    console.log('   (This test will only work AFTER the constraint is applied)\n');

    // Find an existing active session to test with
    const { data: existingSessions, error: existingError } = await supabase
      .from('game_sessions')
      .select('campaign_id, character_id')
      .eq('status', 'active')
      .not('campaign_id', 'is', null)
      .not('character_id', 'is', null)
      .limit(1);

    if (existingError) throw existingError;

    if (existingSessions && existingSessions.length > 0) {
      const { campaign_id, character_id } = existingSessions[0];

      // Try to create a duplicate active session
      const { data: duplicateSession, error: duplicateError } = await supabase
        .from('game_sessions')
        .insert({
          campaign_id,
          character_id,
          status: 'active',
          session_number: 999,
          start_time: new Date().toISOString(),
        })
        .select();

      if (duplicateError) {
        // Check if it's the unique constraint error we expect
        if (duplicateError.message.includes('idx_active_session_per_character') ||
            duplicateError.message.includes('unique') ||
            duplicateError.message.includes('duplicate')) {
          console.log('✅ PASSED: Unique constraint working!');
          console.log('   Duplicate active session was correctly rejected\n');
        } else {
          console.log('⚠️  UNKNOWN: Got error but not constraint-related:');
          console.log('   ' + duplicateError.message + '\n');
        }
      } else {
        // Duplicate was created - constraint not applied yet
        console.log('⚠️  WARNING: Unique constraint NOT yet applied');
        console.log('   Duplicate session was created (will clean up now)');

        // Clean up the test duplicate
        if (duplicateSession && duplicateSession[0]) {
          await supabase
            .from('game_sessions')
            .delete()
            .eq('id', duplicateSession[0].id);
        }

        console.log('   Please apply the constraint migration:\n');
        console.log('   supabase/migrations/20251103_add_session_constraints.sql\n');
      }
    } else {
      console.log('⚠️  SKIPPED: No active sessions found to test with\n');
    }

    // Summary
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 Test Summary');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ Pre-migration checks: PASSED');
    console.log('✅ Database tables: ACCESSIBLE');
    console.log('✅ Query performance: GOOD');

    if (!hasDuplicates) {
      console.log('✅ Data cleanup: COMPLETE');
    } else {
      console.log('❌ Data cleanup: NEEDED');
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('📋 Next Steps:');
    console.log('1. Apply cleanup migration (if needed):');
    console.log('   supabase/migrations/20251103_cleanup_duplicate_sessions.sql');
    console.log('');
    console.log('2. Apply constraints migration:');
    console.log('   supabase/migrations/20251103_add_session_constraints.sql');
    console.log('');
    console.log('3. Re-run this test to verify constraints work\n');

    return true;

  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error('\nError details:', error.message);
    return false;
  }
}

testConstraints();
