import React from 'react';
import { motion } from 'framer-motion';
import { ChatMessage } from '@/types/game';
import { MessageMetadata } from './MessageMetadata';
import { slideInLeft } from '@/utils/animations';
import { User } from 'lucide-react';

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
    <motion.div
      className="w-full flex items-start gap-3 justify-end"
      variants={slideInLeft}
      initial="hidden"
      animate="visible"
    >
      <div
        className={
          `relative px-4 py-3 rounded-2xl transition-all duration-300 message-bubble backdrop-blur-sm max-w-[85%] md:max-w-[70%] ` +
          'player-bubble fantasy-card bg-gradient-to-br from-card/95 to-muted/20 text-card-foreground shadow-md border border-border/50 ' +
          'hover:shadow-lg hover:border-infinite-purple/30 hover:-translate-y-0.5 group ' +
          (isFirstInGroup ? 'rounded-t-2xl pt-4 ' : '') +
          (isLastInGroup ? 'rounded-b-2xl pb-4 ' : 'border-b border-border/20 ')
        }
      >
        {/* Message content */}
        <div className="text-sm leading-relaxed whitespace-pre-wrap">{displayText}</div>

        {/* Truncation expander */}
        {isLongMessage && (
          <button onClick={onToggleExpanded} className="text-xs text-primary hover:underline mt-1 inline-block">
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

      {/* Character avatar */}
      {isLastInGroup && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-infinite-purple to-infinite-teal flex items-center justify-center shadow-md ring-2 ring-background">
          <User className="w-4 h-4 text-white" />
        </div>
      )}
    </motion.div>
  );
};
