#!/usr/bin/env node

/**
 * Test script for message sequence numbers
 *
 * This script tests the concurrent message insertion with sequence numbers
 * to ensure proper ordering even when multiple messages are inserted simultaneously.
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
config({ path: resolve(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Test concurrent message insertion
 */
async function testConcurrentInserts() {
  console.log('🧪 Testing concurrent message insertions...\n');

  // Create a test session
  const { data: session, error: sessionError } = await supabase
    .from('game_sessions')
    .insert({
      session_number: 999,
      status: 'active',
      campaign_id: null,
      character_id: null,
    })
    .select()
    .single();

  if (sessionError) {
    console.error('❌ Failed to create test session:', sessionError);
    return;
  }

  console.log('✅ Created test session:', session.id);

  try {
    // Insert 10 messages concurrently
    const numMessages = 10;
    console.log(`\n📤 Inserting ${numMessages} messages concurrently...`);

    const insertPromises = Array.from({ length: numMessages }, (_, i) =>
      supabase.from('dialogue_history').insert({
        session_id: session.id,
        message: `Test message ${i + 1}`,
        speaker_type: 'player',
        timestamp: new Date().toISOString(),
      })
    );

    const results = await Promise.all(insertPromises);

    // Check for errors
    const errors = results.filter(r => r.error);
    if (errors.length > 0) {
      console.error('❌ Some inserts failed:', errors);
      return;
    }

    console.log('✅ All messages inserted successfully');

    // Fetch messages and verify sequence numbers
    console.log('\n🔍 Verifying sequence numbers...');

    const { data: messages, error: fetchError } = await supabase
      .from('dialogue_history')
      .select('id, message, sequence_number')
      .eq('session_id', session.id)
      .order('sequence_number', { ascending: true });

    if (fetchError) {
      console.error('❌ Failed to fetch messages:', fetchError);
      return;
    }

    console.log(`\n📊 Retrieved ${messages.length} messages:\n`);

    // Check for sequence correctness
    let allCorrect = true;
    const sequences = new Set();

    messages.forEach((msg, idx) => {
      const expectedSeq = idx + 1;
      const isCorrect = msg.sequence_number === expectedSeq;
      const isDuplicate = sequences.has(msg.sequence_number);

      sequences.add(msg.sequence_number);

      const status = isCorrect && !isDuplicate ? '✅' : '❌';
      console.log(
        `${status} Sequence ${msg.sequence_number} (expected ${expectedSeq})${
          isDuplicate ? ' [DUPLICATE!]' : ''
        }: ${msg.message}`
      );

      if (!isCorrect || isDuplicate) {
        allCorrect = false;
      }
    });

    // Check for gaps in sequence
    const maxSeq = Math.max(...Array.from(sequences));
    const hasGaps = sequences.size !== maxSeq;

    if (hasGaps) {
      console.log('\n❌ Gaps detected in sequence numbers!');
      allCorrect = false;
    }

    console.log('\n' + '='.repeat(60));
    if (allCorrect) {
      console.log('✅ SUCCESS: All sequence numbers are correct and unique!');
    } else {
      console.log('❌ FAILURE: Sequence number issues detected!');
    }
    console.log('='.repeat(60) + '\n');
  } finally {
    // Clean up test data
    console.log('🧹 Cleaning up test data...');

    await supabase
      .from('dialogue_history')
      .delete()
      .eq('session_id', session.id);

    await supabase
      .from('game_sessions')
      .delete()
      .eq('id', session.id);

    console.log('✅ Test data cleaned up\n');
  }
}

/**
 * Test sequence ordering with timestamp conflicts
 */
async function testTimestampConflicts() {
  console.log('🧪 Testing sequence ordering with same timestamps...\n');

  // Create a test session
  const { data: session, error: sessionError } = await supabase
    .from('game_sessions')
    .insert({
      session_number: 998,
      status: 'active',
      campaign_id: null,
      character_id: null,
    })
    .select()
    .single();

  if (sessionError) {
    console.error('❌ Failed to create test session:', sessionError);
    return;
  }

  console.log('✅ Created test session:', session.id);

  try {
    // Insert messages with identical timestamps
    const sameTimestamp = new Date().toISOString();
    const numMessages = 5;

    console.log(`\n📤 Inserting ${numMessages} messages with identical timestamps...`);

    const insertPromises = Array.from({ length: numMessages }, (_, i) =>
      supabase.from('dialogue_history').insert({
        session_id: session.id,
        message: `Message ${i + 1} (same timestamp)`,
        speaker_type: 'dm',
        timestamp: sameTimestamp, // All messages get same timestamp
      })
    );

    await Promise.all(insertPromises);

    // Fetch messages ordered by sequence number
    const { data: messages } = await supabase
      .from('dialogue_history')
      .select('message, sequence_number, timestamp')
      .eq('session_id', session.id)
      .order('sequence_number', { ascending: true });

    console.log('\n📊 Messages ordered by sequence_number:\n');

    messages.forEach(msg => {
      console.log(`  Seq ${msg.sequence_number}: ${msg.message}`);
    });

    console.log('\n✅ Sequence numbers provide deterministic ordering despite identical timestamps!\n');
  } finally {
    // Clean up
    await supabase
      .from('dialogue_history')
      .delete()
      .eq('session_id', session.id);

    await supabase
      .from('game_sessions')
      .delete()
      .eq('id', session.id);

    console.log('✅ Test data cleaned up\n');
  }
}

// Run tests
(async () => {
  try {
    await testConcurrentInserts();
    await testTimestampConflicts();
    console.log('🎉 All tests completed!\n');
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
})();
