import { Json } from '@/integrations/supabase/types';

export enum MessageType {
  TASK = 'TASK',
  RESULT = 'RESULT',
  QUERY = 'QUERY',
  RESPONSE = 'RESPONSE',
  STATE_UPDATE = 'STATE_UPDATE',
}

export enum MessagePriority {
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW',
}

export interface MessageDeliveryStatus {
  delivered: boolean;
  timestamp: Date;
  attempts: number;
  error?: string;
}

export interface MessageAcknowledgment {
  id: string;
  messageId: string;
  status: 'pending' | 'received' | 'processed' | 'failed';
  attempts: number;
  lastAttempt?: Date;
  acknowledgedAt?: Date;
  timeoutAt?: Date;
  error?: string;
  metadata?: Record<string, any>;
}

export interface QueuedMessage {
  id: string;
  type: MessageType;
  content: Json;
  priority: MessagePriority;
  sender: string;
  receiver: string;
  timestamp: Date;
  deliveryStatus: MessageDeliveryStatus;
  retryCount: number;
  maxRetries: number;
}

export interface MessageQueueConfig {
  maxRetries: number;
  retryDelay: number;
  timeoutDuration: number;
  maxQueueSize: number;
}
