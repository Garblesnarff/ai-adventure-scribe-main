import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ChatMessage, MessageContext } from '@/types/game';

/**
 * Custom hook for fetching and managing game messages
 * @param sessionId - Current game session ID
 * @returns Query result containing messages array and loading state
 */
export const useMessages = (sessionId: string | null) => {
  return useQuery({
    queryKey: ['messages', sessionId],
    queryFn: async () => {
      if (!sessionId) return [];

      const { data, error } = await supabase
        .from('dialogue_history')
        .select('*')
        .eq('session_id', sessionId)
        .order('timestamp', { ascending: true });

      if (error) {
        console.error('Error fetching messages:', error);
        return [];
      }

      return data.map(msg => ({
        text: msg.message,
        sender: msg.speaker_type as ChatMessage['sender'],
        id: msg.id,
        timestamp: msg.timestamp,
        context: msg.context as MessageContext,
      }));
    },
    enabled: !!sessionId,
  });
};