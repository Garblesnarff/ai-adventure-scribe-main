import React from 'react';
import { Play, Pause, Square, Volume2, VolumeX, Users, Settings, AlertCircle, RefreshCw, Trash2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useProgressiveVoice } from '@/hooks/use-progressive-voice';
import { NarrationSegment } from '@/hooks/use-ai-response';

interface ProgressiveVoicePlayerProps {
  text: string;
  narrationSegments?: NarrationSegment[]; // Pre-segmented narration from AI
  isEnabled?: boolean;
  className?: string;
}

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
  className = ""
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
    setVolume,
    toggleMute,
    toggleVoiceEnabled,
    getCharacterVoiceMappings,
    clearCharacterVoiceMappings
  } = useProgressiveVoice();

  const [showSegments, setShowSegments] = React.useState(false);
  const [hasUserInteracted, setHasUserInteracted] = React.useState(() => {
    return localStorage.getItem('progressive-voice-user-interacted') === 'true';
  });
  const [autoPlayEnabled, setAutoPlayEnabled] = React.useState(() => {
    return localStorage.getItem('progressive-voice-auto-play') !== 'false';
  });

  // Auto-play functionality with user interaction tracking
  const [lastText, setLastText] = React.useState('');
  
  React.useEffect(() => {
    if (text && text !== lastText && text.trim() && isVoiceEnabled) {
      setLastText(text);
      
      // Only auto-play if user has interacted before and auto-play is enabled
      if (hasUserInteracted && autoPlayEnabled && !isPlaying && !isProcessing) {
        console.log('🎪 Auto-playing new AI response with progressive voice');
        setTimeout(() => {
          if (narrationSegments && narrationSegments.length > 0) {
            speakAISegments(narrationSegments);
          } else {
            speakPlainText(text);
          }
        }, 100);
      }
    }
  }, [text, narrationSegments, lastText, isVoiceEnabled, hasUserInteracted, autoPlayEnabled, isPlaying, isProcessing, speakAISegments, speakPlainText]);

  const handlePlayPause = React.useCallback(() => {
    // Mark that user has interacted for future auto-play
    if (!hasUserInteracted) {
      setHasUserInteracted(true);
      localStorage.setItem('progressive-voice-user-interacted', 'true');
    }

    if (isPlaying) {
      stopPlayback();
    } else if (!isProcessing) {
      if (narrationSegments && narrationSegments.length > 0) {
        console.log('🎭 Manual play with AI segments');
        speakAISegments(narrationSegments);
      } else {
        console.log('📝 Manual play with plain text fallback');
        speakPlainText(text);
      }
    }
  }, [isPlaying, isProcessing, stopPlayback, speakAISegments, speakPlainText, text, narrationSegments, hasUserInteracted]);

  const handleAutoPlayToggle = React.useCallback(() => {
    const newAutoPlayState = !autoPlayEnabled;
    setAutoPlayEnabled(newAutoPlayState);
    localStorage.setItem('progressive-voice-auto-play', newAutoPlayState.toString());
  }, [autoPlayEnabled]);

  const handleRetry = React.useCallback(() => {
    if (text && isVoiceEnabled && !isProcessing) {
      if (narrationSegments && narrationSegments.length > 0) {
        console.log('🔄 Retrying with AI segments');
        speakAISegments(narrationSegments);
      } else {
        console.log('🔄 Retrying with plain text');
        speakPlainText(text);
      }
    }
  }, [text, narrationSegments, isVoiceEnabled, isProcessing, speakAISegments, speakPlainText]);

  const handleClearVoiceMappings = React.useCallback(() => {
    console.log('🔧 Clearing voice mappings...');
    clearCharacterVoiceMappings();
  }, [clearCharacterVoiceMappings]);

  const handleVolumeChange = React.useCallback((values: number[]) => {
    setVolume(values[0]);
  }, [setVolume]);

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
      <Card className={`bg-white/90 backdrop-blur-sm border-2 border-primary/20 hover:border-primary/40 transition-all duration-200 ${className}`}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between text-lg">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <span>Progressive Voice</span>
              {(isProcessing) && (
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
                  {!hasUserInteracted 
                    ? "Click ▶ to enable auto-play" 
                    : autoPlayEnabled 
                      ? "Auto-play enabled" 
                      : "Click ▶ to play"
                  }
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Switch
                  id="progressive-auto-play"
                  checked={autoPlayEnabled && hasUserInteracted}
                  onCheckedChange={handleAutoPlayToggle}
                  disabled={!hasUserInteracted}
                />
                <Label htmlFor="progressive-auto-play" className="text-xs">
                  Auto-play
                </Label>
              </div>
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
                  {isPlaying ? (
                    <Pause className="h-4 w-4" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {isPlaying ? 'Pause' : 'Play'}
              </TooltipContent>
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
              <TooltipContent>
                Stop
              </TooltipContent>
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
              <TooltipContent>
                Clear voice mappings
              </TooltipContent>
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
                <TooltipContent>
                  Retry
                </TooltipContent>
              </Tooltip>
            )}

            {/* Volume Controls */}
            <div className="flex items-center gap-2 flex-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleMute}
                className="h-8 w-8 p-0"
              >
                {isMuted ? (
                  <VolumeX className="h-4 w-4" />
                ) : (
                  <Volume2 className="h-4 w-4" />
                )}
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
                {error}{" "}
                <Button 
                  variant="link" 
                  size="sm" 
                  onClick={handleRetry}
                  className="h-auto p-0 text-destructive underline"
                >
                  Click to retry
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {/* Progress Bar */}
          {(isPlaying || isProcessing) && (
            <div className="space-y-2">
              <Progress value={calculateProgress()} className="h-2" />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>
                  {currentSegmentIndex >= 0 ? `Segment ${currentSegmentIndex + 1} of ${segments.length}` : 'Starting...'}
                </span>
                <span>
                  {segments[currentSegmentIndex]?.character || 'DM'}
                </span>
              </div>
            </div>
          )}

          {/* Current Playing Segment */}
          {isPlaying && currentSegmentIndex >= 0 && segments[currentSegmentIndex] && (
            <Card className="bg-primary/5 border-primary/30">
              <CardContent className="p-3">
                <div className="flex items-start gap-3">
                  <span className="text-lg" role="img" aria-label={segments[currentSegmentIndex].type}>
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
                    <p className="text-sm leading-relaxed">
                      {segments[currentSegmentIndex].text}
                    </p>
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
                  <p className="text-sm text-muted-foreground italic">
                    No segments to display
                  </p>
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