import { AgentMemory } from '../types';
import { MemoryAdapter } from '../adapters/MemoryAdapter';

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