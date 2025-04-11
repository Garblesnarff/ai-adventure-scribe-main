/**
 * Enum for CrewAI message types
 */
export enum MessageType {
  TASK = 'TASK',
  RESULT = 'RESULT',
  QUERY = 'QUERY',
  RESPONSE = 'RESPONSE',
  STATE_UPDATE = 'STATE_UPDATE'
}

/**
 * Enum for message priorities
 */
export enum MessagePriority {
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW'
}

/**
 * Interface for CrewAI agent messages
 */
export interface AgentMessage {
  type: MessageType;
  content: any;
  metadata?: {
    priority?: MessagePriority;
    timestamp: Date;
    sender?: string;
    receiver?: string;
  }
}