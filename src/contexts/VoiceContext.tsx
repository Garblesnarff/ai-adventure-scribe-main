import React, { createContext, useContext, useState, useCallback, useRef } from 'react';

import type { NarrationSegment } from '@/hooks/use-ai-response';

import { useProgressiveVoice } from '@/hooks/use-progressive-voice';
import { extractNarrativeContent } from '@/utils/parseMessageOptions';

interface VoiceContextType {
  currentPlayingId: string | null;
  isPlaying: boolean;
  isPaused: boolean;
  playMessage: (messageId: string, text: string, narrationSegments?: NarrationSegment[]) => void;
  pauseMessage: () => void;
  stopMessage: () => void;
  volume: number;
  isMuted: boolean;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
}

const VoiceContext = createContext<VoiceContextType | undefined>(undefined);

export function useVoiceContext() {
  const context = useContext(VoiceContext);
  if (context === undefined) {
    throw new Error('useVoiceContext must be used within a VoiceProvider');
  }
  return context;
}

interface VoiceProviderProps {
  children: React.ReactNode;
}

export function VoiceProvider({ children }: VoiceProviderProps) {
  const [currentPlayingId, setCurrentPlayingId] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState<string>('');

  // Use the existing progressive voice hook
  const {
    isPlaying,
    isPaused,
    isProcessing,
    volume,
    isMuted,
    isVoiceEnabled,
    speakAISegments,
    speakPlainText,
    pausePlayback,
    resumePlayback,
    stopPlayback,
    setVolume,
    toggleMute,
    initializeAudioContext,
  } = useProgressiveVoice();

  // Helper function to convert NarrationSegments to AISegments
  const convertNarrationToAISegments = useCallback((narrationSegments: NarrationSegment[]) => {
    return narrationSegments.map((segment) => ({
      type: (['dm', 'narration'].includes(segment.type) ? 'dm' : 'character') as 'dm' | 'character',
      text: segment.text,
      character: segment.character,
      voice_category: segment.voice_category,
    }));
  }, []);

  const playMessage = useCallback(
    (messageId: string, text: string, narrationSegments?: NarrationSegment[]) => {
      // Initialize audio context for browser compatibility
      initializeAudioContext();

      // If this is the same message and it's paused, resume it
      if (currentPlayingId === messageId && isPaused) {
        resumePlayback();
        setAnnouncement('Resuming message playback');
        return;
      }

      // Stop current message if different message is playing
      if (currentPlayingId && currentPlayingId !== messageId) {
        stopPlayback();
      }

      setCurrentPlayingId(messageId);
      setAnnouncement('Playing message with text-to-speech');

      // Use AI segments if available, otherwise fall back to plain text
      if (narrationSegments && narrationSegments.length > 0) {
        const aiSegments = convertNarrationToAISegments(narrationSegments);
        speakAISegments(aiSegments);
      } else {
        // Extract narrative content as a safeguard (in case full text with options is passed)
        const narrativeText = extractNarrativeContent(text);
        speakPlainText(narrativeText);
      }
    },
    [
      currentPlayingId,
      isPaused,
      resumePlayback,
      stopPlayback,
      initializeAudioContext,
      convertNarrationToAISegments,
      speakAISegments,
      speakPlainText,
    ],
  );

  const pauseMessage = useCallback(() => {
    pausePlayback();
    setAnnouncement('Message playback paused');
  }, [pausePlayback]);

  const stopMessage = useCallback(() => {
    stopPlayback();
    setCurrentPlayingId(null);
    setAnnouncement('Message playback stopped');
  }, [stopPlayback]);

  // Handle when playback ends naturally (but not when paused)
  React.useEffect(() => {
    if (!isPlaying && !isProcessing && !isPaused && currentPlayingId) {
      // Audio finished naturally (not paused)
      setCurrentPlayingId(null);
    }
  }, [isPlaying, isProcessing, isPaused, currentPlayingId]);

  const contextValue: VoiceContextType = {
    currentPlayingId,
    isPlaying: isPlaying && !!currentPlayingId,
    isPaused: isPaused && !!currentPlayingId,
    playMessage,
    pauseMessage,
    stopMessage,
    volume,
    isMuted,
    setVolume,
    toggleMute,
  };

  return (
    <VoiceContext.Provider value={contextValue}>
      {children}

      {/* Screen reader announcements */}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {announcement}
      </div>
    </VoiceContext.Provider>
  );
}
