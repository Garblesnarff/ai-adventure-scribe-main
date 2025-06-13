// MessageType and MessagePriority moved to src/types/messaging.ts
// Import them from '@/types/messaging' if AgentMessage or other types in this file need them.
import { MessageType, MessagePriority } from '@/types/messaging';

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