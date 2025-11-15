import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { GameInterface } from '@/features/game-session/components';
import { Button } from '@/components/ui/button';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useGameSession } from '@/features/game-session';
import { useToast } from '@/hooks/use-toast';
import { fadeInUp, cardItem } from '@/utils/animations';

interface GameSessionProps {
  campaignId: string;
}

/**
 * GameSession component handles the game interface and session management
 * @param campaignId - ID of the current campaign
 */
export const GameSession: React.FC<GameSessionProps> = ({ campaignId }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const characterId = searchParams.get('character');
  
  // Use the improved useGameSession hook
  const { 
    sessionData, 
    sessionId, 
    sessionState
  } = useGameSession(campaignId, characterId || undefined);

  // Update URL with session ID when available
  useEffect(() => {
    if (sessionId && characterId) {
      const currentSessionParam = searchParams.get('session');
      if (currentSessionParam !== sessionId) {
        const newSearchParams = new URLSearchParams(searchParams);
        newSearchParams.set('session', sessionId);
        setSearchParams(newSearchParams, { replace: true });
      }
    }
  }, [sessionId, characterId, searchParams, setSearchParams]);

  // Show loading state while session is being initialized
  if (sessionState === 'loading') {
    return (
      <motion.div
        variants={fadeInUp}
        initial="hidden"
        animate="visible"
        className="text-center py-8"
      >
        <h2 className="text-xl font-semibold mb-4">Loading Game Session</h2>
        <p className="text-muted-foreground">Preparing your adventure...</p>
      </motion.div>
    );
  }

  // Show error state if session initialization failed
  if (sessionState === 'error') {
    return (
      <motion.div
        variants={cardItem}
        initial="hidden"
        animate="visible"
        className="text-center py-8"
      >
        <h2 className="text-xl font-semibold mb-4">Session Error</h2>
        <p className="text-muted-foreground mb-4">
          Failed to initialize your game session. Please try refreshing the page.
        </p>
        <Button
          onClick={() => window.location.reload()}
          className="mx-auto"
        >
          Refresh Page
        </Button>
      </motion.div>
    );
  }

  if (!characterId) {
    return (
      <motion.div
        variants={cardItem}
        initial="hidden"
        animate="visible"
        className="text-center py-8"
      >
        <h2 className="text-xl font-semibold mb-4">No Character Selected</h2>
        <p className="text-muted-foreground mb-4">
          Select a character to start playing this campaign
        </p>
        <Button
          onClick={() => navigate('/app/characters')}
          className="mx-auto"
        >
          Choose Character
        </Button>
      </motion.div>
    );
  }

  // Show session resumption info if we have session data
  if (sessionData && sessionState === 'active') {
    const isNewSession = sessionData.turn_count === 0;
    const sessionInfo = isNewSession 
      ? "Starting a new adventure" 
      : `Resuming Session ${sessionData.session_number || 1} - Turn ${sessionData.turn_count || 0}`;
    
    // Show a brief info message for session resumption
    if (!isNewSession && sessionData.current_scene_description) {
      toast({
        title: "Adventure Resumed",
        description: sessionInfo,
        duration: 3000,
      });
    }
  }

  return <GameInterface />;
};
