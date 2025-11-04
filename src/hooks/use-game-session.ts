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
 * @author AI Dungeon Master Team
 */

 // ============================
 // SDK/library imports
 // ============================
import { useState, useEffect, useCallback, useRef } from 'react';

 // ============================
 // External integrations
 // ============================
import { supabase } from '@/integrations/supabase/client';

 // ============================
 // Project hooks
 // ============================
import { useToast } from '@/hooks/use-toast';

 // ============================
 // Project types
 // ============================
import { GameSession } from '@/types/game';
import logger from '@/lib/logger';

const SESSION_EXPIRY_TIME = 1000 * 60 * 60 * 24; // 24 hours (was 1 hour)
const CLEANUP_INTERVAL = 1000 * 60 * 15; // Check every 15 minutes (was 5 minutes)

/**
 * React hook for managing game sessions, including creation, expiration, cleanup, and summary generation.
 * 
 * @returns {{
 *   sessionId: string | null,
 *   setSessionId: (id: string | null) => void,
 *   sessionState: 'active' | 'expired' | 'ending'
 * }} Session state and control functions
 */
export interface ExtendedGameSession extends GameSession {
  current_scene_description?: string | null;
  session_notes?: string | null;
  turn_count?: number | null;
  campaign_id?: string | null; // Ensure these are part of GameSession or ExtendedGameSession
  character_id?: string | null;
}

