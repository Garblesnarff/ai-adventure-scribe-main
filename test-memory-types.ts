#!/usr/bin/env tsx

/**
 * Comprehensive Memory Type Test Script
 *
 * This script validates that all 13 memory types can be successfully
 * created and stored in the database without constraint violations.
 */

import { randomUUID } from 'crypto';

import { supabase } from './src/integrations/supabase/client';
import { MemoryManager } from './src/services/memory-manager';

import type { MemoryType, Memory } from './src/services/memory-manager';


// Test session ID for consistent testing - using proper UUID format
const TEST_SESSION_ID = randomUUID();

// All 13 memory types to test
const MEMORY_TYPES: MemoryType[] = [
  'general',
  'npc',
  'location',
  'quest',
  'item',
  'event',
  'story_beat',
  'character_moment',
  'world_detail',
  'dialogue_gem',
  'atmosphere',
  'plot_point',
  'foreshadowing'
];

// Test data for each memory type
const TEST_MEMORIES: Record<MemoryType, Omit<Memory, 'id' | 'created_at' | 'updated_at'>> = {
  general: {
    session_id: TEST_SESSION_ID,
    type: 'general',
    category: 'session_notes',
    content: 'The party began their adventure in the bustling port town of Saltmarsh.',
    importance: 3,
    emotional_tone: 'neutral'
  },

  npc: {
    session_id: TEST_SESSION_ID,
    type: 'npc',
    category: 'Captain Firebeard',
    content: 'Captain Firebeard is a gruff but fair harbormaster with a distinctive red beard and a parrot named Squawks.',
    importance: 4,
    emotional_tone: 'humorous',
    metadata: { npc_name: 'Captain Firebeard', location: 'Saltmarsh Harbor', attitude: 'friendly' }
  },

  location: {
    session_id: TEST_SESSION_ID,
    type: 'location',
    category: 'The Snuggly Duckling',
    content: 'A cozy tavern with low-hanging beams, warm firelight, and the smell of fresh bread and ale.',
    importance: 3,
    emotional_tone: 'peaceful',
    metadata: { location_type: 'tavern', ambiance: 'cozy', services: ['food', 'lodging', 'rumors'] }
  },

  quest: {
    session_id: TEST_SESSION_ID,
    type: 'quest',
    category: 'The Missing Merchant',
    content: 'Captain Firebeard asked the party to investigate the disappearance of merchant Aldwin Brightcoin.',
    importance: 5,
    emotional_tone: 'mysterious',
    metadata: { quest_giver: 'Captain Firebeard', objective: 'find_missing_person', reward: '200gp' }
  },

  item: {
    session_id: TEST_SESSION_ID,
    type: 'item',
    category: 'Brightcoin Family Signet',
    content: 'A silver signet ring bearing the Brightcoin merchant family crest, found at the docks.',
    importance: 4,
    emotional_tone: 'mysterious',
    metadata: { item_type: 'quest_item', rarity: 'uncommon', significance: 'clue' }
  },

  event: {
    session_id: TEST_SESSION_ID,
    type: 'event',
    category: 'Dock Fight',
    content: 'The party fought off three smugglers trying to prevent them from investigating the warehouse.',
    importance: 4,
    emotional_tone: 'intense',
    metadata: { combat: true, outcome: 'victory', location: 'warehouse_district' }
  },

  story_beat: {
    session_id: TEST_SESSION_ID,
    type: 'story_beat',
    category: 'First Clue',
    content: 'Discovery of the bloodstained signet ring marked the first real lead in the missing merchant case.',
    importance: 5,
    emotional_tone: 'foreboding',
    metadata: { narrative_importance: 'high', story_progression: 'mystery_deepens' }
  },

  character_moment: {
    session_id: TEST_SESSION_ID,
    type: 'character_moment',
    category: 'Kael\'s Compassion',
    content: 'Kael insisted on checking if the wounded smuggler needed medical attention despite the man attacking them.',
    importance: 3,
    emotional_tone: 'peaceful',
    metadata: { character: 'Kael', trait_revealed: 'compassion', moral_choice: 'mercy' }
  },

  world_detail: {
    session_id: TEST_SESSION_ID,
    type: 'world_detail',
    category: 'Saltmarsh Politics',
    content: 'The town council has been struggling with increased smuggling activity since the trade routes changed.',
    importance: 2,
    emotional_tone: 'neutral',
    metadata: { scope: 'local_politics', implications: 'ongoing_threat' }
  },

  dialogue_gem: {
    session_id: TEST_SESSION_ID,
    type: 'dialogue_gem',
    category: 'Captain Firebeard',
    content: 'Captain Firebeard: "Arr, that merchant was as jumpy as a cat in a thunderstorm the last time I saw him."',
    importance: 3,
    emotional_tone: 'humorous',
    metadata: { speaker: 'Captain Firebeard', quote_type: 'memorable_description', reveals: 'merchant_state_of_mind' }
  },

  atmosphere: {
    session_id: TEST_SESSION_ID,
    type: 'atmosphere',
    category: 'Foggy Docks',
    content: 'Thick fog rolled in from the sea, muffling sounds and creating an eerie atmosphere around the docks.',
    importance: 2,
    emotional_tone: 'mysterious',
    metadata: { mood: 'eerie', weather: 'foggy', time_of_day: 'evening' }
  },

  plot_point: {
    session_id: TEST_SESSION_ID,
    type: 'plot_point',
    category: 'Smuggling Connection',
    content: 'The party discovered that Aldwin Brightcoin may have stumbled upon a major smuggling operation.',
    importance: 5,
    emotional_tone: 'foreboding',
    metadata: { revelation: 'major_plot_thread', consequences: 'puts_party_in_danger' }
  },

  foreshadowing: {
    session_id: TEST_SESSION_ID,
    type: 'foreshadowing',
    category: 'Strange Ships',
    content: 'Several townsfolk mentioned seeing ships with black sails anchored far offshore during recent nights.',
    importance: 4,
    emotional_tone: 'foreboding',
    metadata: { hints_at: 'larger_threat', subtlety: 'moderate', future_relevance: 'high' }
  }
};

