import { Play, Pause, Volume2, VolumeX } from 'lucide-react';
import React, { useState, useCallback } from 'react';

import type { NarrationSegment } from '@/hooks/use-ai-response';

import { useVoiceContext } from '@/contexts/VoiceContext';
import { cn } from '@/lib/utils';
import { Button } from '@/shared/components/ui/button';
import { Slider } from '@/shared/components/ui/slider';
import { extractNarrativeContent } from '@/utils/parseMessageOptions';

interface DMMessageVoiceControlsProps {
  messageId: string;
  messageText: string;
  narrationSegments?: NarrationSegment[];
  className?: string;
}

export function DMMessageVoiceControls({
  messageId,
  messageText,
  narrationSegments,
  className,
}: DMMessageVoiceControlsProps) {
  const {
    currentPlayingId,
    isPlaying,
    playMessage,
    pauseMessage,
    volume,
    isMuted,
    setVolume,
    toggleMute,
  } = useVoiceContext();

  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [isTouchDevice, setIsTouchDevice] = useState(() => {
    if (typeof window !== 'undefined') {
      return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    }
    return false;
  });

  const isCurrentlyPlaying = currentPlayingId === messageId && isPlaying;

  const handlePlayPause = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (isCurrentlyPlaying) {
        pauseMessage();
      } else {
        // Extract narrative content to exclude options from TTS
        const narrativeText = extractNarrativeContent(messageText);
        playMessage(messageId, narrativeText, narrationSegments);
      }
    },
    [isCurrentlyPlaying, pauseMessage, playMessage, messageId, messageText, narrationSegments],
  );

  const handleVolumeChange = useCallback(
    (values: number[]) => {
      setVolume(values[0]);
    },
    [setVolume],
  );

  const handleVolumeToggle = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      toggleMute();
    },
    [toggleMute],
  );

  // Check if speech synthesis is available
  const [isVoiceAvailable] = useState(() => {
    if (typeof window !== 'undefined') {
      return 'speechSynthesis' in window;
    }
    return false;
  });

  if (!isVoiceAvailable) {
    return null;
  }

  return (
    <div
      className={cn(
        'flex items-center gap-2 transition-all duration-200',
        // Desktop: Show on hover, Mobile: Always show when playing or recently interacted
        'opacity-0 group-hover:opacity-100',
        isCurrentlyPlaying && 'opacity-100',
        isTouchDevice && 'opacity-100', // Always visible on touch devices
        className,
      )}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Play/Pause Button */}
      <Button
        variant="ghost"
        size="sm"
        className={cn(
          'h-6 w-6 p-0 rounded-full transition-all duration-150',
          'hover:bg-accent/50 active:scale-95',
          'text-muted-foreground hover:text-primary',
          isCurrentlyPlaying && 'text-primary bg-accent/30',
          // Larger touch target on mobile
          isTouchDevice && 'h-8 w-8',
        )}
        onClick={handlePlayPause}
        aria-label={
          isCurrentlyPlaying
            ? 'Pause reading this message'
            : 'Play this message with text-to-speech'
        }
        aria-pressed={isCurrentlyPlaying}
      >
        {isCurrentlyPlaying ? (
          <Pause className={cn('h-3 w-3', isTouchDevice && 'h-4 w-4')} aria-hidden="true" />
        ) : (
          <Play className={cn('h-3 w-3', isTouchDevice && 'h-4 w-4')} aria-hidden="true" />
        )}
      </Button>

      {/* Playing Indicator */}
      {isCurrentlyPlaying && (
        <div
          className="flex items-center gap-1.5 animate-in slide-in-from-left-2 duration-200"
          aria-live="polite"
          aria-label="Currently playing message"
        >
          <div className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse" aria-hidden="true" />
          <span
            className={cn(
              'text-xs text-primary font-medium',
              isTouchDevice ? 'inline' : 'hidden md:inline',
            )}
          >
            Playing
          </span>
          <span className="sr-only">Playing message</span>
        </div>
      )}

      {/* Volume Control - Only show on hover/focus or when volume slider is open */}
      {(showVolumeSlider || isCurrentlyPlaying) && (
        <div
          className="flex items-center gap-1 animate-in slide-in-from-right-2 duration-200"
          onMouseEnter={() => setShowVolumeSlider(true)}
          onMouseLeave={() => setShowVolumeSlider(false)}
        >
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 rounded-full text-muted-foreground hover:text-primary"
            onClick={handleVolumeToggle}
            aria-label={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? (
              <VolumeX className="h-3 w-3" aria-hidden="true" />
            ) : (
              <Volume2 className="h-3 w-3" aria-hidden="true" />
            )}
          </Button>

          {showVolumeSlider && (
            <div className="w-16">
              <Slider
                value={[isMuted ? 0 : volume]}
                onValueChange={handleVolumeChange}
                max={1}
                step={0.05}
                className="h-4"
                aria-label="Volume"
              />
            </div>
          )}
        </div>
      )}

      {/* Additional context for screen readers */}
      {narrationSegments && narrationSegments.length > 0 && (
        <span className="sr-only">
          This message has {narrationSegments.length} voice segments with multiple characters
        </span>
      )}
    </div>
  );
}
