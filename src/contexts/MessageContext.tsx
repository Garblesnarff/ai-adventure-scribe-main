import React, { createContext, useContext } from 'react';
import { ChatMessage } from '@/types/game';
import { useMessages } from '@/hooks/useMessages';
import { useMessageQueue } from '@/hooks/useMessageQueue';

interface MessageContextType {
  messages: ChatMessage[];
  isLoading: boolean;
  sendMessage: (message: ChatMessage) => Promise<void>;
  queueStatus: 'idle' | 'processing' | 'error' | 'retrying';
}

const MessageContext = createContext<MessageContextType | undefined>(undefined);

/**
 * Provider component for managing message-related state and operations
 */
export const MessageProvider: React.FC<{ 
  sessionId: string | null;
  children: React.ReactNode;
}> = ({ sessionId, children }) => {
  const { data: messages = [], isLoading } = useMessages(sessionId);
  const { messageMutation, queueStatus } = useMessageQueue(sessionId);

  const value: MessageContextType = {
    messages,
    isLoading,
    sendMessage: messageMutation.mutateAsync,
    queueStatus,
  };

  return (
    <MessageContext.Provider value={value}>
      {children}
    </MessageContext.Provider>
  );
};

/**
 * Custom hook for accessing message context
 * @throws Error if used outside of MessageProvider
 */
export const useMessageContext = () => {
  const context = useContext(MessageContext);
  if (context === undefined) {
    throw new Error('useMessageContext must be used within a MessageProvider');
  }
  return context;
};