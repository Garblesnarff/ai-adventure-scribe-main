/**
 * Simple Message Context
 * 
 * Provides a simple MessageContext for SimpleGameChat to work with VoiceHandler
 */

import React, { createContext, useContext, ReactNode } from 'react';
import { ChatMessage } from '@/services/ai-service';

interface SimpleMessageContextType {
  messages: ChatMessage[];
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
  const value: SimpleMessageContextType = {
    messages,
    isLoading,
    sendMessage,
    queueStatus,
  };

  return (
    <SimpleMessageContext.Provider value={value}>
      {children}
    </SimpleMessageContext.Provider>
  );
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