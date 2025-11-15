import React from 'react';

import { MessageMetadata } from './MessageMetadata';

import type { ChatMessage } from '@/types/game';

interface PlayerMessageProps {
  message: ChatMessage;
  messageId: string;
  isFirstInGroup: boolean;
  isLastInGroup: boolean;
  displayText: string;
  isLongMessage: boolean;
  isExpanded: boolean;
  onToggleExpanded: () => void;
}

/**
 * PlayerMessage Component
 * Renders player-specific message bubbles with card styling
 */
export const PlayerMessage: React.FC<PlayerMessageProps> = ({
  message,
  messageId,
  isFirstInGroup,
  isLastInGroup,
  displayText,
  isLongMessage,
  isExpanded,
  onToggleExpanded,
}) => {
  return (
    <div className="w-full">
      <div
        className={
          `relative px-4 py-3 rounded-2xl transition-all duration-300 message-bubble backdrop-blur-sm ` +
          'player-bubble ml-auto bg-gradient-to-br from-card/90 to-card/95 text-card-foreground shadow-md border border-border/50 hover:shadow-lg ' +
          (isFirstInGroup ? 'rounded-t-2xl pt-4 ' : '') +
          (isLastInGroup ? 'rounded-b-2xl pb-4 ' : 'border-b border-border/20 ') +
          'animate-in fade-in slide-in-from-bottom-2 hover:scale-[1.02] group-hover:shadow-lg'
        }
      >
        {/* Message content */}
        <div className="text-sm leading-relaxed whitespace-pre-wrap">{displayText}</div>

        {/* Truncation expander */}
        {isLongMessage && (
          <button
            onClick={onToggleExpanded}
            className="text-xs text-primary hover:underline mt-1 inline-block"
          >
            {isExpanded ? 'Read less' : 'Read more'}
          </button>
        )}

        {/* Metadata (context and timestamp) */}
        <MessageMetadata
          message={message}
          isFirstInGroup={isFirstInGroup}
          isLastInGroup={isLastInGroup}
          isPlayer={true}
        />
      </div>
    </div>
  );
};
