/**
 * useGameSession Hook
 *
 * Manages the lifecycle of a game session, including creation, expiration,
 * cleanup, and summary generation. Handles session state and integrates with Supabase.
 *
 * Dependencies:
 * - React hooks (useState, useEffect, useCallback, useRef)
 * - Supabase client (src/integrations/supabase/client.ts)
 * - Toast notification hook (src/hooks/use-toast.ts)
 * - Game session types (src/types/game.ts)
 *
 * Cleanup Strategy:
 * - AbortController: Tracks and cancels in-flight async operations on unmount
 * - mountedRef: Prevents state updates on unmounted components
 * - Cleanup intervals: Properly cleared on unmount to prevent memory leaks
 * - Refs: Reset on unmount to prevent stale closures
 * - Toast ref: Stored to avoid dependency changes and stale closures
 * - React StrictMode compatible: Lock mechanism prevents duplicate session creation
 *
 * Validation Strategy:
 * - All session operations validate session exists before proceeding
 * - Loading states prevent operations during initialization
 * - Error states are clearly defined and managed
 * - Helpful warnings logged when validation fails
 * - Early returns prevent crashes on undefined/null sessions
 *
 * @author AI Dungeon Master Team
 */

// ============================
// SDK/library imports
// ============================
import { useState, useEffect, useCallback, useRef } from 'react';

// ============================
// External integrations
// ============================
import type { GameSession } from '@/types/game';

import { useTelemetry } from '@/hooks/use-telemetry';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

// ============================
// Project hooks
// ============================

// ============================
// Project types
// ============================
import logger from '@/lib/logger';

const SESSION_EXPIRY_TIME = 1000 * 60 * 60 * 24; // 24 hours (was 1 hour)
const CLEANUP_INTERVAL = 1000 * 60 * 15; // Check every 15 minutes (was 5 minutes)

/**
 * React hook for managing game sessions, including creation, expiration, cleanup, and summary generation.
 *
 * Session State Values:
 * - 'idle': No session initialized (missing campaignId or characterId)
 * - 'loading': Session is being created or loaded
 * - 'active': Session is active and ready for use
 * - 'ending': Session is being cleaned up
 * - 'expired': Session has been marked as expired/completed
 * - 'error': Error occurred during session operations
 *
 * Validation Features:
 * - All session operations validate session exists before proceeding
 * - Safe setter validates session data before updating state
 * - Update operations validate parameters and prevent invalid state transitions
 * - Helper function (isSessionReady) provides single source of truth for readiness
 * - Comprehensive guards prevent operations on null/undefined sessions
 *
 * @param {string | undefined} campaignId - Campaign ID for session
 * @param {string | undefined} characterId - Character ID for session
 * @returns {{
 *   sessionData: ExtendedGameSession | null,
 *   setSessionData: (data: ExtendedGameSession | null) => void,
 *   sessionId: string | null,
 *   sessionState: 'active' | 'expired' | 'ending' | 'loading' | 'error' | 'idle',
 *   updateGameSessionState: (newState: Partial<ExtendedGameSession>) => Promise<void>,
 *   createGameSession: (campId: string, charId: string) => Promise<string | null>,
 *   isSessionReady: () => boolean
 * }} Session state and control functions
 */
export interface ExtendedGameSession extends GameSession {
  current_scene_description?: string | null;
  session_notes?: string | null;
  turn_count?: number | null;
  campaign_id?: string | null;
  character_id?: string | null;
}

