import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface GameSession {
  id: string;
  campaign_id: string;
  character_id: string;
  session_number: number;
  status: string;
  start_time: string;
  end_time?: string;
  summary?: string;
}

export const useSimpleGameSession = (campaignId?: string, characterId?: string) => {
  const { user } = useAuth();
  const [session, setSession] = useState<GameSession | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createGameSession = async (campaignId: string, characterId: string) => {
    if (!user) {
      throw new Error('User must be authenticated');
    }

    setLoading(true);
    setError(null);

    try {
      // Get the next session number
      const { data: existingSessions, error: countError } = await supabase
        .from('game_sessions')
        .select('session_number')
        .eq('campaign_id', campaignId)
        .order('session_number', { ascending: false })
        .limit(1);

      if (countError) throw countError;

      const nextSessionNumber = existingSessions.length > 0 
        ? existingSessions[0].session_number + 1 
        : 1;

      // Create new session
      const { data, error } = await supabase
        .from('game_sessions')
        .insert({
          campaign_id: campaignId,
          character_id: characterId,
          session_number: nextSessionNumber,
          status: 'active',
        })
        .select()
        .single();

      if (error) throw error;

      setSession(data);
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create session';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const getActiveSession = async (campaignId: string, characterId: string) => {
    setLoading(true);
    setError(null);

    try {
      // Look for existing active session
      const { data, error } = await supabase
        .from('game_sessions')
        .select('*')
        .eq('campaign_id', campaignId)
        .eq('character_id', characterId)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) throw error;

      if (data && data.length > 0) {
        setSession(data[0]);
        return data[0];
      }

      // No active session found, create one
      return await createGameSession(campaignId, characterId);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get session';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const endSession = async (sessionId: string, summary?: string) => {
    try {
      const { error } = await supabase
        .from('game_sessions')
        .update({
          status: 'completed',
          end_time: new Date().toISOString(),
          summary: summary,
        })
        .eq('id', sessionId);

      if (error) throw error;

      if (session?.id === sessionId) {
        setSession({ ...session, status: 'completed', end_time: new Date().toISOString(), summary });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to end session';
      setError(errorMessage);
      throw err;
    }
  };

  // Auto-load session when campaign and character are available
  useEffect(() => {
    if (campaignId && characterId && user) {
      getActiveSession(campaignId, characterId).catch(console.error);
    }
  }, [campaignId, characterId, user]);

  return {
    session,
    loading,
    error,
    createGameSession,
    getActiveSession,
    endSession,
  };
};