/**
 * Setup test session in database
 */
async function setupTestSession(): Promise<void> {
  console.log('🔧 Setting up test session...');

  try {
    // Create a test campaign first
    const testCampaignId = randomUUID();
    await supabase
      .from('campaigns')
      .insert({
        id: testCampaignId,
        name: 'Memory Test Campaign',
        description: 'Test campaign for memory validation'
      });

    // Create a test character (no campaign_id field in characters table)
    const testCharacterId = randomUUID();
    await supabase
      .from('characters')
      .insert({
        id: testCharacterId,
        name: 'Test Character',
        class: 'Fighter',
        race: 'Human',
        level: 1
      });

    // Create the test session
    await supabase
      .from('game_sessions')
      .insert({
        id: TEST_SESSION_ID,
        campaign_id: testCampaignId,
        character_id: testCharacterId,
        session_number: 1,
        start_time: new Date().toISOString()
      });

    console.log('✅ Test session setup complete');
  } catch (error) {
    console.log('⚠️ Test session already exists or setup failed:', error);
  }
}

/**
 * Clean up test data from previous runs
 */
async function cleanupTestData(): Promise<void> {
  console.log('🧹 Cleaning up test data...');

  try {
    // Clean memories first (foreign key dependency)
    await supabase
      .from('memories')
      .delete()
      .eq('session_id', TEST_SESSION_ID);

    // Get session details to clean related data
    const { data: session } = await supabase
      .from('game_sessions')
      .select('campaign_id, character_id')
      .eq('id', TEST_SESSION_ID)
      .single();

    if (session) {
      // Clean session
      await supabase
        .from('game_sessions')
        .delete()
        .eq('id', TEST_SESSION_ID);

      // Clean character
      await supabase
        .from('characters')
        .delete()
        .eq('id', session.character_id);

      // Clean campaign
      await supabase
        .from('campaigns')
        .delete()
        .eq('id', session.campaign_id);
    }

    console.log('✅ Test data cleaned up');
  } catch (error) {
    console.log('⚠️ Cleanup warning:', error);
  }
}

/**
 * Test individual memory type creation
 */
async function testIndividualMemoryCreation(): Promise<{ success: MemoryType[], failed: MemoryType[] }> {
  console.log('🔬 Testing individual memory creation for each type...');

  const success: MemoryType[] = [];
  const failed: MemoryType[] = [];

  for (const memoryType of MEMORY_TYPES) {
    try {
      console.log(`  Testing type: ${memoryType}`);

      const testMemory = TEST_MEMORIES[memoryType];
      await MemoryManager.saveMemories([testMemory]);

      // Verify it was saved
      const { data, error } = await supabase
        .from('memories')
        .select('*')
        .eq('session_id', TEST_SESSION_ID)
        .eq('type', memoryType)
        .single();

      if (error || !data) {
        throw new Error(`Memory not found after creation: ${error?.message}`);
      }

      console.log(`    ✅ ${memoryType}: SUCCESS`);
      success.push(memoryType);

    } catch (error) {
      console.error(`    ❌ ${memoryType}: FAILED -`, error);
      failed.push(memoryType);
    }
  }

  return { success, failed };
}

/**
 * Test batch memory creation with all types
 */
