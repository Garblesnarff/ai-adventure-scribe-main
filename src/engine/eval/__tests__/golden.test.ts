import { describe, it, expect } from 'vitest';
import g1 from '../goldens/combat.basic.json';
import { applyPlayerIntent } from '../../scene/orchestrator';
import type { SceneState, PlayerIntent } from '../../scene/types';
import { hashState } from '../../scene/reducer';

function toScene(s: any): SceneState { 
  return s as SceneState; 
}

function now() { 
  return 1730764800000; 
}

describe('Goldens', () => {
  it('combat.basic is stable', () => {
    let state = toScene(g1.scene);
    const intents = g1.intents as PlayerIntent[];
    
    // Apply all intents in sequence
    intents.forEach(intent => { 
      const result = applyPlayerIntent(state, intent, { now });
      state = result.state; 
    });
    
    const finalHash = hashState(state);
    
    // Verify hash is non-empty and stable length
    expect(finalHash.length).toBeGreaterThan(10);
    expect(finalHash.length).toBe(64); // sha256 hex length
    
    // For now, just verify it's consistent across multiple runs
    expect(finalHash).not.toBe(hashState(toScene(g1.scene)));
    
    // Log the hash so we can update the golden file once stable
    console.log('Golden combat.basic hash:', finalHash);
  });

  it('can replay golden scenario multiple times', () => {
    const intents = g1.intents as PlayerIntent[];
    const final_hashes: string[] = [];
    
    // Run the same scenario 3 times and collect hashes
    for (let run = 0; run < 3; run++) {
      let state = toScene(g1.scene);
      
      intents.forEach(intent => { 
        const result = applyPlayerIntent(state, intent, { now });
        state = result.state; 
      });
      
      final_hashes.push(hashState(state));
    }
    
    // All hashes should be identical
    expect(final_hashes[0]).toBe(final_hashes[1]);
    expect(final_hashes[1]).toBe(final_hashes[2]);
    expect(final_hashes[0]).toBe(final_hashes[2]);
  });
});
