/**
 * BFF Streaming Chat Hook
 * 
 * React hooks for streaming chat interface with Server-Sent Events.
 * Provides real-time AI response streaming and message management.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect, useRef, useCallback } from 'react';
import { 
  BFFMessageData,
  BFFStreamingChatRequest,
  BFFStreamingChatResponse 
} from '../../../server/src/bff/types';

const BFF_BASE_URL = import.meta.env.VITE_BFF_API_URL || 'http://localhost:4000/bff';

interface StreamingState {
  isStreaming: boolean;
  streamId: string | null;
  currentContent: string;
  isComplete: boolean;
  error: string | null;
}

/**
 * Hook for session messages with real-time updates
 */
export function useBFFSessionMessages(
  sessionId: string | null,
  options: {
    limit?: number;
    offset?: number;
    suspense?: boolean;
  } = {}
) {
  const { limit = 50, offset = 0, suspense = false } = options;

  return useQuery({
    queryKey: ['bff-session-messages', sessionId, { limit, offset }],
    queryFn: async (): Promise<{
      messages: BFFMessageData[];
      hasMore: boolean;
      totalCount: number | null;
    }> => {
      if (!sessionId) {
        throw new Error('Session ID is required');
      }

      const params = new URLSearchParams();
      params.append('limit', limit.toString());
      params.append('offset', offset.toString());

      const response = await fetch(`${BFF_BASE_URL}/streaming-chat/session/${sessionId}/messages?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch messages: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to load messages');
      }

      return result.data;
    },
    enabled: !!sessionId,
    staleTime: 30000, // 30 seconds
    refetchOnWindowFocus: false,
    suspense
  });
}

/**
 * Hook for streaming chat with Server-Sent Events
 */
export function useBFFStreamingChat(sessionId: string | null) {
  const queryClient = useQueryClient();
  const [streamingState, setStreamingState] = useState<StreamingState>({
    isStreaming: false,
    streamId: null,
    currentContent: '',
    isComplete: false,
    error: null
  });
  
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isTyping, setIsTyping] = useState(false);

  // Mutation for sending messages
  const sendMessageMutation = useMutation({
    mutationFn: async (request: BFFStreamingChatRequest): Promise<BFFStreamingChatResponse> => {
      const response = await fetch(`${BFF_BASE_URL}/streaming-chat/send`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        throw new Error(`Failed to send message: ${response.statusText}`);
      }

      const result: BFFStreamingChatResponse = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to send message');
      }

      return result;
    },
    onSuccess: (data, request) => {
      console.log('✅ BFF: Message sent, starting stream:', data.streamId);
      
      // Immediately add user message to the cache
      queryClient.setQueryData(
        ['bff-session-messages', request.sessionId], 
        (old: any) => {
          if (!old) return old;
          
          const userMessage: BFFMessageData = {
            id: `user_${Date.now()}`,
            type: 'user',
            content: request.message,
            timestamp: new Date(),
            characterId: request.characterId,
            metadata: { streaming: false },
            streamingState: 'complete'
          };
          
          return {
            ...old,
            messages: [...old.messages, userMessage]
          };
        }
      );

      // Start streaming the AI response
      if (data.streamId && data.sseUrl) {
        startStreaming(data.streamId, data.sseUrl, request.sessionId);
      }
    },
    onError: (error) => {
      console.error('❌ BFF: Failed to send message:', error);
      setStreamingState(prev => ({
        ...prev,
        isStreaming: false,
        error: error.message
      }));
    }
  });

  // Start Server-Sent Events stream
  const startStreaming = useCallback((streamId: string, sseUrl: string, sessionId: string) => {
    console.log('📡 BFF: Starting SSE stream:', streamId);
    
    setStreamingState({
      isStreaming: true,
      streamId,
      currentContent: '',
      isComplete: false,
      error: null
    });

    // Close existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    // Create new EventSource
    const fullUrl = sseUrl.startsWith('http') ? sseUrl : `${BFF_BASE_URL}${sseUrl}`;
    const eventSource = new EventSource(fullUrl);
    eventSourceRef.current = eventSource;

    let aiMessageId: string | null = null;
    let accumulatedContent = '';

    eventSource.onopen = () => {
      console.log('📡 BFF: SSE connection opened');
    };

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        switch (data.type) {
          case 'stream_connected':
            console.log('✅ BFF: Stream connected');
            break;
          
          case 'content_chunk':
            accumulatedContent = data.fullContent || accumulatedContent + data.content;
            
            setStreamingState(prev => ({
              ...prev,
              currentContent: accumulatedContent,
              isComplete: data.isComplete || false
            }));

            // Update the message in the cache
            queryClient.setQueryData(
              ['bff-session-messages', sessionId], 
              (old: any) => {
                if (!old) return old;
                
                let updatedMessages = [...old.messages];
                
                // Find or create the AI message
                const aiMessageIndex = updatedMessages.findIndex(
                  msg => msg.id === aiMessageId || (msg.type === 'dm' && msg.streamingState === 'streaming')
                );
                
                if (aiMessageIndex !== -1) {
                  // Update existing message
                  updatedMessages[aiMessageIndex] = {
                    ...updatedMessages[aiMessageIndex],
                    content: accumulatedContent,
                    streamingState: data.isComplete ? 'complete' : 'streaming'
                  };
                } else {
                  // Create new AI message
                  const newAiMessage: BFFMessageData = {
                    id: aiMessageId || `ai_${Date.now()}`,
                    type: 'dm',
                    content: accumulatedContent,
                    timestamp: new Date(),
                    metadata: { streaming: !data.isComplete },
                    streamingState: data.isComplete ? 'complete' : 'streaming'
                  };
                  updatedMessages.push(newAiMessage);
                  if (!aiMessageId) aiMessageId = newAiMessage.id;
                }
                
                return {
                  ...old,
                  messages: updatedMessages
                };
              }
            );
            break;
          
          case 'stream_complete':
            console.log('✅ BFF: Stream completed');
            setStreamingState(prev => ({
              ...prev,
              isStreaming: false,
              isComplete: true
            }));
            
            // Final update to mark as complete
            queryClient.setQueryData(
              ['bff-session-messages', sessionId], 
              (old: any) => {
                if (!old) return old;
                
                const updatedMessages = old.messages.map((msg: BFFMessageData) => {
                  if (msg.id === aiMessageId || (msg.type === 'dm' && msg.streamingState === 'streaming')) {
                    return {
                      ...msg,
                      content: data.content || accumulatedContent,
                      streamingState: 'complete',
                      metadata: { 
                        ...msg.metadata, 
                        streaming: false,
                        hasAudio: data.hasAudio || false
                      }
                    };
                  }
                  return msg;
                });
                
                return {
                  ...old,
                  messages: updatedMessages
                };
              }
            );
            
            eventSource.close();
            break;
          
          case 'stream_error':
            console.error('❌ BFF: Stream error:', data.error);
            setStreamingState(prev => ({
              ...prev,
              isStreaming: false,
              error: data.error
            }));
            eventSource.close();
            break;
          
          case 'heartbeat':
            // Keep connection alive
            break;
          
          default:
            console.log('📡 BFF: Unknown SSE event:', data.type);
        }
      } catch (error) {
        console.error('❌ BFF: Failed to parse SSE data:', error);
      }
    };

    eventSource.onerror = (error) => {
      console.error('❌ BFF: SSE error:', error);
      setStreamingState(prev => ({
        ...prev,
        isStreaming: false,
        error: 'Connection error'
      }));
      eventSource.close();
    };
  }, [queryClient]);

  // Send message function
  const sendMessage = useCallback((
    message: string,
    options: {
      characterId?: string;
      includeAudio?: boolean;
      voiceId?: string;
    } = {}
  ) => {
    if (!sessionId) {
      console.error('❌ BFF: Cannot send message - no session ID');
      return;
    }

    const request: BFFStreamingChatRequest = {
      sessionId,
      message,
      characterId: options.characterId || localStorage.getItem('currentCharacterId') || '',
      includeAudio: options.includeAudio || false,
      voiceId: options.voiceId
    };

    sendMessageMutation.mutate(request);
  }, [sessionId, sendMessageMutation]);

  // Typing indicator management
  const setTypingIndicator = useMutation({
    mutationFn: async ({ isTyping: typing }: { isTyping: boolean }) => {
      if (!sessionId) return;

      const response = await fetch(`${BFF_BASE_URL}/streaming-chat/typing`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId,
          characterId: localStorage.getItem('currentCharacterId'),
          isTyping: typing
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update typing indicator');
      }
    },
    onSuccess: (_, { isTyping: typing }) => {
      setIsTyping(typing);
    }
  });

  const startTyping = useCallback(() => {
    setTypingIndicator.mutate({ isTyping: true });
  }, [setTypingIndicator]);

  const stopTyping = useCallback(() => {
    setTypingIndicator.mutate({ isTyping: false });
  }, [setTypingIndicator]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (isTyping) {
        stopTyping();
      }
    };
  }, [isTyping, stopTyping]);

  return {
    sendMessage,
    streamingState,
    isTyping,
    startTyping,
    stopTyping,
    isSending: sendMessageMutation.isPending
  };
}

/**
 * Hook for acknowledging message receipt (for optimistic updates)
 */
export function useBFFAcknowledgeMessage() {
  return useMutation({
    mutationFn: async ({ messageId, streamId }: { messageId: string; streamId?: string }) => {
      const response = await fetch(`${BFF_BASE_URL}/streaming-chat/acknowledge`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ messageId, streamId }),
      });

      if (!response.ok) {
        throw new Error('Failed to acknowledge message');
      }
    }
  });
}

/**
 * Helper hook for managing message pagination
 */
export function useBFFMessagePagination(sessionId: string | null, pageSize = 20) {
  const [offset, setOffset] = useState(0);
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useBFFSessionMessages(sessionId, {
    limit: pageSize,
    offset
  });

  const loadMore = useCallback(() => {
    if (data?.hasMore) {
      setOffset(prev => prev + pageSize);
    }
  }, [data?.hasMore, pageSize]);

  const loadPrevious = useCallback(() => {
    setOffset(prev => Math.max(0, prev - pageSize));
  }, [pageSize]);

  const reset = useCallback(() => {
    setOffset(0);
    // Invalidate queries to refetch from the beginning
    queryClient.invalidateQueries({ 
      queryKey: ['bff-session-messages', sessionId] 
    });
  }, [sessionId, queryClient]);

  return {
    messages: data?.messages || [],
    hasMore: data?.hasMore || false,
    isLoading,
    error,
    loadMore,
    loadPrevious,
    reset,
    canLoadPrevious: offset > 0
  };
}