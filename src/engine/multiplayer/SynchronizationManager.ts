import { logger } from '../../lib/logger';
import {
  SynchronizationState,
  ParticipantSync,
  SessionConflict,
  WorldChange,
  SessionParticipant,
  SynchronizationRequest,
  SynchronizationResponse,
  SessionEvent,
  SharedSession,
  SyncStatus
} from './types';
import { SceneState } from '../scene/types';
import { WorldGraph } from '../world/graph';

/**
 * Manages real-time synchronization between participants
 * Handles state changes, conflict resolution, and consistent state distribution
 */
export class SynchronizationManager {
  private syncStates: Map<string, SynchronizationState> = new Map();
  private pendingChanges: Map<string, WorldChange[]> = new Map();
  private conflicts: Map<string, SessionConflict[]> = new Map();
  private participantSyncs: Map<string, Map<string, ParticipantSync>> = new Map();
  
  constructor(private worldGraphs: Map<string, WorldGraph>) {}

  /**
   * Initialize synchronization for a session
   */
  initializeSynchronization(sessionId: string, participants: SessionParticipant[]): SynchronizationState {
    const participantSyncs: Map<string, ParticipantSync> = new Map();
    
    participants.forEach(participant => {
      participantSyncs.set(participant.id, {
        participantId: participant.id,
        lastSyncedTurn: 0,
        isCurrent: true,
        pendingChanges: [],
        conflicts: []
      });
    });

    const syncState: SynchronizationState = {
      sessionId,
      version: '1.0.0',
      timestamp: new Date(),
      participantSyncs: Array.from(participantSyncs.values()),
      pendingConflicts: [],
      resolvedConflicts: [],
      isSynchronized: true,
      synchronizationProgress: 1.0
    };

    this.syncStates.set(sessionId, syncState);
    this.participantSyncs.set(sessionId, participantSyncs);
    this.pendingChanges.set(sessionId, []);
    this.conflicts.set(sessionId, []);

    return syncState;
  }

  /**
   * Process world changes and update participant sync states
   */
  async processWorldChanges(
    sessionId: string,
    changes: WorldChange[],
    participantId: string
  ): Promise<boolean> {
    try {
      const pendingChanges = this.pendingChanges.get(sessionId) || [];
      pendingChanges.push(...changes);
      this.pendingChanges.set(sessionId, pendingChanges);

      // Mark participant as having changes to distribute
      const participantSyncs = this.participantSyncs.get(sessionId);
      if (participantSyncs) {
        const sync = participantSyncs.get(participantId);
        if (sync) {
          sync.pendingChanges.push(...changes);
          sync.isCurrent = false; // Participant has changes not yet synchronized
        }
      }

      // Check for conflicts with other participants' changes
      const conflicts = await this.detectChangeConflicts(sessionId, changes, participantId);
      if (conflicts.length > 0) {
        await this.handleConflicts(sessionId, conflicts);
        return false; // Conflict detected, changes pending resolution
      }

      // No conflicts, proceed with synchronization
      await this.synchronizeChanges(sessionId, changes, participantId);
      return true;
    } catch (error) {
      logger.error('Error processing world changes:', error);
      return false;
    }
  }

