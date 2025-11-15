/**
 * Telemetry Utility
 *
 * Comprehensive telemetry tracking for diagnosing session terminations,
 * WebGL context loss, memory pressure, and browser lifecycle events.
 *
 * @example
 * // Track page lifecycle
 * telemetry.trackPageLifecycle(sessionId);
 *
 * @example
 * // Check for crash on startup
 * const crashed = telemetry.detectCrash();
 * if (crashed) {
 *   logger.error('Previous session crashed', crashed);
 * }
 *
 * @example
 * // Mark session as active
 * telemetry.markSessionActive(sessionId);
 *
 * @example
 * // Clean shutdown
 * telemetry.markSessionClean(sessionId);
 */

import logger from './logger';

const SESSION_STORAGE_KEY = 'infiniteRealms_activeSession';
const CLEAN_SHUTDOWN_KEY = 'infiniteRealms_cleanShutdown';
const WEBGL_CONTEXT_LOST_KEY = 'infiniteRealms_webglContextLost';

/**
 * Interface for memory usage stats
 */
export interface MemoryStats {
  usedMB: number;
  totalMB: number;
  limitMB: number;
  percentage: number;
}

/**
 * Interface for crash detection result
 */
export interface CrashDetection {
  crashed: boolean;
  previousSessionId?: string;
  webglContextLostAt?: number;
  timeSinceContextLoss?: number;
}

/**
 * Get current memory usage statistics
 * Uses Chrome's performance.memory API when available
 */
