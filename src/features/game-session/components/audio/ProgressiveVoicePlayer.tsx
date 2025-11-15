import {
  Play,
  Pause,
  Square,
  Volume2,
  VolumeX,
  Users,
  Settings,
  AlertCircle,
  RefreshCw,
  Trash2,
  TestTube,
} from 'lucide-react';
import React from 'react';

import type { NarrationSegment } from '@/hooks/use-ai-response';
import type { AISegment } from '@/services/voice-director';

import { useLocalStorage } from '@/hooks/use-local-storage';
import { useProgressiveVoice } from '@/hooks/use-progressive-voice';
import logger from '@/lib/logger';
import { Alert, AlertDescription } from '@/shared/components/ui/alert';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/shared/components/ui/collapsible';
import { Label } from '@/shared/components/ui/label';
import { Slider } from '@/shared/components/ui/slider';
import { Switch } from '@/shared/components/ui/switch';
import { Progress } from '@/shared/components/ui/progress';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/shared/components/ui/tooltip';

interface ProgressiveVoicePlayerProps {
  text: string;
  narrationSegments?: NarrationSegment[]; // Pre-segmented narration from AI
  isEnabled?: boolean;
  className?: string;
}

// Helper function to convert NarrationSegments to AISegments
const convertNarrationToAISegments = (narrationSegments: NarrationSegment[]): AISegment[] => {
  return narrationSegments.map((segment) => ({
    type: (['dm', 'narration'].includes(segment.type) ? 'dm' : 'character') as 'dm' | 'character',
    text: segment.text,
    character: segment.character,
    voice_category: segment.voice_category,
  }));
};

/**
 * ProgressiveVoicePlayer Component
 *
 * Simplified multi-voice player that uses progressive audio generation.
 * Replaces the complex MultiVoicePlayer with a cleaner, more reliable approach.
 */
