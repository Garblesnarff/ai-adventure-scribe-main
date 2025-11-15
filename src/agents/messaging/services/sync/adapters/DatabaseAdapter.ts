import { supabase } from '@/integrations/supabase/client';
import { Json } from '@/integrations/supabase/types';
import { TypeConverter } from './TypeConverter';
import { MessageSequence, SyncState, VectorClock, SyncStatus } from '../types';
import { ErrorHandlingService } from '../../../../error/services/ErrorHandlingService';
import { ErrorCategory, ErrorSeverity } from '../../../../error/types';

export class DatabaseAdapter {
  private static errorHandler = ErrorHandlingService.getInstance();

  static async saveMessageSequence(sequence: MessageSequence): Promise<void> {
    await this.errorHandler.handleDatabaseOperation(
      async () =>
        supabase.from('message_sequences').insert({
          message_id: sequence.messageId,
          sequence_number: sequence.sequenceNumber,
          vector_clock: TypeConverter.toJson(sequence.vectorClock),
        }),
      {
        category: ErrorCategory.DATABASE,
        context: 'DatabaseAdapter.saveMessageSequence',
        severity: ErrorSeverity.HIGH,
      },
    );
  }

  static async updateSyncStatus(
    agentId: string,
    syncState: SyncState,
    vectorClock: VectorClock,
  ): Promise<void> {
    await this.errorHandler.handleDatabaseOperation(
      async () =>
        supabase.from('sync_status').upsert({
          agent_id: agentId,
          last_sync_timestamp: new Date().toISOString(),
          sync_state: TypeConverter.toJson(syncState),
          vector_clock: TypeConverter.toJson(vectorClock),
        }),
      {
        category: ErrorCategory.DATABASE,
        context: 'DatabaseAdapter.updateSyncStatus',
        severity: ErrorSeverity.HIGH,
      },
    );
  }

  static async getMessageSequence(messageId: string): Promise<MessageSequence | null> {
    const { data, error } = await this.errorHandler.handleDatabaseOperation(
      async () =>
        supabase.from('message_sequences').select('*').eq('message_id', messageId).single(),
      {
        category: ErrorCategory.DATABASE,
        context: 'DatabaseAdapter.getMessageSequence',
        severity: ErrorSeverity.HIGH,
      },
    );

    if (error || !data) return null;
    return TypeConverter.messageSequenceFromDb(data);
  }

  static async getAllMessageSequences(): Promise<MessageSequence[]> {
    const { data, error } = await this.errorHandler.handleDatabaseOperation(
      async () => supabase.from('message_sequences').select('*'),
      {
        category: ErrorCategory.DATABASE,
        context: 'DatabaseAdapter.getAllMessageSequences',
        severity: ErrorSeverity.HIGH,
      },
    );

    if (error || !data) return [];
    return data.map((record) => TypeConverter.messageSequenceFromDb(record));
  }

  static async getSyncStatus(agentId: string): Promise<SyncStatus | null> {
    const { data, error } = await this.errorHandler.handleDatabaseOperation(
      async () => supabase.from('sync_status').select('*').eq('agent_id', agentId).single(),
      {
        category: ErrorCategory.DATABASE,
        context: 'DatabaseAdapter.getSyncStatus',
        severity: ErrorSeverity.HIGH,
      },
    );

    if (error || !data) return null;
    return TypeConverter.syncStatusFromDb(data);
  }

  static async getLatestSyncStatus(): Promise<SyncStatus | null> {
    const { data, error } = await this.errorHandler.handleDatabaseOperation(
      async () =>
        supabase
          .from('sync_status')
          .select('*')
          .order('last_sync_timestamp', { ascending: false })
          .limit(1)
          .single(),
      {
        category: ErrorCategory.DATABASE,
        context: 'DatabaseAdapter.getLatestSyncStatus',
        severity: ErrorSeverity.HIGH,
      },
    );

    if (error || !data) return null;
    return TypeConverter.syncStatusFromDb(data);
  }

  static async getMessageById(messageId: string): Promise<any> {
    const { data, error } = await this.errorHandler.handleDatabaseOperation(
      async () => supabase.from('agent_communications').select('*').eq('id', messageId).single(),
      {
        category: ErrorCategory.DATABASE,
        context: 'DatabaseAdapter.getMessageById',
        severity: ErrorSeverity.HIGH,
      },
    );

    if (error || !data) return null;
    return TypeConverter.queuedMessageFromDb(data);
  }
}
