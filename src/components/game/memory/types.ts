import type { Json } from '@/integrations/supabase/types';

/**
 * Base memory types - matches database constraint in memories table
 */
export type MemoryType =
  | 'general'
  | 'npc'
  | 'location'
  | 'quest'
  | 'item'
  | 'event'
  | 'story_beat'
  | 'character_moment'
  | 'world_detail'
  | 'dialogue_gem'
  | 'atmosphere'
  | 'plot_point'
  | 'foreshadowing';

/**
 * Memory subcategories for better organization
 */
export type MemorySubcategory =
  | 'current_location'
  | 'previous_location'
  | 'npc'
  | 'player'
  | 'player_action'
  | 'npc_action'
  | 'dialogue'
  | 'description'
  | 'environment'
  | 'item'
  | 'general';

/**
 * Type guard to check if a string is a valid MemoryType
 */
export function isValidMemoryType(type: string): type is MemoryType {
  return [
    'general',
    'npc',
    'location',
    'quest',
    'item',
    'event',
    'story_beat',
    'character_moment',
    'world_detail',
    'dialogue_gem',
    'atmosphere',
    'plot_point',
    'foreshadowing',
  ].includes(type);
}

/**
 * Type guard to check if a string is a valid MemorySubcategory
 */
export function isValidMemorySubcategory(subcategory: string): subcategory is MemorySubcategory {
  return [
    'current_location',
    'previous_location',
    'npc',
    'player',
    'player_action',
    'npc_action',
    'dialogue',
    'description',
    'environment',
    'item',
    'general',
  ].includes(subcategory);
}

/**
 * Scene state interface for context tracking
 */
export interface SceneState {
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
}

/**
 * Enhanced memory interface with new categorization features
 */
export interface Memory {
  id: string;
  type: MemoryType;
  subcategory?: MemorySubcategory;
  content: string;
  importance: number;
  embedding?: number[] | string | null;
  metadata: Json | null;
  created_at: string;
  session_id?: string | null;
  updated_at: string;
  context_id?: string;
  related_memories?: string[];
  tags?: string[];
}

/**
 * Interface for memory category configuration
 */
export interface MemoryCategory {
  type: MemoryType;
  label: string;
  icon: React.ReactNode;
  subcategories?: MemorySubcategory[];
}
