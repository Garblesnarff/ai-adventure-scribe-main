import React from 'react';
import { ChatMessage } from '@/types/game';
import { MessageMetadata } from './MessageMetadata';
import { MessageVoicePlayer } from './MessageVoicePlayer';
import { MessageImageSection } from './MessageImageSection';
import { removeRollRequestsFromMessage } from '@/utils/rollRequestParser';

interface DMMessageProps {
  message: ChatMessage;
  messageId: string;
  isFirstInGroup: boolean;
  isLastInGroup: boolean;
  displayContent: string;
  isLongMessage: boolean;
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
  isLongMessage,
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

  return (
    <div className={`w-full ${hasAnyImage ? 'relative mb-48 md:mb-60' : ''}`}>
      <div
        className={
          `relative px-4 py-3 rounded-2xl transition-all duration-300 message-bubble backdrop-blur-sm ` +
          'dm-bubble border border-infinite-purple/30 bg-gradient-to-br from-slate-800/90 via-purple-900/85 to-slate-800/90 text-white shadow-lg hover:shadow-xl hover:shadow-purple-500/20 ' +
          (isFirstInGroup ? 'rounded-t-2xl pt-4 ' : '') +
          (isLastInGroup ? 'rounded-b-2xl pb-4 ' : 'border-b border-border/20 ') +
          'animate-in fade-in slide-in-from-bottom-2 hover:scale-[1.02] group-hover:shadow-lg'
        }
      >
        {/* Message content */}
        <div className="text-sm leading-relaxed whitespace-pre-wrap">{cleanContent}</div>

        {/* Image generation section - only on last message */}
        {isLastInGroup && (
          <MessageImageSection
            messageId={messageId}
            isGenerating={isGeneratingImage}
            imageUrl={imageUrl}
            error={imageError}
            onGenerate={onGenerateImage}
          />
        )}

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
          isPlayer={false}
        />

        {/* Voice Controls - only on last DM message */}
        {isLastInGroup && (
          <MessageVoicePlayer
            messageId={messageId}
            messageText={displayContent}
            narrationSegments={message.narrationSegments as any}
          />
        )}
      </div>
    </div>
  );
};
