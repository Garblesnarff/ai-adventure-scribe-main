export enum ErrorCategory {
  NETWORK = 'network',
  DATABASE = 'database',
  VALIDATION = 'validation',
  AGENT = 'agent',
  SYSTEM = 'system',
}

export enum ErrorSeverity {
  LOW = 1,
  MEDIUM = 2,
  HIGH = 3,
  CRITICAL = 4,
}

export interface ErrorMetadata {
  agentId?: string;
  sessionId?: string;
  taskId?: string;
  lastKnownGoodState?: any;
  [key: string]: any;
}
