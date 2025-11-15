import { MessageSequence } from '../types';
import { supabase } from '@/integrations/supabase/client';
import { TypeConverter } from '../adapters/TypeConverter';
import { logger } from '../../../../../lib/logger';

export class ConsistencyValidator {
  public async checkConsistency(): Promise<boolean> {
    try {
      const { data: sequences, error } = await supabase
        .from('message_sequences')
        .select('*')
        .order('sequence_number', { ascending: true });

      if (error) {
        throw error;
      }

      let isConsistent = true;
      let lastSequence = 0;

      for (const sequence of sequences) {
        if (sequence.sequence_number !== lastSequence + 1) {
          isConsistent = false;
          logger.warn(
            '[ConsistencyValidator] Consistency check failed:',
            `Expected ${lastSequence + 1}, got ${sequence.sequence_number}`,
          );
          break;
        }
        lastSequence = sequence.sequence_number;
      }

      return isConsistent;
    } catch (error) {
      logger.error('[ConsistencyValidator] Consistency check error:', error);
      return false;
    }
  }

  public async validateSequence(sequence: MessageSequence): Promise<boolean> {
    // Add any additional sequence validation logic here
    return true;
  }
}