export const ProgressiveVoicePlayer: React.FC<ProgressiveVoicePlayerProps> = ({
  text,
  narrationSegments,
  isEnabled = true,
  className = '',
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
    apiKey,
    speakAISegments,
    speakPlainText,
    stopPlayback,
    setVolume,
    toggleMute,
    toggleVoiceEnabled,
    retryApiKeyFetch,
    getCharacterVoiceMappings,
    clearCharacterVoiceMappings,
    initializeAudioContext,
  } = useProgressiveVoice();

  const [showSegments, setShowSegments] = React.useState(false);
  const [hasUserInteracted, setHasUserInteracted] = useLocalStorage(
    'progressive-voice-user-interacted',
    false,
  );
  const [autoPlayEnabled, setAutoPlayEnabled] = useLocalStorage(
    'progressive-voice-auto-play',
    false,
  ); // DISABLED by default: Auto-play causes browser policy violations

  // Auto-play functionality DISABLED to prevent browser policy issues
  const [lastText, setLastText] = React.useState('');

  // Simple text change tracking (auto-play disabled)
  React.useEffect(() => {
    if (text && text !== lastText && text.trim()) {
      setLastText(text);
      logger.debug('📝 New text received for progressive voice (auto-play disabled):', {
        textLength: text.length,
        hasNarrationSegments: !!(narrationSegments && narrationSegments.length > 0),
        narrationSegmentsLength: narrationSegments?.length || 0,
        narrationSegmentsType: typeof narrationSegments,
        narrationSegmentsFirst: narrationSegments?.[0],
        rawNarrationSegments: narrationSegments,
      });
    }
  }, [text, narrationSegments, lastText]);

  const handlePlayPause = React.useCallback(() => {
    // Initialize audio context during user interaction for browser autoplay compliance
    initializeAudioContext();

    // Mark that user has interacted
    if (!hasUserInteracted) {
      setHasUserInteracted(true);
    }

    if (isPlaying) {
      stopPlayback();
    } else if (!isProcessing) {
      logger.info('🎵 Manual play initiated');
      logger.debug('🔍 Debugging narration segments for manual play:', {
        hasNarrationSegments: !!(narrationSegments && narrationSegments.length > 0),
        narrationSegmentsLength: narrationSegments?.length || 0,
        narrationSegmentsType: typeof narrationSegments,
        rawNarrationSegments: narrationSegments,
      });

      if (narrationSegments && narrationSegments.length > 0) {
        logger.debug('🎭 Manual play with AI segments');
        const aiSegments = convertNarrationToAISegments(narrationSegments);
        logger.debug('🔄 Converted AI segments:', aiSegments);
        speakAISegments(aiSegments);
      } else {
        logger.debug('📝 Manual play with plain text fallback');
        speakPlainText(text);
      }
    }
  }, [
    isPlaying,
    isProcessing,
    stopPlayback,
    speakAISegments,
    speakPlainText,
    text,
    narrationSegments,
    hasUserInteracted,
    initializeAudioContext,
    setHasUserInteracted,
  ]);

  const handleAutoPlayToggle = React.useCallback(() => {
    setAutoPlayEnabled(!autoPlayEnabled);
  }, [autoPlayEnabled, setAutoPlayEnabled]);

  const handleRetry = React.useCallback(() => {
    if (text && isVoiceEnabled && !isProcessing) {
      if (narrationSegments && narrationSegments.length > 0) {
        logger.debug('🔄 Retrying with AI segments');
        const aiSegments = convertNarrationToAISegments(narrationSegments);
        speakAISegments(aiSegments);
      } else {
        logger.debug('🔄 Retrying with plain text');
        speakPlainText(text);
      }
    }
  }, [text, narrationSegments, isVoiceEnabled, isProcessing, speakAISegments, speakPlainText]);

  const handleTestAudio = React.useCallback(async () => {
    logger.info('🧪 Testing audio with simple text...');

    // Mark user interaction
    if (!hasUserInteracted) {
      setHasUserInteracted(true);
    }

    // Test with simple DM narration
    const testSegments = [
      {
        type: 'dm' as const,
        text: 'This is a test of the audio system.',
        character: undefined,
        voice_category: undefined,
      },
    ];

    await speakAISegments(testSegments);
  }, [speakAISegments, hasUserInteracted]);

  const handleClearVoiceMappings = React.useCallback(() => {
    logger.info('🔧 Clearing voice mappings...');
    clearCharacterVoiceMappings();
  }, [clearCharacterVoiceMappings]);

  const handleVolumeChange = React.useCallback(
    (values: number[]) => {
      setVolume(values[0]);
    },
    [setVolume],
  );

  const calculateProgress = () => {
    if (segments.length === 0) return 0;
    if (!isPlaying && !isProcessing) return 0;
    return ((currentSegmentIndex + 1) / segments.length) * 100;
  };

  const getSegmentTypeIcon = (type: string) => {
    return type === 'character' ? '💬' : '📖';
  };

  if (!isEnabled || !text) {
    return null;
  }

  return (
    <TooltipProvider>
      <Card
        className={`bg-white/90 backdrop-blur-sm border-2 border-primary/20 hover:border-primary/40 transition-all duration-200 ${className}`}
      >
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between text-lg">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <span>Progressive Voice</span>
              {isProcessing && (
                <Badge variant="outline" className="animate-pulse">
                  Processing...
                </Badge>
              )}
              {error && (
                <Badge variant="destructive" className="text-xs">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  Error
                </Badge>
              )}
              {isVoiceEnabled && !isPlaying && !isProcessing && !error && (
                <Badge variant="secondary" className="text-xs">
                  {!hasUserInteracted ? '⚠️ Click ▶ to activate audio' : '📝 Manual playback only'}
                </Badge>
              )}
              {!isVoiceEnabled && (
                <Badge variant="outline" className="text-xs text-muted-foreground">
                  🔇 Voice disabled
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-4">
              {/* Auto-play toggle HIDDEN - auto-play disabled */}
              <div className="flex items-center gap-2">
                <Switch
                  id="progressive-voice-enabled"
                  checked={isVoiceEnabled}
                  onCheckedChange={toggleVoiceEnabled}
                />
                <Label htmlFor="progressive-voice-enabled" className="text-sm">
                  Enable
                </Label>
              </div>
            </div>
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Main Controls */}
          <div className="flex items-center gap-3">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePlayPause}
                  disabled={!isVoiceEnabled || isProcessing || !text}
                  className="h-10 w-10 p-0"
                >
                  {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{isPlaying ? 'Pause' : 'Play'}</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={stopPlayback}
                  disabled={!isPlaying && !isProcessing}
                  className="h-10 w-10 p-0"
                >
                  <Square className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Stop</TooltipContent>
            </Tooltip>

            {/* Retry API Key Button */}
            {!apiKey && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={retryApiKeyFetch}
                    className="h-10 w-10 p-0 border-orange-300 text-orange-600 hover:bg-orange-50"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Retry API key fetch</TooltipContent>
              </Tooltip>
            )}

            {/* Test Audio Button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleTestAudio}
                  disabled={!isVoiceEnabled || isProcessing}
                  className="h-10 w-10 p-0"
                >
                  <TestTube className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Test audio</TooltipContent>
            </Tooltip>

            {/* Clear Voice Mappings Button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClearVoiceMappings}
                  className="h-10 w-10 p-0"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Clear voice mappings</TooltipContent>
            </Tooltip>

            {/* Retry Button */}
            {error && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRetry}
                    disabled={!isVoiceEnabled || isProcessing}
                    className="h-10 w-10 p-0"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Retry</TooltipContent>
              </Tooltip>
            )}

            {/* Volume Controls */}
            <div className="flex items-center gap-2 flex-1">
              <Button variant="ghost" size="sm" onClick={toggleMute} className="h-8 w-8 p-0">
                {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              </Button>

              <Slider
                value={[isMuted ? 0 : volume]}
                onValueChange={handleVolumeChange}
                max={1}
                step={0.05}
                className="flex-1"
              />

              <span className="text-xs text-muted-foreground w-10 text-right">
                {Math.round((isMuted ? 0 : volume) * 100)}%
              </span>
            </div>

            <Collapsible open={showSegments} onOpenChange={setShowSegments}>
              <CollapsibleTrigger asChild>
                <Button variant="outline" size="sm" className="h-10">
                  <Settings className="h-4 w-4 mr-2" />
                  Segments ({segments.length})
                </Button>
              </CollapsibleTrigger>
            </Collapsible>
          </div>

          {/* Error Alert */}
          {error && !isProcessing && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {error}{' '}
                {error.includes('API Key') && (
                  <Button
                    variant="link"
                    size="sm"
                    onClick={retryApiKeyFetch}
                    className="h-auto p-0 text-destructive underline"
                  >
                    Retry API key fetch
                  </Button>
                )}
                {!error.includes('API Key') && (
                  <Button
                    variant="link"
                    size="sm"
                    onClick={handleRetry}
                    className="h-auto p-0 text-destructive underline"
                  >
                    Click to retry
                  </Button>
                )}
              </AlertDescription>
            </Alert>
          )}

          {/* API Key Status Alert */}
          {!apiKey && !error && (
            <Alert variant="default">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                🔑 <strong>Retrieving API key...</strong>
                <br />
                ElevenLabs API key is being loaded. If this persists, click the 🔄 button to retry.
              </AlertDescription>
            </Alert>
          )}

          {/* First Time User Help */}
          {!hasUserInteracted && !isPlaying && !isProcessing && !error && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                🎙️ <strong>Welcome to Voice Narration!</strong>
                <br />
                Click the ▶ Play button or the 🧪 Test button to start audio. Once you interact,
                future AI responses will auto-play (if enabled).
              </AlertDescription>
            </Alert>
          )}

          {/* Progress Bar */}
          {(isPlaying || isProcessing) && (
            <div className="space-y-2">
              <Progress value={calculateProgress()} className="h-2" />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>
                  {currentSegmentIndex >= 0
                    ? `Segment ${currentSegmentIndex + 1} of ${segments.length}`
                    : 'Starting...'}
                </span>
                <span>{segments[currentSegmentIndex]?.character || 'DM'}</span>
              </div>
            </div>
          )}

          {/* Current Playing Segment */}
          {isPlaying && currentSegmentIndex >= 0 && segments[currentSegmentIndex] && (
            <Card className="bg-primary/5 border-primary/30">
              <CardContent className="p-3">
                <div className="flex items-start gap-3">
                  <span
                    className="text-lg"
                    role="img"
                    aria-label={segments[currentSegmentIndex].type}
                  >
                    {getSegmentTypeIcon(segments[currentSegmentIndex].type)}
                  </span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="text-xs">
                        {segments[currentSegmentIndex].character}
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        {segments[currentSegmentIndex].voiceName}
                      </Badge>
                    </div>
                    <p className="text-sm leading-relaxed">{segments[currentSegmentIndex].text}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Segments Preview */}
          <Collapsible open={showSegments} onOpenChange={setShowSegments}>
            <CollapsibleContent className="space-y-2">
              <div className="border-t pt-4">
                <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Voice Segments
                </h4>

                {segments.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic">No segments to display</p>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {segments.map((segment, index) => (
                      <div
                        key={segment.id}
                        className={`p-2 rounded-lg border transition-colors ${
                          index === currentSegmentIndex
                            ? 'bg-primary/10 border-primary/30'
                            : segment.error
                              ? 'bg-destructive/10 border-destructive/30'
                              : 'bg-muted/30 border-muted'
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          <span className="text-sm" role="img" aria-label={segment.type}>
                            {segment.error ? '⚠️' : getSegmentTypeIcon(segment.type)}
                          </span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1 mb-1">
                              <Badge variant="outline" className="text-xs">
                                {segment.character}
                              </Badge>
                              <Badge variant="secondary" className="text-xs">
                                {segment.voiceName}
                              </Badge>
                              {segment.error && (
                                <Badge variant="destructive" className="text-xs">
                                  Error
                                </Badge>
                              )}
                              {segment.isGenerating && (
                                <Badge variant="outline" className="text-xs animate-pulse">
                                  Generating...
                                </Badge>
                              )}
                              {segment.isPlaying && (
                                <Badge variant="default" className="text-xs">
                                  Playing
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground truncate">
                              {segment.error || segment.text}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Voice Mappings Debug Info */}
                <div className="mt-4 p-2 bg-muted/30 rounded text-xs">
                  <strong>Character Voice Mappings:</strong>
                  <pre className="mt-1 text-xs overflow-auto">
                    {JSON.stringify(getCharacterVoiceMappings(), null, 2)}
                  </pre>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
};
