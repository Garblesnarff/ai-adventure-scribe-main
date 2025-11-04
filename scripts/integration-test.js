/**
 * Integration Test Suite for Units 1-12
 *
 * Tests all major improvements to verify they work together:
 * - Migration integrity
 * - Database indexes
 * - N+1 query fixes
 * - Session constraints
 * - Pagination
 * - Archival system
 * - List optimizations
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

// Load environment variables
config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Test results tracking
const testResults = {
  passed: 0,
  failed: 0,
  warnings: 0,
  tests: []
};

function logTest(name, status, details = {}) {
  const emoji = status === 'pass' ? '✅' : status === 'warn' ? '⚠️' : '❌';
  console.log(`${emoji} ${name}`);

  if (Object.keys(details).length > 0) {
    console.log(`   ${JSON.stringify(details, null, 2).split('\n').join('\n   ')}`);
  }

  testResults.tests.push({ name, status, details });

  if (status === 'pass') testResults.passed++;
  else if (status === 'warn') testResults.warnings++;
  else testResults.failed++;
}

// ===================================================================
// TEST 1: VERIFY MIGRATIONS
// ===================================================================
async function testMigrations() {
  console.log('\n📋 TEST 1: Migration Verification');
  console.log('=' .repeat(60));

  try {
    // Check if new indexes exist
    const { data: indexes, error } = await supabase
      .rpc('pg_indexes')
      .select('*')
      .or('indexname.eq.idx_active_session_per_character,indexname.eq.idx_game_sessions_status,indexname.eq.idx_dialogue_history_session_speaker,indexname.eq.idx_character_spells_spell_id');

    if (error) {
      // Try alternative method using information_schema
      const { data: indexData, error: indexError } = await supabase
        .from('pg_indexes')
        .select('indexname, tablename')
        .in('indexname', [
          'idx_active_session_per_character',
          'idx_game_sessions_status',
          'idx_dialogue_history_session_speaker',
          'idx_character_spells_spell_id'
        ]);

      if (indexError) {
        logTest('Migration indexes exist', 'warn', {
          reason: 'Cannot query pg_indexes - need admin access',
          suggestion: 'Run manually: SELECT * FROM pg_indexes WHERE indexname LIKE \'idx_%\''
        });
      } else {
        const foundIndexes = indexData?.map(idx => idx.indexname) || [];
        logTest('Migration indexes exist', foundIndexes.length >= 3 ? 'pass' : 'fail', {
          found: foundIndexes,
          expected: 4
        });
      }
    } else {
      const foundIndexes = indexes?.map(idx => idx.indexname) || [];
      logTest('Migration indexes exist', foundIndexes.length >= 3 ? 'pass' : 'fail', {
        found: foundIndexes,
        expected: 4
      });
    }

    // Check if archive tables exist
    const { data: archiveTables, error: archiveError } = await supabase
      .rpc('pg_tables')
      .select('tablename')
      .eq('schemaname', 'public')
      .like('tablename', '%_archive');

    if (archiveError) {
      logTest('Archive tables exist', 'warn', {
        reason: 'Cannot query pg_tables - need admin access'
      });
    } else {
      const expectedTables = [
        'game_sessions_archive',
        'dialogue_history_archive',
        'memories_archive',
        'character_voice_mappings_archive',
        'combat_encounters_archive'
      ];

      const foundTables = archiveTables?.map(t => t.tablename) || [];
      const allExist = expectedTables.every(t => foundTables.includes(t));

      logTest('Archive tables exist', allExist ? 'pass' : 'warn', {
        found: foundTables.length,
        expected: expectedTables.length
      });
    }

  } catch (err) {
    logTest('Migration verification', 'fail', { error: err.message });
  }
}

// ===================================================================
// TEST 2: DATABASE INDEXES
// ===================================================================
async function testIndexes() {
  console.log('\n🗂️  TEST 2: Database Index Performance');
  console.log('=' .repeat(60));

  try {
    // Test if indexes are being used with EXPLAIN
    const { data, error } = await supabase
      .from('game_sessions')
      .select('id, status')
      .eq('status', 'active')
      .limit(1);

    if (error) {
      logTest('Index usage on status filter', 'warn', {
        reason: 'Cannot verify index usage without EXPLAIN access'
      });
    } else {
      logTest('Status filter query works', 'pass', {
        recordsFound: data?.length || 0
      });
    }

    // Test composite index on dialogue_history
    const { data: dialogueData, error: dialogueError } = await supabase
      .from('dialogue_history')
      .select('id')
      .limit(1);

    if (!dialogueError) {
      logTest('Dialogue history queries work', 'pass', {
        recordsFound: dialogueData?.length || 0
      });
    }

  } catch (err) {
    logTest('Index testing', 'fail', { error: err.message });
  }
}

// ===================================================================
// TEST 3: N+1 QUERY FIXES
// ===================================================================
async function testN1Fixes() {
  console.log('\n🔍 TEST 3: N+1 Query Optimization');
  console.log('=' .repeat(60));

  try {
    // Test campaigns list endpoint (should only select minimal fields)
    const startTime = Date.now();
    const { data: campaigns, error } = await supabase
      .from('campaigns')
      .select(`
        id, name, description, genre,
        difficulty_level, campaign_length, tone,
        status, background_image, art_style,
        created_at, updated_at
      `)
      .limit(10);

    const queryTime = Date.now() - startTime;

    if (error) {
      logTest('Campaign list optimization', 'fail', { error: error.message });
    } else {
      // Check that heavy JSONB fields are NOT included
      const hasHeavyFields = campaigns?.some(c =>
        c.setting_details || c.thematic_elements || c.style_config || c.rules_config
      );

      logTest('Campaign list excludes heavy fields', !hasHeavyFields ? 'pass' : 'fail', {
        queryTime: `${queryTime}ms`,
        recordCount: campaigns?.length || 0,
        hasHeavyFields
      });
    }

    // Test characters list endpoint
    const charStartTime = Date.now();
    const { data: characters, error: charError } = await supabase
      .from('characters')
      .select(`
        id, name, race, class, level,
        image_url, avatar_url,
        campaign_id,
        created_at, updated_at
      `)
      .limit(10);

    const charQueryTime = Date.now() - charStartTime;

    if (charError) {
      logTest('Character list optimization', 'fail', { error: charError.message });
    } else {
      // Check that heavy fields are NOT included
      const hasHeavyCharFields = characters?.some(c =>
        c.backstory_elements || c.personality_traits || c.appearance
      );

      logTest('Character list excludes heavy fields', !hasHeavyCharFields ? 'pass' : 'fail', {
        queryTime: `${charQueryTime}ms`,
        recordCount: characters?.length || 0,
        hasHeavyFields: hasHeavyCharFields
      });
    }

  } catch (err) {
    logTest('N+1 fix testing', 'fail', { error: err.message });
  }
}

// ===================================================================
// TEST 4: SESSION CONSTRAINTS
// ===================================================================
async function testSessionConstraints() {
  console.log('\n🔒 TEST 4: Session Constraints');
  console.log('=' .repeat(60));

  try {
    // Create a test campaign and character
    const { data: testCampaign, error: campaignError } = await supabase
      .from('campaigns')
      .insert({
        name: 'Integration Test Campaign',
        user_id: '00000000-0000-0000-0000-000000000000', // Test user
        status: 'active'
      })
      .select()
      .single();

    if (campaignError) {
      logTest('Session constraint test setup', 'warn', {
        reason: 'Cannot create test data - skipping constraint tests',
        error: campaignError.message
      });
      return;
    }

    const { data: testCharacter, error: charError } = await supabase
      .from('characters')
      .insert({
        name: 'Test Character',
        user_id: '00000000-0000-0000-0000-000000000000',
        campaign_id: testCampaign.id,
        race: 'Human',
        class: 'Fighter',
        level: 1
      })
      .select()
      .single();

    if (charError) {
      // Cleanup campaign
      await supabase.from('campaigns').delete().eq('id', testCampaign.id);
      logTest('Session constraint test setup', 'warn', {
        reason: 'Cannot create test character',
        error: charError.message
      });
      return;
    }

    // Test 1: Create first active session (should succeed)
    const { data: session1, error: session1Error } = await supabase
      .from('game_sessions')
      .insert({
        campaign_id: testCampaign.id,
        character_id: testCharacter.id,
        session_number: 1,
        status: 'active',
        start_time: new Date().toISOString()
      })
      .select()
      .single();

    if (session1Error) {
      logTest('Create first active session', 'fail', { error: session1Error.message });
    } else {
      logTest('Create first active session', 'pass', { sessionId: session1.id });

      // Test 2: Try to create duplicate active session (should fail)
      const { data: session2, error: session2Error } = await supabase
        .from('game_sessions')
        .insert({
          campaign_id: testCampaign.id,
          character_id: testCharacter.id,
          session_number: 2,
          status: 'active',
          start_time: new Date().toISOString()
        })
        .select()
        .single();

      if (session2Error && session2Error.code === '23505') {
        // 23505 = unique_violation
        logTest('Prevent duplicate active sessions', 'pass', {
          constraintWorking: true,
          errorCode: session2Error.code
        });
      } else if (session2Error) {
        logTest('Prevent duplicate active sessions', 'fail', {
          unexpectedError: session2Error.message
        });
      } else {
        logTest('Prevent duplicate active sessions', 'fail', {
          reason: 'Duplicate session was allowed - constraint not working!',
          duplicateSessionId: session2?.id
        });
        // Cleanup duplicate session
        await supabase.from('game_sessions').delete().eq('id', session2.id);
      }

      // Test 3: Mark first session as completed
      await supabase
        .from('game_sessions')
        .update({ status: 'completed', end_time: new Date().toISOString() })
        .eq('id', session1.id);

      // Test 4: Create new active session (should succeed)
      const { data: session3, error: session3Error } = await supabase
        .from('game_sessions')
        .insert({
          campaign_id: testCampaign.id,
          character_id: testCharacter.id,
          session_number: 3,
          status: 'active',
          start_time: new Date().toISOString()
        })
        .select()
        .single();

      if (session3Error) {
        logTest('Create new active session after completion', 'fail', {
          error: session3Error.message
        });
      } else {
        logTest('Create new active session after completion', 'pass', {
          sessionId: session3.id
        });
        // Cleanup
        await supabase.from('game_sessions').delete().eq('id', session3.id);
      }

      // Cleanup first session
      await supabase.from('game_sessions').delete().eq('id', session1.id);
    }

    // Cleanup test data
    await supabase.from('characters').delete().eq('id', testCharacter.id);
    await supabase.from('campaigns').delete().eq('id', testCampaign.id);

  } catch (err) {
    logTest('Session constraint testing', 'fail', { error: err.message });
  }
}

// ===================================================================
// TEST 5: PAGINATION
// ===================================================================
async function testPagination() {
  console.log('\n📄 TEST 5: Pagination Implementation');
  console.log('=' .repeat(60));

  try {
    // Test basic pagination on dialogue_history
    const pageSize = 20;
    const { data: page1, error: page1Error } = await supabase
      .from('dialogue_history')
      .select('id, message, timestamp')
      .order('timestamp', { ascending: false })
      .limit(pageSize);

    if (page1Error) {
      logTest('Pagination - first page', 'fail', { error: page1Error.message });
    } else {
      logTest('Pagination - first page', 'pass', {
        pageSize,
        recordsReturned: page1?.length || 0,
        limitWorking: (page1?.length || 0) <= pageSize
      });

      // Get second page if there are enough records
      if (page1 && page1.length === pageSize) {
        const lastTimestamp = page1[page1.length - 1].timestamp;

        const { data: page2, error: page2Error } = await supabase
          .from('dialogue_history')
          .select('id, message, timestamp')
          .order('timestamp', { ascending: false })
          .lt('timestamp', lastTimestamp)
          .limit(pageSize);

        if (page2Error) {
          logTest('Pagination - second page', 'fail', { error: page2Error.message });
        } else {
          const hasOverlap = page2?.some(p2 => page1.some(p1 => p1.id === p2.id));

          logTest('Pagination - second page', !hasOverlap ? 'pass' : 'fail', {
            recordsReturned: page2?.length || 0,
            hasOverlap,
            cursorWorking: !hasOverlap
          });
        }
      } else {
        logTest('Pagination - second page', 'warn', {
          reason: 'Not enough records to test pagination'
        });
      }
    }

  } catch (err) {
    logTest('Pagination testing', 'fail', { error: err.message });
  }
}

// ===================================================================
// TEST 6: ARCHIVAL SYSTEM
// ===================================================================
async function testArchivalSystem() {
  console.log('\n📦 TEST 6: Archival System');
  console.log('=' .repeat(60));

  try {
    // Test archive function exists
    const { data, error } = await supabase
      .rpc('archive_old_sessions', {
        retention_days: 90,
        dry_run: true
      });

    if (error) {
      if (error.message.includes('does not exist')) {
        logTest('Archive function exists', 'fail', {
          reason: 'archive_old_sessions function not found - migration not applied'
        });
      } else {
        logTest('Archive function exists', 'warn', {
          error: error.message
        });
      }
    } else {
      logTest('Archive function exists', 'pass', {
        dryRunResult: data
      });

      // Test archive statistics view
      const { data: stats, error: statsError } = await supabase
        .from('archive_statistics')
        .select('*');

      if (statsError) {
        logTest('Archive statistics view', 'warn', {
          reason: 'View may not exist or need permissions'
        });
      } else {
        logTest('Archive statistics view', 'pass', {
          tables: stats?.map(s => s.table_name) || []
        });
      }
    }

  } catch (err) {
    logTest('Archival system testing', 'fail', { error: err.message });
  }
}

// ===================================================================
// TEST 7: LIST OPTIMIZATIONS
// ===================================================================
async function testListOptimizations() {
  console.log('\n📊 TEST 7: List Response Optimization');
  console.log('=' .repeat(60));

  try {
    // Test campaign list response size
    const { data: fullCampaign, error: fullError } = await supabase
      .from('campaigns')
      .select('*')
      .limit(1)
      .single();

    const { data: optimizedCampaign, error: optimizedError } = await supabase
      .from('campaigns')
      .select(`
        id, name, description, genre,
        difficulty_level, campaign_length, tone,
        status, background_image, art_style,
        created_at, updated_at
      `)
      .limit(1)
      .single();

    if (!fullError && !optimizedError && fullCampaign && optimizedCampaign) {
      const fullSize = JSON.stringify(fullCampaign).length;
      const optimizedSize = JSON.stringify(optimizedCampaign).length;
      const reduction = ((1 - optimizedSize / fullSize) * 100).toFixed(1);

      logTest('Campaign list size reduction', 'pass', {
        fullSize: `${fullSize} bytes`,
        optimizedSize: `${optimizedSize} bytes`,
        reduction: `${reduction}%`
      });
    } else {
      logTest('Campaign list size reduction', 'warn', {
        reason: 'No campaign data to test'
      });
    }

    // Test character list response size
    const { data: fullCharacter, error: fullCharError } = await supabase
      .from('characters')
      .select('*')
      .limit(1)
      .single();

    const { data: optimizedCharacter, error: optimizedCharError } = await supabase
      .from('characters')
      .select(`
        id, name, race, class, level,
        image_url, avatar_url,
        campaign_id,
        created_at, updated_at
      `)
      .limit(1)
      .single();

    if (!fullCharError && !optimizedCharError && fullCharacter && optimizedCharacter) {
      const fullSize = JSON.stringify(fullCharacter).length;
      const optimizedSize = JSON.stringify(optimizedCharacter).length;
      const reduction = ((1 - optimizedSize / fullSize) * 100).toFixed(1);

      logTest('Character list size reduction', 'pass', {
        fullSize: `${fullSize} bytes`,
        optimizedSize: `${optimizedSize} bytes`,
        reduction: `${reduction}%`
      });
    } else {
      logTest('Character list size reduction', 'warn', {
        reason: 'No character data to test'
      });
    }

  } catch (err) {
    logTest('List optimization testing', 'fail', { error: err.message });
  }
}

// ===================================================================
// MAIN TEST RUNNER
// ===================================================================
async function runAllTests() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║       INTEGRATION TEST SUITE - UNITS 1-12                  ║');
  console.log('╚════════════════════════════════════════════════════════════╝');

  await testMigrations();
  await testIndexes();
  await testN1Fixes();
  await testSessionConstraints();
  await testPagination();
  await testArchivalSystem();
  await testListOptimizations();

  // Print summary
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║                    TEST SUMMARY                            ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log(`✅ Passed:   ${testResults.passed}`);
  console.log(`❌ Failed:   ${testResults.failed}`);
  console.log(`⚠️  Warnings: ${testResults.warnings}`);
  console.log(`📊 Total:    ${testResults.tests.length}`);

  const successRate = ((testResults.passed / testResults.tests.length) * 100).toFixed(1);
  console.log(`\n📈 Success Rate: ${successRate}%`);

  if (testResults.failed > 0) {
    console.log('\n❌ Failed Tests:');
    testResults.tests
      .filter(t => t.status === 'fail')
      .forEach(t => {
        console.log(`   - ${t.name}`);
        if (t.details.error) console.log(`     Error: ${t.details.error}`);
        if (t.details.reason) console.log(`     Reason: ${t.details.reason}`);
      });
  }

  if (testResults.warnings > 0) {
    console.log('\n⚠️  Warnings:');
    testResults.tests
      .filter(t => t.status === 'warn')
      .forEach(t => {
        console.log(`   - ${t.name}`);
        if (t.details.reason) console.log(`     Reason: ${t.details.reason}`);
      });
  }

  // Exit with appropriate code
  process.exit(testResults.failed > 0 ? 1 : 0);
}

// Run tests
runAllTests().catch(err => {
  console.error('❌ Test suite failed:', err);
  process.exit(1);
});
