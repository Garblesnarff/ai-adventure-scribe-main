#!/usr/bin/env tsx

/**
 * Debug Memory Creation
 * Simple test to understand the foreign key constraint issue
 */

import { MemoryManager } from './src/services/memory-manager';
import { supabase } from './src/integrations/supabase/client';
import { randomUUID } from 'crypto';

async function debugMemoryCreation() {
  console.log('🔍 Debug Memory Creation Test');
  console.log('=============================\n');

  try {
    // Step 1: Create test data
    console.log('1. Creating test campaign...');
    const testCampaignId = randomUUID();

    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .insert({
        id: testCampaignId,
        name: 'Debug Test Campaign',
        description: 'Test campaign for debug'
      })
      .select()
      .single();

    if (campaignError) {
      throw new Error(`Campaign creation failed: ${campaignError.message}`);
    }
    console.log('✅ Campaign created:', campaign.id);

    // Step 2: Create test character
    console.log('2. Creating test character...');
    const testCharacterId = randomUUID();

    const { data: character, error: characterError } = await supabase
      .from('characters')
      .insert({
        id: testCharacterId,
        name: 'Debug Test Character',
        class: 'Fighter',
        race: 'Human',
        level: 1
      })
      .select()
      .single();

    if (characterError) {
      throw new Error(`Character creation failed: ${characterError.message}`);
    }
    console.log('✅ Character created:', character.id);

    // Step 3: Create test session
    console.log('3. Creating test session...');
    const testSessionId = randomUUID();

    const { data: session, error: sessionError } = await supabase
      .from('game_sessions')
      .insert({
        id: testSessionId,
        campaign_id: testCampaignId,
        character_id: testCharacterId,
        session_number: 1,
        start_time: new Date().toISOString()
      })
      .select()
      .single();

    if (sessionError) {
      throw new Error(`Session creation failed: ${sessionError.message}`);
    }
    console.log('✅ Session created:', session.id);

    // Step 4: Verify session exists
    console.log('4. Verifying session exists...');
    const { data: verifySession, error: verifyError } = await supabase
      .from('game_sessions')
      .select('*')
      .eq('id', testSessionId)
      .single();

    if (verifyError || !verifySession) {
      throw new Error(`Session verification failed: ${verifyError?.message}`);
    }
    console.log('✅ Session verified:', verifySession.id);

    // Step 5: Test memory creation
    console.log('5. Testing memory creation...');
    const testMemory = {
      session_id: testSessionId,
      type: 'general' as const,
      category: 'test',
      content: 'This is a test memory to verify creation works',
      importance: 3,
      emotional_tone: 'neutral'
    };

    console.log('Memory data:', testMemory);

    await MemoryManager.saveMemories([testMemory]);
    console.log('✅ Memory created successfully');

    // Step 6: Verify memory exists
    console.log('6. Verifying memory exists...');
    const { data: memories, error: memoryError } = await supabase
      .from('memories')
      .select('*')
      .eq('session_id', testSessionId);

    if (memoryError) {
      throw new Error(`Memory verification failed: ${memoryError.message}`);
    }

    console.log(`✅ Found ${memories.length} memories:`);
    memories.forEach((memory, index) => {
      console.log(`   ${index + 1}. Type: ${memory.type}, Content: ${memory.content.substring(0, 50)}...`);
    });

    // Test multiple memory types
    console.log('\n7. Testing multiple memory types...');
    const multipleMemories = [
      { session_id: testSessionId, type: 'npc', content: 'Test NPC memory', importance: 3 },
      { session_id: testSessionId, type: 'location', content: 'Test Location memory', importance: 3 },
      { session_id: testSessionId, type: 'dialogue_gem', content: 'Test Dialogue memory', importance: 3 }
    ];

    await MemoryManager.saveMemories(multipleMemories);
    console.log('✅ Multiple memory types created successfully');

    // Final verification
    const { data: allMemories } = await supabase
      .from('memories')
      .select('type')
      .eq('session_id', testSessionId);

    const memoryTypes = allMemories?.map(m => m.type) || [];
    console.log(`✅ Total memories created: ${memoryTypes.length}`);
    console.log(`   Types: ${memoryTypes.join(', ')}`);

    // Cleanup
    console.log('\n8. Cleaning up test data...');
    await supabase.from('memories').delete().eq('session_id', testSessionId);
    await supabase.from('game_sessions').delete().eq('id', testSessionId);
    await supabase.from('characters').delete().eq('id', testCharacterId);
    await supabase.from('campaigns').delete().eq('id', testCampaignId);
    console.log('✅ Cleanup complete');

    console.log('\n🎉 All tests passed! Memory creation is working correctly.');

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    console.error('Error details:', error);
  }
}

// Execute if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  debugMemoryCreation()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Debug test failed:', error);
      process.exit(1);
    });
}

export { debugMemoryCreation };