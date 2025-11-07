/**
 * Mock Checkpointer for Testing
 *
 * Provides a test implementation of the Supabase checkpointer
 * that doesn't require database access. Stores checkpoints in memory
 * for the duration of the test.
 *
 * @module agents/langgraph/__tests__/mocks/checkpointer
 */

import type { Checkpoint, CheckpointMetadata } from '@langchain/langgraph';

/**
 * In-memory checkpoint storage
 */
interface CheckpointStore {
  [threadId: string]: {
    [checkpointId: string]: {
      checkpoint: Checkpoint;
      metadata: CheckpointMetadata;
      createdAt: string;
    };
  };
}

/**
 * Mock implementation of SupabaseCheckpointer for testing
 *
 * Provides the same interface as the real checkpointer but stores
 * data in memory instead of Supabase.
 */
export class MockCheckpointer {
  private store: CheckpointStore = {};

  /**
   * Save a checkpoint to memory
   */
  async put(
    config: { configurable?: { thread_id?: string } },
    checkpoint: Checkpoint,
    metadata: CheckpointMetadata
  ): Promise<void> {
    const threadId = config.configurable?.thread_id;
    if (!threadId) {
      throw new Error('thread_id is required in config.configurable');
    }

    if (!this.store[threadId]) {
      this.store[threadId] = {};
    }

    this.store[threadId][checkpoint.id] = {
      checkpoint: this.serializeCheckpoint(checkpoint),
      metadata,
      createdAt: new Date().toISOString(),
    };
  }

  /**
   * Load the latest checkpoint for a thread
   */
  async get(
    config: { configurable?: { thread_id?: string } }
  ): Promise<Checkpoint | undefined> {
    const threadId = config.configurable?.thread_id;
    if (!threadId || !this.store[threadId]) {
      return undefined;
    }

    const checkpoints = Object.values(this.store[threadId]);
    if (checkpoints.length === 0) {
      return undefined;
    }

    // Return the most recent checkpoint
    const latest = checkpoints.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )[0];

    return this.deserializeCheckpoint(latest.checkpoint);
  }

  /**
   * List all checkpoints for a thread
   */
  async list(
    config: { configurable?: { thread_id?: string } },
    limit?: number
  ): Promise<Array<{ checkpoint: Checkpoint; metadata: CheckpointMetadata }>> {
    const threadId = config.configurable?.thread_id;
    if (!threadId || !this.store[threadId]) {
      return [];
    }

    let checkpoints = Object.values(this.store[threadId]);

    // Sort by creation time descending
    checkpoints = checkpoints.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    if (limit) {
      checkpoints = checkpoints.slice(0, limit);
    }

    return checkpoints.map(({ checkpoint, metadata }) => ({
      checkpoint: this.deserializeCheckpoint(checkpoint),
      metadata,
    }));
  }

  /**
   * Delete a specific checkpoint
   */
  async deleteCheckpoint(threadId: string, checkpointId: string): Promise<void> {
    if (this.store[threadId] && this.store[threadId][checkpointId]) {
      delete this.store[threadId][checkpointId];
    }
  }

  /**
   * Delete all checkpoints for a thread
   */
  async deleteThread(threadId: string): Promise<void> {
    delete this.store[threadId];
  }

  /**
   * Clear all checkpoints (useful between tests)
   */
  clear(): void {
    this.store = {};
  }

  /**
   * Get checkpoint count for a thread (test utility)
   */
  getCheckpointCount(threadId: string): number {
    return this.store[threadId] ? Object.keys(this.store[threadId]).length : 0;
  }

  /**
   * Get all thread IDs (test utility)
   */
  getThreadIds(): string[] {
    return Object.keys(this.store);
  }

  /**
   * Serialize checkpoint for storage
   */
  private serializeCheckpoint(checkpoint: Checkpoint): Checkpoint {
    return {
      ...checkpoint,
      channel_values: JSON.parse(JSON.stringify(checkpoint.channel_values || {})),
    };
  }

  /**
   * Deserialize checkpoint from storage
   */
  private deserializeCheckpoint(data: any): Checkpoint {
    return {
      ...data,
      channel_values: data.channel_values || {},
    };
  }
}

/**
 * Mock Supabase client that returns empty data
 *
 * Used to prevent actual Supabase calls in tests
 */
export const mockSupabaseClient = {
  from: () => ({
    upsert: () => Promise.resolve({ data: null, error: null }),
    select: () => ({
      eq: () => ({
        order: () => ({
          limit: () => ({
            maybeSingle: () => Promise.resolve({ data: null, error: null }),
          }),
        }),
      }),
    }),
    delete: () => ({
      eq: () => Promise.resolve({ data: null, error: null }),
    }),
  }),
  auth: {
    getUser: () => Promise.resolve({ data: { user: null }, error: null }),
    getSession: () => Promise.resolve({ data: { session: null }, error: null }),
  },
};

/**
 * Create a mock checkpointer instance
 *
 * Use this in beforeEach to get a fresh checkpointer for each test
 */
export function createMockCheckpointer(): MockCheckpointer {
  return new MockCheckpointer();
}
