/**
 * IndexedDB Cleanup Hook
 *
 * Custom React hook for managing IndexedDB cleanup operations.
 * Provides access to cleanup stats and manual cleanup triggers.
 *
 * Usage:
 * ```tsx
 * const { stats, manualCleanup, isLoading } = useIndexedDBCleanup();
 *
 * // Display stats in settings/debug panel
 * <div>Last cleanup: {new Date(stats.lastCleanupTime).toLocaleString()}</div>
 * <div>Total deleted: {stats.totalMessagesDeleted}</div>
 *
 * // Manual cleanup button
 * <button onClick={() => manualCleanup()}>Clear Old Messages</button>
 * ```
 *
 * @author AI Dungeon Master Team
 */

import { useState, useEffect, useCallback } from 'react';

import { IndexedDBService } from '../agents/messaging/services/storage/IndexedDBService';
import { logger } from '../lib/logger';

interface CleanupStats {
  lastCleanupTime: number;
  totalMessagesDeleted: number;
  lastDeletedCount: number;
}

interface UseIndexedDBCleanupReturn {
  stats: CleanupStats;
  manualCleanup: (maxAgeMs?: number) => Promise<number>;
  isLoading: boolean;
  error: string | null;
  refreshStats: () => void;
}

/**
 * Hook for managing IndexedDB cleanup operations
 */
export function useIndexedDBCleanup(): UseIndexedDBCleanupReturn {
  const [stats, setStats] = useState<CleanupStats>({
    lastCleanupTime: 0,
    totalMessagesDeleted: 0,
    lastDeletedCount: 0,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshStats = useCallback(() => {
    try {
      const service = IndexedDBService.getInstance();
      const currentStats = service.getCleanupStats();
      setStats(currentStats);
      setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get cleanup stats';
      setError(errorMessage);
      logger.error('[useIndexedDBCleanup] Error getting stats:', err);
    }
  }, []);

  const manualCleanup = useCallback(
    async (maxAgeMs?: number): Promise<number> => {
      setIsLoading(true);
      setError(null);

      try {
        const service = IndexedDBService.getInstance();
        const deletedCount = await service.manualCleanup(maxAgeMs);

        // Refresh stats after cleanup
        refreshStats();

        logger.info(
          `[useIndexedDBCleanup] Manual cleanup completed: ${deletedCount} messages deleted`,
        );
        return deletedCount;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Cleanup failed';
        setError(errorMessage);
        logger.error('[useIndexedDBCleanup] Manual cleanup error:', err);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [refreshStats],
  );

  // Load initial stats on mount
  useEffect(() => {
    refreshStats();
  }, [refreshStats]);

  // Optionally refresh stats periodically (every 5 minutes)
  useEffect(() => {
    const interval = setInterval(
      () => {
        refreshStats();
      },
      5 * 60 * 1000,
    ); // 5 minutes

    return () => clearInterval(interval);
  }, [refreshStats]);

  return {
    stats,
    manualCleanup,
    isLoading,
    error,
    refreshStats,
  };
}

/**
 * Format cleanup stats for display
 */
export function formatCleanupStats(stats: CleanupStats): {
  lastCleanupText: string;
  totalDeletedText: string;
  lastDeletedText: string;
} {
  const lastCleanupText =
    stats.lastCleanupTime > 0 ? new Date(stats.lastCleanupTime).toLocaleString() : 'Never';

  const totalDeletedText = stats.totalMessagesDeleted.toLocaleString();
  const lastDeletedText = stats.lastDeletedCount.toLocaleString();

  return {
    lastCleanupText,
    totalDeletedText,
    lastDeletedText,
  };
}

/**
 * Get a human-readable time since last cleanup
 */
export function timeSinceLastCleanup(lastCleanupTime: number): string {
  if (lastCleanupTime === 0) {
    return 'Never';
  }

  const now = Date.now();
  const diff = now - lastCleanupTime;

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 24) {
    const days = Math.floor(hours / 24);
    return `${days} day${days !== 1 ? 's' : ''} ago`;
  }

  if (hours > 0) {
    return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
  }

  return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
}
