import React from 'react';

import { DMMessageVoiceControls } from '@/components/game/voice/DMMessageVoiceControls';

interface MessageVoicePlayerProps {
  messageId: string;
  messageText: string;
  narrationSegments?: Array<{
    text: string;
    audioUrl?: string;
    emotion?: string;
  }>;
}

/**
 * MessageVoicePlayer Component
 * Wraps DMMessageVoiceControls with hover effects and positioning
 * Only visible on hover for DM messages
 */
export const MessageVoicePlayer: React.FC<MessageVoicePlayerProps> = ({
  messageId,
  messageText,
  narrationSegments,
}) => {
  return (
    <div className="absolute bottom-2 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
      <DMMessageVoiceControls
        messageId={messageId}
        messageText={messageText}
        narrationSegments={narrationSegments as any}
      />
    </div>
  );
};
