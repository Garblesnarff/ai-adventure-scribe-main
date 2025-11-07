import { logger } from '../../../lib/logger';
import {
  SharedSession,
  WorldChange,
  SessionConflict,
  ConflictType,
  TurnState
} from '../types';

/**
 * Manages real-time state synchronization across participants
 * Handles conflict detection and resolution
 */
export class StateSync {
  private conflicts: Map<string, SessionConflict[]> = new Map();
  private pendingChanges: Map<string, WorldChange[]> = new Map();
  private syncVersions: Map<string, number> = new Map();

  /**
   * Synchronize state changes
   */
  async syncState(
    sessionId: string,
    changes: WorldChange[],
    participantId: string
  ): Promise<boolean> {
    try {
      // Check for conflicts
      const conflicts = this.detectConflicts(sessionId, changes);

      if (conflicts.length > 0) {
        logger.warn(`Detected ${conflicts.length} conflicts in session ${sessionId}`);
        for (const conflict of conflicts) {
          this.addConflict(sessionId, conflict);
        }
        return false;
      }

      // Apply changes if no conflicts
      await this.applyChanges(sessionId, changes);

      // Increment sync version
      const currentVersion = this.syncVersions.get(sessionId) || 0;
      this.syncVersions.set(sessionId, currentVersion + 1);

      logger.debug(`Synced ${changes.length} changes for session ${sessionId}`);
      return true;
    } catch (error) {
      logger.error(`State sync failed for session ${sessionId}:`, error);
      return false;
    }
  }

  /**
   * Detect conflicts in pending changes
   */
  detectConflicts(sessionId: string, newChanges: WorldChange[]): SessionConflict[] {
    const conflicts: SessionConflict[] = [];
    const pending = this.pendingChanges.get(sessionId) || [];

    for (const newChange of newChanges) {
      for (const pendingChange of pending) {
        if (this.areChangesConflicting(newChange, pendingChange)) {
          conflicts.push(this.createConflict(sessionId, newChange, pendingChange));
        }
      }
    }

    return conflicts;
  }

  /**
   * Resolve a conflict
   */
  async resolveConflict(
    sessionId: string,
    conflictId: string,
    resolution: TurnState
  ): Promise<boolean> {
    const sessionConflicts = this.conflicts.get(sessionId) || [];
    const conflict = sessionConflicts.find(c => c.id === conflictId);

    if (!conflict) {
      logger.error(`Conflict ${conflictId} not found in session ${sessionId}`);
      return false;
    }

    conflict.status = 'resolved';
    conflict.proposedResolution = resolution;
    conflict.resolvedAt = new Date();

    logger.info(`Resolved conflict ${conflictId} in session ${sessionId}`);
    return true;
  }

  /**
   * Get pending conflicts for session
   */
  getPendingConflicts(sessionId: string): SessionConflict[] {
    const sessionConflicts = this.conflicts.get(sessionId) || [];
    return sessionConflicts.filter(c => c.status === 'active');
  }

  /**
   * Get resolved conflicts for session
   */
  getResolvedConflicts(sessionId: string): SessionConflict[] {
    const sessionConflicts = this.conflicts.get(sessionId) || [];
    return sessionConflicts.filter(c => c.status === 'resolved');
  }

  /**
   * Apply operational transform for concurrent edits
   */
  async applyOperationalTransform(
    sessionId: string,
    localChanges: WorldChange[],
    remoteChanges: WorldChange[]
  ): Promise<WorldChange[]> {
    const transformed: WorldChange[] = [];

    for (const localChange of localChanges) {
      let transformedChange = localChange;

      for (const remoteChange of remoteChanges) {
        if (this.canTransform(localChange, remoteChange)) {
          transformedChange = this.transform(transformedChange, remoteChange);
        }
      }

      transformed.push(transformedChange);
    }

    logger.debug(`Applied OT: ${localChanges.length} local changes transformed`);
    return transformed;
  }

  /**
   * Get current sync version
   */
  getSyncVersion(sessionId: string): number {
    return this.syncVersions.get(sessionId) || 0;
  }

  /**
   * Clear conflicts for session
   */
  clearConflicts(sessionId: string): void {
    this.conflicts.delete(sessionId);
  }

  /**
   * Clear pending changes for session
   */
  clearPendingChanges(sessionId: string): void {
    this.pendingChanges.delete(sessionId);
  }

  /**
   * Get sync health status
   */
  getSyncHealth(sessionId: string): {
    isHealthy: boolean;
    pendingConflicts: number;
    pendingChanges: number;
    syncVersion: number;
  } {
    const pendingConflicts = this.getPendingConflicts(sessionId).length;
    const pendingChanges = (this.pendingChanges.get(sessionId) || []).length;
    const syncVersion = this.getSyncVersion(sessionId);

    return {
      isHealthy: pendingConflicts === 0 && pendingChanges < 10,
      pendingConflicts,
      pendingChanges,
      syncVersion
    };
  }

  // Private helpers

  private async applyChanges(sessionId: string, changes: WorldChange[]): Promise<void> {
    // Store as pending until confirmed
    if (!this.pendingChanges.has(sessionId)) {
      this.pendingChanges.set(sessionId, []);
    }

    const pending = this.pendingChanges.get(sessionId)!;
    pending.push(...changes);

    // In production, this would apply changes to world state
  }

  private areChangesConflicting(change1: WorldChange, change2: WorldChange): boolean {
    // Same entity modified by different participants
    if (change1.entityId && change1.entityId === change2.entityId) {
      return change1.participantId !== change2.participantId;
    }

    // Same relationship modified
    if (change1.relationshipId && change1.relationshipId === change2.relationshipId) {
      return change1.participantId !== change2.participantId;
    }

    // Same fact modified
    if (change1.factId && change1.factId === change2.factId) {
      return change1.participantId !== change2.participantId;
    }

    return false;
  }

  private createConflict(
    sessionId: string,
    change1: WorldChange,
    change2: WorldChange
  ): SessionConflict {
    const conflictType: ConflictType = change1.entityId ? 'world_state' : 'narrative';

    return {
      id: `conflict-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      sessionId,
      conflictType,
      status: 'active',
      initiatorId: change1.participantId,
      affectedParticipants: [change1.participantId, change2.participantId],
      originalAction: {} as TurnState, // Would be populated from actual turn
      conflictingStates: [],
      createdAt: new Date(),
      severity: 'medium',
      canProceed: false
    };
  }

  private addConflict(sessionId: string, conflict: SessionConflict): void {
    if (!this.conflicts.has(sessionId)) {
      this.conflicts.set(sessionId, []);
    }
    this.conflicts.get(sessionId)!.push(conflict);
  }

  private canTransform(local: WorldChange, remote: WorldChange): boolean {
    // Check if changes can be transformed (not directly conflicting)
    return local.entityId !== remote.entityId &&
           local.relationshipId !== remote.relationshipId &&
           local.factId !== remote.factId;
  }

  private transform(local: WorldChange, remote: WorldChange): WorldChange {
    // Apply operational transform
    // In production, this would implement proper OT algorithm
    return { ...local };
  }
}
