import { db as originalDb } from '../../../db/client.js';
import { dbQueryDuration, dbQueryTotal } from './metrics.js';
import { logger } from './logger.js';

export function wrapQueryWithMetrics(operation: string, table: string) {
  return async <T>(queryFn: () => Promise<T>): Promise<T> => {
    const start = Date.now();
    let success = true;

    try {
      const result = await queryFn();
      return result;
    } catch (error) {
      success = false;
      logger.error('Database query failed', {
        operation,
        table,
        error: (error as Error).message,
      });
      throw error;
    } finally {
      const duration = (Date.now() - start) / 1000;

      dbQueryDuration.observe({ operation, table }, duration);
      dbQueryTotal.inc({ operation, table, success: success.toString() });

      if (duration > 0.1) { // Log slow queries (> 100ms)
        logger.warn('Slow database query detected', {
          operation,
          table,
          duration: `${duration.toFixed(3)}s`,
        });
      }
    }
  };
}

// Export wrapped database client
export const db = originalDb;
