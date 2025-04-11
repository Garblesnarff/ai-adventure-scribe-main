import { Memory, MemoryType } from '@/components/game/memory/types';

/**
 * Interface for memory with relevance scoring
 */
export interface ScoredMemory {
  memory: Memory;
  relevanceScore: number;
}

/**
 * Interface for memory filtering options
 */
export interface MemoryFilter {
  category?: string;
  importance?: number;
  timeframe?: 'recent' | 'all';
}

/**
 * Interface for categorized memory context
 */
export interface MemoryContext {
  recent: Memory[];
  locations: Memory[];
  characters: Memory[];
  plot: Memory[];
  currentLocation?: {
    name: string;
    description?: string;
    type?: string;
  };
  activeNPCs?: Array<{
    name: string;
    type?: string;
    status: string;
  }>;
}

// Re-export the Memory and MemoryType types
export type { Memory, MemoryType };