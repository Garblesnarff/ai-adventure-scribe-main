import { logger } from '../../../lib/logger';
import { SharedSession, WorldSessionSnapshot, SessionSnapshot, SnapshotType } from '../types';
import { WorldGraph } from '../../world/graph';

/**
 * Handles session persistence, snapshots, and recovery
 * Manages save/load operations and state serialization
 */
export class SessionPersistence {
  private snapshots: Map<string, SessionSnapshot[]> = new Map();
  private readonly MAX_SNAPSHOTS_PER_SESSION = 50;

  /**
   * Save session to persistent storage
   */
  async saveSession(session: SharedSession): Promise<boolean> {
    try {
      // In production, this would save to database
      // For now, just log the operation
      logger.info(`Saving session ${session.id}`);

      // Create auto-save snapshot
      await this.createSnapshot(session.id, session, 'auto');

      return true;
    } catch (error) {
      logger.error(`Failed to save session ${session.id}:`, error);
      return false;
    }
  }

  /**
   * Load session from persistent storage
   */
  async loadSession(sessionId: string): Promise<SharedSession | null> {
    try {
      // In production, this would load from database
      logger.info(`Loading session ${sessionId}`);

      // For now, return null as we don't have actual persistence yet
      return null;
    } catch (error) {
      logger.error(`Failed to load session ${sessionId}:`, error);
      return null;
    }
  }

  /**
   * Create session snapshot
   */
  async createSnapshot(
    sessionId: string,
    session: SharedSession,
    type: SnapshotType
  ): Promise<SessionSnapshot> {
    const snapshot: SessionSnapshot = {
      id: this.generateSnapshotId(),
      sessionId,
      turnNumber: session.gameState.turnCount,
      gameState: this.cloneGameState(session.gameState),
      worldState: this.cloneWorldState(session.worldSnapshot),
      participantStates: this.captureParticipantStates(session),
      type,
      version: '1.0.0',
      checksum: this.calculateChecksum(session),
      size: this.estimateSize(session),
      createdAt: new Date()
    };

    // Store snapshot
    if (!this.snapshots.has(sessionId)) {
      this.snapshots.set(sessionId, []);
    }

    const sessionSnapshots = this.snapshots.get(sessionId)!;
    sessionSnapshots.push(snapshot);

    // Limit snapshots per session
    if (sessionSnapshots.length > this.MAX_SNAPSHOTS_PER_SESSION) {
      sessionSnapshots.shift();
    }

    logger.info(`Created ${type} snapshot for session ${sessionId}`);
    return snapshot;
  }

  /**
   * Restore session from snapshot
   */
  async restoreFromSnapshot(snapshotId: string): Promise<SharedSession | null> {
    try {
      const snapshot = this.findSnapshot(snapshotId);
      if (!snapshot) {
        logger.error(`Snapshot ${snapshotId} not found`);
        return null;
      }

      // In production, this would restore full session state
      logger.info(`Restoring session from snapshot ${snapshotId}`);

      return null; // Placeholder
    } catch (error) {
      logger.error(`Failed to restore from snapshot ${snapshotId}:`, error);
      return null;
    }
  }

  /**
   * Get snapshots for session
   */
  getSessionSnapshots(sessionId: string): SessionSnapshot[] {
    return this.snapshots.get(sessionId) || [];
  }

  /**
   * Get latest snapshot for session
   */
  getLatestSnapshot(sessionId: string): SessionSnapshot | null {
    const snapshots = this.getSessionSnapshots(sessionId);
    return snapshots.length > 0 ? snapshots[snapshots.length - 1] : null;
  }

  /**
   * Delete old snapshots
   */
  deleteOldSnapshots(sessionId: string, beforeDate: Date): number {
    const snapshots = this.snapshots.get(sessionId);
    if (!snapshots) return 0;

    const initialCount = snapshots.length;
    const filtered = snapshots.filter(s => s.createdAt >= beforeDate);
    this.snapshots.set(sessionId, filtered);

    const deleted = initialCount - filtered.length;
    logger.info(`Deleted ${deleted} old snapshots for session ${sessionId}`);
    return deleted;
  }

  /**
   * Update world snapshot for session
   */
  async updateWorldSnapshot(
    sessionId: string,
    worldGraph: WorldGraph
  ): Promise<WorldSessionSnapshot> {
    const snapshot = worldGraph.createSnapshot();
    logger.debug(`Updated world snapshot for session ${sessionId}`);
    return snapshot;
  }

  /**
   * Clear all snapshots for session
   */
  clearSessionSnapshots(sessionId: string): void {
    this.snapshots.delete(sessionId);
    logger.info(`Cleared snapshots for session ${sessionId}`);
  }

  // Private helpers

  private generateSnapshotId(): string {
    return `snap-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private cloneGameState(gameState: any): any {
    return JSON.parse(JSON.stringify(gameState));
  }

  private cloneWorldState(worldState: WorldSessionSnapshot): WorldSessionSnapshot {
    return JSON.parse(JSON.stringify(worldState));
  }

  private captureParticipantStates(session: SharedSession): Record<string, any> {
    const states: Record<string, any> = {};

    for (const participant of session.participants) {
      states[participant.id] = {
        participantId: participant.id,
        lastSyncedTurn: session.gameState.turnCount,
        localState: {},
        pendingActions: [],
        confidence: 1.0
      };
    }

    return states;
  }

  private calculateChecksum(session: SharedSession): string {
    // Simple checksum based on turn count and timestamp
    const data = `${session.id}-${session.gameState.turnCount}-${Date.now()}`;
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }

  private estimateSize(session: SharedSession): number {
    return JSON.stringify(session).length;
  }

  private findSnapshot(snapshotId: string): SessionSnapshot | null {
    for (const snapshots of this.snapshots.values()) {
      const found = snapshots.find(s => s.id === snapshotId);
      if (found) return found;
    }
    return null;
  }
}
