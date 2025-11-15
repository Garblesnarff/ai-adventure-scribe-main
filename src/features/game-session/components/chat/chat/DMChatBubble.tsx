import { Play, Pause, Volume2, VolumeX, AlertCircle, RefreshCw } from 'lucide-react';
import React, { useMemo } from 'react';

import type { NarrationSegment } from '@/hooks/use-ai-response';
import type { ChatMessage } from '@/services/ai-service';

import { DiceRollEmbed } from '@/components/DiceRollEmbed';
import { ActionOptions } from '@/components/game/ActionOptions';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { useProgressiveVoice } from '@/hooks/use-progressive-voice';
import logger from '@/lib/logger';
import { DiceEngine, type DiceRollResult } from '@/services/dice/DiceEngine';
import {
  parseMessageOptions,
  extractNarrativeContent,
  createPlayerMessageFromOption,
} from '@/utils/parseMessageOptions';

interface DMChatBubbleProps {
  message: ChatMessage;
  narrationSegments?: NarrationSegment[];
  onOptionSelect?: (optionText: string) => void;
}

// Helper function to convert NarrationSegments to AISegments
const convertNarrationToAISegments = (narrationSegments: NarrationSegment[]) => {
  return narrationSegments.map((segment) => ({
    type: segment.type === 'dm' ? 'dm' : ('character' as 'dm' | 'character'),
    text: segment.text,
    character: segment.character,
    voice_category: segment.voice_category,
  }));
};

