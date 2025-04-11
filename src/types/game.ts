import { Memory } from './memory';
import { Campaign } from './campaign';

export type SpeakerType = 'player' | 'dm' | 'system';

export type SessionStatus = 'active' | 'expired' | 'ending';

/**
 * Interface defining the structure of message context data
 * Must be compatible with Supabase's Json type
 */
export interface MessageContext {
  [key: string]: string | null | undefined;
  location?: string | null;
  emotion?: string | null;
  intent?: string | null;
}

/**
 * Interface for chat messages in the game
 */
export interface ChatMessage {
  text: string;
  sender: SpeakerType;
  id?: string;
  timestamp?: string;
  context?: MessageContext;
}

/**
 * Interface for game session data
 */
export interface GameSession {
  id: string;
  session_number: number;
  start_time: string;
  end_time?: string;
  summary?: string;
  status: 'active' | 'completed' | 'expired';
}

/**
 * Interface for complete game context
 */
export interface GameContext {
  campaign: {
    basic: {
      name: string;
      description?: string;
      genre?: string;
      status: string;
    };
    setting: {
      era: string;
      location: string;
      atmosphere: string;
    };
    thematicElements: {
      mainThemes: string[];
      recurringMotifs: string[];
      keyLocations: string[];
      importantNPCs: string[];
    };
  };
  character?: {
    basic: {
      name: string;
      race: string;
      class: string;
      level: number;
    };
    stats: {
      health: {
        current: number;
        max: number;
        temporary: number;
      };
      armorClass: number;
      abilities: Record<string, number>;
    };
    equipment: Array<{
      name: string;
      type: string;
      equipped: boolean;
    }>;
  };
  memories: {
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
  };
}

export type { Campaign };