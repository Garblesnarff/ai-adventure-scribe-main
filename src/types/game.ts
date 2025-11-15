import type { Campaign } from './campaign';
import type { Memory } from './memory';
import type { ActionOption } from '@/utils/parseMessageOptions';

export type SpeakerType = 'player' | 'dm' | 'system';

export type SessionStatus = 'active' | 'expired' | 'ending';

/**
 * Interface defining the structure of message context data
 * Must be compatible with Supabase's Json type
 */
export interface MessageContext {
  [key: string]: any;
  location?: string | null;
  emotion?: string | null;
  intent?: string | null;
  diceRoll?: {
    formula: string;
    count: number;
    dieType: number;
    modifier: number;
    advantage: boolean;
    disadvantage: boolean;
    results: number[];
    keptResults?: number[];
    total: number;
    naturalRoll?: number;
    critical?: boolean;
    label?: string;
    timestamp: string;
  };
  combatData?: {
    type: string;
    actor?: string;
    target?: string;
    roll?: any;
    dc?: number;
    success?: boolean;
    critical?: boolean;
    action?: any;
    description?: string;
    participants?: Array<{
      name: string;
      initiative: number;
      roll: any;
    }>;
    summary?: {
      rounds: number;
      totalDamage: number;
      participants: Array<{
        name: string;
        damageDealt: number;
        damageTaken: number;
        status: string;
      }>;
      outcome: string;
    };
  };
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
  narrationSegments?: Array<{
    type: 'narration' | 'dialogue' | 'action' | 'thought' | 'dm' | 'character' | 'transition';
    text: string;
    character?: string;
    voice_category?: string;
  }>;
  options?: ActionOption[];
  characterName?: string;
  characterAvatar?: string;
  // Optional inline images associated with this message (not persisted server-side yet)
  images?: Array<{
    url: string;
    prompt?: string;
    model?: string;
    quality?: 'low' | 'medium' | 'high';
    createdAt?: string;
  }>;
  // Optional DM-provided visual prompts to suggest generating an image for this scene
  imageRequests?: Array<{
    prompt: string;
    style?: string;
    quality?: 'low' | 'medium' | 'high';
  }>;
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
