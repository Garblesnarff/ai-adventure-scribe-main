import React, { useEffect } from 'react';
import { GameInterface } from '@/components/GameInterface';
import { Button } from '@/components/ui/button';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface GameSessionProps {
  campaignId: string;
}

/**
 * GameSession component handles the game interface and session management
 * @param campaignId - ID of the current campaign
 */
export const GameSession: React.FC<GameSessionProps> = ({ campaignId }) => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const sessionId = searchParams.get('session');
  const characterId = searchParams.get('character');

  /**
   * Creates a new game session for the campaign and character
   */
  const createGameSession = async () => {
    try {
      // Create new game session
      const { data: session, error } = await supabase
        .from('game_sessions')
        .insert({
          campaign_id: campaignId,
          character_id: characterId,
          status: 'active',
        })
        .select()
        .single();

      if (error) throw error;

      // Update URL with new session ID
      navigate(`/campaign/${campaignId}?session=${session.id}&character=${characterId}`);

      toast({
        title: "Session Started",
        description: "Your game session has begun!",
      });

      return session;
    } catch (error) {
      console.error('Error creating game session:', error);
      toast({
        title: "Error",
        description: "Failed to start game session",
        variant: "destructive",
      });
      return null;
    }
  };

  /**
   * Validates the current session and creates a new one if needed
   */
  const validateSession = async () => {
    if (!sessionId && characterId) {
      await createGameSession();
    } else if (sessionId) {
      // Verify session exists and is valid
      const { data: session, error } = await supabase
        .from('game_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (error || !session || session.status !== 'active') {
        console.log('Invalid or expired session, creating new one');
        await createGameSession();
      }
    }
  };

  useEffect(() => {
    validateSession();
  }, [sessionId, characterId, campaignId]);

  if (!characterId) {
    return (
      <div className="text-center py-8">
        <h2 className="text-xl font-semibold mb-4">No Character Selected</h2>
        <p className="text-muted-foreground mb-4">
          Select a character to start playing this campaign
        </p>
        <Button
          onClick={() => navigate('/characters')}
          className="mx-auto"
        >
          Choose Character
        </Button>
      </div>
    );
  }

  return <GameInterface />;
};