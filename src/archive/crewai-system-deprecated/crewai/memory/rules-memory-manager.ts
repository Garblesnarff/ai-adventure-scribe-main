/**
 * Rules Memory Manager for CrewAI
 * 
 * This file defines the RulesMemoryManager class, responsible for managing 
 * the Rules Interpreter agent's memory within the CrewAI framework. 
 * It uses a MemoryAdapter to interact with memory storage, potentially
 * storing rule interpretations or relevant rule snippets.
 * 
 * Main Class:
 * - RulesMemoryManager: Handles memory operations for the Rules Interpreter agent.
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