import type { Memory, MemoryType } from '@/components/game/memory/types';

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

export interface EnhancedMemory {
  id: string;
  type: 'dialogue' | 'description' | 'action' | 'scene_state';
  content: string;
  timestamp: string;
  importance: number;
  category: 'npc' | 'location' | 'player_action' | 'environment' | 'general';
  context: {
    location?: string;
    npcs?: string[];
    playerAction?: string;
    sceneState?: {
      currentLocation: string;
      activeNPCs: Array<{
        id: string;
        name: string;
        status: 'present' | 'departed' | 'inactive';
        lastInteraction?: string;
      }>;
      environmentDetails: {
        atmosphere: string;
        timeOfDay: string;
        sensoryDetails: string[];
      };
      playerState: {
        lastAction: string;
        currentInteraction?: string;
      };
    };
  };
  metadata: Record<string, any>;
}

export interface MemoryQueryOptions {
  category?: string;
  timeframe?: 'recent' | 'all';
  contextMatch?: {
    location?: string;
    npc?: string;
    action?: string;
  };
  limit?: number;
  query?: string;
  semanticSearch?: boolean;
}
