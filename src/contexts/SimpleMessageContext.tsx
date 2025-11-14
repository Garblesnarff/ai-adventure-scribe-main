/**
 * Simple Message Context
 *
 * Provides a simple MessageContext for SimpleGameChat to work with VoiceHandler
 */

import React, { createContext, useContext } from 'react';

import type { ChatMessage } from '@/services/ai-service';
import type { ChatMessage as GameChatMessage } from '@/types/game';
import type { ReactNode } from 'react';

interface SimpleMessageContextType {
  messages: GameChatMessage[];
  isLoading: boolean;
  sendMessage: (message: ChatMessage) => Promise<void>;
  queueStatus: 'idle' | 'processing' | 'error' | 'retrying';
}

const SimpleMessageContext = createContext<SimpleMessageContextType | undefined>(undefined);

/**
 * Simple provider component for managing message-related state from SimpleGameChat
 */
export const SimpleMessageProvider: React.FC<{
  messages: ChatMessage[];
  isLoading: boolean;
  sendMessage: (message: ChatMessage) => Promise<void>;
  queueStatus?: 'idle' | 'processing' | 'error' | 'retrying';
  children: ReactNode;
}> = ({ messages, isLoading, sendMessage, queueStatus = 'idle', children }) => {
  // Transform messages from ai-service format to VoiceHandler-compatible format
  const transformedMessages: GameChatMessage[] = messages.map((msg) => ({
    text: msg.content, // Transform content -> text
    sender: (msg.role === 'assistant' ? 'dm' : msg.role === 'user' ? 'player' : 'system') as
      | 'dm'
      | 'player'
      | 'system', // Transform role -> sender
    id: msg.id,
    timestamp: msg.timestamp.toISOString(),
    context: {
      emotion: 'neutral' as const,
      intent: (msg.role === 'user' ? 'query' : 'response') as 'query' | 'response',
    },
    // Pass through narrationSegments for voice segmentation, preserving original types for VoiceDirector
    narrationSegments: msg.narrationSegments,
  }));

  const value: SimpleMessageContextType = {
    messages: transformedMessages,
    isLoading,
    sendMessage,
    queueStatus,
  };

  return <SimpleMessageContext.Provider value={value}>{children}</SimpleMessageContext.Provider>;
};

/**
 * Custom hook for accessing simple message context
 * This makes VoiceHandler work with SimpleGameChat's message state
 */
export const useMessageContext = () => {
  const context = useContext(SimpleMessageContext);
  if (context === undefined) {
    throw new Error('useMessageContext must be used within a SimpleMessageProvider');
  }
  return context;
};
