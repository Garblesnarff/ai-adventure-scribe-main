export interface GameState {
  location: {
    name: string;
    description: string;
    atmosphere: string;
    timeOfDay: string;
  };
  activeNPCs: Array<{
    id: string;
    name: string;
    description: string;
    personality: string;
    currentStatus: string;
    lastInteraction?: string;
  }>;
  playerStatus: {
    currentHealth: number;
    maxHealth: number;
    conditions: string[];
    inventory: string[];
    activeEffects: string[];
  };
  sceneStatus: {
    currentAction: string;
    availableActions: string[];
    environmentalEffects: string[];
    threatLevel: 'none' | 'low' | 'medium' | 'high';
  };
}
