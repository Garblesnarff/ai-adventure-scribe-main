import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { processContent } from '@/utils/memoryClassification';
import { Memory, MemoryType, isValidMemoryType } from '@/components/game/memory/types';

export const useMemoryCreation = (sessionId: string | null) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const generateEmbedding = async (text: string) => {
    try {
      console.log('[Memory Creation] Starting embedding generation for text:', text);
      
      const { data, error } = await supabase.functions.invoke('generate-embedding', {
        body: { text },
      });

      if (error) throw error;
      
      if (!data?.embedding) {
        throw new Error('Invalid embedding format received from API');
      }

      return data.embedding;
    } catch (error) {
      console.error('[Memory Creation] Error generating embedding:', error);
      throw error;
    }
  };

  const validateMemory = (memory: Partial<Memory>): boolean => {
    if (!memory.content || typeof memory.content !== 'string') {
      console.error('[Memory Creation] Invalid content:', memory.content);
      return false;
    }

    if (!isValidMemoryType(memory.type)) {
      console.error('[Memory Creation] Invalid memory type:', memory.type);
      return false;
    }

    if (memory.importance && (memory.importance < 1 || memory.importance > 5)) {
      console.error('[Memory Creation] Invalid importance score:', memory.importance);
      return false;
    }

    return true;
  };

  const createMemory = useMutation({
    mutationFn: async (memory: Omit<Memory, 'id' | 'created_at' | 'updated_at'>) => {
      if (!sessionId) throw new Error('No active session');

      console.log('[Memory Creation] Starting memory creation process:', memory);
      
      if (!validateMemory(memory)) {
        throw new Error('Invalid memory data');
      }

      const embedding = await generateEmbedding(memory.content);
      
      console.log('[Memory Creation] Inserting memory into database:', {
        ...memory,
        session_id: sessionId,
        embedding
      });

      const { data, error } = await supabase
        .from('memories')
        .insert([{ 
          ...memory,
          session_id: sessionId,
          embedding,
          metadata: memory.metadata || {},
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) throw error;

      return data;
    },
    onSuccess: () => {
      console.log('[Memory Creation] Memory created successfully');
      queryClient.invalidateQueries({ queryKey: ['memories', sessionId] });
    },
    onError: (error) => {
      console.error('[Memory Creation] Error in memory creation mutation:', error);
      toast({
        title: "Error",
        description: "Failed to create memory: " + error.message,
        variant: "destructive",
      });
    },
  });

  const extractMemories = async (content: string) => {
    try {
      if (!sessionId) throw new Error('No active session');

      console.log('[Memory Creation] Processing content for memory extraction:', content);
      
      const memorySegments = processContent(content);
      
      console.log('[Memory Creation] Classified segments:', memorySegments);

      // Create memories for each classified segment
      for (const segment of memorySegments) {
        if (!isValidMemoryType(segment.type)) {
          console.warn('[Memory Creation] Skipping segment with invalid type:', segment);
          continue;
        }

        await createMemory.mutateAsync({
          session_id: sessionId,
          type: segment.type,
          content: segment.content,
          importance: segment.importance,
          metadata: {},
        });
      }

      console.log('[Memory Creation] Memory extraction completed successfully');
    } catch (error) {
      console.error('[Memory Creation] Error extracting memories:', error);
      throw error;
    }
  };

  return {
    createMemory: createMemory.mutate,
    extractMemories,
  };
};