// src/engine/scene/orchestrator.ts
import type { SceneState, PlayerIntent, DMAction, RulesEvent, EventLogEntry } from './types';
import { applyIntent, hashState } from './reducer';
import { append, hasProcessed, markProcessed } from './event-log';
import { randomUUID } from 'node:crypto';

export interface OrchestratorDeps {
  now: () => number;
}

export interface SceneOrchestratorConfig {
  enableIdempotency: boolean;
  enableLogging: boolean;
  maxEventLogSize: number;
}

export class SceneOrchestrator {
  private config: SceneOrchestratorConfig;
  private deps: OrchestratorDeps;

  constructor(config: Partial<SceneOrchestratorConfig> = {}, deps: OrchestratorDeps = { now: Date.now }) {
    this.config = {
      enableIdempotency: true,
      enableLogging: true,
      maxEventLogSize: 10000,
      ...config
    };
    this.deps = deps;
  }

  // Apply a player intent with idempotency and logging
  public applyPlayerIntent(
    state: SceneState,
    intent: PlayerIntent
  ): { state: SceneState; log: EventLogEntry } {
    // Check if intent should be ignored
    if (this.config.enableIdempotency && hasProcessed(intent.idempotencyKey)) {
      const ignoredEntry: EventLogEntry = {
        id: randomUUID(),
        sceneId: state.id,
        at: this.deps.now(),
        actorId: intent.actorId,
        action: { type: 'narrate', text: 'Duplicate intent ignored' },
        stateHashBefore: hashState(state),
        stateHashAfter: hashState(state)
      };
      
      if (this.config.enableLogging) {
        append(ignoredEntry);
      }
      
      return { state, log: ignoredEntry };
    }

    // Check if scene is paused (except for safety commands)
    if (state.paused && intent.type !== 'ooc') {
      const pausedEntry: EventLogEntry = {
        id: randomUUID(),
        sceneId: state.id,
        at: this.deps.now(),
        actorId: intent.actorId,
        action: { type: 'narrate', text: 'Scene is paused - intent ignored' },
        stateHashBefore: hashState(state),
        stateHashAfter: hashState(state)
      };
      
      if (this.config.enableLogging) {
        append(pausedEntry);
      }
      
      return { state, log: pausedEntry };
    }

    const before = hashState(state);
    const next = applyIntent(state, intent);
    const after = hashState(next);

    const entry: EventLogEntry = {
      id: randomUUID(),
      sceneId: state.id,
      at: this.deps.now(),
      actorId: intent.actorId,
      action: intent,
      stateHashBefore: before,
      stateHashAfter: after
    };

    if (this.config.enableLogging) {
      append(entry);
      // Mark as processed after successful logging
      if (this.config.enableIdempotency) {
        markProcessed(intent.idempotencyKey);
      }
    }

    return { state: next, log: entry };
  }

  // Apply a DM action with logging
  public applyDMAction(
    state: SceneState,
    action: DMAction
  ): { state: SceneState; log: EventLogEntry } {
    const before = hashState(state);
    const next = applyDMAction(state, action);
    const after = hashState(next);

    const entry: EventLogEntry = {
      id: randomUUID(),
      sceneId: state.id,
      at: this.deps.now(),
      action,
      stateHashBefore: before,
      stateHashAfter: after
    };

    if (this.config.enableLogging) {
      append(entry);
    }

    return { state: next, log: entry };
  }

  // Apply a rules event with logging
  public applyRulesEvent(
    state: SceneState,
    event: RulesEvent
  ): { state: SceneState; log: EventLogEntry } {
    const before = hashState(state);
    const next = applyRulesEvent(state, event);
    const after = hashState(next);

    const entry: EventLogEntry = {
      id: randomUUID(),
      sceneId: state.id,
      at: this.deps.now(),
      actorId: event.actorId,
      action: event,
      stateHashBefore: before,
      stateHashAfter: after
    };

    if (this.config.enableLogging) {
      append(entry);
    }

    return { state: next, log: entry };
  }

  // Process a batch of actions maintaining order
  public processBatch(
    initialState: SceneState,
    actions: Array<{ action: PlayerIntent | DMAction | RulesEvent; priority?: number }>
  ): { state: SceneState; logs: EventLogEntry[] } {
    // Sort by priority if provided (higher priority first)
    const sortedActions = actions
      .map((a, index) => ({ ...a, index }))
      .sort((a, b) => (b.priority || 0) - (a.priority || 0) || a.index - b.index);

    let currentState = initialState;
    const logs: EventLogEntry[] = [];

    for (const { action } of sortedActions) {
      if ('type' in action) {
        if (['move', 'attack', 'skill_check', 'cast', 'ooc'].includes(action.type)) {
          const result = this.applyPlayerIntent(currentState, action as PlayerIntent);
          currentState = result.state;
          logs.push(result.log);
        } else if (['call_for_check', 'apply_damage', 'advance_clock', 'narrate', 'pause_scene', 'resume_scene', 'veil_content'].includes(action.type)) {
          const result = this.applyDMAction(currentState, action as DMAction);
          currentState = result.state;
          logs.push(result.log);
        } else if (['roll', 'turn_start', 'turn_end', 'reaction_window'].includes(action.type)) {
          const result = this.applyRulesEvent(currentState, action as RulesEvent);
          currentState = result.state;
          logs.push(result.log);
        }
      }
    }

    return { state: currentState, logs };
  }

  // Safety command processing
  public processSafetyCommand(
    state: SceneState,
    actorId: string,
    command: string): { state: SceneState; log: EventLogEntry } {
    const trimmedCommand = command.trim();
    
    // X-Card / Pause
    if (trimmedCommand === '/x' || trimmedCommand === '/pause') {
      return this.applyDMAction(state, {
        type: 'pause_scene',
        reason: `Safety command invoked: ${trimmedCommand}`
      });
    }
    
    // Veil
    if (trimmedCommand.startsWith('/veil ')) {
      const topic = trimmedCommand.substring(6).trim();
      return this.applyDMAction(state, {
        type: 'veil_content',
        topic,
        reason: `Veil command invoked for: ${topic}`
      });
    }
    
    // Resume
    if (trimmedCommand === '/resume') {
      return this.applyDMAction(state, {
        type: 'resume_scene'
      });
    }
    
    // Unknown safety command
    return this.applyDMAction(state, {
      type: 'narrate',
      text: `Unknown safety command: ${trimmedCommand}`
    });
  }
}

// Convenience functions for common orchestration tasks
export function applyPlayerIntent(
  state: SceneState,
  intent: PlayerIntent,
  deps: OrchestratorDeps = { now: Date.now }
): { state: SceneState; log: EventLogEntry } {
  const orchestrator = new SceneOrchestrator({}, deps);
  return orchestrator.applyPlayerIntent(state, intent);
}

export function createNewScene(
  locationId: string,
  participants: string[],
  seed?: string
): SceneState {
  return {
    id: randomUUID(),
    locationId,
    time: new Date().toISOString(),
    participants,
    initiative: [...participants],
    turnIndex: 0,
    clocks: [],
    hazards: [],
    seed: seed || `scene-${Date.now()}`,
    paused: false
  };
}