async function testBatchMemoryCreation(): Promise<boolean> {
  console.log('🗂️ Testing batch memory creation...');

  try {
    // Clear existing memories only (keep session intact)
    await supabase
      .from('memories')
      .delete()
      .eq('session_id', TEST_SESSION_ID);

    // Create array of all test memories
    const allMemories = MEMORY_TYPES.map(type => TEST_MEMORIES[type]);

    // Save all memories in one batch
    await MemoryManager.saveMemories(allMemories);

    // Verify all memories were saved
    const { data, error } = await supabase
      .from('memories')
      .select('type')
      .eq('session_id', TEST_SESSION_ID);

    if (error) {
      throw new Error(`Failed to retrieve saved memories: ${error.message}`);
    }

    const savedTypes = new Set(data.map(m => m.type));
    const missedTypes = MEMORY_TYPES.filter(type => !savedTypes.has(type));

    if (missedTypes.length > 0) {
      throw new Error(`Missing types after batch save: ${missedTypes.join(', ')}`);
    }

    console.log(`  ✅ Successfully saved all ${MEMORY_TYPES.length} memory types in batch`);
    return true;

  } catch (error) {
    console.error('  ❌ Batch creation failed:', error);
    return false;
  }
}

/**
 * Test memory retrieval for all types
 */
async function testMemoryRetrieval(): Promise<{ success: MemoryType[], failed: MemoryType[] }> {
  console.log('🔍 Testing memory retrieval for each type...');

  const success: MemoryType[] = [];
  const failed: MemoryType[] = [];

  for (const memoryType of MEMORY_TYPES) {
    try {
      const { data, error } = await supabase
        .from('memories')
        .select('*')
        .eq('session_id', TEST_SESSION_ID)
        .eq('type', memoryType);

      if (error) {
        throw new Error(`Query error: ${error.message}`);
      }

      if (!data || data.length === 0) {
        throw new Error('No memories found');
      }

      console.log(`    ✅ ${memoryType}: Found ${data.length} memory(ies)`);
      success.push(memoryType);

    } catch (error) {
      console.error(`    ❌ ${memoryType}: FAILED -`, error);
      failed.push(memoryType);
    }
  }

  return { success, failed };
}

/**
 * Test MemoryManager retrieval methods
 */
async function testMemoryManagerMethods(): Promise<boolean> {
  console.log('🛠️ Testing MemoryManager retrieval methods...');

  try {
    // Test getRelevantMemories
    const relevantMemories = await MemoryManager.getRelevantMemories(TEST_SESSION_ID, 'merchant');
    console.log(`  ✅ getRelevantMemories: Retrieved ${relevantMemories.length} memories`);

    // Test getFictionReadyMemories (using lower threshold since our test data has moderate narrative weights)
    const fictionMemories = await MemoryManager.getFictionReadyMemories(TEST_SESSION_ID, 1);
    console.log(`  ✅ getFictionReadyMemories: Retrieved ${fictionMemories.length} memories`);

    return true;
  } catch (error) {
    console.error('  ❌ MemoryManager methods failed:', error);
    return false;
  }
}

/**
 * Create a temporary session for constraint testing
 */
async function createTempTestSession(): Promise<string> {
  const tempSessionId = randomUUID();
  const tempCampaignId = randomUUID();
  const tempCharacterId = randomUUID();

  await supabase.from('campaigns').insert({
    id: tempCampaignId,
    name: 'Temp Test Campaign',
    description: 'Temporary campaign for constraint testing'
  });

  await supabase.from('characters').insert({
    id: tempCharacterId,
    name: 'Temp Test Character',
    class: 'Fighter',
    race: 'Human',
    level: 1
  });

  await supabase.from('game_sessions').insert({
    id: tempSessionId,
    campaign_id: tempCampaignId,
    character_id: tempCharacterId,
    session_number: 999,
    start_time: new Date().toISOString()
  });

  return tempSessionId;
}

/**
 * Validate that database constraints are working correctly
 */
