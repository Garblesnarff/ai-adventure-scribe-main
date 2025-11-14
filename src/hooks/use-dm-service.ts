/**
 * useDMService Hook
 *
 * React hook for interacting with the LangGraph-based DM service.
 * Provides a clean API for components to send messages and manage
 * conversation state.
 *
 * Replaces: useMessageQueue, useMessages (when using LangGraph)
 *
 * @module hooks
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, useCallback } from 'react';
import { toast } from 'sonner';

import type { GameMessage } from '@/agents/langgraph/adapters/message-adapter';
import type { WorldContext, DMResponse } from '@/agents/langgraph/dm-service';

import { getDMService } from '@/agents/langgraph/dm-service';
import { logger } from '@/lib/logger';

/**
 * Hook options
 */
export interface UseDMServiceOptions {
  sessionId: string;
  context: WorldContext;
  onStream?: (chunk: string) => void;
  onError?: (error: Error) => void;
}

/**
 * Hook return value
 */
export interface UseDMServiceReturn {
  // Message sending
  sendMessage: (message: string) => Promise<DMResponse>;
  isSending: boolean;

  // Conversation history
  messages: GameMessage[];
  isLoadingHistory: boolean;
  refreshHistory: () => void;

  // State management
  clearHistory: () => Promise<void>;

  // Error handling
  error: Error | null;
}

/**
 * React hook for DM service interactions
 *
 * Usage:
 * ```tsx
 * const {
 *   sendMessage,
 *   isSending,
 *   messages,
 *   isLoadingHistory
 * } = useDMService({
 *   sessionId: session.id,
 *   context: {
 *     campaignId,
 *     characterId,
 *     sessionId: session.id,
 *   }
 * });
 * ```
 */
export function useDMService(options: UseDMServiceOptions): UseDMServiceReturn {
  const { sessionId, context, onStream, onError } = options;
  const [error, setError] = useState<Error | null>(null);
  const queryClient = useQueryClient();
  const dmService = getDMService();

  // Query key for conversation history
  const conversationKey = ['conversation', sessionId];

  /**
   * Load conversation history
   */
  const {
    data: messages = [],
    isLoading: isLoadingHistory,
    refetch: refreshHistory,
  } = useQuery({
    queryKey: conversationKey,
    queryFn: async () => {
      try {
        return await dmService.getConversationHistory(sessionId);
      } catch (err) {
        logger.error('[useDMService] Failed to load conversation history:', err);
        throw err;
      }
    },
    enabled: !!sessionId,
    staleTime: 1000 * 60, // 1 minute
  });

  /**
   * Send message mutation
   */
  const sendMessageMutation = useMutation({
    mutationFn: async (message: string) => {
      setError(null);

      return await dmService.sendMessage({
        sessionId,
        message,
        context,
        onStream,
      });
    },
    onSuccess: (response) => {
      // Invalidate and refetch conversation history
      queryClient.invalidateQueries({ queryKey: conversationKey });

      logger.info('[useDMService] Message sent successfully:', {
        sessionId,
        responseLength: response.response.length,
      });
    },
    onError: (err: Error) => {
      logger.error('[useDMService] Failed to send message:', err);
      setError(err);

      if (onError) {
        onError(err);
      } else {
        toast.error('Failed to send message', {
          description: err.message,
        });
      }
    },
  });

  /**
   * Clear conversation history
   */
  const clearHistory = useCallback(async () => {
    try {
      await dmService.clearHistory(sessionId);
      queryClient.invalidateQueries({ queryKey: conversationKey });

      toast.success('Conversation cleared');
      logger.info('[useDMService] Conversation history cleared:', { sessionId });
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      logger.error('[useDMService] Failed to clear history:', error);
      toast.error('Failed to clear conversation', {
        description: error.message,
      });
      throw error;
    }
  }, [sessionId, queryClient, dmService, conversationKey]);

  return {
    sendMessage: sendMessageMutation.mutateAsync,
    isSending: sendMessageMutation.isPending,
    messages,
    isLoadingHistory,
    refreshHistory,
    clearHistory,
    error,
  };
}

/**
 * Hook for accessing checkpoint history (debugging/time-travel)
 */
export function useCheckpointHistory(sessionId: string, limit = 10) {
  const dmService = getDMService();

  return useQuery({
    queryKey: ['checkpoints', sessionId],
    queryFn: () => dmService.getCheckpointHistory(sessionId, limit),
    enabled: !!sessionId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Hook for DM service status (debugging)
 */
export function useDMServiceStatus() {
  const dmService = getDMService();

  return useQuery({
    queryKey: ['dm-service-status'],
    queryFn: () => dmService.getStatus(),
    staleTime: 1000 * 60, // 1 minute
  });
}
