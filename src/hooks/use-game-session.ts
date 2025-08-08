/**
 * useGameSession Hook
 * 
 * Manages the lifecycle of a game session, including creation, expiration,
 * cleanup, and summary generation. Handles session state and integrates with Supabase.
 * 
 * Dependencies:
 * - React hooks (useState, useEffect)
 * - Supabase client (src/integrations/supabase/client.ts)
 * - Toast notification hook (src/hooks/use-toast.ts)
 * - Game session types (src/types/game.ts)
 * 
 * @author AI Dungeon Master Team
 */

 // ============================
 // SDK/library imports
 // ============================
import { useState, useEffect, useCallback } from 'react';

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

const SESSION_EXPIRY_TIME = 1000 * 60 * 60; // 1 hour
const CLEANUP_INTERVAL = 1000 * 60 * 5; // Check every 5 minutes

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
  const [sessionState, setSessionState] = useState<'active' | 'expired' | 'ending' | 'loading'>('loading');
  const { toast } = useToast();

  const currentSessionId = sessionData?.id || null;

  /**
   * Creates a new game session in Supabase.
   * 
   * @returns {Promise<string | null>} The new session ID or null if failed
   */
  const createGameSession = useCallback(async (): Promise<string | null> => {
    if (!campaignId || !characterId) {
      toast({ title: "Error", description: "Campaign or Character ID missing for session creation.", variant: "destructive" });
      setSessionState('error'); // Or a specific error state
      return null;
    }
    setSessionState('loading');
    const { data, error } = await supabase
      .from('game_sessions')
      .insert([{ 
        session_number: 1, // This might need to be dynamic if multiple sessions per campaign/char
        status: 'active',
        campaign_id: campaignId,
        character_id: characterId,
        turn_count: 0,
        current_scene_description: "The adventure begins...", // Default scene
        session_notes: ""
      }])
      .select()
      .single();

    if (error) {
      console.error('Error creating game session:', error);
      setSessionState('error');
      toast({ title: "Error", description: "Failed to create game session", variant: "destructive" });
      return null;
    }
    setSessionData(data as ExtendedGameSession);
    setSessionState('active');
    return data.id;
  }, [campaignId, characterId, toast]);

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
        .order('timestamp', { ascending: true });

      if (error) {
        console.error('Error fetching dialogue history:', error);
        return "No activity recorded in this session";
      }

      if (!messages?.length) return "No activity recorded in this session";

      // Simple summary generation - can be enhanced with AI later
      const messageCount = messages.length;
      const playerActions = messages.filter(m => m.speaker_type === 'player').length;
      const dmResponses = messages.filter(m => m.speaker_type === 'dm').length;

      return `Session completed with ${messageCount} total interactions: ${playerActions} player actions and ${dmResponses} DM responses.`;
    } catch (err) {
      console.error('Error generating session summary:', err);
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
    return Date.now() - startTime > SESSION_EXPIRY_TIME;
  };

  /**
   * Cleans up an expired session, generates a summary, and updates status.
   * 
   * @param {string} sessionId - The session ID
   * @returns {Promise<string>} The generated summary
   */
  const cleanupSession = useCallback(async (sessionIdToClean: string): Promise<string> => {
    setSessionState('ending');
    const summary = await generateSessionSummary(sessionIdToClean);
    
    const { error } = await supabase
      .from('game_sessions')
      .update({ 
        end_time: new Date().toISOString(),
        summary,
        status: 'completed' as const
      })
      .eq('id', sessionIdToClean);

    if (error) {
      console.error('Error cleaning up session:', error);
      toast({ title: "Error", description: "Failed to cleanup session properly", variant: "destructive" });
    } else {
      setSessionState('expired');
      if (currentSessionId === sessionIdToClean) {
        setSessionData(prev => prev ? { ...prev, status: 'completed', end_time: new Date().toISOString(), summary } : null);
      }
    }
    return summary;
  }, [toast, currentSessionId]);


  const updateGameSessionState = useCallback(async (newState: Partial<ExtendedGameSession>) => {
    if (!currentSessionId) return;

    // Optimistically update local state
    setSessionData(prev => prev ? { ...prev, ...newState } : null);

    const { data, error } = await supabase
      .from('game_sessions')
      .update(newState)
      .eq('id', currentSessionId)
      .select()
      .single();

    if (error) {
      console.error('Error updating game session state:', error);
      toast({ title: "Error", description: "Failed to save game state. Changes may be lost.", variant: "destructive" });
      // Potentially revert optimistic update here or refetch
    } else if (data) {
      setSessionData(data as ExtendedGameSession); // Update with actual data from DB
    }
  }, [currentSessionId, toast]);


  /**
   * Initialize and maintain session
   */
  useEffect(() => {
    const initSession = async () => {
      setSessionState('loading');
      // Try to find an active session for this campaign & character
      // For MVP, we might just create a new one or load the latest.
      // This logic could be more complex (e.g. allow selecting from multiple sessions)
      if (campaignId && characterId) {
        const { data: existingSession, error: existingSessionError } = await supabase
          .from('game_sessions')
          .select('*')
          .eq('campaign_id', campaignId)
          .eq('character_id', characterId)
          .eq('status', 'active') // Only load active sessions
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(); // Use maybeSingle to not error if no session found

        if (existingSessionError) {
          console.error("Error fetching existing session:", existingSessionError);
          // Proceed to create a new session if error or no session found
        }
        
        if (existingSession) {
          if (isSessionExpired(existingSession as ExtendedGameSession)) {
            await cleanupSession(existingSession.id);
            // Fall through to create a new session
          } else {
            setSessionData(existingSession as ExtendedGameSession);
            setSessionState('active');
            return; // Found and loaded active session
          }
        }
      }
      // If no existing active session, or if campaignId/characterId not provided yet for loading
      if (campaignId && characterId) { // Only create if IDs are present
         await createGameSession();
      } else {
        setSessionState('idle'); // Or some other state indicating waiting for IDs
      }
    };

    initSession();
  }, [campaignId, characterId, createGameSession, cleanupSession]);


  // Periodic cleanup check (remains similar)
  useEffect(() => {
    const cleanupIntervalId = setInterval(async () => {
      if (sessionData && sessionData.id && sessionData.status === 'active') {
        if (isSessionExpired(sessionData)) {
          await cleanupSession(sessionData.id);
        }
      }
    }, CLEANUP_INTERVAL);

    return () => {
      clearInterval(cleanupIntervalId);
    };
  }, [sessionData, cleanupSession]);

  return { 
    sessionData, 
    setSessionData, // For direct manipulation if needed, e.g. notes
    sessionId: currentSessionId, 
    sessionState, 
    updateGameSessionState,
    createGameSession // Expose create if manual creation is ever needed
  };
};
