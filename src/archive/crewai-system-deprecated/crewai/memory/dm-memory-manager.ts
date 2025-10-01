/**
 * DM Memory Manager for CrewAI
 * 
 * This file defines the DMMemoryManager class, responsible for managing the 
 * Dungeon Master agent's memory within the CrewAI framework. It utilizes a 
 * MemoryAdapter to interact with the underlying memory storage.
 * 
 * Main Class:
 * - DMMemoryManager: Handles initialization, retrieval, storage, and forgetting of memories.
 * 
 * Key Dependencies:
 * - AgentMemory type (../types/memory)
 * - MemoryAdapter (../adapters/memory-adapter.ts)
 * 
 * @author AI Dungeon Master Team
 */

// CrewAI Types
import { AgentMemory } from '../types/memory'; // Assuming AgentMemory is defined in memory.ts

// CrewAI Adapters (assuming kebab-case filenames)
import { MemoryAdapter } from '../adapters/memory-adapter';


export class DMMemoryManager {
  private memoryAdapter: MemoryAdapter;

  constructor(sessionId: string) {
    this.memoryAdapter = new MemoryAdapter(sessionId);
  }

  /**
   * Initialize memory system
   */
  initializeMemory(): AgentMemory {
    return {
      shortTerm: [],
      longTerm: [],
      retrieve: this.retrieveMemories.bind(this),
      store: this.storeMemory.bind(this),
      forget: this.forgetMemory.bind(this)
    };
  }

  /**
   * Retrieve memories based on context
   */
  private async retrieveMemories(context: any): Promise<any[]> {
    return this.memoryAdapter.getRecentMemories(5);
  }

  /**
   * Store a new memory
   */
  private async storeMemory(memory: any): Promise<void> {
    await this.memoryAdapter.storeMemory(memory);
  }

  /**
   * Forget a specific memory
   */
  private async forgetMemory(memoryId: string): Promise<void> {
    console.log('Memory forget not implemented yet:', memoryId);
  }

  /**
   * Get memory adapter instance
   */
  getMemoryAdapter(): MemoryAdapter {
    return this.memoryAdapter;
  }
}