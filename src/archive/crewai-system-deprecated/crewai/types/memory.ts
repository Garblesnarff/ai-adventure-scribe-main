export interface AgentMemory {
  shortTerm: any[];
  longTerm: any[];
  retrieve: (context: any) => Promise<any[]>;
  store: (memory: any) => Promise<void>;
  forget: (memoryId: string) => Promise<void>;
}

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