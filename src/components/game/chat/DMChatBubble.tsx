import React from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Play, Pause, Volume2, VolumeX, AlertCircle, RefreshCw } from 'lucide-react';
import { useProgressiveVoice } from '@/hooks/use-progressive-voice';
import { ChatMessage } from '@/services/ai-service';
import { NarrationSegment } from '@/hooks/use-ai-response';

interface DMChatBubbleProps {
  message: ChatMessage;
  narrationSegments?: NarrationSegment[];
}

// Helper function to convert NarrationSegments to AISegments
const convertNarrationToAISegments = (narrationSegments: NarrationSegment[]) => {
  return narrationSegments.map(segment => ({
    type: segment.type === 'dm' ? 'dm' : 'character' as 'dm' | 'character',
    text: segment.text,
    character: segment.character,
    voice_category: segment.voice_category
  }));
};

export const DMChatBubble: React.FC<DMChatBubbleProps> = ({
  message,
  narrationSegments
}) => {
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
    initializeAudioContext
  } = useProgressiveVoice();

  const [hasUserInteracted, setHasUserInteracted] = React.useState(() => {
    return localStorage.getItem('progressive-voice-user-interacted') === 'true';
  });

  // Check if this message is currently playing
  const isThisMessagePlaying = React.useMemo(() => {
    if (!isPlaying || segments.length === 0) return false;
    // Simple check: if we have segments and one is playing, assume it's this message
    // In a more complex system, we'd track which message's segments are active
    return segments.some(segment => segment.isPlaying);
  }, [isPlaying, segments]);

  const handlePlayPause = React.useCallback(() => {
    // Initialize audio context during user interaction
    initializeAudioContext();
    
    // Mark that user has interacted
    if (!hasUserInteracted) {
      setHasUserInteracted(true);
      localStorage.setItem('progressive-voice-user-interacted', 'true');
    }

    if (isThisMessagePlaying) {
      stopPlayback();
    } else if (!isProcessing) {
      console.log('🎵 Playing message:', message.id);
      
      if (narrationSegments && narrationSegments.length > 0) {
        console.log('🎭 Using AI segments for message playback');
        const aiSegments = convertNarrationToAISegments(narrationSegments);
        speakAISegments(aiSegments);
      } else {
        console.log('📝 Using plain text fallback for message playback');
        speakPlainText(message.content);
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
    initializeAudioContext
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
    <div className="flex justify-start">
      <div className="flex max-w-[85%] flex-row items-start">
        {/* DM Avatar */}
        <div className="flex-shrink-0 mr-3">
          <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium bg-infinite-purple text-white">
            DM
          </div>
        </div>

        {/* Message Bubble */}
        <div className="flex flex-col items-start space-y-2">
          <div className={`relative px-5 py-4 rounded-xl transition-all duration-200 bg-muted text-foreground ${
            isThisMessagePlaying ? 'ring-2 ring-infinite-purple ring-opacity-50 shadow-lg' : ''
          }`}>
            {/* Message Content */}
            <p className="text-sm leading-relaxed whitespace-pre-wrap mb-3">
              {message.content}
            </p>

            {/* Voice Controls */}
            {isVoiceEnabled && (
              <div className="flex items-center gap-2 pt-2 border-t border-muted-foreground/10">
                {/* Play/Pause Button */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handlePlayPause}
                  disabled={isProcessing}
                  className="h-8 w-8 p-0 hover:bg-infinite-purple/10"
                >
                  {isThisMessagePlaying ? (
                    <Pause className="h-4 w-4" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                </Button>

                {/* Progress Bar */}
                {isThisMessagePlaying && (
                  <div className="flex-1 flex items-center gap-2">
                    <Progress 
                      value={calculateProgress()} 
                      className="h-2 flex-1" 
                    />
                    <span className="text-xs text-muted-foreground min-w-[4rem]">
                      {formatTime(currentSegmentIndex, segments.length)}
                    </span>
                  </div>
                )}

                {/* Volume Control */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleMute}
                  className="h-8 w-8 p-0 hover:bg-infinite-purple/10"
                >
                  {isMuted ? (
                    <VolumeX className="h-4 w-4" />
                  ) : (
                    <Volume2 className="h-4 w-4" />
                  )}
                </Button>

                {/* Error State */}
                {error && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handlePlayPause}
                    className="h-8 w-8 p-0 hover:bg-destructive/10 text-destructive"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                )}
              </div>
            )}

            {/* Processing Indicator */}
            {isProcessing && isThisMessagePlaying && (
              <div className="flex items-center gap-2 pt-2 border-t border-muted-foreground/10">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <div className="w-2 h-2 bg-infinite-purple rounded-full animate-pulse" />
                  <span>Generating audio...</span>
                </div>
              </div>
            )}

            {/* Current Segment Info */}
            {isThisMessagePlaying && currentSegmentIndex >= 0 && segments[currentSegmentIndex] && (
              <div className="flex items-center gap-2 pt-2 border-t border-muted-foreground/10">
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-infinite-purple font-medium">
                    {segments[currentSegmentIndex].character || 'DM'}
                  </span>
                  <span className="text-muted-foreground">
                    Segment {currentSegmentIndex + 1} of {segments.length}
                  </span>
                </div>
              </div>
            )}

            {/* Error Message */}
            {error && !isProcessing && (
              <div className="flex items-center gap-2 pt-2 border-t border-destructive/20">
                <AlertCircle className="h-4 w-4 text-destructive" />
                <span className="text-xs text-destructive">
                  Audio error - click retry
                </span>
              </div>
            )}

            {/* First Time User Help */}
            {!hasUserInteracted && !isThisMessagePlaying && !isProcessing && !error && (
              <div className="pt-2 border-t border-muted-foreground/10">
                <span className="text-xs text-muted-foreground">
                  Click ▶️ to hear this message
                </span>
              </div>
            )}
          </div>

          {/* Timestamp */}
          <div className="text-xs text-muted-foreground px-2">
            {message.timestamp ? new Date(message.timestamp).toLocaleTimeString([], { 
              hour: '2-digit', 
              minute: '2-digit' 
            }) : ''}
          </div>
        </div>
      </div>
    </div>
  );
};
