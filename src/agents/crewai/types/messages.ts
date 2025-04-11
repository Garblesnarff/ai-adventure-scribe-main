import { AgentState, StateChange } from './state';
import { MessageType, MessagePriority } from './communication';
import { AgentTask } from '../../types';

export interface BaseMessagePayload {
  timestamp?: Date;
  metadata?: Record<string, any>;
  sender?: string;
  receiver?: string;
}

export interface StateUpdateMessagePayload extends BaseMessagePayload {
  agentId: string;
  stateChanges: StateChange;
  previousState?: AgentState;
}

export interface MessagePayload extends BaseMessagePayload {
  type: MessageType;
  content: any;
}

export interface TaskMessagePayload extends BaseMessagePayload {
  task: AgentTask;
  priority: MessagePriority;
  delegatedBy?: string;
  requiredCapabilities?: string[];
}

export interface ResultMessagePayload extends BaseMessagePayload {
  taskId: string;
  success: boolean;
  data?: any;
  error?: string;
  executionTime?: number;
}

export interface QueryMessagePayload extends BaseMessagePayload {
  queryId: string;
  queryType: string;
  parameters: Record<string, any>;
  timeout?: number;
}

export interface ResponseMessagePayload extends BaseMessagePayload {
  queryId: string;
  data: any;
  status: 'success' | 'error' | 'partial';
}