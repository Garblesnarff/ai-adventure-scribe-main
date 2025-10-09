// Demonstrate the AI DM Engine functionality
import { SceneOrchestrator, createNewScene } from './scene/orchestrator';
import { applyPlayerIntent } from './scene/orchestrator';
import { genServerSeed, hashServerSeed, hmacRoll } from './rng/commitment';
import { applyDMAction } from './scene/reducer';
import { recordRoll, getRolls } from './rng/logging';
import { explainDC, explainRoll } from './rules/explain';
import { SceneState, PlayerIntent, DMAction } from './scene/types';

// Demo function showing engine workflow
export function demonstrateEngineWorkflow() {
  console.log('🎭 AI DM Engine Demonstration');
  console.log('============================');
  
  // 1. Create a new scene
  console.log('\n1. Creating new battle scene...');
  const battleScene = createNewScene('combat-arena-123', ['hero-1', 'monster-1'],征服战斗场景-456');
  console.log('Scene created:', {
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
  console.log('\n2. Testing provably fair RNG...');
  const serverSeed = genServerSeed();
  const clientSeed = 'player-session-789';
  
  const roll1 = hmacRoll(serverSeed, clientSeed, 1, 20);
  const roll2 = hmacRoll(serverSeed, clientSeed, 2, 20);
  
  console.log('Server seed (commitment):', hashServerSeed(serverSeed));
  console.log('Roll 1:', roll1);
  console.log('Roll 2:', roll2);
  console.log('Verification:', verifyRoll(serverSeed, clientSeed, 1, 20, roll1.value, roll1.proof));
  console.log('Roll 2 Verification:', verifyRoll(serverSeed, clientSeed, 2, 20, roll2.value, roll2.proof));

  // 4. Apply some game actions
  console.log('\n3. Applying player actions...');
  
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
  console.log('Move action logged:', moveResult.log.action.type === 'move' ? true : false);
  
  // Second intent - attack
  const attackIntent: PlayerIntent = {
    type: 'attack', 
    targetId: 'monster-1',
    actorId: 'hero-1',
    idempotencyIntent: 'attack-001'
  };
  
  const attackResult = orchestrator.applyPlayerIntent(state, attackIntent);
  state = attackResult.state;
  console.log('Attack action logged:', attackResult.log.action.type === 'attack' ? true : false);
  
  // 5. Apply DM action
  const damageAction: DMAction = {
    type: 'apply_damage',
    targetId: 'monster-1',
    amount: 8,
    source: 'longsword'
  };
  
  const damageResult = orchestrator.applyDMAction(state, damageAction);
  state = damageResult.state;
  console.log('Damage action logged:', damageResult.log.action.type === 'apply_damage' ? true : false);
  
  // 6. Show the final state
  console.log('\n4. Final scene state:');
  console.log('- Scene ID:', state.id);
  console.log('- Participants:', state.participants);
  console.log('- Clocks:', state.clocks.length);
  console.log('- Metadata:', state.metadata);
  console.log('- Paused:', state.paused);
  
  // 7. Roll transcript
  console.log('\n5. Roll transcript:');
  const rolls = getRolls(state.id);
  console.log('Total rolls:', rolls.length);
  rolls.forEach((roll, i) => {
    console.log(` ${i+1}. ${roll.actorId} ${roll.kind}: ${roll.value}/${roll.d}${roll.mod >= 0 ? '+' : ''}${roll.mod} = ${roll.total}`);
  });
  
  // 8. Rules explanation
  console.log('\n6. Rules explanations:');
  console.log('DC for perception (RAW):', explainDC('perception', 15, { mode: 'RAW', ruleRef: getRuleReference('perception') }));
  console.log('Roll explanation:', explainRoll('hero-1', 'check', 16, 15, { mode: 'RAI', note: 'checking for hidden clues' }));
  
  console.log('\n✅ Engine workflow demonstration complete!');
  
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
  console.log('\n🧪 Testing Engine Integration...');
  
  const demo = demonstrateEngineWorkflow();
  
  // Verify state changes
  const initialHash = JSON.stringify(demo.initialState.metadata || {});
  const finalHash = JSON.stringify(demo.finalState.metadata || {});
  
  console.log('State changed:', initialHash !== finalHash ? 'YES' : 'NO');
  console.log('Event log entries:', getRolls(demo.finalState.id).length);
  
  // Test idempotency
  console.log('\n🔄 Testing idempotency...');
  const duplicateIntents = demo.orchestrator.applyPlayerIntent(
    demo.finalState, 
    { type: 'move', actorId: 'hero-1', to: { x: 6, y: 4 }, idempotencyKey: 'move-001' }
  );
  
  console.log('Duplicate intent action type:', duplicateIntents.log.action.type);
  console.log('Duplicate ignored:', duplicateIntents.log.action.type === 'narrate');
  
  return demo;
}

// If run directly, demonstrate the engine
if (require.main === module) {
  testEngineIntegration();
}
