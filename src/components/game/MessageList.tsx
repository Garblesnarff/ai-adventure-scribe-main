import React from 'react';
import { ChatMessage } from '@/types/game';
import { useMessageContext } from '@/contexts/MessageContext';

/**
 * MessageList Component
 * Displays a list of chat messages with styling based on sender type
 */
export const MessageList: React.FC = () => {
  const { messages = [] } = useMessageContext();

  return (
    <div className="h-[60vh] overflow-y-auto mb-4 space-y-4 p-4">
      {messages?.map((message) => (
        <div
          key={message.id || message.timestamp}
          className={`p-3 rounded-lg ${
            message.sender === 'dm'
              ? 'bg-accent text-accent-foreground'
              : message.sender === 'system'
              ? 'bg-muted text-muted-foreground'
              : 'bg-primary text-primary-foreground'
          }`}
        >
          <p>{message.text}</p>
          {message.context && (
            <div className="mt-2 text-sm opacity-75">
              {message.context.emotion && (
                <span className="mr-2">Emotion: {message.context.emotion}</span>
              )}
              {message.context.location && (
                <span>Location: {message.context.location}</span>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};