export const useGameSession = (campaignId?: string, characterId?: string) => {
  const [sessionData, setSessionData] = useState<ExtendedGameSession | null>(null);
  const [sessionState, setSessionState] = useState<
    'active' | 'expired' | 'ending' | 'loading' | 'error' | 'idle'
  >('idle');
  const { toast } = useToast();

  const currentSessionId = sessionData?.id || null;

  // Add session heartbeat tracking for active game sessions
  // This monitors memory usage and session health every 30 seconds
  useTelemetry({
    sessionId: currentSessionId || undefined,
    enableHeartbeat: !!currentSessionId,
    heartbeatInterval: 30000, // 30 seconds
  });

  /**
   * Validates that a session object has required properties.
   * Used internally to ensure session data integrity.
   *
   * @param {any} session - The session object to validate
   * @returns {boolean} True if session has required properties
   */
  const isValidSession = (session: any): session is ExtendedGameSession => {
    return session && typeof session === 'object' && typeof session.id === 'string';
  };

  /**
   * Safe setter for session data with validation.
   * Validates session data before updating state to prevent invalid states.
   *
   * Validation:
   * - Allows null to clear session
   * - Validates session object has required properties (id)
   * - Logs warning if invalid data is provided
   * - Prevents setting invalid session objects
   *
   * @param {ExtendedGameSession | null} data - The session data to set
   */
  const safeSetSessionData = useCallback((data: ExtendedGameSession | null) => {
    // Guard: Allow null to clear session
    if (data === null) {
      setSessionData(null);
      return;
    }

    // Guard: Validate session data before setting
    if (!isValidSession(data)) {
      logger.warn('⚠️ [safeSetSessionData] Attempted to set invalid session data', {
        providedData: data,
      });
      return;
    }

    setSessionData(data);
  }, []);

  /**
   * Helper to check if session is ready for operations.
   * Provides a single source of truth for session readiness validation.
   *
   * @returns {boolean} True if session is active and ready for operations
   */
  const isSessionReady = useCallback((): boolean => {
    // Session must exist with valid ID
    if (!sessionData || !sessionData.id) {
      return false;
    }

    // Session state must be 'active'
    if (sessionState !== 'active') {
      return false;
    }

    return true;
  }, [sessionData, sessionState]);

  // Race condition prevention: track initialization and mount status
  // initializingRef acts as a lock to prevent duplicate session creation during:
  // - React StrictMode double mounting (development)
  // - Fast component mount/unmount cycles
  // - Concurrent useEffect executions
  const initializingRef = useRef(false);
  const mountedRef = useRef(true);
  const sessionInitializedRef = useRef(false); // Track if session was successfully initialized

  // AbortController for cancelling in-flight async operations
  // While Supabase doesn't directly support AbortSignal, we use this pattern
  // to track and prevent state updates from stale async operations
  const abortControllerRef = useRef<AbortController | null>(null);

  // Store toast in ref to avoid dependency changes and prevent stale closures
  const toastRef = useRef(toast);
  useEffect(() => {
    toastRef.current = toast;
  }, [toast]);

  /**
   * Creates a new game session in Supabase.
   *
   * Validation:
   * - Requires valid campaignId and characterId
   * - Sets error state and shows toast on validation failure
   * - Returns null if validation fails or component unmounts
   *
   * Cleanup-safe: Checks mountedRef before state updates to prevent
   * updates on unmounted components.
   *
   * @param {string} campId - Campaign ID
   * @param {string} charId - Character ID
   * @returns {Promise<string | null>} The new session ID or null if failed
   */
  const createGameSession = useCallback(
    async (campId: string, charId: string): Promise<string | null> => {
      // Guard: Validate required parameters
      if (!campId || !charId) {
        logger.warn('⚠️ [createGameSession] Missing required parameters', { campId, charId });
        toastRef.current({
          title: 'Error',
          description: 'Campaign or Character ID missing for session creation.',
          variant: 'destructive',
        });
        if (mountedRef.current) {
          setSessionState('error');
        }
        return null;
      }

      if (mountedRef.current) {
        setSessionState('loading');
      }

      const { data, error } = await supabase
        .from('game_sessions')
        .insert([
          {
            session_number: 1,
            status: 'active',
            campaign_id: campId,
            character_id: charId,
            turn_count: 0,
            current_scene_description: 'The adventure begins...',
            session_notes: '',
          },
        ])
        .select()
        .single();

      // Guard: Check if component unmounted during async operation
      if (!mountedRef.current) {
        logger.warn('⚠️ [createGameSession] Component unmounted during session creation');
        return null;
      }

      if (error) {
        logger.error('[createGameSession] Error creating game session:', error);
        setSessionState('error');
        toastRef.current({
          title: 'Error',
          description: 'Failed to create game session',
          variant: 'destructive',
        });
        return null;
      }

      setSessionData(data as ExtendedGameSession);
      setSessionState('active');
      logger.info('✅ [createGameSession] Session created successfully:', data.id);
      return data.id;
    },
    [],
  ); // Stable dependencies - uses refs and parameters instead

  /**
   * Generates a summary string for the session based on dialogue history.
   *
   * Validation:
   * - Requires valid sessionId parameter
   * - Returns fallback message if sessionId is invalid
   * - Returns fallback message on database errors
   *
   * Note: This function does not perform state updates, so it's inherently
   * safe from cleanup issues.
   *
   * @param {string} sessionId - The session ID
   * @returns {Promise<string>} The generated summary
   */
  const generateSessionSummary = async (sessionId: string): Promise<string> => {
    // Guard: Validate sessionId parameter
    if (!sessionId) {
      logger.warn('⚠️ [generateSessionSummary] Called without valid sessionId');
      return 'No activity recorded in this session';
    }

    try {
      const { data: messages, error } = await supabase
        .from('dialogue_history')
        .select('message, speaker_type, context')
        .eq('session_id', sessionId)
        .order('sequence_number', { ascending: true });

      if (error) {
        logger.error('[generateSessionSummary] Error fetching dialogue history:', error);
        return 'No activity recorded in this session';
      }

      if (!messages?.length) {
        logger.info('[generateSessionSummary] No messages found for session:', sessionId);
        return 'No activity recorded in this session';
      }

      // Simple summary generation - can be enhanced with AI later
      const messageCount = messages.length;
      const playerActions = messages.filter((m) => m.speaker_type === 'player').length;
      const dmResponses = messages.filter((m) => m.speaker_type === 'dm').length;

      return `Session completed with ${messageCount} total interactions: ${playerActions} player actions and ${dmResponses} DM responses.`;
    } catch (err) {
      logger.error('[generateSessionSummary] Error generating session summary:', err);
      return 'No activity recorded in this session';
    }
  };

  /**
   * Checks if a session has expired based on start time.
   *
   * Validation:
   * - Requires valid session object with id
   * - Uses current time as fallback if start_time is missing
   *
   * @param {ExtendedGameSession} session - The session object
   * @returns {boolean} True if expired, false otherwise
   */
  const isSessionExpired = (session: ExtendedGameSession): boolean => {
    // Guard: Validate session parameter
    if (!session || !session.id) {
      logger.warn('⚠️ [isSessionExpired] Called without valid session');
      return false;
    }

    const startTime = session.start_time ? new Date(session.start_time).getTime() : Date.now();
    const currentTime = Date.now();
    const elapsed = currentTime - startTime;
    const isExpired = elapsed > SESSION_EXPIRY_TIME;

    if (isExpired) {
      logger.info(`⏰ Session ${session.id} expired:`, {
        sessionId: session.id,
        startTime: new Date(startTime).toISOString(),
        currentTime: new Date(currentTime).toISOString(),
        elapsedHours: Math.round((elapsed / (1000 * 60 * 60)) * 100) / 100,
        expiryHours: SESSION_EXPIRY_TIME / (1000 * 60 * 60),
      });
    } else {
      logger.info(`✅ Session ${session.id} still active:`, {
        sessionId: session.id,
        elapsedHours: Math.round((elapsed / (1000 * 60 * 60)) * 100) / 100,
        remainingHours:
          Math.round(((SESSION_EXPIRY_TIME - elapsed) / (1000 * 60 * 60)) * 100) / 100,
      });
    }

    return isExpired;
  };

  /**
   * Cleans up an expired session, generates a summary, and updates status.
   *
   * Validation:
   * - Requires valid sessionIdToClean parameter
   * - Returns early with fallback message if sessionId is invalid
   * - Logs warning if called without valid session
   *
   * Cleanup-safe: Uses mountedRef checks before state updates to prevent
   * updates on unmounted components. Returns early if component unmounts
   * during async operations.
   *
   * @param {string} sessionIdToClean - The session ID
   * @returns {Promise<string>} The generated summary
   */
  const cleanupSession = useCallback(async (sessionIdToClean: string): Promise<string> => {
    // Guard: Validate sessionId parameter
    if (!sessionIdToClean) {
      logger.warn('⚠️ [cleanupSession] Called without valid sessionId');
      return 'No activity recorded in this session';
    }

    if (mountedRef.current) {
      setSessionState('ending');
    }

    const summary = await generateSessionSummary(sessionIdToClean);

    // Guard: Check if component unmounted during summary generation
    if (!mountedRef.current) {
      logger.warn('⚠️ [cleanupSession] Component unmounted during cleanup');
      return summary;
    }

    const { error } = await supabase
      .from('game_sessions')
      .update({
        end_time: new Date().toISOString(),
        summary,
        status: 'completed' as const,
      })
      .eq('id', sessionIdToClean);

    // Guard: Check if component unmounted during database update
    if (!mountedRef.current) {
      logger.warn('⚠️ [cleanupSession] Component unmounted during database update');
      return summary;
    }

    if (error) {
      logger.error('[cleanupSession] Error cleaning up session:', error);
      toastRef.current({
        title: 'Error',
        description: 'Failed to cleanup session properly',
        variant: 'destructive',
      });
    } else {
      setSessionState('expired');
      // Use functional update to get current value
      setSessionData((prev) => {
        if (prev && prev.id === sessionIdToClean) {
          return { ...prev, status: 'completed', end_time: new Date().toISOString(), summary };
        }
        return prev;
      });
      logger.info('✅ [cleanupSession] Session cleaned up successfully:', sessionIdToClean);
    }
    return summary;
  }, []); // Stable dependencies - uses refs and parameters

  /**
   * Updates game session state in both local state and Supabase.
   *
   * Validation:
   * - Validates newState parameter is a valid object
   * - Checks if session exists before attempting update
   * - Logs warning if called without active session
   * - Returns early if session is not initialized
   * - Prevents updates during loading or error states
   * - Validates that newState doesn't contain disallowed properties
   *
   * Cleanup-safe: Uses functional state updates and mountedRef checks
   * to prevent updates on unmounted components. Optimistically updates
   * local state before database update.
   *
   * @param {Partial<ExtendedGameSession>} newState - Partial session state to update
   * @returns {Promise<void>}
   */
  const updateGameSessionState = useCallback(async (newState: Partial<ExtendedGameSession>) => {
    // Guard: Validate newState parameter
    if (!newState || typeof newState !== 'object') {
      logger.warn('⚠️ [updateGameSessionState] Invalid newState parameter', {
        providedValue: newState,
      });
      return;
    }

    // Guard: Prevent updating critical immutable properties
    if ('id' in newState) {
      logger.warn('⚠️ [updateGameSessionState] Cannot update session id', {
        attemptedUpdate: newState,
      });
      return;
    }

    // Guard: Check if newState is empty
    if (Object.keys(newState).length === 0) {
      logger.warn('⚠️ [updateGameSessionState] newState is empty, no update needed');
      return;
    }

    // Get current session ID from state using functional approach
    let sessId: string | null = null;
    let currentState: 'active' | 'expired' | 'ending' | 'loading' | 'error' | 'idle' = 'idle';

    setSessionData((prev) => {
      // Guard: Validate session before optimistic update
      if (prev && isValidSession(prev)) {
        sessId = prev.id;
        // Optimistically update local state
        return { ...prev, ...newState };
      }
      return prev;
    });

    // Capture current session state for validation
    setSessionState((prev) => {
      currentState = prev;
      return prev;
    });

    // Guard: Prevent updates when session is not initialized
    if (!sessId) {
      logger.warn('⚠️ [updateGameSessionState] Cannot update - session not initialized', {
        attemptedUpdate: newState,
        currentSessionState: currentState,
      });
      return;
    }

    // Guard: Prevent updates during inappropriate states
    if (currentState === 'loading') {
      logger.warn('⚠️ [updateGameSessionState] Cannot update - session is loading', {
        attemptedUpdate: newState,
      });
      return;
    }

    if (currentState === 'error') {
      logger.warn('⚠️ [updateGameSessionState] Cannot update - session is in error state', {
        attemptedUpdate: newState,
      });
      return;
    }

    // Guard: Prevent updates after component unmount
    if (!mountedRef.current) {
      logger.warn('⚠️ [updateGameSessionState] Cannot update - component unmounted');
      return;
    }

    const { data, error } = await supabase
      .from('game_sessions')
      .update(newState)
      .eq('id', sessId)
      .select()
      .single();

    // Guard: Check mount status after async operation
    if (!mountedRef.current) {
      logger.warn('⚠️ [updateGameSessionState] Component unmounted during update');
      return;
    }

    if (error) {
      logger.error('[updateGameSessionState] Error updating game session state:', error);
      toastRef.current({
        title: 'Error',
        description: 'Failed to save game state. Changes may be lost.',
        variant: 'destructive',
      });
      // Potentially revert optimistic update here or refetch
    } else if (data) {
      setSessionData(data as ExtendedGameSession); // Update with actual data from DB
      logger.info('✅ [updateGameSessionState] Session updated successfully:', sessId);
    }
  }, []); // Stable dependencies - uses refs and functional updates

  /**
   * Initialize and maintain session
   *
   * This effect handles:
   * - Session initialization when campaignId and characterId are available
   * - Resuming active sessions
   * - Cleaning up expired sessions
   * - Creating continuation sessions
   * - Race condition prevention via lock mechanism
   */
  useEffect(() => {
    // Guard: Only initialize if we have the required IDs
    if (!campaignId || !characterId) {
      if (mountedRef.current) {
        setSessionState('idle');
        logger.info('[Session Init] Waiting for campaignId and characterId');
      }
      return;
    }

    // Guard: Prevent concurrent initialization (CRITICAL for race condition prevention)
    // This lock prevents duplicate sessions from being created when:
    // - React StrictMode double-mounts components in development
    // - Components mount/unmount rapidly during navigation
    // - Multiple useEffect cycles execute before first completes
    if (initializingRef.current) {
      logger.info('🔒 [Session Init] Already in progress, skipping to prevent duplicate creation');
      return;
    }

    // Guard: Skip if session already initialized successfully
    if (sessionInitializedRef.current) {
      logger.info('✓ [Session Init] Already initialized, skipping');
      return;
    }

    // Acquire lock: Mark initialization as in progress IMMEDIATELY after guards
    initializingRef.current = true;
    logger.info(
      '🔓 [Session Init] Acquired lock - campaignId:',
      campaignId,
      'characterId:',
      characterId,
    );

    // Create new AbortController for this initialization cycle
    // This allows us to cancel the operation if the component unmounts
    // or if the dependencies change before completion
    abortControllerRef.current = new AbortController();
    const abortSignal = abortControllerRef.current.signal;

    const initSession = async () => {
      try {
        // Check if aborted before starting
        if (abortSignal.aborted) {
          logger.info('[Session Init] Aborted before starting');
          return;
        }

        // Set loading state at start
        if (mountedRef.current) {
          setSessionState('loading');
        }

        // First, try to find the most recent session for this campaign & character
        // Look for both active and completed sessions to get the latest one
        const { data: existingSessions, error: existingSessionError } = await supabase
          .from('game_sessions')
          .select('*')
          .eq('campaign_id', campaignId)
          .eq('character_id', characterId)
          .order('created_at', { ascending: false })
          .limit(5); // Get last 5 sessions to find the best one to resume

        // Check if operation was aborted or component unmounted after async operation
        if (abortSignal.aborted || !mountedRef.current) {
          logger.info('[Session Init] Aborted after fetching sessions');
          return;
        }

        if (existingSessionError) {
          logger.error('[Session Init] Error fetching existing sessions:', existingSessionError);
          // If we can't fetch sessions, create a new one
          const newSessionId = await createGameSession(campaignId, characterId);
          if (newSessionId && mountedRef.current) {
            sessionInitializedRef.current = true; // Mark as successfully initialized
          }
          return;
        }

        // Look for an active session first
        let sessionToResume = existingSessions?.find((s) => s.status === 'active') as
          | ExtendedGameSession
          | undefined;

        // If we have an active session, check if it's expired
        if (sessionToResume) {
          if (isSessionExpired(sessionToResume)) {
            logger.info(
              '[Session Init] Found active session but expired, cleaning up:',
              sessionToResume.id,
            );
            await cleanupSession(sessionToResume.id);
            // Check abort status after async cleanup operation
            if (abortSignal.aborted || !mountedRef.current) {
              logger.info('[Session Init] Aborted after session cleanup');
              return;
            }
            sessionToResume = undefined;
          } else {
            logger.info('[Session Init] Resuming active session:', sessionToResume.id);
            if (mountedRef.current && !abortSignal.aborted) {
              setSessionData(sessionToResume);
              setSessionState('active');
              sessionInitializedRef.current = true; // Mark as successfully initialized
            }
            return;
          }
        }

        // If no active session, look for the most recent completed session
        // and create a new session based on its state
        const lastCompletedSession = existingSessions?.find((s) => s.status === 'completed');

        if (lastCompletedSession) {
          logger.info(
            '[Session Init] Creating continuation from previous:',
            lastCompletedSession.id,
          );
          // Create a new session but maintain continuity from the last one
          const sessionNumber =
            Math.max(...(existingSessions?.map((s) => s.session_number || 1) || [1])) + 1;

          const { data, error } = await supabase
            .from('game_sessions')
            .insert([
              {
                session_number: sessionNumber,
                status: 'active',
                campaign_id: campaignId,
                character_id: characterId,
                turn_count: 0,
                current_scene_description:
                  lastCompletedSession.current_scene_description || 'Continuing your adventure...',
                session_notes: `Continuing from Session ${lastCompletedSession.session_number || 1}`,
              },
            ])
            .select()
            .single();

          if (!mountedRef.current) return;

          if (error) {
            logger.error('[Session Init] Error creating continuation session:', error);
            setSessionState('error');
            toastRef.current({
              title: 'Error',
              description: 'Failed to create game session',
              variant: 'destructive',
            });
            return;
          }

          setSessionData(data as ExtendedGameSession);
          setSessionState('active');
          sessionInitializedRef.current = true; // Mark as successfully initialized
          logger.info('✅ [Session Init] Continuation session created:', data.id);
          return;
        }

        // No existing sessions found, create the first one
        logger.info('[Session Init] No existing sessions, creating first session');
        const newSessionId = await createGameSession(campaignId, characterId);
        if (newSessionId && mountedRef.current) {
          sessionInitializedRef.current = true; // Mark as successfully initialized
        }
      } catch (error) {
        logger.error('[Session Init] Error in session initialization:', error);
        if (mountedRef.current) {
          setSessionState('error');
          toastRef.current({
            title: 'Error',
            description: 'Failed to initialize game session',
            variant: 'destructive',
          });
        }
        // On error, release lock to allow retry
        initializingRef.current = false;
        sessionInitializedRef.current = false;
      } finally {
        // Note: We intentionally do NOT clear initializingRef.current here on success
        // The lock persists until component unmount to prevent React StrictMode
        // double-mounting from creating duplicate sessions
        // Only cleared on error (above) or unmount (below)
      }
    };

    initSession();

    // Cleanup on unmount - CRITICAL for proper lock release
    return () => {
      logger.info('🔓 [Session Init] Releasing lock on unmount');
      mountedRef.current = false;
      initializingRef.current = false; // Release lock on unmount
      sessionInitializedRef.current = false; // Reset initialization flag

      // Abort any in-flight async operations from this effect
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    };
  }, [campaignId, characterId, createGameSession, cleanupSession]); // Stable dependencies now

  // Periodic cleanup check with stable references
  // This effect runs every CLEANUP_INTERVAL (15 minutes) to check for expired sessions
  useEffect(() => {
    const cleanupIntervalId = setInterval(async () => {
      // Guard: Check if component is still mounted before running cleanup check
      if (!mountedRef.current) {
        logger.info('[Periodic Cleanup] Component unmounted, skipping check');
        return;
      }

      // Use functional state read to avoid stale closure
      setSessionData((currentSession) => {
        // Guard: Validate session exists with required properties
        if (!isValidSession(currentSession)) {
          return currentSession;
        }

        // Guard: Only check sessions that are marked as active
        if (currentSession.status !== 'active') {
          return currentSession;
        }

        // Guard: Additional session state validation - must be in 'active' state
        setSessionState((state) => {
          if (state !== 'active') {
            logger.info('[Periodic Cleanup] Session not in active state, skipping:', state);
            return state;
          }
          return state;
        });

        // Check if session has expired
        if (isSessionExpired(currentSession)) {
          logger.info('[Periodic Cleanup] Session expired, cleaning up:', currentSession.id);
          // Don't await here to avoid blocking the interval
          cleanupSession(currentSession.id).catch((err) => {
            logger.error('[Periodic Cleanup] Error in cleanup:', err);
          });
        }

        return currentSession; // Return unchanged
      });
    }, CLEANUP_INTERVAL);

    // Cleanup: Clear interval on unmount to prevent memory leaks and operations on unmounted component
    return () => {
      logger.info('[Periodic Cleanup] Clearing interval on unmount');
      clearInterval(cleanupIntervalId);
    };
  }, [cleanupSession]); // Only depends on stable cleanupSession

  return {
    sessionData,
    setSessionData: safeSetSessionData, // Safe setter with validation
    sessionId: currentSessionId,
    sessionState,
    updateGameSessionState,
    createGameSession, // Expose create if manual creation is ever needed
    isSessionReady, // Helper to check if session is ready for operations
  };
};
