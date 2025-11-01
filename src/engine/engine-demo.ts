// Demonstrate the AI DM Engine functionality
import { SceneOrchestrator, createNewScene } from './scene/orchestrator';
import { applyPlayerIntent } from './scene/orchestrator';
import { genServerSeed, hashServerSeed, hmacRoll } from './rng/commitment';
import { applyDMAction } from './scene/reducer';
import { recordRoll, getRolls } from './rng/logging';
import { explainDC, explainRoll } from './rules/explain';
import { SceneState, PlayerIntent, DMAction } from './scene/types';
import { logger } from '../lib/logger';

// Demo function showing engine workflow
export function demonstrateEngineWorkflow() {
  logger.info('🎭 AI DM Engine Demonstration');
  logger.info('============================');
  
  // 1. Create a new scene
  logger.info('\n1. Creating new battle scene...');
  const battleScene = createNewScene('combat-arena-123', ['hero-1', 'monster-1'], 'battle-scene-456');
  logger.info('Scene created:', {
    id: battleScene.id,
    location: battleScene.locationId,
    participants: battleScene.participants,
    seed: battleScene.seed,
    paused: battleScene.paused
  });

  // 2. Create orchestrator
  const orchestrator = new SceneOrchestrator({
    enableIdempotency: true,
    enableLogging: true
  });

  // 3. Demonstrate provably fair RNG
  logger.info('\n2. Testing provably fair RNG...');
  const serverSeed = genServerSeed();
  const clientSeed = 'player-session-789';
  
  const roll1 = hmacRoll(serverSeed, clientSeed, 1, 20);
  const roll2 = hmacRoll(serverSeed, clientSeed, 2, 20);
  
  logger.info('Server seed (commitment):', hashServerSeed(serverSeed));
  logger.info('Roll 1:', roll1);
  logger.info('Roll 2:', roll2);
  logger.info('Verification:', verifyRoll(serverSeed, clientSeed, 1, 20, roll1.value, roll1.proof));
  logger.info('Roll 2 Verification:', verifyRoll(serverSeed, clientSeed, 2, 20, roll2.value, roll2.proof));

  // 4. Apply some game actions
  logger.info('\n3. Applying player actions...');
  
  // First intent - move
  const moveIntent: PlayerIntent = {
    type: 'move',
    actorId: 'hero-1',
    to: { x: 5, y: 3 },
    idempotencyKey: 'move-001'
  };
  
  let state = battleScene;
  let moveResult = orchestrator.applyPlayerIntent(state, moveIntent);
  state = moveResult.state;
  logger.info('Move action logged:', moveResult.log.action.type === 'move' ? true : false);
  
  // Second intent - attack
  const attackIntent: PlayerIntent = {
    type: 'attack', 
    targetId: 'monster-1',
    actorId: 'hero-1',
    idempotencyIntent: 'attack-001'
  };
  
  const attackResult = orchestrator.applyPlayerIntent(state, attackIntent);
  state = attackResult.state;
  logger.info('Attack action logged:', attackResult.log.action.type === 'attack' ? true : false);
  
  // 5. Apply DM action
  const damageAction: DMAction = {
    type: 'apply_damage',
    targetId: 'monster-1',
    amount: 8,
    source: 'longsword'
  };
  
  const damageResult = orchestrator.applyDMAction(state, damageAction);
  state = damageResult.state;
  logger.info('Damage action logged:', damageResult.log.action.type === 'apply_damage' ? true : false);
  
  // 6. Show the final state
  logger.info('\n4. Final scene state:');
  logger.info('- Scene ID:', state.id);
  logger.info('- Participants:', state.participants);
  logger.info('- Clocks:', state.clocks.length);
  logger.info('- Metadata:', state.metadata);
  logger.info('- Paused:', state.paused);
  
  // 7. Roll transcript
  logger.info('\n5. Roll transcript:');
  const rolls = getRolls(state.id);
  logger.info('Total rolls:', rolls.length);
  rolls.forEach((roll, i) => {
    logger.info(` ${i+1}. ${roll.actorId} ${roll.kind}: ${roll.value}/${roll.d}${roll.mod >= 0 ? '+' : ''}${roll.mod} = ${roll.total}`);
  });
  
  // 8. Rules explanation
  logger.info('\n6. Rules explanations:');
  logger.info('DC for perception (RAW):', explainDC('perception', 15, { mode: 'RAW', ruleRef: getRuleReference('perception') }));
  logger.info('Roll explanation:', explainRoll('hero-1', 'check', 16, 15, { mode: 'RAI', note: 'checking for hidden clues' }));
  
  logger.info('\n✅ Engine workflow demonstration complete!');
  
  return {
    initialState: battleScene,
    finalState: state,
    rolls,
    orchestrator,
    commitment: { serverSeed, hash: hashServerSeed(serverSeed) }
  };
}

// Simple integration test
export function testEngineIntegration() {
  logger.info('\n🧪 Testing Engine Integration...');
  
  const demo = demonstrateEngineWorkflow();
  
  // Verify state changes
  const initialHash = JSON.stringify(demo.initialState.metadata || {});
  const finalHash = JSON.stringify(demo.finalState.metadata || {});
  
  logger.info('State changed:', initialHash !== finalHash ? 'YES' : 'NO');
  logger.info('Event log entries:', getRolls(demo.finalState.id).length);
  
  // Test idempotency
  logger.info('\n🔄 Testing idempotency...');
  const duplicateIntents = demo.orchestrator.applyPlayerIntent(
    demo.finalState, 
    { type: 'move', actorId: 'hero-1', to: { x: 6, y: 4 }, idempotencyKey: 'move-001' }
  );
  
  logger.info('Duplicate intent action type:', duplicateIntents.log.action.type);
  logger.info('Duplicate ignored:', duplicateIntents.log.action.type === 'narrate');
  
  return demo;
}

// If run directly, demonstrate the engine
if (require.main === module) {
  testEngineIntegration();
}