async function testDatabaseConstraints(): Promise<boolean> {
  console.log('🔒 Testing database constraints...');
  let tempSessionId: string | null = null;

  try {
    tempSessionId = await createTempTestSession();

    // Test invalid memory type (should fail)
    console.log('  Testing invalid memory type constraint...');
    try {
      await MemoryManager.saveMemories([{
        session_id: tempSessionId,
        type: 'invalid_type' as MemoryType,
        content: 'This should fail',
        importance: 3
      }]);
      console.log('  ❌ Invalid type was accepted (constraint not working!)');
      return false;
    } catch (error) {
      console.log('  ✅ Invalid type correctly rejected');
    }

    // Test invalid importance (should be corrected by MemoryManager)
    console.log('  Testing importance bounds correction...');
    await MemoryManager.saveMemories([{
      session_id: tempSessionId,
      type: 'general',
      content: 'Testing importance bounds',
      importance: 10 // Should be clamped to 5
    }]);

    const { data } = await supabase
      .from('memories')
      .select('importance')
      .eq('session_id', tempSessionId)
      .eq('content', 'Testing importance bounds')
      .single();

    if (data?.importance === 5) {
      console.log('  ✅ Importance correctly clamped to max value (5)');
    } else {
      console.log(`  ❌ Importance not clamped correctly: ${data?.importance}`);
      return false;
    }

    return true;
  } catch (error) {
    console.error('  ❌ Constraint testing failed:', error);
    return false;
  } finally {
    // Clean up temp session
    if (tempSessionId) {
      try {
        const { data: session } = await supabase
          .from('game_sessions')
          .select('campaign_id, character_id')
          .eq('id', tempSessionId)
          .single();

        if (session) {
          await supabase.from('memories').delete().eq('session_id', tempSessionId);
          await supabase.from('game_sessions').delete().eq('id', tempSessionId);
          await supabase.from('characters').delete().eq('id', session.character_id);
          await supabase.from('campaigns').delete().eq('id', session.campaign_id);
        }
      } catch (cleanupError) {
        console.log('  ⚠️ Temp session cleanup warning:', cleanupError);
      }
    }
  }
}

/**
 * Generate test report
 */
function generateReport(results: {
  individualCreation: { success: MemoryType[], failed: MemoryType[] },
  batchCreation: boolean,
  retrieval: { success: MemoryType[], failed: MemoryType[] },
  managerMethods: boolean,
  constraints: boolean
}) {
  console.log('\n📊 TEST RESULTS SUMMARY');
  console.log('========================');

  console.log('\n🔬 Individual Memory Creation:');
  console.log(`  ✅ Success: ${results.individualCreation.success.length}/${MEMORY_TYPES.length}`);
  console.log(`  ❌ Failed: ${results.individualCreation.failed.length}`);
  if (results.individualCreation.failed.length > 0) {
    console.log(`     Failed types: ${results.individualCreation.failed.join(', ')}`);
  }

  console.log('\n🗂️ Batch Memory Creation:');
  console.log(`  ${results.batchCreation ? '✅' : '❌'} ${results.batchCreation ? 'SUCCESS' : 'FAILED'}`);

  console.log('\n🔍 Memory Retrieval:');
  console.log(`  ✅ Success: ${results.retrieval.success.length}/${MEMORY_TYPES.length}`);
  console.log(`  ❌ Failed: ${results.retrieval.failed.length}`);
  if (results.retrieval.failed.length > 0) {
    console.log(`     Failed types: ${results.retrieval.failed.join(', ')}`);
  }

  console.log('\n🛠️ MemoryManager Methods:');
  console.log(`  ${results.managerMethods ? '✅' : '❌'} ${results.managerMethods ? 'SUCCESS' : 'FAILED'}`);

  console.log('\n🔒 Database Constraints:');
  console.log(`  ${results.constraints ? '✅' : '❌'} ${results.constraints ? 'SUCCESS' : 'FAILED'}`);

  const overallSuccess = (
    results.individualCreation.failed.length === 0 &&
    results.batchCreation &&
    results.retrieval.failed.length === 0 &&
    results.managerMethods &&
    results.constraints
  );

  console.log('\n🎯 OVERALL RESULT:');
  console.log(`  ${overallSuccess ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);

  if (overallSuccess) {
    console.log('\n🎉 Memory system is working correctly!');
    console.log('   All 13 memory types can be successfully created and retrieved.');
  } else {
    console.log('\n⚠️ Memory system has issues that need attention.');
  }
}

/**
 * Main test execution
 */
async function runMemoryTypeTests(): Promise<void> {
  console.log('🚀 Starting Memory Type Validation Tests');
  console.log('==========================================\n');

  try {
    // Setup
    await cleanupTestData();
    await setupTestSession();

    // Run all tests
    const individualCreation = await testIndividualMemoryCreation();
    const retrieval1 = await testMemoryRetrieval(); // Test retrieval after individual creation
    const batchCreation = await testBatchMemoryCreation();
    const retrieval2 = await testMemoryRetrieval(); // Test retrieval after batch creation
    const managerMethods = await testMemoryManagerMethods();
    const constraints = await testDatabaseConstraints();

    // Use the second retrieval results (after batch creation)
    const retrieval = retrieval2;

    // Generate report
    generateReport({
      individualCreation,
      batchCreation,
      retrieval,
      managerMethods,
      constraints
    });

    // Cleanup
    console.log('\n🧹 Final cleanup...');
    await cleanupTestData();
    console.log('✅ Cleanup complete');

  } catch (error) {
    console.error('\n💥 Test execution failed:', error);
    process.exit(1);
  }
}

// Execute tests if this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runMemoryTypeTests()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Failed to run tests:', error);
      process.exit(1);
    });
}

export { runMemoryTypeTests };