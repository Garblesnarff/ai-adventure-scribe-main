export interface AgentContext {
  campaignContext: CampaignContext;
  characterContext: CharacterContext;
  memories: Memory[];
  gameState?: GameState;
  combatContext?: CombatContext;
}

export interface CombatContext {
  detection?: {
    isCombat: boolean;
    combatType: string;
    confidence: number;
    shouldStartCombat: boolean;
    shouldEndCombat: boolean;
    enemies?: Array<{
      name: string;
      type: string;
      estimatedCR: string;
      description: string;
      suggestedHP: number;
      suggestedAC: number;
    }>;
    combatActions?: Array<{
      actor: string;
      action: string;
      target?: string;
      weapon?: string;
      rollNeeded: boolean;
      rollType: string;
    }>;
  };
  encounter?: {
    status: string;
    currentRound: number;
    phase: string;
    location?: string;
    terrain?: string;
    visibility?: string;
    participants?: Array<{
      name: string;
      participantType: string;
      initiative: number;
      currentHitPoints: number;
      maxHitPoints: number;
      temporaryHitPoints: number;
      armorClass: number;
      conditions?: Array<{ name: string }>;
      deathSaves?: {
        successes: number;
        failures: number;
      };
    }>;
  };
}

export interface CampaignContext {
  name: string;
  genre: string;
  tone?: string;
  difficulty_level?: string;
  description?: string;
  setting_details?: {
    era?: string;
    location?: string;
    atmosphere?: string;
  };
  world_id?: string;
}

export interface CharacterContext {
  name: string;
  race: string;
  class: string;
  level: number;
  background?: string;
  description?: string;
  alignment?: string;
}

export interface Memory {
  id?: string;
  session_id?: string;
  type: string;
  content: string;
  importance?: number;
  embedding?: number[];
  metadata?: Record<string, any>;
  created_at?: string;
  updated_at?: string;
  category?: string;
}

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
  combat?: {
    isInCombat: boolean;
    activeEncounter?: {
      currentRound: number;
      phase: string;
      roundsElapsed: number;
      currentTurnParticipantId?: string;
      location?: string;
      visibility?: string;
      terrain?: string;
      environmentalEffects?: string[];
      participants: Array<{
        id: string;
        name: string;
        initiative: number;
        currentHitPoints: number;
        maxHitPoints: number;
        temporaryHitPoints: number;
        conditions: Array<{ name: string }>;
        deathSaves?: {
          successes: number;
          failures: number;
        };
      }>;
    };
  };
}

export interface NarrationSegment {
  type: 'narration' | 'dialogue' | 'action' | 'thought';
  text: string;
  character?: string;
  voice_category?: string;
}

export interface DiceRoll {
  type: 'attack' | 'damage' | 'saving_throw' | 'ability_check' | 'initiative' | 'skill_check';
  dice_notation: string; // e.g., "1d20+4", "2d6+3"
  result: number;
  modifier: number;
  target?: number; // DC or AC
  success?: boolean;
  critical?: boolean;
  actor: string;
  context: string; // Description of what the roll is for
}

export interface StructuredDMResponse {
  text: string; // Display text for chat
  narration_segments: NarrationSegment[]; // Pre-segmented for voice
  dice_rolls?: DiceRoll[]; // Structured dice roll data
}

export interface VoiceContext {
  available_categories: string[];
  character_mappings: Record<string, string>;
}

export interface DMResponse {
  environment: {
    description: string;
    atmosphere: string;
    sensoryDetails: string[];
  };
  characters: {
    activeNPCs: string[];
    reactions: string[];
    dialogue: string;
  };
  opportunities: {
    immediate: string[];
    nearby: string[];
    questHooks: string[];
  };
  mechanics: {
    availableActions: string[];
    relevantRules: string[];
    suggestions: string[];
  };
}