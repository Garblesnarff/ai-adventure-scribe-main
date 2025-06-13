import { Agent } from '@/types/agent'; // Assuming Agent will be moved here
import { AgentTool } from './tasks';
import { AgentMemory } from './memory';
import { AgentMessage } from './communication'; // MessageType, MessagePriority no longer exported from here
import { MessageType, MessagePriority } from '@/types/messaging';

/**
 * Enum for CrewAI agent roles
 */
export enum CrewAIRole {
  DungeonMaster = 'dungeon_master',
  MemoryKeeper = 'memory_keeper',
  RulesInterpreter = 'rules_interpreter',
  Narrator = 'narrator'
}

/**
 * Interface that bridges existing Agent with CrewAI capabilities
 */
export interface CrewAIAgentBridge extends Agent {
  id: string;
  role: string;
  goal: string;
  backstory: string;
  
  // Add optional CrewAI properties
  crewAIConfig?: {
    tools: AgentTool[];
    memory: AgentMemory;
    communicate: (message: AgentMessage) => Promise<void>;
  }
}
