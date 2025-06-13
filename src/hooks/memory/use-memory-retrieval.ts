import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Memory, isValidMemoryType } from '@/components/game/memory/types';

export const useMemoryRetrieval = (sessionId: string | null) => {
  return useQuery({
    queryKey: ['memories', sessionId],
    queryFn: async () => {
      if (!sessionId) return [];
      
      console.log('[Memory Retrieval] Fetching memories for session:', sessionId);
      
      const { data, error } = await supabase
        .from('memories')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[Memory Retrieval] Error fetching memories:', error);
        throw error;
      }

      console.log(`[Memory Retrieval] Retrieved ${data.length} memories`);
      
      // Transform and validate the data to match Memory type
      return data.map((memory): Memory => {
        // Validate and ensure memory type is correct
        const validatedType = isValidMemoryType(memory.type) ? memory.type : 'general';
        
        if (validatedType !== memory.type) {
          console.warn(`[Memory Retrieval] Invalid memory type detected: ${memory.type}, defaulting to 'general'`);
        }

        return {
          id: memory.id,
          type: validatedType,
          content: memory.content,
          importance: memory.importance || 0,
          embedding: typeof memory.embedding === 'string' 
            ? JSON.parse(memory.embedding)
            : memory.embedding,
          metadata: memory.metadata,
          created_at: memory.created_at || new Date().toISOString(),
          session_id: memory.session_id,
          updated_at: memory.updated_at || new Date().toISOString(),
        };
      });
    },
    enabled: !!sessionId,
  });
};