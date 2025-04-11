import { useState } from 'react';
import { ChatMessage } from '@/types/game';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useMutation, useQueryClient } from '@tanstack/react-query';

const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1000;
const MAX_BATCH_SIZE = 5;

type QueueStatus = 'idle' | 'processing' | 'error' | 'retrying';

/**
 * Hook for managing message queue and persistence with enhanced error handling
 * @param sessionId Current game session ID
 */
export const useMessageQueue = (sessionId: string | null) => {
  const [queueStatus, setQueueStatus] = useState<QueueStatus>('idle');
  const [messageQueue, setMessageQueue] = useState<ChatMessage[]>([]);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  /**
   * Handles message persistence with enhanced retry logic and backoff
   */
  const messageMutation = useMutation({
    mutationFn: async (message: ChatMessage) => {
      let retries = 0;
      let delay = INITIAL_RETRY_DELAY;

      while (retries < MAX_RETRIES) {
        try {
          setQueueStatus(retries > 0 ? 'retrying' : 'processing');
          
          // Format the context to ensure it's compatible with Supabase's Json type
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
              context: contextData
            });

          if (error) throw error;
          
          // Process any queued messages if this one succeeded
          if (messageQueue.length > 0) {
            const batch = messageQueue.slice(0, MAX_BATCH_SIZE);
            await processMessageBatch(batch);
            setMessageQueue(prev => prev.slice(MAX_BATCH_SIZE));
          }

          setQueueStatus('idle');
          return;
        } catch (error) {
          console.error(`Attempt ${retries + 1} failed:`, error);
          retries++;
          
          if (retries === MAX_RETRIES) {
            setQueueStatus('error');
            // Queue message for later retry if max retries reached
            setMessageQueue(prev => [...prev, message]);
            throw error;
          }
          
          // Exponential backoff
          await new Promise(resolve => setTimeout(resolve, delay));
          delay *= 2; // Double the delay for next retry
        }
      }
    },
    onError: (error) => {
      console.error('Error saving message:', error);
      toast({
        title: "Error",
        description: "Message will be retried automatically",
        variant: "destructive",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages', sessionId] });
    },
  });

  /**
   * Process a batch of queued messages
   */
  const processMessageBatch = async (batch: ChatMessage[]) => {
    const formattedBatch = batch.map(message => ({
      session_id: sessionId,
      message: message.text,
      speaker_type: message.sender,
      context: message.context ? {
        location: message.context.location || null,
        emotion: message.context.emotion || null,
        intent: message.context.intent || null
      } : {}
    }));

    const { error } = await supabase
      .from('dialogue_history')
      .insert(formattedBatch);

    if (error) throw error;
  };

  /**
   * Retry all queued messages
   */
  const retryQueuedMessages = async () => {
    if (messageQueue.length > 0 && queueStatus !== 'processing') {
      try {
        const batch = messageQueue.slice(0, MAX_BATCH_SIZE);
        await processMessageBatch(batch);
        setMessageQueue(prev => prev.slice(MAX_BATCH_SIZE));
        
        if (messageQueue.length > 0) {
          // Schedule next batch
          setTimeout(retryQueuedMessages, INITIAL_RETRY_DELAY);
        }
      } catch (error) {
        console.error('Error processing message batch:', error);
        toast({
          title: "Error",
          description: "Failed to process message batch. Will retry later.",
          variant: "destructive",
        });
      }
    }
  };

  return { 
    messageMutation, 
    queueStatus,
    queueLength: messageQueue.length,
    retryQueuedMessages
  };
};