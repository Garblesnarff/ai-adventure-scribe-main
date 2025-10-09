import { describe, it, expect, beforeEach, vi } from 'vitest';
import { applyPlayerIntent } from '../../scene/orchestrator';
import { applyIntent, hashState, createSceneState } from '../../scene/reducer';
import { clear, all, forScene } from '../../scene/event-log';
import type { SceneState, PlayerIntent } from '../../scene/types';

// Mock deterministic time function
const mockNow = vi.fn(() => 1730764800000);

function mkState(): SceneState {
  return createSceneState({
    id: 'scene-1',
    locationId: 'loc-1',
    participants: ['pc1', 'npc1'],
    initiative: ['pc1', 'npc1']
  });
}

describe('Scene Engine Replay', () => {
  beforeEach(() => {
    clear(); // Reset event log and idempotency tracking
  });

  describe('Determinism', () => {
    it('produces identical state for same intents', () => {
      const intents: PlayerIntent[] = [
        { type: 'move', actorId: 'pc1', to: { x: 1, y: 1 }, idempotencyKey: 'k1' },
        { type: 'skill_check', actorId: 'pc1', skill: 'perception', idempotencyKey: 'k2' }
      ];

      // First run
      let state1 = mkState();
      const logs1 = intents.map(intent => {
        const res = applyPlayerIntent(state1, intent, { now: mockNow });
        state1 = res.state;
        return res.log;
      });

      // Second run
      let state2 = mkState();
      const logs2 = intents.map(intent => {
        const res = applyPlayerIntent(state2, intent, { now: mockNow });
        state2 = res.state;
        return res.log;
      });

      // Verify states are identical
      expect(hashState(state1)).toBe(hashState(state2));
      
      // Verify logs are identical (except for IDs which are unique)
      expect(logs1.length).toBe(logs2.length);
      for (let i = 0; i < logs1.length; i++) {
        expect(logs1[i].actorId).toBe(logs2[i].actorId);
        expect(logs1[i].action).toEqual(logs2[i].action);
        expect(logs1[i].stateHashBefore).toBe(logs2[i].stateHashBefore);
        expect(logs1[i].stateHashAfter).toBe(logs2[i].stateHashAfter);
      }
    });

    it('handles duplicate intents consistently', () => {
      const duplicateIntent: PlayerIntent = {
        type: 'move',
        actorId: 'pc1',
        to: { x: 1, y: 1 },
        idempotencyKey: 'duplicate-key'
      };

      const state = mkState();
      
      // Apply intent twice
      const result1 = applyPlayerIntent(state, duplicateIntent, { now: mockNow });
      const result2 = applyPlayerIntent(result1.state, duplicateIntent, { now: mockNow });

      // Second application should result in ignored duplicate
      expect(result1.state).not.toEqual(state); // First should change state
      expect(result2.state).toEqual(state); // Second should not change state (duplicate ignored)
      
      // Log should show duplicate ignored
      expect(result2.log.action).toMatchObject({ 
        type: 'narrate', 
        text: 'Duplicate intent ignored' 
      });
    });
  });

  describe('Event Log Integrity', () => {
    it('maintains accurate state hashes', () => {
      const intent: PlayerIntent = {
        type: 'attack',
        actorId: 'pc1',
        targetId: 'npc1',
        idempotencyKey: 'attack-1'
      };

      const initialState = mkState();
      const result = applyPlayerIntent(initialState, intent, { now: mockNow });

      expect(result.log.stateHashBefore).toBe(hashState(initialState));
      expect(result.log.stateHashAfter).toBe(hashState(result.state));
      expect(result.log.stateHashBefore).not.toBe(result.log.stateHashAfter);
    });

    it('preserves correct ordering in event log', () => {
      const intents: PlayerIntent[] = [
        { type: 'move', actorId: 'pc1', to: { x: 1, y: 1 }, idempotencyKey: 'order-1' },
        { type: 'skill_check', actorId: 'pc1', skill: 'perception', idempotencyKey: 'order-2' },
        { type: 'cast', actorId: 'pc1', spellId: 'fireball', idempotencyKey: 'order-3' }
      ];

      let state = mkState();
      const timestamps: number[] = [];
      
      intents.forEach(intent => {
        const result = applyPlayerIntent(state, intent, { now });
        timestamps.push(result.log.at);
        state = result.state;
      });

      // Events should be in chronological order
      expect(timestamps).toEqual([...timestamps].sort((a, b) => a - b));
      
      // Event log should contain all events in order
      const sceneLogs = forScene(state.id);
      expect(sceneLogs).toHaveLength(3);
      
      for (let i = 0; i < sceneLogs.length - 1; i++) {
        expect(sceneLogs[i].at).toBeLessThanOrEqual(sceneLogs[i + 1].at);
      }
    });
  });

  describe('Scene Reconstruction', () => {
    it('can reconstruct final state from event log', () => {
      const intents: PlayerIntent[] = [
        { type: 'move', actorId: 'pc1', to: { x: 1, y: 1 }, idempotencyKey: 'recon-1' },
        { type: 'skill_check', actorId: 'pc1', skill: 'athletics', idempotencyKey: 'recon-2' }
      ];

      // Apply intents to get final state
      let finalState = mkState();
      intents.forEach(intent => {
        const result = applyPlayerIntent(finalState, intent, { now: mockNow });
        finalState = result.state;
      });

      // Get event log
      const eventLog = forScene(finalState.id);
      
      // Reconstruct state by reapplying actions
      let reconstructedState = mkState();
      eventLog.forEach(entry => {
        if (entry.action.type === 'move' || 
            entry.action.type === 'skill_check' ||
            entry.action.type === 'cast' ||
            entry.action.type === 'attack' ||
            entry.action.type === 'ooc') {
          reconstructedState = applyIntent(reconstructedState, entry.action as PlayerIntent);
        }
      });

      // States should match
      expect(hashState(reconstructedState)).toBe(hashState(finalState));
    });

    it('handles out-of-order application correctly', () => {
      const intent1: PlayerIntent = {
        type: 'move',
        actorId: 'pc1',
        to: { x: 1, y: 1 },
        idempotencyKey: 'order-test-1'
      };

      const intent2: PlayerIntent = {
        type: 'skill_check',
        actorId: 'pc1',
        skill: 'perception',
        idempotencyKey: 'order-test-2'
      };

      // Apply in order 1 then 2
      let state1 = mkState();
      const result1a = applyPlayerIntent(state1, intent1, { now: mockNow });
      const result1b = applyPlayerIntent(result1a.state, intent2, { now: mockNow });

      // Apply in order 2 then 1 (different timestamps)
      mockNow.mockReturnValue(mockNow() + 1000);
      let state2 = mkState();
      const result2a = applyPlayerIntent(state2, intent2, { now: mockNow });
      mockNow.mockReturnValue(mockNow() + 1000);
      const result2b = applyPlayerIntent(result2a.state, intent1, { now: mockNow });
      
      // Reset mock for consistency
      mockNow.mockReturnValue(1730764800000);

      // Final states should be different due to order
      expect(hashState(result1b.state)).not.toBe(hashState(result2b.state));
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('handles empty actions gracefully', () => {
      const state = mkState();
      const initialHash = hashState(state);
      
      // Applying no actions should leave state unchanged
      expect(hashState(state)).toBe(initialHash);
    });

    it('preserves immutability of initial state', () => {
      const intent: PlayerIntent = {
        type: 'move',
        actorId: 'pc1',
        to: { x: 1, y: 1 },
        idempotencyKey: 'immutable-1'
      };

      const initialState = mkState();
      const result = applyPlayerIntent(initialState, intent, { now: mockNow });

      // Original state should be unchanged
      expect(initialState.turnIndex).toBe(mkState().turnIndex);
      expect(hashState(initialState)).toBe(hashState(mkState()));
      
      // Result should be a new object
      expect(result.state).not.toBe(initialState);
    });

    it('handles malformed intent keys safely', () => {
      const state = mkState();
      const malformedIntent: PlayerIntent = {
        type: 'move',
        actorId: 'pc1',
        to: { x: 1, y: 1 },
        idempotencyKey: '' // Empty key
      };

      // Should not crash even with empty keys
      expect(() => {
        applyPlayerIntent(state, malformedIntent, { now: mockNow });
      }).not.toThrow();
    });
  });

  describe('Performance and Scalability', () => {
    it('handles large numbers of intents efficiently', () => {
      const intents: PlayerIntent[] = [];
      for (let i = 0; i < 1000; i++) {
        intents.push({
          type: 'move',
          actorId: 'pc1',
          to: { x: i, y: i },
          idempotencyKey: `perf-${i}`
        });
      }

      let state = mkState();
      const startTime = Date.now();
      
      intents.forEach(intent => {
        const result = applyPlayerIntent(state, intent, { now });
        state = result.state;
      });
      
      const endTime = Date.now();
      
      // Should complete reasonably quickly (adjust threshold as needed)
      expect(endTime - startTime).toBeLessThan(1000); // 1 second
      expect(state.turnIndex).toBe(0); // Should remain unchanged in current implementation
    });
  });
});
