import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import logger from '@/lib/logger';

interface SessionValidatorProps {
  sessionId: string | null;
  campaignId: string | null;
  characterId: string | null;
}

/**
 * Custom hook for validating game session data
 * @param sessionId - Current session ID
 * @param campaignId - Current campaign ID
 * @param characterId - Current character ID
 * @returns Boolean indicating if session is valid
 */
export const useSessionValidator = ({
  sessionId,
  campaignId,
  characterId,
}: SessionValidatorProps) => {
  const { toast } = useToast();

  const validateSession = async () => {
    if (!sessionId || !campaignId || !characterId) {
      logger.error('Missing required IDs:', { sessionId, campaignId, characterId });
      toast({
        title: 'Session Error',
        description: 'Missing required session information',
        variant: 'destructive',
      });
      return false;
    }

    // Verify session exists with required data
    const { data: session, error } = await supabase
      .from('game_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('campaign_id', campaignId)
      .eq('character_id', characterId)
      .single();

    if (error || !session) {
      logger.error('Session validation failed:', error || 'Session not found');
      toast({
        title: 'Session Error',
        description: 'Invalid game session. Please try starting a new game.',
        variant: 'destructive',
      });
      return false;
    }

    return true;
  };

  return validateSession;
};