export const DMChatBubble: React.FC<DMChatBubbleProps> = ({
  message,
  narrationSegments,
  onOptionSelect,
}) => {
  // Parse message content to separate narrative from options
  const parsedMessage = useMemo(() => {
    return parseMessageOptions(message.content);
  }, [message.content]);

  // Parse dice expressions from the message content
  const diceExpressions = useMemo(() => {
    return DiceEngine.findDiceExpressions(message.content);
  }, [message.content]);

  // Render message content with embedded dice components
  const renderMessageContent = useMemo(() => {
    const content = parsedMessage.content || message.content;

    if (diceExpressions.length === 0) {
      return <p className="text-sm leading-relaxed whitespace-pre-wrap mb-3">{content}</p>;
    }

    // Split content around dice expressions and render with embedded dice components
    const parts = [];
    let lastIndex = 0;

    diceExpressions.forEach((diceExpr, index) => {
      // Add text before dice expression
      if (diceExpr.index > lastIndex) {
        const textBefore = content.slice(lastIndex, diceExpr.index);
        if (textBefore) {
          parts.push(<span key={`text-${index}`}>{textBefore}</span>);
        }
      }

      // Add dice component
      parts.push(
        <DiceRollEmbed
          key={`dice-${index}`}
          expression={diceExpr.expression}
          purpose={diceExpr.purpose}
          autoRoll={true}
          showAnimation={true}
          onRoll={(result: DiceRollResult) => {
            logger.info('Dice rolled:', result);
          }}
        />,
      );

      lastIndex = diceExpr.index + diceExpr.length;
    });

    // Add remaining text after last dice expression
    if (lastIndex < content.length) {
      const textAfter = content.slice(lastIndex);
      if (textAfter) {
        parts.push(<span key="text-final">{textAfter}</span>);
      }
    }

    return <div className="text-sm leading-relaxed mb-3">{parts}</div>;
  }, [parsedMessage.content, message.content, diceExpressions]);
  const {
    segments,
    currentSegmentIndex,
    isPlaying,
    isProcessing,
    volume,
    isMuted,
    isVoiceEnabled,
    error,
    speakAISegments,
    speakPlainText,
    stopPlayback,
    toggleMute,
    initializeAudioContext,
  } = useProgressiveVoice();

  const [hasUserInteracted, setHasUserInteracted] = useLocalStorage<boolean>(
    'progressive-voice-user-interacted',
    false,
  );

  // Handle option selection
  const handleOptionSelect = React.useCallback(
    (option: any) => {
      if (onOptionSelect) {
        const playerMessage = createPlayerMessageFromOption(option);
        onOptionSelect(playerMessage);
      }
    },
    [onOptionSelect],
  );

  // Check if this message is currently playing
  const isThisMessagePlaying = React.useMemo(() => {
    if (!isPlaying || segments.length === 0) return false;
    // Simple check: if we have segments and one is playing, assume it's this message
    // In a more complex system, we'd track which message's segments are active
    return segments.some((segment) => segment.isPlaying);
  }, [isPlaying, segments]);

  const handlePlayPause = React.useCallback(() => {
    // Initialize audio context during user interaction
    initializeAudioContext();

    // Mark that user has interacted
    if (!hasUserInteracted) {
      setHasUserInteracted(true);
    }

    if (isThisMessagePlaying) {
      stopPlayback();
    } else if (!isProcessing) {
      logger.info('🎵 Playing message:', message.id);

      if (narrationSegments && narrationSegments.length > 0) {
        logger.debug('🎭 Using AI segments for message playback');
        const aiSegments = convertNarrationToAISegments(narrationSegments);
        speakAISegments(aiSegments);
      } else {
        logger.debug('📝 Using plain text fallback for message playback');
        // Use only narrative content for TTS (exclude options)
        const narrativeContent = extractNarrativeContent(message.content);
        speakPlainText(narrativeContent);
      }
    }
  }, [
    isThisMessagePlaying,
    isProcessing,
    stopPlayback,
    speakAISegments,
    speakPlainText,
    message.content,
    message.id,
    narrationSegments,
    hasUserInteracted,
    setHasUserInteracted,
    initializeAudioContext,
  ]);

  const calculateProgress = () => {
    if (!isThisMessagePlaying || segments.length === 0) return 0;
    return ((currentSegmentIndex + 1) / segments.length) * 100;
  };

  const formatTime = (segmentIndex: number, totalSegments: number) => {
    // Simple time calculation - could be enhanced with actual audio durations
    const estimatedDuration = totalSegments * 3; // 3 seconds per segment estimate
    const currentTime = segmentIndex * 3;

    const formatSeconds = (seconds: number) => {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return `${formatSeconds(currentTime)} / ${formatSeconds(estimatedDuration)}`;
  };

  return (
    <div className="flex justify-start animate-in slide-in-from-left-2 duration-500">
      <div className="flex max-w-[85%] flex-row items-start">
        {/* Enhanced DM Avatar */}
        <div className="flex-shrink-0 mr-4 relative">
          <div className="w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold bg-gradient-to-br from-infinite-purple to-infinite-teal text-white shadow-lg border-2 border-white/20 hover-glow transition-all duration-300">
            <span className="text-xs">🎭</span>
          </div>
          <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-infinite-gold rounded-full flex items-center justify-center border-2 border-background">
            <span className="text-[8px] font-bold text-infinite-dark">DM</span>
          </div>
        </div>

        {/* Enhanced Message Bubble */}
        <div className="flex flex-col items-start space-y-3">
          <div
            className={`relative px-6 py-4 rounded-2xl transition-all duration-300 glass-strong shadow-lg hover:shadow-xl ${
              isThisMessagePlaying
                ? 'ring-2 ring-infinite-purple/70 shadow-2xl bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-xl'
                : 'hover:bg-card/80'
            }`}
          >
            {/* Speech Bubble Tail */}
            <div className="absolute left-[-8px] top-6 w-0 h-0 border-t-8 border-t-transparent border-b-8 border-b-transparent border-r-8 border-r-card/90"></div>
            <div className="absolute left-[-6px] top-6 w-0 h-0 border-t-8 border-t-transparent border-b-8 border-b-transparent border-r-8 border-r-card"></div>
            {/* Enhanced Message Content */}
            <div className="text-narrative text-foreground-secondary">{renderMessageContent}</div>

            {/* Enhanced Voice Controls */}
            {isVoiceEnabled && (
              <div className="flex items-center gap-3 pt-3 border-t border-white/10">
                {/* Enhanced Play/Pause Button */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handlePlayPause}
                  disabled={isProcessing}
                  className="h-9 w-9 p-0 rounded-full hover:bg-infinite-purple/20 focus-glow transition-all duration-200 hover:scale-105"
                >
                  {isThisMessagePlaying ? (
                    <Pause className="h-4 w-4 text-infinite-teal" />
                  ) : (
                    <Play className="h-4 w-4 text-infinite-gold" />
                  )}
                </Button>

                {/* Enhanced Progress Bar */}
                {isThisMessagePlaying && (
                  <div className="flex-1 flex items-center gap-3">
                    <div className="flex-1 bg-white/10 rounded-full h-2 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-infinite-teal to-infinite-purple transition-all duration-300 ease-out rounded-full"
                        style={{ width: `${calculateProgress()}%` }}
                      ></div>
                    </div>
                    <span className="text-xs text-muted-foreground/80 font-mono min-w-[4rem] bg-card/50 px-2 py-1 rounded">
                      {formatTime(currentSegmentIndex, segments.length)}
                    </span>
                  </div>
                )}

                {/* Enhanced Volume Control */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleMute}
                  className="h-9 w-9 p-0 rounded-full hover:bg-infinite-teal/20 focus-glow transition-all duration-200 hover:scale-105"
                >
                  {isMuted ? (
                    <VolumeX className="h-4 w-4 text-red-400" />
                  ) : (
                    <Volume2 className="h-4 w-4 text-infinite-teal" />
                  )}
                </Button>

                {/* Enhanced Error State */}
                {error && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handlePlayPause}
                    className="h-9 w-9 p-0 rounded-full hover:bg-destructive/20 text-destructive focus-glow transition-all duration-200 hover:scale-105"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                )}
              </div>
            )}

            {/* Enhanced Processing Indicator */}
            {isProcessing &&
              isThisMessagePlaying &&
              !(currentSegmentIndex >= 0 && segments[currentSegmentIndex]) && (
                <div className="flex items-center gap-3 pt-3 border-t border-white/10">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground bg-infinite-purple/10 px-3 py-1 rounded-full">
                    <div className="flex gap-1">
                      <div className="w-1.5 h-1.5 bg-infinite-purple rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                      <div className="w-1.5 h-1.5 bg-infinite-teal rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                      <div className="w-1.5 h-1.5 bg-infinite-gold rounded-full animate-bounce"></div>
                    </div>
                    <span className="font-medium">Weaving mystical audio...</span>
                  </div>
                </div>
              )}

            {/* Enhanced Current Segment Info */}
            {isThisMessagePlaying && currentSegmentIndex >= 0 && segments[currentSegmentIndex] && (
              <div className="flex items-center gap-3 pt-3 border-t border-white/10">
                <div className="flex items-center gap-2 text-xs bg-gradient-to-r from-infinite-purple/10 to-infinite-teal/10 px-3 py-1 rounded-full">
                  <span className="text-infinite-gold font-bold">
                    🎭 {segments[currentSegmentIndex].character || 'Dungeon Master'}
                  </span>
                  <span className="text-muted-foreground/80 font-mono">
                    {currentSegmentIndex + 1}/{segments.length}
                  </span>
                </div>
              </div>
            )}

            {/* Enhanced Error Message */}
            {error && !isProcessing && (
              <div className="flex items-center gap-3 pt-3 border-t border-destructive/20">
                <div className="flex items-center gap-2 text-xs text-destructive bg-destructive/10 px-3 py-1 rounded-full">
                  <AlertCircle className="h-4 w-4" />
                  <span className="font-medium">Mystical interference detected - click retry</span>
                </div>
              </div>
            )}

            {/* Enhanced First Time User Help */}
            {!hasUserInteracted && !isThisMessagePlaying && !isProcessing && !error && (
              <div className="pt-3 border-t border-white/10">
                <div className="flex items-center gap-2 text-xs text-muted-foreground/80 bg-infinite-gold/10 px-3 py-1 rounded-full animate-pulse">
                  <span className="text-infinite-gold">✨</span>
                  <span className="font-medium">Click play to hear the Dungeon Master's voice</span>
                </div>
              </div>
            )}
          </div>

          {/* Enhanced Action Options */}
          {parsedMessage.hasOptions && (
            <div className="w-full max-w-md animate-in slide-in-from-bottom-2 duration-500">
              <ActionOptions
                options={parsedMessage.options}
                onOptionSelect={handleOptionSelect}
                delay={10000} // 10 second delay
              />
            </div>
          )}

          {/* Enhanced Timestamp */}
          <div className="text-xs text-muted-foreground/60 px-2 font-mono bg-card/30 rounded px-2 py-1">
            {message.timestamp
              ? new Date(message.timestamp).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : ''}
          </div>
        </div>
      </div>
    </div>
  );
};
