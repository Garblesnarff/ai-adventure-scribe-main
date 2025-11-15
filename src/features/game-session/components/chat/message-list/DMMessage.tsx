import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { ChatMessage } from '@/types/game';
import { MessageVoicePlayer } from './MessageVoicePlayer';
import { MessageImageSection } from './MessageImageSection';
import { removeRollRequestsFromMessage } from '@/utils/rollRequestParser';
import { formatNarrative } from './formatNarrative';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { slideInRight, fadeIn } from '@/utils/animations';

interface DMMessageProps {
  message: ChatMessage;
  messageId: string;
  isFirstInGroup: boolean;
  isLastInGroup: boolean;
  displayContent: string;
  isExpanded: boolean;
  onToggleExpanded: () => void;
  imageUrl?: string;
  isGeneratingImage: boolean;
  imageError?: string;
  onGenerateImage: () => void;
  hasAnyImage: boolean;
}

/**
 * DMMessage Component
 * Renders DM-specific message bubbles with purple gradient styling
 * Integrates voice controls, image generation, and action options
 */
export const DMMessage: React.FC<DMMessageProps> = ({
  message,
  messageId,
  isFirstInGroup,
  isLastInGroup,
  displayContent,
  isExpanded,
  onToggleExpanded,
  imageUrl,
  isGeneratingImage,
  imageError,
  onGenerateImage,
  hasAnyImage,
}) => {
  // Remove roll requests and visual prompt markers from display
  let cleanContent = removeRollRequestsFromMessage(displayContent);
  cleanContent = cleanContent.replace(/^[\t ]*VISUAL\s+PROMPT:.*$/gim, '').trim();

  // Don't render if content is empty after removing roll requests
  if (!cleanContent || cleanContent.length === 0) {
    return null;
  }

  const { content, charCount, paragraphCount } = useMemo(() => formatNarrative(cleanContent), [cleanContent]);
  const exceedsClampThreshold = charCount > 800 || paragraphCount > 4;
  const shouldClamp = exceedsClampThreshold && !isExpanded;

  const narrativeClass = cn(
    'narrative-text max-w-[72ch] lg:max-w-[78ch] text-[15px] md:text-base leading-7 text-white/95 tracking-normal hyphens-auto',
    'selection:bg-infinite-purple/20 selection:text-white break-words',
    'transition-colors duration-200 group-hover:text-white',
    shouldClamp && 'max-h-[22rem] overflow-hidden clamp-fade'
  );

  const hasContextMetadata = Boolean(message.context?.emotion || message.context?.location);
  const timestamp = message.timestamp
    ? new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : '';

  return (
    <motion.div
      className={cn('w-full', hasAnyImage ? 'relative pb-48 md:pb-60' : '')}
      variants={slideInRight}
      initial="hidden"
      animate="visible"
    >
      <article
        aria-label="Dungeon Master message"
        className={cn(
          'message-bubble dm-bubble cosmic-panel relative overflow-hidden rounded-3xl',
          'px-5 py-4 md:px-6 md:py-5 shadow-lg md:shadow-xl transition-all duration-300',
          'hover:shadow-2xl hover:shadow-infinite-purple/30 hover:border-infinite-purple/40',
          'group'
        )}
      >
        <div className={narrativeClass}>{content}</div>

        {exceedsClampThreshold && (
          <div className="mt-4 flex justify-end">
            <Button
              size="sm"
              variant="ghost"
              className="text-xs font-semibold uppercase tracking-wider text-white/70 hover:text-white"
              onClick={onToggleExpanded}
            >
              {isExpanded ? 'Show less' : 'Read more'}
            </Button>
          </div>
        )}

        {/* Image generation section - only on last message */}
        {isLastInGroup && (
          <div className="mt-4">
            <MessageImageSection
              messageId={messageId}
              isGenerating={isGeneratingImage}
              imageUrl={imageUrl}
              error={imageError}
              onGenerate={onGenerateImage}
            />
          </div>
        )}

        {isFirstInGroup && hasContextMetadata && (
          <div className="mt-5 border-t border-white/10 pt-4 text-sm text-white/70 space-y-2">
            {message.context?.emotion && (
              <div className="flex items-center gap-2">
                <span role="img" aria-label="mood" className="text-lg leading-none">
                  🎭
                </span>
                <span>{message.context.emotion}</span>
              </div>
            )}
            {message.context?.location && (
              <div className="flex items-center gap-2">
                <span role="img" aria-label="location" className="text-lg leading-none">
                  📍
                </span>
                <span>{message.context.location}</span>
              </div>
            )}
          </div>
        )}

        {/* Subtle texture overlay on hover */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-5 transition-opacity duration-300 pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-white/5" />
        </div>
      </article>

      {/* Timestamp & voice controls */}
      <div className="mt-3 flex flex-col items-end gap-2 pr-1">
        {isLastInGroup && (
          <MessageVoicePlayer
            messageId={messageId}
            messageText={displayContent}
            narrationSegments={message.narrationSegments as any}
          />
        )}

        {isLastInGroup && timestamp && (
          <div className="text-[11px] uppercase tracking-[0.35em] text-white/60">
            {timestamp}
          </div>
        )}
      </div>
    </motion.div>
  );
};
