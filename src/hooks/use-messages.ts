import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ChatMessage, MessageContext } from '@/types/game';
import logger from '@/lib/logger';

/**
 * Custom hook for fetching and managing game messages
 * @param sessionId - Current game session ID
 * @returns Query result containing messages array, loading state, and addMessage function
 */
export const useMessages = (sessionId: string | null) => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['messages', sessionId],
    queryFn: async () => {
      if (!sessionId) return [];

      const { data, error } = await supabase
        .from('dialogue_history')
        .select('*')
        .eq('session_id', sessionId)
        .order('timestamp', { ascending: true });

      if (error) {
        logger.error('Error fetching messages:', error);
        return [];
      }

      // Get the character data for this session to add avatar info to player messages
      const { data: sessionData } = await supabase
        .from('game_sessions')
        .select('character_id')
        .eq('id', sessionId)
        .single();

      let characterData = null;
      if (sessionData?.character_id) {
        const { data: char } = await supabase
          .from('characters')
          .select('name, avatar_url')
          .eq('id', sessionData.character_id)
          .single();
        characterData = char;
      }

      return data.map(msg => ({
        text: msg.message,
        sender: msg.speaker_type as ChatMessage['sender'],
        id: msg.id,
        timestamp: msg.timestamp,
        context: msg.context as MessageContext,
        images: Array.isArray((msg as any).images) ? (msg as any).images : undefined,
        // Add character info to player messages
        characterName: msg.speaker_type === 'player' && characterData ? characterData.name : undefined,
        characterAvatar: msg.speaker_type === 'player' && characterData ? characterData.avatar_url : undefined,
      }));
    },
    enabled: !!sessionId,
  });

  const addMessage = async (message: ChatMessage) => {
    if (!sessionId) return;

    try {
      const contextData = message.context ? {
        location: message.context.location || null,
        emotion: message.context.emotion || null,
        intent: message.context.intent || null
      } : {};

      const { error } = await supabase
        .from('dialogue_history')
        .insert({
          session_id: sessionId,
          message: message.text,
          speaker_type: message.sender,
          context: contextData,
          timestamp: new Date().toISOString(),
        });

      if (error) {
        logger.error('Error adding message:', error);
        throw error;
      }

      // Invalidate and refetch messages
      await queryClient.invalidateQueries({ queryKey: ['messages', sessionId] });
    } catch (error) {
      logger.error('Failed to add message:', error);
      throw error;
    }
  };

  return {
    ...query,
    addMessage,
  };
};