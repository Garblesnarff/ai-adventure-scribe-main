import { Json } from '@/integrations/supabase/types';

export interface AcknowledgmentData {
  messageId: string;
  status: 'pending' | 'received' | 'processed' | 'failed';
  attempts: number;
  lastAttempt?: Date;
  acknowledgedAt?: Date;
  timeoutAt?: Date;
  error?: string;
  metadata?: Record<string, any>;
}

export interface AcknowledgmentStatus {
  messageId: string;
  receiverId: string;
  timestamp: Date;
  status: 'pending' | 'received' | 'processed' | 'failed';
}