export const useGameSession = (campaignId?: string, characterId?: string) => {
  const [sessionData, setSessionData] = useState<ExtendedGameSession | null>(null);
  const [sessionState, setSessionState] = useState<'active' | 'expired' | 'ending' | 'loading' | 'error' | 'idle'>('idle');
  const { toast } = useToast();

  const currentSessionId = sessionData?.id || null;

  // Race condition prevention: track initialization and mount status
  const initializingRef = useRef(false);
  const mountedRef = useRef(true);

  // Store toast in ref to avoid dependency changes
  const toastRef = useRef(toast);
  useEffect(() => {
    toastRef.current = toast;
  }, [toast]);

  /**
   * Creates a new game session in Supabase.
   *
   * @returns {Promise<string | null>} The new session ID or null if failed
   */
  const createGameSession = useCallback(async (
    campId: string,
    charId: string
  ): Promise<string | null> => {
    if (!campId || !charId) {
      toastRef.current({ title: "Error", description: "Campaign or Character ID missing for session creation.", variant: "destructive" });
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
      .insert([{
        session_number: 1,
        status: 'active',
        campaign_id: campId,
        character_id: charId,
        turn_count: 0,
        current_scene_description: "The adventure begins...",
        session_notes: ""
      }])
      .select()
      .single();

    if (!mountedRef.current) return null;

    if (error) {
      logger.error('Error creating game session:', error);
      setSessionState('error');
      toastRef.current({ title: "Error", description: "Failed to create game session", variant: "destructive" });
      return null;
    }

    setSessionData(data as ExtendedGameSession);
    setSessionState('active');
    return data.id;
  }, []); // Stable dependencies - uses refs and parameters instead

  /**
   * Generates a summary string for the session based on dialogue history.
   * 
   * @param {string} sessionId - The session ID
   * @returns {Promise<string>} The generated summary
   */
  const generateSessionSummary = async (sessionId: string): Promise<string> => {
    try {
      const { data: messages, error } = await supabase
        .from('dialogue_history')
        .select('message, speaker_type, context')
        .eq('session_id', sessionId)
        .order('sequence_number', { ascending: true });

      if (error) {
        logger.error('Error fetching dialogue history:', error);
        return "No activity recorded in this session";
      }

      if (!messages?.length) return "No activity recorded in this session";

      // Simple summary generation - can be enhanced with AI later
      const messageCount = messages.length;
      const playerActions = messages.filter(m => m.speaker_type === 'player').length;
      const dmResponses = messages.filter(m => m.speaker_type === 'dm').length;

      return `Session completed with ${messageCount} total interactions: ${playerActions} player actions and ${dmResponses} DM responses.`;
    } catch (err) {
      logger.error('Error generating session summary:', err);
      return "No activity recorded in this session";
    }
  };

  /**
   * Checks if a session has expired based on start time.
   * 
   * @param {GameSession} session - The session object
   * @returns {boolean} True if expired, false otherwise
   */
  const isSessionExpired = (session: ExtendedGameSession): boolean => {
    const startTime = session.start_time ? new Date(session.start_time).getTime() : Date.now();
    const currentTime = Date.now();
    const elapsed = currentTime - startTime;
    const isExpired = elapsed > SESSION_EXPIRY_TIME;
    
    if (isExpired) {
      logger.info(`⏰ Session ${session.id} expired:`, {
        sessionId: session.id,
        startTime: new Date(startTime).toISOString(),
        currentTime: new Date(currentTime).toISOString(),
        elapsedHours: Math.round(elapsed / (1000 * 60 * 60) * 100) / 100,
        expiryHours: SESSION_EXPIRY_TIME / (1000 * 60 * 60)
      });
    } else {
      logger.info(`✅ Session ${session.id} still active:`, {
        sessionId: session.id,
        elapsedHours: Math.round(elapsed / (1000 * 60 * 60) * 100) / 100,
        remainingHours: Math.round((SESSION_EXPIRY_TIME - elapsed) / (1000 * 60 * 60) * 100) / 100
      });
    }
    
    return isExpired;
  };

  /**
   * Cleans up an expired session, generates a summary, and updates status.
   *
   * @param {string} sessionIdToClean - The session ID
   * @returns {Promise<string>} The generated summary
   */
  const cleanupSession = useCallback(async (sessionIdToClean: string): Promise<string> => {
    if (mountedRef.current) {
      setSessionState('ending');
    }

    const summary = await generateSessionSummary(sessionIdToClean);

    if (!mountedRef.current) return summary;

    const { error } = await supabase
      .from('game_sessions')
      .update({
        end_time: new Date().toISOString(),
        summary,
        status: 'completed' as const
      })
      .eq('id', sessionIdToClean);

    if (!mountedRef.current) return summary;

    if (error) {
      logger.error('Error cleaning up session:', error);
      toastRef.current({ title: "Error", description: "Failed to cleanup session properly", variant: "destructive" });
    } else {
      setSessionState('expired');
      // Use functional update to get current value
      setSessionData(prev => {
        if (prev && prev.id === sessionIdToClean) {
          return { ...prev, status: 'completed', end_time: new Date().toISOString(), summary };
        }
        return prev;
      });
    }
    return summary;
  }, []); // Stable dependencies - uses refs and parameters


  const updateGameSessionState = useCallback(async (newState: Partial<ExtendedGameSession>) => {
    // Get current session ID from state using functional approach
    let sessId: string | null = null;
    setSessionData(prev => {
      if (prev) {
        sessId = prev.id;
        // Optimistically update local state
        return { ...prev, ...newState };
      }
      return prev;
    });

    if (!sessId || !mountedRef.current) return;

    const { data, error } = await supabase
      .from('game_sessions')
      .update(newState)
      .eq('id', sessId)
      .select()
      .single();

    if (!mountedRef.current) return;

    if (error) {
      logger.error('Error updating game session state:', error);
      toastRef.current({ title: "Error", description: "Failed to save game state. Changes may be lost.", variant: "destructive" });
      // Potentially revert optimistic update here or refetch
    } else if (data) {
      setSessionData(data as ExtendedGameSession); // Update with actual data from DB
    }
  }, []); // Stable dependencies - uses refs and functional updates


  /**
   * Initialize and maintain session
   */
  useEffect(() => {
    // Guard: Only initialize if we have the required IDs
    if (!campaignId || !characterId) {
      if (mountedRef.current) {
        setSessionState('idle');
      }
      return;
    }

    // Guard: Prevent concurrent initialization
    if (initializingRef.current) {
      logger.info('Session initialization already in progress, skipping...');
      return;
    }

    // Mark initialization as in progress IMMEDIATELY after checks
    initializingRef.current = true;

    const initSession = async () => {
      try {
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

        // Check if still mounted after async operation
        if (!mountedRef.current) return;

        if (existingSessionError) {
          logger.error("Error fetching existing sessions:", existingSessionError);
          // If we can't fetch sessions, create a new one
          await createGameSession(campaignId, characterId);
          return;
        }

        // Look for an active session first
        let sessionToResume = existingSessions?.find(s => s.status === 'active') as ExtendedGameSession | undefined;

        // If we have an active session, check if it's expired
        if (sessionToResume) {
          if (isSessionExpired(sessionToResume)) {
            logger.info('Found active session but it has expired, cleaning up...');
            await cleanupSession(sessionToResume.id);
            if (!mountedRef.current) return;
            sessionToResume = undefined;
          } else {
            logger.info('Resuming active session:', sessionToResume.id);
            if (mountedRef.current) {
              setSessionData(sessionToResume);
              setSessionState('active');
            }
            return;
          }
        }

        // If no active session, look for the most recent completed session
        // and create a new session based on its state
        const lastCompletedSession = existingSessions?.find(s => s.status === 'completed');

        if (lastCompletedSession) {
          logger.info('Creating new session continuing from previous session:', lastCompletedSession.id);
          // Create a new session but maintain continuity from the last one
          const sessionNumber = Math.max(
            ...(existingSessions?.map(s => s.session_number || 1) || [1])
          ) + 1;

          const { data, error } = await supabase
            .from('game_sessions')
            .insert([{
              session_number: sessionNumber,
              status: 'active',
              campaign_id: campaignId,
              character_id: characterId,
              turn_count: 0,
              current_scene_description: lastCompletedSession.current_scene_description || "Continuing your adventure...",
              session_notes: `Continuing from Session ${lastCompletedSession.session_number || 1}`
            }])
            .select()
            .single();

          if (!mountedRef.current) return;

          if (error) {
            logger.error('Error creating continuation session:', error);
            setSessionState('error');
            toastRef.current({ title: "Error", description: "Failed to create game session", variant: "destructive" });
            return;
          }

          setSessionData(data as ExtendedGameSession);
          setSessionState('active');
          return;
        }

        // No existing sessions found, create the first one
        logger.info('No existing sessions found, creating first session');
        await createGameSession(campaignId, characterId);

      } catch (error) {
        logger.error('Error in session initialization:', error);
        if (mountedRef.current) {
          setSessionState('error');
          toastRef.current({ title: "Error", description: "Failed to initialize game session", variant: "destructive" });
        }
      } finally {
        // Always clear the initialization flag
        initializingRef.current = false;
      }
    };

    initSession();

    // Cleanup on unmount
    return () => {
      mountedRef.current = false;
    };
  }, [campaignId, characterId, createGameSession, cleanupSession]); // Stable dependencies now


  // Periodic cleanup check with stable references
  useEffect(() => {
    const cleanupIntervalId = setInterval(async () => {
      // Use functional state read to avoid stale closure
      setSessionData(currentSession => {
        if (currentSession && currentSession.id && currentSession.status === 'active') {
          if (isSessionExpired(currentSession)) {
            // Don't await here to avoid blocking the interval
            cleanupSession(currentSession.id).catch(err => {
              logger.error('Error in periodic cleanup:', err);
            });
          }
        }
        return currentSession; // Return unchanged
      });
    }, CLEANUP_INTERVAL);

    return () => {
      clearInterval(cleanupIntervalId);
    };
  }, [cleanupSession]); // Only depends on stable cleanupSession

  return { 
    sessionData, 
    setSessionData, // For direct manipulation if needed, e.g. notes
    sessionId: currentSessionId, 
    sessionState, 
    updateGameSessionState,
    createGameSession // Expose create if manual creation is ever needed
  };
};
