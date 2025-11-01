// src/engine/scene/reducer.ts
import type { SceneState, PlayerIntent, DMAction, RulesEvent, Clock, Hazard } from './types';
import { createHash } from 'node:crypto';
import { logger } from '../../lib/logger';

export function hashState(s: SceneState): string {
  return createHash('sha256').update(JSON.stringify(s)).digest('hex');
}

export function applyIntent(state: SceneState, intent: PlayerIntent): SceneState {
  // Create deep copy to ensure immutability
  const next = JSON.parse(JSON.stringify(state));
  
  switch (intent.type) {
    case 'move':
      // For now, we'll mark that a move happened by updating a counter
      // In real implementation, this would integrate with grid/range system
      if (!next.metadata) next.metadata = {};
      next.metadata.lastMove = intent;
      next.metadata.moveCount = (next.metadata.moveCount || 0) + 1;
      logger.info(`Move intent: ${intent.actorId} to ${JSON.stringify(intent.to)}`);
      break;
      
    case 'attack':
      // Mark that an attack happened
      if (!next.metadata) next.metadata = {};
      next.metadata.lastAttack = intent;
      next.metadata.attackCount = (next.metadata.attackCount || 0) + 1;
      logger.info(`Attack intent: ${intent.actorId} -> ${intent.targetId}${intent.weaponId ? ` with ${intent.weaponId}` : ''}`);
      break;
      
    case 'skill_check':
      // Mark that a skill check happened
      if (!next.metadata) next.metadata = {};
      next.metadata.lastSkillCheck = intent;
      next.metadata.skillCheckCount = (next.metadata.skillCheckCount || 0) + 1;
      logger.info(`Skill check intent: ${intent.actorId} -> ${intent.skill}${intent.approach ? ` (${intent.approach})` : ''}`);
      break;
      
    case 'cast':
      // Placeholder for spell casting
      logger.info(`Cast intent: ${intent.actorId} -> ${intent.spellId}${intent.slot ? ` (slot ${intent.slot})` : ''}`);
      break;
      
    case 'ooc':
      // Out of character - handle safety or meta commands
      logger.info(`OOC intent: ${intent.actorId} -> ${intent.message}`);
      break;
      
    default:
      // Exhaustive check for compiler
      const _exhaustive: never = intent;
      throw new Error(`Unknown intent type: ${_exhaustive}`);
  }
  
  return next;
}

export function applyDMAction(state: SceneState, action: DMAction): SceneState {
  // Create deep copy to ensure immutability
  const next = JSON.parse(JSON.stringify(state));
  
  switch (action.type) {
    case 'call_for_check':
      logger.info(`DM calls for check: ${action.actorId} -> ${action.skill} DC ${action.dc} (${action.reason})`);
      break;
      
    case 'apply_damage':
      logger.info(`DM applies damage: ${action.targetId} takes ${action.amount} from ${action.source}`);
      break;
      
    case 'advance_clock':
      const clock = next.clocks.find(c => c.id === action.clockId);
      if (clock) {
        clock.value = Math.min(clock.max, clock.value + action.ticks);
        logger.info(`Clock advanced: ${action.clockId} ${clock.value}/${clock.max} (${action.reason})`);
      }
      break;
      
    case 'narrate':
      logger.info(`DM narration: ${action.text.substring(0, 50)}...`);
      break;
      
    case 'pause_scene':
      next.paused = true;
      next.lastSafetyEvent = {
        kind: 'pause',
        at: Date.now(),
        data: action.reason
      };
      logger.info(`Scene paused: ${action.reason || 'No reason given'}`);
      break;
      
    case 'resume_scene':
      next.paused = false;
      next.lastSafetyEvent = {
        kind: 'pause',
        at: Date.now(),
        data: 'resumed'
      };
      logger.info(`Scene resumed`);
      break;
      
    case 'veil_content':
      next.lastSafetyEvent = {
        kind: 'veil',
        at: Date.now(),
        data: action.topic
      };
      logger.info(`Content veiled: ${action.topic}`);
      break;
      
    default:
      const _exhaustive: never = action;
      throw new Error(`Unknown DM action type: ${_exhaustive}`);
  }
  
  return next;
}

export function applyRulesEvent(state: SceneState, evt: RulesEvent): SceneState {
  // Create deep copy to ensure immutability
  const next = JSON.parse(JSON.stringify(state));
  
  switch (evt.type) {
    case 'roll':
      logger.info(`Roll event: ${evt.actorId} -> ${evt.rollType} ${evt.result} (${evt.d}d${evt.mod >= 0 ? '+' : ''}${evt.mod})${evt.rationale ? ` - ${evt.rationale}` : ''}`);
      break;
      
    case 'turn_start':
      // Update turn index if actor is in initiative
      const turnStartIndex = next.initiative.indexOf(evt.actorId);
      if (turnStartIndex !== -1) {
        next.turnIndex = turnStartIndex;
        logger.info(`Turn started: ${evt.actorId} (index ${turnStartIndex})`);
      }
      break;
      
    case 'turn_end':
      logger.info(`Turn ended: ${evt.actorId}`);
      break;
      
    case 'reaction_window':
      logger.info(`Reaction window opened: ${evt.forActorId} (${evt.reason})`);
      break;
      
    default:
      const _exhaustive: never = evt;
      throw new Error(`Unknown rules event type: ${_exhaustive}`);
  }
  
  return next;
}

// Apply multiple actions/intents in sequence
export function applySequence(
  initialState: SceneState,
  actions: Array<PlayerIntent | DMAction | RulesEvent>
): { state: SceneState; steps: Array<{ before: string; after: string }> } {
  let currentState = initialState;
  const steps: Array<{ before: string; after: string }> = [];
  
  for (const action of actions) {
    const before = hashState(currentState);
    
    if ('type' in action) {
      if (['move', 'attack', 'skill_check', 'cast', 'ooc'].includes(action.type)) {
        currentState = applyIntent(currentState, action as PlayerIntent);
      } else if (['call_for_check', 'apply_damage', 'advance_clock', 'narrate', 'pause_scene', 'resume_scene', 'veil_content'].includes(action.type)) {
        currentState = applyDMAction(currentState, action as DMAction);
      } else if (['roll', 'turn_start', 'turn_end', 'reaction_window'].includes(action.type)) {
        currentState = applyRulesEvent(currentState, action as RulesEvent);
      }
    }
    
    const after = hashState(currentState);
    steps.push({ before, after });
  }
  
  return { state: currentState, steps };
}

// Helper functions for creating initial state
export function createSceneState(overrides: Partial<SceneState> = {}): SceneState {
  const defaultState: SceneState = {
    id: `scene-${Date.now()}`,
    locationId: `location-${Date.now()}`,
    time: new Date().toISOString(),
    participants: [],
    initiative: [],
    turnIndex: 0,
    clocks: [],
    hazards: [],
    seed: `seed-${Date.now()}`,
    paused: false
  };
  
  return { ...defaultState, ...overrides };
}

export function addClock(state: SceneState, clock: Omit<Clock, 'id'>): SceneState {
  const next = JSON.parse(JSON.stringify(state));
  next.clocks.push({
    id: `clock-${Date.now()}-${Math.random()}`,
    ...clock
  });
  return next;
}

export function addHazard(state: SceneState, hazard: Omit<Hazard, 'id'>): SceneState {
  const next = JSON.parse(JSON.stringify(state));
  next.hazards.push({
    id: `hazard-${Date.now()}-${Math.random()}`,
    ...hazard
  });
  return next;
}
