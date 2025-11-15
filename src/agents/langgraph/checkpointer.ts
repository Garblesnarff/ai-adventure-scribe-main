/**
 * LangGraph Checkpointer
 *
 * State persistence for LangGraph agent graphs.
 * Replaces the custom IndexedDB messaging system with LangGraph's
 * built-in checkpointing mechanism.
 *
 * @module agents/langgraph/checkpointer
 */

import { MemorySaver } from '@langchain/langgraph';
import { CHECKPOINT_CONFIG } from './config';

/**
 * In-memory checkpointer for development and testing
 *
 * State is lost when the page reloads.
 * Use for development or when persistence is not needed.
 */
export const memoryCheckpointer = new MemorySaver();

/**
 * LocalStorage-based checkpointer
 *
 * Persists state to browser localStorage.
 * State survives page reloads but not across devices.
 *
 * @future Implementation pending in Work Unit 6.2
 */
export class LocalStorageCheckpointer {
  private readonly storageKey = 'langgraph_checkpoints';

  /**
   * Save checkpoint to localStorage
   */
  async save(_threadId: string, _checkpoint: any): Promise<void> {
    // TODO: Implement in Work Unit 6.2
    throw new Error('LocalStorageCheckpointer not yet implemented');
  }

  /**
   * Load checkpoint from localStorage
   */
  async load(_threadId: string): Promise<any> {
    // TODO: Implement in Work Unit 6.2
    throw new Error('LocalStorageCheckpointer not yet implemented');
  }

  /**
   * Delete checkpoint from localStorage
   */
  async delete(_threadId: string): Promise<void> {
    // TODO: Implement in Work Unit 6.2
    throw new Error('LocalStorageCheckpointer not yet implemented');
  }

  /**
   * Clean up expired checkpoints
   */
  async cleanup(): Promise<void> {
    const now = Date.now();
    const stored = localStorage.getItem(this.storageKey);

    if (!stored) return;

    const checkpoints = JSON.parse(stored);
    const filtered = Object.fromEntries(
      Object.entries(checkpoints).filter(([_, data]: [string, any]) => {
        return now - data.timestamp < CHECKPOINT_CONFIG.ttl;
      }),
    );

    localStorage.setItem(this.storageKey, JSON.stringify(filtered));
  }
}

/**
 * Supabase-based checkpointer
 *
 * Persists state to Supabase database.
 * State is available across devices and sessions.
 *
 * @future Implementation pending in Work Unit 6.3
 */
export class SupabaseCheckpointer {
  /**
   * Save checkpoint to Supabase
   */
  async save(_threadId: string, _checkpoint: any): Promise<void> {
    // TODO: Implement in Work Unit 6.3
    throw new Error('SupabaseCheckpointer not yet implemented');
  }

  /**
   * Load checkpoint from Supabase
   */
  async load(_threadId: string): Promise<any> {
    // TODO: Implement in Work Unit 6.3
    throw new Error('SupabaseCheckpointer not yet implemented');
  }

  /**
   * Delete checkpoint from Supabase
   */
  async delete(_threadId: string): Promise<void> {
    // TODO: Implement in Work Unit 6.3
    throw new Error('SupabaseCheckpointer not yet implemented');
  }
}

/**
 * Get the configured checkpointer based on environment settings
 *
 * @returns Checkpointer instance based on CHECKPOINT_CONFIG.storageType
 */
export function getCheckpointer() {
  switch (CHECKPOINT_CONFIG.storageType) {
    case 'memory':
      return memoryCheckpointer;

    case 'localstorage':
      console.warn(
        '[LangGraph] LocalStorage checkpointer not yet implemented. ' +
          'Falling back to memory checkpointer.',
      );
      return memoryCheckpointer;

    case 'supabase':
      console.warn(
        '[LangGraph] Supabase checkpointer not yet implemented. ' +
          'Falling back to memory checkpointer.',
      );
      return memoryCheckpointer;

    default:
      console.warn(
        `[LangGraph] Unknown checkpoint storage type: ${CHECKPOINT_CONFIG.storageType}. ` +
          'Falling back to memory checkpointer.',
      );
      return memoryCheckpointer;
  }
}

/**
 * Default checkpointer instance
 *
 * Use this for most graph compilations unless you need
 * a specific checkpointer implementation.
 */
export const checkpointer = getCheckpointer();
