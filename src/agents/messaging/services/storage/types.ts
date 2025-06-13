import { Json } from '@/integrations/supabase/types';
import { QueuedMessage } from '@/types/messaging';

export interface StoredMessage {
  id: string;
  content: any;
  type: string;
  priority: string;
  timestamp: string;
  status: 'pending' | 'sent' | 'failed' | 'acknowledged';
  retryCount: number;
  metadata?: {
    sender: string;
    receiver: string;
  };
}

export interface QueueState {
  lastSyncTimestamp: string;
  messages: QueuedMessage[];
  pendingMessages: string[];
  processingMessage?: string;
  isOnline: boolean;
  metrics: {
    totalProcessed: number;
    failedDeliveries: number;
    avgProcessingTime: number;
  };
}

export interface StorageConfig {
  dbName: string;
  messageStoreName: string;
  queueStoreName: string;
  offlineStoreName: string;
  version: number;
}

// OfflineState has been moved to src/types/messaging.ts