/**
 * Voice Handler Component
 *
 * Manages voice narration for DM messages using the ProgressiveVoicePlayer.
 * Provides text-to-speech with character voices and progressive audio generation.
 *
 * Key features:
 * - Progressive audio generation for faster playback start
 * - Multi-character voice support with persistent voice mappings
 * - Automatic narration segment conversion from AI responses
 * - Browser autoplay policy compliance
 *
 * @author AI Dungeon Master Team
 */

import React from 'react';

import { ProgressiveVoicePlayer } from './audio/ProgressiveVoicePlayer';

import { useMessageContext } from '@/contexts/MessageContext';
import logger from '@/lib/logger';

export const VoiceHandler: React.FC = () => {
  const { messages } = useMessageContext();

  const lastMessage = messages[messages.length - 1];
  const shouldRenderPlayer = lastMessage?.sender === 'dm' && lastMessage.text;
  const cleanText = shouldRenderPlayer ? lastMessage.text.replace(/[*_`#]/g, '') : '';
  const narrationSegments = lastMessage?.narrationSegments;

  // Debug logging
  React.useEffect(() => {
    if (shouldRenderPlayer) {
      logger.debug('🎭 VoiceHandler: Processing message:', {
        hasLastMessage: !!lastMessage,
        messageType: lastMessage?.sender,
        textLength: lastMessage?.text?.length || 0,
        hasNarrationSegments: !!(narrationSegments && narrationSegments.length > 0),
        narrationSegmentsCount: narrationSegments?.length || 0,
        narrationSegments: narrationSegments,
      });
    }
  }, [lastMessage, shouldRenderPlayer, narrationSegments]);

  if (!shouldRenderPlayer) {
    return null;
  }

  return (
    <ProgressiveVoicePlayer
      text={cleanText}
      narrationSegments={narrationSegments}
      isEnabled={true}
    />
  );
};
