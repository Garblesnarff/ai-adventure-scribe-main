/**
 * Supabase Checkpoint Saver
 *
 * Implements LangGraph state persistence using Supabase as the backend.
 * Replaces custom IndexedDB persistence with server-side state management.
 *
 * Features:
 * - State snapshots stored in Supabase
 * - Automatic serialization/deserialization
 * - Thread-based state isolation
 * - Checkpoint history for time-travel debugging
 *
 * @module langgraph/persistence
 */

import { BaseCheckpointSaver } from '@langchain/langgraph';
import type { Checkpoint, CheckpointMetadata } from '@langchain/langgraph';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';

/**
 * Database row structure for agent checkpoints
 */
interface CheckpointRow {
  id: string;
  thread_id: string;
  checkpoint_id: string;
  parent_checkpoint_id?: string;
  state: any;
  metadata: any;
  created_at: string;
  updated_at: string;
}

/**
 * Supabase-backed checkpoint saver for LangGraph state management
 *
 * Stores graph state in Supabase for persistence across sessions,
 * enabling features like:
 * - Session restoration after page reload
 * - Multi-device synchronization
 * - State history and replay
 * - Debugging and time-travel
 */
export class SupabaseCheckpointer extends BaseCheckpointSaver {
  private readonly tableName = 'agent_checkpoints';

  /**
   * Save a checkpoint to Supabase
   *
   * @param checkpoint - The checkpoint to save
   */
  async put(
    config: { configurable?: { thread_id?: string } },
    checkpoint: Checkpoint,
    metadata: CheckpointMetadata,
  ): Promise<void> {
    const threadId = config.configurable?.thread_id;
    if (!threadId) {
      throw new Error('thread_id is required in config.configurable');
    }

    try {
      const checkpointRow: Partial<CheckpointRow> = {
        thread_id: threadId,
        checkpoint_id: checkpoint.id,
        parent_checkpoint_id: metadata.parent_checkpoint_id,
        state: this.serializeCheckpoint(checkpoint),
        metadata: metadata,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase.from(this.tableName).upsert(checkpointRow, {
        onConflict: 'thread_id,checkpoint_id',
      });

      if (error) {
        logger.error('[SupabaseCheckpointer] Failed to save checkpoint:', error);
        throw error;
      }

      logger.info('[SupabaseCheckpointer] Checkpoint saved:', {
        threadId,
        checkpointId: checkpoint.id,
      });
    } catch (error) {
      logger.error('[SupabaseCheckpointer] Error saving checkpoint:', error);
      throw error;
    }
  }

  /**
   * Load the latest checkpoint for a thread
   *
   * @param config - Configuration with thread_id
   * @returns The latest checkpoint or undefined if none exists
   */
  async get(config: { configurable?: { thread_id?: string } }): Promise<Checkpoint | undefined> {
    const threadId = config.configurable?.thread_id;
    if (!threadId) {
      return undefined;
    }

    try {
      const { data, error } = await supabase
        .from(this.tableName)
        .select('*')
        .eq('thread_id', threadId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        logger.error('[SupabaseCheckpointer] Failed to load checkpoint:', error);
        return undefined;
      }

      if (!data) {
        logger.info('[SupabaseCheckpointer] No checkpoint found for thread:', threadId);
        return undefined;
      }

      const checkpoint = this.deserializeCheckpoint(data.state);

      logger.info('[SupabaseCheckpointer] Checkpoint loaded:', {
        threadId,
        checkpointId: checkpoint.id,
      });

      return checkpoint;
    } catch (error) {
      logger.error('[SupabaseCheckpointer] Error loading checkpoint:', error);
      return undefined;
    }
  }

  /**
   * List all checkpoints for a thread
   *
   * @param config - Configuration with thread_id
   * @returns Array of checkpoints with metadata
   */
  async list(
    config: { configurable?: { thread_id?: string } },
    limit?: number,
  ): Promise<Array<{ checkpoint: Checkpoint; metadata: CheckpointMetadata }>> {
    const threadId = config.configurable?.thread_id;
    if (!threadId) {
      return [];
    }

    try {
      let query = supabase
        .from(this.tableName)
        .select('*')
        .eq('thread_id', threadId)
        .order('created_at', { ascending: false });

      if (limit) {
        query = query.limit(limit);
      }

      const { data, error } = await query;

      if (error) {
        logger.error('[SupabaseCheckpointer] Failed to list checkpoints:', error);
        return [];
      }

      if (!data) {
        return [];
      }

      return data.map((row) => ({
        checkpoint: this.deserializeCheckpoint(row.state),
        metadata: row.metadata,
      }));
    } catch (error) {
      logger.error('[SupabaseCheckpointer] Error listing checkpoints:', error);
      return [];
    }
  }

  /**
   * Delete a specific checkpoint
   *
   * @param threadId - The thread ID
   * @param checkpointId - The checkpoint ID to delete
   */
  async deleteCheckpoint(threadId: string, checkpointId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from(this.tableName)
        .delete()
        .eq('thread_id', threadId)
        .eq('checkpoint_id', checkpointId);

      if (error) {
        logger.error('[SupabaseCheckpointer] Failed to delete checkpoint:', error);
        throw error;
      }

      logger.info('[SupabaseCheckpointer] Checkpoint deleted:', {
        threadId,
        checkpointId,
      });
    } catch (error) {
      logger.error('[SupabaseCheckpointer] Error deleting checkpoint:', error);
      throw error;
    }
  }

  /**
   * Delete all checkpoints for a thread
   *
   * @param threadId - The thread ID
   */
  async deleteThread(threadId: string): Promise<void> {
    try {
      const { error } = await supabase.from(this.tableName).delete().eq('thread_id', threadId);

      if (error) {
        logger.error('[SupabaseCheckpointer] Failed to delete thread:', error);
        throw error;
      }

      logger.info('[SupabaseCheckpointer] Thread deleted:', threadId);
    } catch (error) {
      logger.error('[SupabaseCheckpointer] Error deleting thread:', error);
      throw error;
    }
  }

  /**
   * Serialize checkpoint for storage
   * Converts complex objects to JSON-safe format
   */
  private serializeCheckpoint(checkpoint: Checkpoint): any {
    return {
      ...checkpoint,
      // Ensure all nested objects are serializable
      channel_values: JSON.parse(JSON.stringify(checkpoint.channel_values || {})),
    };
  }

  /**
   * Deserialize checkpoint from storage
   * Reconstructs checkpoint object from stored data
   */
  private deserializeCheckpoint(data: any): Checkpoint {
    return {
      ...data,
      // Reconstruct any special types if needed
      channel_values: data.channel_values || {},
    };
  }
}
