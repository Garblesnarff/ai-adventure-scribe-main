/**
 * Types of queries that can be made between agents
 */
export enum QueryType {
  TASK_STATUS = 'TASK_STATUS',
  AGENT_STATUS = 'AGENT_STATUS',
  MEMORY_RETRIEVAL = 'MEMORY_RETRIEVAL'
}

/**
 * Status of a query in the system
 */
export enum QueryStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED'
}

/**
 * Base interface for query parameters
 */
export interface QueryParameters {
  queryId: string;
  timeout?: number;
  retryAttempts?: number;
}

/**
 * Task status query parameters
 */
export interface TaskStatusQueryParams extends QueryParameters {
  taskId: string;
}

/**
 * Agent status query parameters
 */
export interface AgentStatusQueryParams extends QueryParameters {
  agentId: string;
}

/**
 * Memory retrieval query parameters
 */
export interface MemoryRetrievalQueryParams extends QueryParameters {
  sessionId: string;
  memoryType?: string;
  limit?: number;
}

/**
 * Query response interface
 */
export interface QueryResponse {
  queryId: string;
  status: QueryStatus;
  data?: any;
  error?: string;
  timestamp: Date;
}