import { AgentTask } from '../../types';
import { MessagePriority } from './communication';

/**
 * Enhanced task interface that works with both systems
 */
export interface CrewAITask extends AgentTask {
  crewAIContext?: {
    assignedAgent?: string;
    priority?: MessagePriority;
    dependencies?: string[];
    status?: TaskStatus;
  }
}

/**
 * Interface for agent tools
 */
export interface AgentTool {
  name: string;
  description: string;
  execute: (params: any) => Promise<any>;
}

/**
 * Enum for task status
 */
export enum TaskStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED'
}

/**
 * Interface for task execution results
 */
export interface TaskResult {
  success: boolean;
  data?: any;
  error?: Error;
  metadata?: {
    executionTime: number;
    resourcesUsed?: string[];
    agentId: string;
  }
}