  /**
   * Request synchronization for a participant
   */
  async requestSynchronization(
    sessionId: string,
    request: SynchronizationRequest
  ): Promise<SynchronizationResponse> {
    try {
      const sessionSyncState = this.syncStates.get(sessionId);
      if (!sessionSyncState) {
        throw new Error('Session not found');
      }

      const participantSyncs = this.participantSyncs.get(sessionId);
      if (!participantSyncs) {
        throw new Error('Participant sync state not found');
      }

      const participantSync = participantSyncs.get(request.participantId);
      if (!participantSync) {
        throw new Error('Participant not found in session');
      }

      // Get current world state
      const worldGraph = this.worldGraphs.get(sessionId);
      if (!worldGraph) {
        throw new Error('World graph not found');
      }

      const worldSnapshot = worldGraph.createSnapshot();
      
      // Determine what data participant needs
      let gameState: SceneState;
      let missingTurns: any[] = [];
      let participantStates: Record<string, any> = {};

      if (request.includeFullState || !participantSync.isCurrent) {
        // Full synchronization needed
        gameState = await this.getFullGameState(sessionId);
        missingTurns = await this.getMissingTurns(sessionId, participantSync.lastSyncedTurn);
        participantStates = await this.getParticipantStates(sessionId, request.participantId);
      } else {
        // Partial synchronization
        gameState = await this.getPartialGameState(sessionId, request.fromTurn);
      }

      // Get active conflicts
      const conflicts = this.conflicts.get(sessionId) || [];
      const relevantConflicts = conflicts.filter(c => 
        c.affectedParticipants.includes(request.participantId)
      );

      // Update participant sync state
      participantSync.lastSyncedTurn = gameState.turnCount;
      participantSync.isCurrent = true;
      participantSync.pendingChanges = [];
      participantSync.conflicts = relevantConflicts.map(c => c.id);

      this.updateSynchronizationProgress(sessionId);

      const response: SynchronizationResponse = {
        gameState,
        worldState: worldSnapshot,
        participantStates,
        missingTurns,
        conflicts: relevantConflicts,
        version: sessionSyncState.version,
        timestamp: new Date()
      };

      return response;
    } catch (error) {
      throw new Error(`Synchronization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get current synchronization state for a session
   */
  getSynchronizationState(sessionId: string): SynchronizationState | null {
    return this.syncStates.get(sessionId) || null;
  }

  /**
   * Get participant sync state
   */
  getParticipantSync(sessionId: string, participantId: string): ParticipantSync | null {
    const participantSyncs = this.participantSyncs.get(sessionId);
    return participantSyncs?.get(participantId) || null;
  }

  /**
   * Handle participant connection/disconnection
   */
  handleParticipantConnect(sessionId: string, participantId: string, connectionId: string): void {
    const participantSyncs = this.participantSyncs.get(sessionId);
    if (participantSyncs) {
      const sync = participantSyncs.get(participantId);
      if (sync) {
        // Mark as potentially out of sync after reconnection
        sync.isCurrent = false;
      }
    }

    this.updateSynchronizationProgress(sessionId);
  }

  handleParticipantDisconnect(sessionId: string, participantId: string): void {
    const participantSyncs = this.participantSyncs.get(sessionId);
    if (participantSyncs) {
      const sync = participantSyncs.get(participantId);
      if (sync) {
        sync.isCurrent = false;
        sync.lastSyncedTurn = 0; // Will need full sync on reconnection
      }
    }

    this.updateSynchronizationProgress(sessionId);
  }

  /**
   * Force full resynchronization of a session
   */
  async forceResynchronization(sessionId: string): Promise<boolean> {
    try {
      const participantSyncs = this.participantSyncs.get(sessionId);
      if (!participantSyncs) return false;

      // Mark all participants as needing synchronization
      participantSyncs.forEach(sync => {
        sync.isCurrent = false;
        sync.pendingChanges = [];
        sync.conflicts = [];
      });

      // Clear pending changes and conflicts
      this.pendingChanges.set(sessionId, []);
      this.conflicts.set(sessionId, []);

      // Update sync state
      this.updateSynchronizationProgress(sessionId);

      return true;
    } catch (error) {
      logger.error('Error forcing resynchronization:', error);
      return false;
    }
  }

  /**
   * Resolve a conflict
   */
  async resolveConflict(
    sessionId: string,
    conflictId: string,
    resolution: any,
    resolvedBy: string
  ): Promise<boolean> {
    try {
      const conflicts = this.conflicts.get(sessionId) || [];
      const conflictIndex = conflicts.findIndex(c => c.id === conflictId);
      
      if (conflictIndex === -1) return false;

      const conflict = conflicts[conflictIndex];
      conflict.status = 'resolved';
      conflict.resolvedBy = resolvedBy;
      conflict.resolvedAt = new Date();
      conflict.resolution = resolution;

      // Apply resolution to pending changes
      await this.applyConflictResolution(sessionId, conflict, resolution);

      // Move conflict from pending to resolved
      conflicts.splice(conflictIndex, 1);
      const sessionSyncState = this.syncStates.get(sessionId);
      if (sessionSyncState) {
        sessionSyncState.resolvedConflicts.push(conflict);
      }

      this.updateSynchronizationProgress(sessionId);
      return true;
    } catch (error) {
      logger.error('Error resolving conflict:', error);
      return false;
    }
  }

  /**
   * Check synchronization health status
   */
  getSyncHealthStatus(sessionId: string): {
    isHealthy: boolean;
    issues: string[];
    suggestions: string[];
  } {
    const sessionSyncState = this.syncStates.get(sessionId);
    const participantSyncs = this.participantSyncs.get(sessionId);
    const pendingChanges = this.pendingChanges.get(sessionId) || [];
    const conflicts = this.conflicts.get(sessionId) || [];

    const issues: string[] = [];
    const suggestions: string[] = [];

    // Check progress
    if (sessionSyncState && sessionSyncState.synchronizationProgress < 0.8) {
      issues.push('Low synchronization progress');
      suggestions.push('Consider forcing resynchronization');
    }

    // Check pending changes
    if (pendingChanges.length > 10) {
      issues.push('High number of pending changes');
      suggestions.push('Process pending changes or force sync');
    }

    // Check conflicts
    if (conflicts.length > 0) {
      issues.push(`${conflicts.length} active conflicts`);
      suggestions.push('Resolve conflicts to improve synchronization');
    }

    // Check individual participant sync
    let outOfSyncCount = 0;
    participantSyncs?.forEach((sync, participantId) => {
      if (!sync.isCurrent) {
        outOfSyncCount++;
        issues.push(`Participant ${participantId} is out of sync`);
      }
    });

    if (outOfSyncCount > 0) {
      suggestions.push(`Synchronize ${outOfSyncCount} out-of-sync participants`);
    }

    const isHealthy = issues.length === 0;

    return {
      isHealthy,
      issues,
      suggestions
    };
  }

  // Private helper methods

  private async detectChangeConflicts(
    sessionId: string,
    changes: WorldChange[],
    participantId: string
  ): Promise<SessionConflict[]> {
    const conflicts: SessionConflict[] = [];
    const existingChanges = this.pendingChanges.get(sessionId) || [];

    for (const change of changes) {
      // Check for conflicts with opposite changes
      const conflictingChanges = existingChanges.filter(existing => 
        this.changesConflict(change, existing, participantId)
      );

      if (conflictingChanges.length > 0) {
        const conflict: SessionConflict = {
          id: this.generateId(),
          sessionId,
          conflictType: this.inferConflictType(change),
          status: 'active',
          initiatorId: participantId,
          affectedParticipants: [participantId, ...conflictingChanges.map(c => c.participantId).filter((p, i, arr) => arr.indexOf(p) === i)],
          originalAction: change as any,
          conflictingStates: conflictingChanges.map(c => c as any),
          createdAt: new Date(),
          severity: this.assessConflictSeverity(change, conflictingChanges),
          canProceed: false
        };

        conflicts.push(conflict);
      }
    }

    return conflicts;
  }

  private changesConflict(
    change1: WorldChange,
    change2: WorldChange,
    participantId: string
  ): boolean {
    // Simple conflict detection logic
    if (change1.participantId === participantId) return false;
    if (change1.type !== change2.type) return false;

    switch (change1.type) {
      case 'entity_updated':
        return change1.entityId === change2.entityId;
      case 'relationship_updated':
        return change1.relationshipId === change2.relationshipId;
      case 'fact_updated':
        return change1.factId === change2.factId;
      default:
        return false;
    }
  }

  private inferConflictType(change: WorldChange): SessionConflict['conflictType'] {
    switch (change.type) {
      case 'entity_created':
      case 'entity_updated':
      case 'entity_removed':
        return 'character_action';
      case 'relationship_created':
      case 'relationship_updated':
      case 'relationship_removed':
        return 'world_state';
      case 'fact_created':
      case 'fact_updated':
      case 'fact_removed':
        return 'narrative';
      default:
        return 'world_state';
    }
  }

  private assessConflictSeverity(change: WorldChange, conflictingChanges: WorldChange[]): 'low' | 'medium' | 'high' {
    // Simple severity assessment
    if (conflictingChanges.length > 2) return 'high';
    if (change.type.includes('removed')) return 'medium';
    return 'low';
  }

  private async handleConflicts(sessionId: string, conflicts: SessionConflict[]): Promise<void> {
    const sessionConflicts = this.conflicts.get(sessionId) || [];
    sessionConflicts.push(...conflicts);
    this.conflicts.set(sessionId, sessionConflicts);

    // Update participant sync states
    const participantSyncs = this.participantSyncs.get(sessionId);
    if (participantSyncs) {
      conflicts.forEach(conflict => {
        conflict.affectedParticipants.forEach(participantId => {
          const sync = participantSyncs.get(participantId);
          if (sync) {
            sync.conflicts.push(conflict.id);
            sync.isCurrent = false;
          }
        });
      });
    }
  }

  private async synchronizeChanges(
    sessionId: string,
    changes: WorldChange[],
    participantId: string
  ): Promise<void> {
    const worldGraph = this.worldGraphs.get(sessionId);
    if (!worldGraph) return;

    // Apply changes to world graph
    for (const change of changes) {
      await this.applyChangeToWorld(worldGraph, change);
    }

    // Update participant sync states
    const participantSyncs = this.participantSyncs.get(sessionId);
    if (participantSyncs) {
      participantSyncs.forEach((sync, id) => {
        if (id === participantId) {
          sync.lastSyncedTurn = sync.lastSyncedTurn + 1; // Increment turn count
          sync.pendingChanges = [];
        } else {
          // Mark other participants as having received changes
          sync.isCurrent = false;
        }
      });
    }

    // Remove processed changes from pending
    const pendingChanges = this.pendingChanges.get(sessionId) || [];
    const changesToRemove = changes.map(c => JSON.stringify(c));
    const remainingChanges = pendingChanges.filter(c => 
      !changesToRemove.includes(JSON.stringify(c))
    );
    this.pendingChanges.set(sessionId, remainingChanges);
  }

  private async applyChangeToWorld(worldGraph: WorldGraph, change: WorldChange): Promise<void> {
    // Apply change based on type
    switch (change.type) {
      case 'entity_created':
        // Create entity logic
        break;
      case 'entity_updated':
        // Update entity logic
        await worldGraph.updateEntityFact({
          entityId: change.entityId!,
          propertyKey: change.newValue?.property || 'value',
          value: change.newValue?.value
        });
        break;
      case 'entity_removed':
        // Remove entity logic
        break;
      case 'relationship_created':
        // Create relationship logic
        break;
      case 'relationship_updated':
        // Update relationship logic
        break;
      case 'relationship_removed':
        // Remove relationship logic
        break;
      case 'fact_updated':
        // Update fact logic
        break;
      default:
        logger.warn(`Unknown change type: ${change.type}`);
    }
  }

  private async getFullGameState(sessionId: string): Promise<SceneState> {
    // This would need to be implemented to get the full scene state
    // For now, return a basic structure
    return {
      id: sessionId,
      sessionId,
      turnCount: 0,
      roundCount: 1,
      phase: 'active',
      isActive: true,
      currentPlayer: null,
      participants: [],
      metadata: {},
      gameState: {
        scene: 'battle',
        location: 'unknown',
        weather: 'clear',
        timeOfDay: 'day'
      }
    };
  }

  private async getPartialGameState(sessionId: string, fromTurn?: number): Promise<SceneState> {
    // Get partial state from specified turn
    return this.getFullGameState(sessionId);
  }

  private async getMissingTurns(sessionId: string, fromTurn: number): Promise<any[]> {
    // Get turns that participant missed
    // This would integrate with the turn manager
    return [];
  }

  private async getParticipantStates(sessionId: string, participantId: string): Promise<Record<string, any>> {
    // Get states for all participants except requester
    const participantSyncs = this.participantSyncs.get(sessionId);
    if (!participantSyncs) return {};

    const states: Record<string, any> = {};
    participantSyncs.forEach((sync, id) => {
      if (id !== participantId) {
        states[id] = {
          lastSyncedTurn: sync.lastSyncedTurn,
          isCurrent: sync.isCurrent,
          pendingChangesCount: sync.pendingChanges.length
        };
      }
    });

    return states;
  }

  private updateSynchronizationProgress(sessionId: string): void {
    const participantSyncs = this.participantSyncs.get(sessionId);
    if (!participantSyncs) return;

    const totalParticipants = participantSyncs.size;
    const synchronizedParticipants = Array.from(participantSyncs.values())
      .filter(sync => sync.isCurrent).length;

    const progress = totalParticipants > 0 ? synchronizedParticipants / totalParticipants : 1;

    const syncState = this.syncStates.get(sessionId);
    if (syncState) {
      syncState.synchronizationProgress = progress;
      syncState.isSynchronized = progress >= 0.9;
    }
  }

  private async applyConflictResolution(
    sessionId: string,
    conflict: SessionConflict,
    resolution: any
  ): Promise<void> {
    // Apply the resolved changes to the world
    const worldGraph = this.worldGraphs.get(sessionId);
    if (!worldGraph) return;

    // Implementation depends on conflict resolution method
    if (conflict.resolutionMethod === 'auto_resolve') {
      // Apply automatic resolution
    } else if (conflict.resolutionMethod === 'dm_override') {
      // Apply DM's chosen resolution
    }
  }

  private generateId(): string {
    return `sync-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
