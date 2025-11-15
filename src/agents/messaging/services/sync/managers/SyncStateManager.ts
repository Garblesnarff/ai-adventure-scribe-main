import { VectorClock, SyncState } from '../types';
import { DatabaseAdapter } from '../adapters/DatabaseAdapter';
import { logger } from '../../../../../lib/logger';

export class SyncStateManager {
  private vectorClock: VectorClock = {};

  public async loadVectorClock(): Promise<void> {
    try {
      const syncStatus = await DatabaseAdapter.getLatestSyncStatus();
      if (syncStatus?.vectorClock) {
        this.vectorClock = syncStatus.vectorClock;
      }
    } catch (error) {
      logger.error('[SyncStateManager] Error loading vector clock:', error);
    }
  }

  public getVectorClock(): VectorClock {
    return { ...this.vectorClock };
  }

  public incrementVectorClock(agentId: string): void {
    this.vectorClock[agentId] = (this.vectorClock[agentId] || 0) + 1;
  }

  public async updateSyncState(agentId: string, pendingMessages: string[]): Promise<void> {
    const syncState: SyncState = {
      lastSequenceNumber: this.vectorClock[agentId] || 0,
      vectorClock: { ...this.vectorClock },
      pendingMessages,
      conflicts: [],
    };

    await DatabaseAdapter.updateSyncStatus(agentId, syncState, this.vectorClock);
  }

  public detectConflict(incomingClock: VectorClock): boolean {
    return Object.entries(incomingClock).some(([agentId, count]) => {
      const localCount = this.vectorClock[agentId] || 0;
      return count < localCount;
    });
  }
}
