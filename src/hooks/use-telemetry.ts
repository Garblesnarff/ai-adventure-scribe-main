/**
 * React Hook for Telemetry Tracking
 *
 * Provides React lifecycle integration for telemetry tracking.
 * Auto-sets up page lifecycle listeners and optionally session heartbeat.
 *
 * @example
 * // In App.tsx for global tracking
 * function App() {
 *   useTelemetry({ enableCrashDetection: true });
 *   // ...
 * }
 *
 * @example
 * // In game session for session-specific tracking
 * function GameSession({ sessionId }: { sessionId: string }) {
 *   useTelemetry({
 *     sessionId,
 *     enableHeartbeat: true,
 *     heartbeatInterval: 30000, // 30 seconds
 *   });
 *   // ...
 * }
 */

import { useEffect, useRef } from 'react';

import logger from '@/lib/logger';
import telemetry from '@/lib/telemetry';

export interface UseTelemetryOptions {
  /**
   * Optional session ID to track
   */
  sessionId?: string;

  /**
   * Enable crash detection on mount (checks for unclean shutdown)
   * Default: false
   */
  enableCrashDetection?: boolean;

  /**
   * Enable session heartbeat logging
   * Default: false
   */
  enableHeartbeat?: boolean;

  /**
   * Heartbeat interval in milliseconds
   * Default: 30000 (30 seconds)
   */
  heartbeatInterval?: number;

  /**
   * Mark session as active on mount
   * Default: true if sessionId is provided
   */
  markSessionActive?: boolean;

  /**
   * Mark session as clean on unmount
   * Default: true if sessionId is provided
   */
  markSessionClean?: boolean;
}

/**
 * React hook for telemetry tracking
 */
export function useTelemetry(options: UseTelemetryOptions = {}) {
  const {
    sessionId,
    enableCrashDetection = false,
    enableHeartbeat = false,
    heartbeatInterval = 30000,
    markSessionActive: shouldMarkActive = !!sessionId,
    markSessionClean: shouldMarkClean = !!sessionId,
  } = options;

  // Use refs to track cleanup functions
  const lifecycleCleanupRef = useRef<(() => void) | null>(null);
  const heartbeatCleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    // Crash detection on mount (app startup)
    if (enableCrashDetection) {
      const crashDetection = telemetry.detectCrash();

      if (crashDetection.crashed) {
        logger.error('🔴 Detected unclean session termination', {
          previousSessionId: crashDetection.previousSessionId,
          likelyReason: 'browser_crash_or_force_close',
          webglContextLostAt: crashDetection.webglContextLostAt,
          webglContextLostAgo: crashDetection.webglContextLostAt
            ? `${Math.floor((Date.now() - crashDetection.webglContextLostAt) / 1000)}s ago`
            : undefined,
        });
      } else {
        logger.debug('✅ No crash detected - clean startup');
      }
    }

    // Mark session as active
    if (shouldMarkActive && sessionId) {
      telemetry.markSessionActive(sessionId);
    }

    // Setup page lifecycle tracking
    lifecycleCleanupRef.current = telemetry.trackPageLifecycle(sessionId);

    // Setup heartbeat if enabled
    if (enableHeartbeat && sessionId) {
      heartbeatCleanupRef.current = telemetry.startSessionHeartbeat(sessionId, heartbeatInterval);
    }

    // Log initial memory state
    telemetry.logMemoryUsage(sessionId);

    // Cleanup on unmount
    return () => {
      // Stop heartbeat first
      if (heartbeatCleanupRef.current) {
        heartbeatCleanupRef.current();
        heartbeatCleanupRef.current = null;
      }

      // Stop lifecycle tracking
      if (lifecycleCleanupRef.current) {
        lifecycleCleanupRef.current();
        lifecycleCleanupRef.current = null;
      }

      // Mark session as clean if unmounting normally
      if (shouldMarkClean && sessionId) {
        telemetry.markSessionClean(sessionId);
      }
    };
  }, [
    sessionId,
    enableCrashDetection,
    enableHeartbeat,
    heartbeatInterval,
    shouldMarkActive,
    shouldMarkClean,
  ]);

  // Return telemetry utilities for manual use
  return {
    logMemory: () => telemetry.logMemoryUsage(sessionId),
    getMemoryStats: telemetry.getMemoryStats,
    recordWebGLContextLoss: telemetry.recordWebGLContextLoss,
  };
}

export default useTelemetry;
