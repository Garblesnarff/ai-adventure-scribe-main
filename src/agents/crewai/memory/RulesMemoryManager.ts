import { AgentMemory } from '../types';
import { MemoryAdapter } from '../adapters/MemoryAdapter';

export class RulesMemoryManager {
  private memoryAdapter: MemoryAdapter;

  constructor(sessionId: string) {
    this.memoryAdapter = new MemoryAdapter(sessionId);
  }

  initializeMemory(): AgentMemory {
    return {
      shortTerm: [],
      longTerm: [],
      retrieve: this.retrieveMemories.bind(this),
      store: this.storeMemory.bind(this),
      forget: this.forgetMemory.bind(this)
    };
  }

  private async retrieveMemories(context: any): Promise<any[]> {
    return this.memoryAdapter.getRecentMemories(5);
  }

  private async storeMemory(memory: any): Promise<void> {
    await this.memoryAdapter.storeMemory({
      ...memory,
      type: 'rule_interpretation'
    });
  }

  private async forgetMemory(memoryId: string): Promise<void> {
    console.log('Memory forget not implemented yet:', memoryId);
  }

  getMemoryAdapter(): MemoryAdapter {
    return this.memoryAdapter;
  }
}