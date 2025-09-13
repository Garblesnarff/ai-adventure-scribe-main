import { useState, useCallback } from 'react';
import { useMutation, useSubscription } from '@apollo/client';
import { GENERATE_CHAT_RESPONSE, EXECUTE_DM_AGENT } from '@/lib/graphql/mutations';
import { STREAM_CHAT_RESPONSE, STREAM_DM_RESPONSE } from '@/lib/graphql/subscriptions';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  context?: Record<string, any>;
  metadata?: Record<string, any>;
}

interface UseGraphQLChatProps {
  sessionId: string;
  enableRealTime?: boolean;
}

interface DMAgentContext {
  campaignDetails: any;
  characterDetails: any;
  memories?: any[];
}

/**
 * Custom hook for GraphQL-based chat interactions
 * Provides both regular mutations and real-time subscriptions
 */
export const useGraphQLChat = ({ sessionId, enableRealTime = false }: UseGraphQLChatProps) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);

  // Mutation for regular chat responses
  const [generateChatResponse, { loading: chatLoading, error: chatError }] = useMutation(
    GENERATE_CHAT_RESPONSE,
    {
      onCompleted: (data) => {
        const response = data.generateChatResponse;
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: response.text,
          context: response.context,
          metadata: response.metadata
        }]);
      },
      onError: (error) => {
        console.error('Chat generation error:', error);
      }
    }
  );

  // Mutation for DM agent responses
  const [executeDMAgent, { loading: dmLoading, error: dmError }] = useMutation(
    EXECUTE_DM_AGENT,
    {
      onCompleted: (data) => {
        const response = data.executeDMAgent;
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: response.response,
          context: response.context,
          metadata: { 
            dmResponse: true, 
            narrationSegments: response.narrationSegments 
          }
        }]);
      },
      onError: (error) => {
        console.error('DM agent error:', error);
      }
    }
  );

  // Real-time chat subscription
  const { data: streamData } = useSubscription(
    STREAM_CHAT_RESPONSE,
    {
      variables: { messages: [], sessionId },
      skip: !enableRealTime || !isStreaming,
      onData: ({ data }) => {
        if (data?.data?.streamChatResponse) {
          const response = data.data.streamChatResponse;
          setMessages(prev => {
            // Update the last assistant message or add a new one
            const lastMessage = prev[prev.length - 1];
            if (lastMessage?.role === 'assistant' && lastMessage.metadata?.streaming) {
              // Update existing streaming message
              return prev.map((msg, index) => 
                index === prev.length - 1 
                  ? { ...msg, content: msg.content + response.text }
                  : msg
              );
            } else {
              // Add new streaming message
              return [...prev, {
                role: 'assistant',
                content: response.text,
                context: response.context,
                metadata: { ...response.metadata, streaming: true }
              }];
            }
          });
        }
      },
      onComplete: () => {
        setIsStreaming(false);
        // Mark the last message as complete
        setMessages(prev => prev.map((msg, index) => 
          index === prev.length - 1 && msg.metadata?.streaming
            ? { ...msg, metadata: { ...msg.metadata, streaming: false } }
            : msg
        ));
      }
    }
  );

  // Send a chat message
  const sendMessage = useCallback(async (content: string, context?: Record<string, any>) => {
    const userMessage: ChatMessage = {
      role: 'user',
      content,
      context,
    };

    setMessages(prev => [...prev, userMessage]);

    if (enableRealTime) {
      setIsStreaming(true);
      // The subscription will handle the response
    } else {
      // Use mutation for immediate response
      await generateChatResponse({
        variables: {
          messages: [...messages, userMessage],
          sessionId,
          context,
        },
      });
    }
  }, [messages, sessionId, enableRealTime, generateChatResponse]);

  // Send a DM agent request
  const sendDMRequest = useCallback(async (
    task: { description: string; type?: string; parameters?: any },
    agentContext: DMAgentContext,
    options?: {
      voiceContext?: any;
      isFirstMessage?: boolean;
      combatContext?: any;
    }
  ) => {
    await executeDMAgent({
      variables: {
        task,
        agentContext,
        voiceContext: options?.voiceContext,
        isFirstMessage: options?.isFirstMessage,
        combatContext: options?.combatContext,
      },
    });
  }, [executeDMAgent]);

  // Clear conversation
  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  // Get the last assistant message
  const getLastResponse = useCallback(() => {
    const lastAssistantMessage = messages
      .slice()
      .reverse()
      .find(msg => msg.role === 'assistant');
    return lastAssistantMessage;
  }, [messages]);

  return {
    // State
    messages,
    isLoading: chatLoading || dmLoading,
    isStreaming,
    error: chatError || dmError,

    // Actions
    sendMessage,
    sendDMRequest,
    clearMessages,
    getLastResponse,

    // Utilities
    hasMessages: messages.length > 0,
    messageCount: messages.length,
  };
};

export default useGraphQLChat;