/**
 * Basic LangGraph Usage Examples
 *
 * Demonstrates how to use the DM agent graph for common scenarios.
 * These examples show the complete workflow from player input to DM response.
 *
 * @module agents/langgraph/examples/basic-usage
 */

import { invokeDMGraph, streamDMGraph } from '../dm-graph';
import type { WorldInfo } from '../state';

/**
 * Example 1: Simple attack action
 *
 * Demonstrates the full workflow:
 * 1. Intent detection (attack)
 * 2. Rules validation (valid attack)
 * 3. Dice roll request (human-in-the-loop)
 * 4. Response generation (narrative)
 */
export async function exampleAttackAction() {
  const worldContext: WorldInfo = {
    campaignId: 'campaign-123',
    sessionId: 'session-456',
    characterIds: ['char-789'],
    location: 'Goblin Cave',
    threatLevel: 'medium',
    activeNPCs: ['Goblin Warrior'],
  };

  const result = await invokeDMGraph(
    'I attack the goblin with my longsword',
    worldContext,
    'session-456',
  );

  console.log('Player Intent:', result.playerIntent);
  console.log('Rules Valid:', result.rulesValidation?.isValid);
  console.log('Dice Roll Required:', result.requiresDiceRoll);
  console.log('DM Response:', result.response?.description);

  return result;
}

/**
 * Example 2: Social interaction
 *
 * Shows how the graph handles non-combat scenarios.
 * May or may not require dice rolls depending on difficulty.
 */
export async function exampleSocialInteraction() {
  const worldContext: WorldInfo = {
    campaignId: 'campaign-123',
    sessionId: 'session-457',
    characterIds: ['char-789'],
    location: 'Town Square',
    threatLevel: 'none',
    activeNPCs: ['Guard Captain'],
  };

  const result = await invokeDMGraph(
    'I try to persuade the guard to let me pass',
    worldContext,
    'session-457',
  );

  console.log('Player Intent:', result.playerIntent); // Should be 'social'
  console.log('Dice Roll Required:', result.requiresDiceRoll); // Might need Persuasion check
  console.log('DM Response:', result.response?.description);

  return result;
}

/**
 * Example 3: Exploration without dice rolls
 *
 * Simple actions that don't require rules validation.
 * Graph should skip dice roll and go straight to response.
 */
export async function exampleSimpleExploration() {
  const worldContext: WorldInfo = {
    campaignId: 'campaign-123',
    sessionId: 'session-458',
    characterIds: ['char-789'],
    location: 'Forest Path',
    threatLevel: 'low',
  };

  const result = await invokeDMGraph('I walk down the forest path', worldContext, 'session-458');

  console.log('Player Intent:', result.playerIntent); // Should be 'movement'
  console.log('Dice Roll Required:', result.requiresDiceRoll); // Should be null
  console.log('DM Response:', result.response?.description);

  return result;
}

/**
 * Example 4: Streaming execution
 *
 * Watch the graph execute in real-time.
 * Useful for showing progress to users.
 */
export async function exampleStreamingExecution() {
  const worldContext: WorldInfo = {
    campaignId: 'campaign-123',
    sessionId: 'session-459',
    characterIds: ['char-789'],
    location: 'Dungeon',
  };

  console.log('Starting streaming execution...');

  for await (const chunk of streamDMGraph(
    'I search the chest for treasure',
    worldContext,
    'session-459',
  )) {
    console.log('State update:', chunk);
  }

  console.log('Streaming complete!');
}

/**
 * Example 5: Error handling
 *
 * Shows how the graph handles invalid inputs or errors.
 */
export async function exampleErrorHandling() {
  const worldContext: WorldInfo = {
    campaignId: 'campaign-123',
    sessionId: 'session-460',
    characterIds: ['char-789'],
  };

  const result = await invokeDMGraph(
    '', // Empty input
    worldContext,
    'session-460',
  );

  console.log('Error:', result.error);
  console.log('Response:', result.response?.description);

  return result;
}

/**
 * Example 6: Using memories for context
 *
 * Shows how previous actions influence responses.
 */
export async function exampleWithMemories() {
  const worldContext: WorldInfo = {
    campaignId: 'campaign-123',
    sessionId: 'session-461',
    characterIds: ['char-789'],
    location: 'Abandoned Manor',
    recentMemories: [
      {
        content: 'Found a mysterious key in the first room',
        type: 'discovery',
        timestamp: new Date(Date.now() - 300000), // 5 minutes ago
      },
      {
        content: 'Heard strange noises from upstairs',
        type: 'observation',
        timestamp: new Date(Date.now() - 60000), // 1 minute ago
      },
    ],
  };

  const result = await invokeDMGraph(
    'I use the key I found to unlock the door',
    worldContext,
    'session-461',
  );

  console.log('DM Response:', result.response?.description);
  // Response should reference the previously found key

  return result;
}

/**
 * Run all examples
 */
export async function runAllExamples() {
  console.log('\n=== Example 1: Attack Action ===');
  await exampleAttackAction();

  console.log('\n=== Example 2: Social Interaction ===');
  await exampleSocialInteraction();

  console.log('\n=== Example 3: Simple Exploration ===');
  await exampleSimpleExploration();

  console.log('\n=== Example 4: Streaming Execution ===');
  await exampleStreamingExecution();

  console.log('\n=== Example 5: Error Handling ===');
  await exampleErrorHandling();

  console.log('\n=== Example 6: With Memories ===');
  await exampleWithMemories();
}

// Uncomment to run examples:
// runAllExamples().catch(console.error);
