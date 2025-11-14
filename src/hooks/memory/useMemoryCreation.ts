import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { Memory } from '@/components/game/memory/types';

import { MemoryType, isValidMemoryType } from '@/components/game/memory/types';
import { isSemanticMemoriesEnabled } from '@/config/featureFlags';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import logger from '@/lib/logger';
import { processContent } from '@/utils/memoryClassification';

const MIN_SEGMENT_LENGTH = 50;
const MAX_SEGMENTS_PER_MESSAGE = 3;

export const useMemoryCreation = (sessionId: string | null) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const generateEmbedding = async (text: string) => {
    if (!isSemanticMemoriesEnabled()) {
      logger.debug('[Memory Creation] Semantic memories disabled; skipping embedding');
      return null;
    }

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

  const validateMemory = (
    memory: Partial<Memory>,
  ): { isValid: boolean; processedMemory: Partial<Memory> } => {
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
      logger.warn(
        '[Memory Creation] Invalid importance score:',
        memory.importance,
        'clamping to valid range',
      );
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
        embedding,
      });

      const { data, error } = await supabase
        .from('memories')
        .insert([
          {
            ...validatedMemory,
            session_id: sessionId,
            embedding: embedding ?? null,
            metadata: validatedMemory.metadata || {},
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ])
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
        title: 'Error',
        description: 'Failed to create memory: ' + error.message,
        variant: 'destructive',
      });
    },
  });

  const extractMemories = async (content: string) => {
    try {
      if (!sessionId) throw new Error('No active session');

      logger.info('[Memory Creation] Processing content for memory extraction:', content);

      const memorySegments = processContent(content);
      const filteredSegments: typeof memorySegments = [];
      const seenContent = new Set<string>();

      for (const segment of memorySegments) {
        const normalizedContent = segment.content.trim();
        if (normalizedContent.length < MIN_SEGMENT_LENGTH) {
          logger.debug('[Memory Creation] Skipping short segment:', normalizedContent);
          continue;
        }

        const dedupeKey = normalizedContent.toLowerCase();
        if (seenContent.has(dedupeKey)) {
          logger.debug('[Memory Creation] Skipping duplicate segment:', normalizedContent);
          continue;
        }

        seenContent.add(dedupeKey);
        filteredSegments.push({ ...segment, content: normalizedContent });
      }

      const prioritizedSegments = [...filteredSegments]
        .sort((a, b) => b.importance - a.importance)
        .slice(0, MAX_SEGMENTS_PER_MESSAGE);

      logger.info('[Memory Creation] Classified segments:', prioritizedSegments);

      // Create memories for each classified segment
      for (const segment of prioritizedSegments) {
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
