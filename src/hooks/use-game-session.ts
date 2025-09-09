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
  const [sessionState, setSessionState] = useState<'active' | 'expired' | 'ending' | 'loading' | 'error' | 'idle'>('loading');
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
    const currentTime = Date.now();
    const elapsed = currentTime - startTime;
    const isExpired = elapsed > SESSION_EXPIRY_TIME;
    
    if (isExpired) {
      console.log(`⏰ Session ${session.id} expired:`, {
        sessionId: session.id,
        startTime: new Date(startTime).toISOString(),
        currentTime: new Date(currentTime).toISOString(),
        elapsedHours: Math.round(elapsed / (1000 * 60 * 60) * 100) / 100,
        expiryHours: SESSION_EXPIRY_TIME / (1000 * 60 * 60)
      });
    } else {
      console.log(`✅ Session ${session.id} still active:`, {
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
      
      if (!campaignId || !characterId) {
        setSessionState('idle');
        return;
      }

      try {
        // First, try to find the most recent session for this campaign & character
        // Look for both active and completed sessions to get the latest one
        const { data: existingSessions, error: existingSessionError } = await supabase
          .from('game_sessions')
          .select('*')
          .eq('campaign_id', campaignId)
          .eq('character_id', characterId)
          .order('created_at', { ascending: false })
          .limit(5); // Get last 5 sessions to find the best one to resume

        if (existingSessionError) {
          console.error("Error fetching existing sessions:", existingSessionError);
          // If we can't fetch sessions, create a new one
          await createGameSession();
          return;
        }
        
        // Look for an active session first
        let sessionToResume = existingSessions?.find(s => s.status === 'active') as ExtendedGameSession | undefined;
        
        // If we have an active session, check if it's expired
        if (sessionToResume) {
          if (isSessionExpired(sessionToResume)) {
            console.log('Found active session but it has expired, cleaning up...');
            await cleanupSession(sessionToResume.id);
            sessionToResume = undefined;
          } else {
            console.log('Resuming active session:', sessionToResume.id);
            setSessionData(sessionToResume);
            setSessionState('active');
            return;
          }
        }
        
        // If no active session, look for the most recent completed session
        // and create a new session based on its state
        const lastCompletedSession = existingSessions?.find(s => s.status === 'completed');
        
        if (lastCompletedSession) {
          console.log('Creating new session continuing from previous session:', lastCompletedSession.id);
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

          if (error) {
            console.error('Error creating continuation session:', error);
            setSessionState('error');
            toast({ title: "Error", description: "Failed to create game session", variant: "destructive" });
            return;
          }
          
          setSessionData(data as ExtendedGameSession);
          setSessionState('active');
          return;
        }
        
        // No existing sessions found, create the first one
        console.log('No existing sessions found, creating first session');
        await createGameSession();
        
      } catch (error) {
        console.error('Error in session initialization:', error);
        setSessionState('error');
        toast({ title: "Error", description: "Failed to initialize game session", variant: "destructive" });
      }
    };

    initSession();
  }, [campaignId, characterId, createGameSession, cleanupSession, toast]);


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
