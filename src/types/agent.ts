import type { Campaign } from './campaign';
import type { MemoryContext } from './memory';

/**
 * Interface for agent execution results
 */
export interface AgentResult {
  success: boolean;
  message: string;
  data?: any;
}

/**
 * Interface for agent tasks
 */
export interface AgentTask {
  id: string;
  description: string;
  expectedOutput: string;
  context?: Record<string, any>;
}

/**
 * Types of agents available in the system
 */
export enum AgentType {
  DungeonMaster = 'dungeon_master',
  Narrator = 'narrator',
  RulesInterpreter = 'rules_interpreter',
}

/**
 * Base interface for all agents in the system
 */
export interface Agent {
  id: string;
  role: string;
  goal: string;
  backstory: string;
  verbose?: boolean;
  allowDelegation?: boolean;
}

/**
 * Interface for agent context data
 */
export interface AgentContext {
  campaign: Campaign;
  memories: MemoryContext;
  currentScene?: {
    location: string;
    characters: string[];
    mood: string;
  };
}

/**
 * Interface for rule conditions
 */
export interface RuleCondition {
  type:
    | 'ability_score'
    | 'class_requirement'
    | 'race_requirement'
    | 'level_requirement'
    | 'equipment_requirement'
    | 'resource_requirement';
  data: {
    ability?: string;
    minimum?: number;
    maximum?: number;
    requiredClass?: string;
    requiredRace?: string;
    minimumLevel?: number;
    requiredItems?: string[];
    resource?: string;
  };
  description: string;
  suggestion?: string;
  context?: {
    abilityScores?: Record<string, { score: number }>;
    class?: string;
    race?: string;
    level?: number;
    equipment?: string[];
    resources?: Record<string, number>;
  };
}

/**
 * Interface for rule requirements
 */
export interface RuleRequirement {
  type: 'prerequisite' | 'proficiency' | 'spell_slot' | 'action_economy' | 'component';
  data: {
    prerequisites?: Array<{
      type: string;
      value: string;
    }>;
    requiredProficiencies?: string[];
    level?: number;
    count?: number;
    actionType?: string;
    cost?: number;
    components?: Array<{
      type: string;
      name: string;
      cost?: number;
    }>;
  };
  description: string;
  suggestion?: string;
  context?: {
    character?: {
      features?: string[];
      spells?: string[];
      proficiencies?: string[];
    };
    spellSlots?: Record<number, number>;
    actions?: Record<string, number>;
    components?: Array<{
      name: string;
      type: string;
      value?: number;
    }>;
  };
}
