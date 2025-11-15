// SDK Imports
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';

// Project Imports
import type { ChatMessage } from '@/types/game';

import { useToast } from '@/hooks/use-toast'; // Assuming kebab-case
import { supabase } from '@/integrations/supabase/client';

// Project Types
import logger from '@/lib/logger';

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
   * Generates message IDs on the frontend to avoid race conditions with database replication
   */
  const messageMutation = useMutation({
    mutationFn: async (message: ChatMessage) => {
      let retries = 0;
      let delay = INITIAL_RETRY_DELAY;

      // Generate message ID on frontend to avoid database timing issues
      const messageId = uuidv4();
      const now = new Date().toISOString();

      while (retries < MAX_RETRIES) {
        try {
          setQueueStatus(retries > 0 ? 'retrying' : 'processing');

          // Format the context to ensure it's compatible with Supabase's Json type
          const contextData = message.context
            ? {
                location: message.context.location || null,
                emotion: message.context.emotion || null,
                intent: message.context.intent || null,
              }
            : {};

          const { error } = await supabase.from('dialogue_history').insert({
            id: messageId,
            session_id: sessionId,
            message: message.text,
            speaker_type: message.sender,
            context: contextData,
            timestamp: now,
          });

          if (error) throw error;

          // Return the message with the ID we generated (available immediately, no race condition)
          const persistedMessage: ChatMessage = {
            ...message,
            id: messageId,
            timestamp: now,
          };

          logger.info(`[MessageQueue] Message persisted with ID: ${messageId}`);

          // Process any queued messages if this one succeeded
          if (messageQueue.length > 0) {
            const batch = messageQueue.slice(0, MAX_BATCH_SIZE);
            await processMessageBatch(batch);
            setMessageQueue((prev) => prev.slice(MAX_BATCH_SIZE));
          }

          setQueueStatus('idle');
          return persistedMessage;
        } catch (error) {
          logger.error(`Attempt ${retries + 1} failed:`, error);
          retries++;

          if (retries === MAX_RETRIES) {
            setQueueStatus('error');
            // Queue message for later retry if max retries reached
            setMessageQueue((prev) => [...prev, message]);
            throw error;
          }

          // Exponential backoff
          await new Promise((resolve) => setTimeout(resolve, delay));
          delay *= 2; // Double the delay for next retry
        }
      }
    },
    onError: (error) => {
      logger.error('Error saving message:', error);
      toast({
        title: 'Error',
        description: 'Message will be retried automatically',
        variant: 'destructive',
      });
    },
    onSuccess: (persistedMessage) => {
      // Invalidate and refetch messages to ensure cache is up-to-date
      queryClient.invalidateQueries({ queryKey: ['messages', sessionId] });
    },
  });

  /**
   * Process a batch of queued messages
   * Also generates IDs for each message to ensure they're immediately available
   */
  const processMessageBatch = async (batch: ChatMessage[]) => {
    const now = new Date().toISOString();
    const formattedBatch = batch.map((message) => ({
      id: message.id || uuidv4(),
      session_id: sessionId,
      message: message.text,
      speaker_type: message.sender,
      context: message.context
        ? {
            location: message.context.location || null,
            emotion: message.context.emotion || null,
            intent: message.context.intent || null,
          }
        : {},
      timestamp: message.timestamp || now,
    }));

    const { error } = await supabase.from('dialogue_history').insert(formattedBatch);

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
        setMessageQueue((prev) => prev.slice(MAX_BATCH_SIZE));

        if (messageQueue.length > 0) {
          // Schedule next batch
          setTimeout(retryQueuedMessages, INITIAL_RETRY_DELAY);
        }
      } catch (error) {
        logger.error('Error processing message batch:', error);
        toast({
          title: 'Error',
          description: 'Failed to process message batch. Will retry later.',
          variant: 'destructive',
        });
      }
    }
  };

  return {
    messageMutation,
    queueStatus,
    queueLength: messageQueue.length,
    retryQueuedMessages,
  };
};
