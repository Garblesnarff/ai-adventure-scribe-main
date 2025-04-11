export interface AgentState {
  id: string;
  status: AgentStatus;
  configuration: Record<string, any>;
  lastActive: Date;
}

export enum AgentStatus {
  IDLE = 'idle',
  BUSY = 'busy',
  ERROR = 'error',
  OFFLINE = 'offline'
}

export interface StateChange {
  status?: AgentStatus;
  configuration?: Record<string, any>;
  [key: string]: any;
}

export interface StateValidationResult {
  isValid: boolean;
  errors?: string[];
}