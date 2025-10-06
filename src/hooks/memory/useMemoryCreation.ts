import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { processContent } from '@/utils/memoryClassification';
import { Memory, MemoryType, isValidMemoryType } from '@/components/game/memory/types';
import logger from '@/lib/logger';

export const useMemoryCreation = (sessionId: string | null) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const generateEmbedding = async (text: string) => {
    try {
      logger.info('[Memory Creation] Starting embedding generation for text:', text);
      
      const { data, error } = await supabase.functions.invoke('generate-embedding', {
        body: { text },
      });

      if (error) throw error;
      
      if (!data?.embedding) {
        throw new Error('Invalid embedding format received from API');
      }

      return data.embedding;
    } catch (error) {
      logger.error('[Memory Creation] Error generating embedding:', error);
      throw error;
    }
  };

  const validateMemory = (memory: Partial<Memory>): { isValid: boolean; processedMemory: Partial<Memory> } => {
    const processedMemory = { ...memory };

    if (!memory.content || typeof memory.content !== 'string') {
      logger.error('[Memory Creation] Invalid content:', memory.content);
      return { isValid: false, processedMemory };
    }

    if (!isValidMemoryType(memory.type)) {
      logger.error('[Memory Creation] Invalid memory type:', memory.type);
      return { isValid: false, processedMemory };
    }

    // Clamp importance score to valid range (1-5) instead of rejecting
    if (memory.importance && (memory.importance < 1 || memory.importance > 5)) {
      logger.warn('[Memory Creation] Invalid importance score:', memory.importance, 'clamping to valid range');
      processedMemory.importance = Math.max(1, Math.min(5, memory.importance));
    }

    return { isValid: true, processedMemory };
  };

  const createMemory = useMutation({
    mutationFn: async (memory: Omit<Memory, 'id' | 'created_at' | 'updated_at'>) => {
      if (!sessionId) throw new Error('No active session');

      logger.info('[Memory Creation] Starting memory creation process:', memory);
      
      const validation = validateMemory(memory);
      if (!validation.isValid) {
        throw new Error('Invalid memory data');
      }

      const validatedMemory = validation.processedMemory;
      const embedding = await generateEmbedding(validatedMemory.content!);
      
      logger.info('[Memory Creation] Inserting memory into database:', {
        ...validatedMemory,
        session_id: sessionId,
        embedding
      });

      const { data, error } = await supabase
        .from('memories')
        .insert([{ 
          ...validatedMemory,
          session_id: sessionId,
          embedding,
          metadata: validatedMemory.metadata || {},
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) throw error;

      return data;
    },
    onSuccess: () => {
      logger.info('[Memory Creation] Memory created successfully');
      queryClient.invalidateQueries({ queryKey: ['memories', sessionId] });
    },
    onError: (error) => {
      logger.error('[Memory Creation] Error in memory creation mutation:', error);
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

      logger.info('[Memory Creation] Processing content for memory extraction:', content);
      
      const memorySegments = processContent(content);
      
      logger.info('[Memory Creation] Classified segments:', memorySegments);

      // Create memories for each classified segment
      for (const segment of memorySegments) {
        if (!isValidMemoryType(segment.type)) {
          logger.warn('[Memory Creation] Skipping segment with invalid type:', segment);
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

      logger.info('[Memory Creation] Memory extraction completed successfully');
    } catch (error) {
      logger.error('[Memory Creation] Error extracting memories:', error);
      throw error;
    }
  };

  return {
    createMemory: createMemory.mutate,
    extractMemories,
  };
};