import React from 'react';

import type { ChatMessage } from '@/types/game';

interface MessageMetadataProps {
  message: ChatMessage;
  isFirstInGroup: boolean;
  isLastInGroup: boolean;
  isPlayer: boolean;
}

/**
 * MessageMetadata Component
 * Displays timestamps, context metadata (emotion, location) for messages
 */
export const MessageMetadata: React.FC<MessageMetadataProps> = ({
  message,
  isFirstInGroup,
  isLastInGroup,
  isPlayer,
}) => {
  return (
    <>
      {/* Context metadata - only show on first message */}
      {isFirstInGroup && message.context && (
        <div className="mt-2 pt-2 border-t border-border/20 space-y-1 text-xs opacity-80">
          {message.context.emotion && (
            <div className="flex items-center">
              <span className="font-medium mr-1">🎭</span>
              <span>{message.context.emotion}</span>
            </div>
          )}
          {message.context.location && (
            <div className="flex items-center">
              <span className="font-medium mr-1">📍</span>
              <span>{message.context.location}</span>
            </div>
          )}
        </div>
      )}

      {/* Timestamp - only on last message */}
      {isLastInGroup && (
        <div className={`text-xs message-meta px-2 ${isPlayer ? 'text-right' : 'text-left'} mt-1`}>
          {message.timestamp
            ? new Date(message.timestamp).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })
            : ''}
        </div>
      )}
    </>
  );
};