export function getMemoryStats(): MemoryStats | null {
  // @ts-ignore - performance.memory is Chrome-specific
  if (typeof performance !== 'undefined' && performance.memory) {
    // @ts-ignore
    const memory = performance.memory;
    const usedMB = Math.round(memory.usedJSHeapSize / 1024 / 1024);
    const totalMB = Math.round(memory.totalJSHeapSize / 1024 / 1024);
    const limitMB = Math.round(memory.jsHeapSizeLimit / 1024 / 1024);
    const percentage = (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100;

    return {
      usedMB,
      totalMB,
      limitMB,
      percentage: Math.round(percentage * 10) / 10, // Round to 1 decimal
    };
  }

  return null;
}

/**
 * Log memory usage with optional metadata
 */
export function logMemoryUsage(sessionId?: string): void {
  const stats = getMemoryStats();
  if (stats) {
    const level = stats.percentage > 80 ? 'warn' : 'info';
    const message = stats.percentage > 80 ? '⚠️ High memory usage detected' : '📊 Memory usage';

    logger[level](message, {
      ...stats,
      sessionId,
    });
  }
}

/**
 * Mark a session as active in session storage
 * This allows us to detect crashes on next startup
 */
export function markSessionActive(sessionId: string): void {
  try {
    sessionStorage.setItem(SESSION_STORAGE_KEY, sessionId);
    sessionStorage.removeItem(CLEAN_SHUTDOWN_KEY);
    logger.debug('📝 Marked session as active', { sessionId });
  } catch (error) {
    logger.error('Failed to mark session active', { error });
  }
}

/**
 * Mark a session as cleanly shutdown
 * This prevents false positive crash detection
 */
export function markSessionClean(sessionId: string): void {
  try {
    sessionStorage.setItem(CLEAN_SHUTDOWN_KEY, sessionId);
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
    logger.debug('✅ Marked session as clean shutdown', { sessionId });
  } catch (error) {
    logger.error('Failed to mark session clean', { error });
  }
}

/**
 * Record WebGL context loss timestamp
 * Used to correlate context loss with session termination
 */
export function recordWebGLContextLoss(): void {
  try {
    const timestamp = Date.now();
    sessionStorage.setItem(WEBGL_CONTEXT_LOST_KEY, timestamp.toString());
    logger.warn('🎮 WebGL context loss recorded', { timestamp });
  } catch (error) {
    logger.error('Failed to record WebGL context loss', { error });
  }
}

/**
 * Detect if previous session crashed (unclean shutdown)
 * Call this on application startup
 */
export function detectCrash(): CrashDetection {
  try {
    const activeSession = sessionStorage.getItem(SESSION_STORAGE_KEY);
    const cleanShutdown = sessionStorage.getItem(CLEAN_SHUTDOWN_KEY);
    const webglContextLost = sessionStorage.getItem(WEBGL_CONTEXT_LOST_KEY);

    // If there was an active session but no clean shutdown marker, we crashed
    if (activeSession && !cleanShutdown) {
      const crashed = true;
      const previousSessionId = activeSession;

      let webglContextLostAt: number | undefined;
      let timeSinceContextLoss: number | undefined;

      if (webglContextLost) {
        webglContextLostAt = parseInt(webglContextLost, 10);
        // We don't know exact crash time, but we can show the context loss timestamp
        timeSinceContextLoss = undefined; // Would need crash timestamp to calculate
      }

      // Clean up the stored data
      sessionStorage.removeItem(SESSION_STORAGE_KEY);
      sessionStorage.removeItem(WEBGL_CONTEXT_LOST_KEY);

      return {
        crashed,
        previousSessionId,
        webglContextLostAt,
        timeSinceContextLoss,
      };
    }

    // Clean shutdown - remove any stale data
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
    sessionStorage.removeItem(CLEAN_SHUTDOWN_KEY);
    sessionStorage.removeItem(WEBGL_CONTEXT_LOST_KEY);

    return { crashed: false };
  } catch (error) {
    logger.error('Failed to detect crash', { error });
    return { crashed: false };
  }
}

/**
 * Track page lifecycle events (visibility, unload, pagehide)
 * Returns cleanup function to remove event listeners
 */
export function trackPageLifecycle(sessionId?: string): () => void {
  const handleVisibilityChange = () => {
    const state = document.hidden ? 'HIDDEN' : 'VISIBLE';
    logger.warn(`👁️ Tab visibility changed: ${state}`, {
      sessionId,
      timestamp: Date.now(),
      memory: getMemoryStats(),
    });

    // Log memory when tab becomes visible (returning from background)
    if (!document.hidden) {
      logMemoryUsage(sessionId);
    }
  };

  const handleBeforeUnload = (e: BeforeUnloadEvent) => {
    logger.warn('🚪 Page is unloading (beforeunload)', {
      reason: 'user_closing_tab_or_navigating',
      sessionId,
      timestamp: Date.now(),
    });

    // Don't mark as clean here - let the component unmount handler do it
    // This event fires for refreshes too, which we want to track separately
  };

  const handlePageHide = (e: PageTransitionEvent) => {
    const isPersisted = e.persisted;
    logger.warn(`📴 Page hidden (pagehide) - persisted: ${isPersisted}`, {
      reason: isPersisted ? 'back_forward_cache' : 'browser_kill_or_crash',
      sessionId,
      timestamp: Date.now(),
    });

    // If not persisted, likely a crash or force close
    if (!isPersisted && sessionId) {
      // Mark that we detected an unclean shutdown
      // But don't clear active session - let crash detection handle it
    }
  };

  // Add event listeners
  document.addEventListener('visibilitychange', handleVisibilityChange);
  window.addEventListener('beforeunload', handleBeforeUnload);
  window.addEventListener('pagehide', handlePageHide);

  logger.debug('📡 Page lifecycle tracking initialized', { sessionId });

  // Return cleanup function
  return () => {
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    window.removeEventListener('beforeunload', handleBeforeUnload);
    window.removeEventListener('pagehide', handlePageHide);
    logger.debug('📡 Page lifecycle tracking cleaned up', { sessionId });
  };
}

/**
 * Start session heartbeat logging with memory stats
 * Returns cleanup function to stop heartbeat
 */
export function startSessionHeartbeat(sessionId: string, intervalMs: number = 30000): () => void {
  logger.info('💓 Session heartbeat started', {
    sessionId,
    intervalSeconds: intervalMs / 1000,
  });

  const startTime = Date.now();

  const heartbeatId = setInterval(() => {
    const elapsedMs = Date.now() - startTime;
    const elapsedMinutes = Math.floor(elapsedMs / 60000);
    const elapsedSeconds = Math.floor((elapsedMs % 60000) / 1000);

    const memory = getMemoryStats();

    logger.debug('💓 Session heartbeat', {
      sessionId,
      activeFor: `${elapsedMinutes}m ${elapsedSeconds}s`,
      elapsedMs,
      memory,
    });

    // Warn if memory is high
    if (memory && memory.percentage > 80) {
      logger.warn('⚠️ High memory usage in session', {
        sessionId,
        ...memory,
      });
    }
  }, intervalMs);

  // Return cleanup function
  return () => {
    clearInterval(heartbeatId);
    logger.info('💓 Session heartbeat stopped', { sessionId });
  };
}

/**
 * Telemetry singleton for global access
 */
export const telemetry = {
  getMemoryStats,
  logMemoryUsage,
  markSessionActive,
  markSessionClean,
  recordWebGLContextLoss,
  detectCrash,
  trackPageLifecycle,
  startSessionHeartbeat,
};

export default telemetry;
