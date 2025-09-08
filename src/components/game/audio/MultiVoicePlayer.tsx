import React from 'react';
import { Play, Pause, Square, Volume2, VolumeX, Users, Settings, AlertCircle, RefreshCw, TestTube, Trash2 } from 'lucide-react';
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
import { useMultiVoice, AudioSegment } from '@/hooks/use-multi-voice';
import { VoiceMapper } from '@/services/voice-mapper';
import { NarrationSegment } from '@/hooks/use-ai-response';

interface MultiVoicePlayerProps {
  text: string;
  narrationSegments?: NarrationSegment[]; // Pre-segmented narration from AI
  isEnabled?: boolean;
  className?: string;
}

/**
 * MultiVoicePlayer Component
 * 
 * Advanced audio player that handles multi-character voice synthesis.
 * Parses DM text and plays different segments with appropriate character voices.
 */
export const MultiVoicePlayer: React.FC<MultiVoicePlayerProps> = ({
  text,
  narrationSegments,
  isEnabled = true,
  className = ""
}) => {
  const {
    segments,
    currentSegmentIndex,
    isPlaying,
    isLoading,
    isProcessing,
    volume,
    isMuted,
    isVoiceEnabled,
    speakText,
    speakSegments, // New function for pre-segmented data
    stopPlayback,
    setVolume,
    toggleMute,
    toggleVoiceEnabled,
    parseText,
    testAudioPlayback
  } = useMultiVoice();

  const [showSegments, setShowSegments] = React.useState(false);
  const [previewSegments, setPreviewSegments] = React.useState<AudioSegment[]>([]);
  const [hasUserInteracted, setHasUserInteracted] = React.useState(() => {
    return localStorage.getItem('audio-user-interacted') === 'true';
  });
  const [autoPlayEnabled, setAutoPlayEnabled] = React.useState(() => {
    return localStorage.getItem('auto-play-enabled') !== 'false';
  });

  // Parse text for preview when text changes, or use pre-segmented data
  React.useEffect(() => {
    if (!isVoiceEnabled) {
      setPreviewSegments([]);
      return;
    }

    // Prefer narrationSegments if available (AI-provided segments)
    if (narrationSegments && narrationSegments.length > 0) {
      console.log('🎭 Using AI-provided narration segments:', narrationSegments.length);
      // Convert NarrationSegments to AudioSegments for preview
      const audioSegments: AudioSegment[] = narrationSegments.map((segment, index): AudioSegment => {
        let voiceConfig = VoiceMapper.getNarratorVoice(); // Default
        
        // Handle both naming conventions: 'narration'/'dm' and 'dialogue'/'character'
        const isNarration = segment.type === 'narration';
        
        if (isNarration) {
          voiceConfig = VoiceMapper.getNarratorVoice();
        } else if (segment.voice_category) {
          // Use the voice category provided by AI
          const allVoices = VoiceMapper.getAllVoices();
          voiceConfig = allVoices[segment.voice_category] || VoiceMapper.getNarratorVoice();
          console.log(`🎭 Preview: Using voice category "${segment.voice_category}" for character "${segment.character}"`);
        } else if (segment.character) {
          // Fallback to character-based mapping
          voiceConfig = VoiceMapper.getVoiceForCharacter(segment.character);
        }
        
        return {
          type: isNarration ? 'narration' : 'dialogue',
          text: segment.text,
          character: segment.character || 'Narrator',
          originalText: segment.text, // Use the segment text as originalText
          startIndex: index * 100, // Generate approximate indices for preview
          endIndex: (index * 100) + segment.text.length,
          voiceConfig,
          isPlaying: false,
          isLoading: false
        };
      });
      setPreviewSegments(audioSegments);
    } else if (text) {
      // Fallback to text parsing
      console.log('📝 Falling back to text parsing for preview');
      const parsed = parseText(text);
      setPreviewSegments(parsed);
    } else {
      setPreviewSegments([]);
    }
  }, [text, narrationSegments, isVoiceEnabled, parseText]);

  // Auto-play functionality with user interaction tracking
  const [lastText, setLastText] = React.useState('');
  
  // Auto-play new text after user has interacted at least once
  React.useEffect(() => {
    if (text && text !== lastText && text.trim() && isVoiceEnabled) {
      setLastText(text);
      
      // Only auto-play if:
      // 1. User has interacted before (to comply with browser policies)
      // 2. Auto-play is enabled
      // 3. We're not already playing or processing
      if (hasUserInteracted && autoPlayEnabled && !isPlaying && !isProcessing && !isLoading) {
        console.log('🎪 Auto-playing new AI response:', text.substring(0, 50) + '...');
        // Small delay to ensure state is settled
        setTimeout(() => {
          // Use pre-segmented data if available, otherwise fall back to text parsing
          if (narrationSegments && narrationSegments.length > 0) {
            console.log('🎭 Auto-playing with AI-provided segments');
            speakSegments(narrationSegments);
          } else {
            console.log('📝 Auto-playing with text parsing fallback');
            speakText(text);
          }
        }, 100);
      } else {
        console.log('🚫 Auto-play skipped:', {
          hasUserInteracted,
          autoPlayEnabled,
          isPlaying,
          isProcessing,
          isLoading
        });
      }
    }
  }, [text, narrationSegments, lastText, isVoiceEnabled, hasUserInteracted, autoPlayEnabled, isPlaying, isProcessing, isLoading, speakText, speakSegments]);

  const handlePlayPause = React.useCallback(() => {
    // Mark that user has interacted for future auto-play
    if (!hasUserInteracted) {
      setHasUserInteracted(true);
      localStorage.setItem('audio-user-interacted', 'true');
    }

    if (isPlaying) {
      stopPlayback();
    } else if (!isProcessing) {
      // Use pre-segmented data if available, otherwise fall back to text parsing
      if (narrationSegments && narrationSegments.length > 0) {
        console.log('🎭 Manual play with AI-provided segments');
        speakSegments(narrationSegments);
      } else {
        console.log('📝 Manual play with text parsing fallback');
        speakText(text);
      }
    }
  }, [isPlaying, isProcessing, stopPlayback, speakText, speakSegments, text, narrationSegments, hasUserInteracted]);

  const handleTestAudio = React.useCallback(async () => {
    console.log('🧪 Testing audio playback capability...');
    const canPlay = await testAudioPlayback();
    if (canPlay) {
      console.log('✅ Audio test passed - trying simple HTTP audio');
      // Test with a simple online audio file
      try {
        const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+D2xW0gBzOG0fPTgSYELIrP8N2QQAoUXrTp66hVFApGn+D2xW0gBzOG0fPTgSYE');
        await audio.play();
        console.log('✅ Simple audio test successful');
      } catch (error) {
        console.error('❌ Simple audio test failed:', error);
      }
    }
  }, [testAudioPlayback]);

  const handleAutoPlayToggle = React.useCallback(() => {
    const newAutoPlayState = !autoPlayEnabled;
    setAutoPlayEnabled(newAutoPlayState);
    localStorage.setItem('auto-play-enabled', newAutoPlayState.toString());
  }, [autoPlayEnabled]);

  const handleRetry = React.useCallback(() => {
    if (text && isVoiceEnabled && !isProcessing) {
      // Use pre-segmented data if available, otherwise fall back to text parsing
      if (narrationSegments && narrationSegments.length > 0) {
        console.log('🔄 Retrying with AI-provided segments');
        speakSegments(narrationSegments);
      } else {
        console.log('🔄 Retrying with text parsing fallback');
        speakText(text);
      }
    }
  }, [text, narrationSegments, isVoiceEnabled, isProcessing, speakText, speakSegments]);

  const handleDebugVoiceMapping = React.useCallback(() => {
    console.log('🔧 Debug: Clearing voice mappings and testing Thorne assignment...');
    
    // Clear all saved mappings
    VoiceMapper.clearSavedMappings();
    
    // Test specific character mappings
    VoiceMapper.debugAndClearCharacter('Thorne');
    VoiceMapper.debugAndClearCharacter('thorne');
    
    // Show current mappings
    console.log('📋 All available voices:', VoiceMapper.getAllVoices());
    
    // Re-parse text to see new voice assignments
    if (text) {
      const reparsed = parseText(text);
      console.log('🎭 Re-parsed segments with cleared mappings:', reparsed.map(s => ({
        type: s.type,
        character: s.character,
        voiceName: s.voiceConfig.name,
        voiceId: s.voiceConfig.id
      })));
    }
  }, [text, parseText]);

  // Check if there are any errors in segments
  const hasErrors = React.useMemo(() => {
    return segments.some(segment => segment.error);
  }, [segments]);

  const errorCount = React.useMemo(() => {
    return segments.filter(segment => segment.error).length;
  }, [segments]);

  const handleVolumeChange = React.useCallback((values: number[]) => {
    setVolume(values[0]);
  }, [setVolume]);

  const getSegmentTypeIcon = (type: string) => {
    switch (type) {
      case 'dialogue':
        return '💬';
      case 'narration':
        return '📖';
      case 'action':
        return '⚡';
      case 'thought':
        return '💭';
      default:
        return '📝';
    }
  };

  const getSegmentTypeBadgeVariant = (type: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (type) {
      case 'dialogue':
        return 'default';
      case 'narration':
        return 'secondary';
      case 'action':
        return 'destructive';
      case 'thought':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  const calculateProgress = () => {
    if (segments.length === 0) return 0;
    if (!isPlaying) return 0;
    return ((currentSegmentIndex + 1) / segments.length) * 100;
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
              <span>Multi-Voice Player</span>
              {(isLoading || isProcessing) && (
                <Badge variant="outline" className="animate-pulse">
                  {isProcessing ? "Processing..." : "Generating..."}
                </Badge>
              )}
              {hasErrors && (
                <Badge variant="destructive" className="text-xs">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  {errorCount} error{errorCount > 1 ? 's' : ''}
                </Badge>
              )}
              {isVoiceEnabled && !isPlaying && !isLoading && !isProcessing && previewSegments.length > 0 && (
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
                  id="auto-play-enabled"
                  checked={autoPlayEnabled && hasUserInteracted}
                  onCheckedChange={handleAutoPlayToggle}
                  disabled={!hasUserInteracted}
                />
                <Label htmlFor="auto-play-enabled" className="text-xs">
                  Auto-play
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="multi-voice-enabled"
                  checked={isVoiceEnabled}
                  onCheckedChange={toggleVoiceEnabled}
                />
                <Label htmlFor="multi-voice-enabled" className="text-sm">
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
                  disabled={!isVoiceEnabled || isLoading || isProcessing || !text}
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
                  disabled={!isPlaying && !isLoading}
                  className="h-10 w-10 p-0"
                >
                  <Square className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                Stop
              </TooltipContent>
            </Tooltip>

            {/* Test Audio Button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleTestAudio}
                  className="h-10 w-10 p-0"
                >
                  <TestTube className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                Test audio playback
              </TooltipContent>
            </Tooltip>

            {/* Debug Voice Mapping Button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDebugVoiceMapping}
                  className="h-10 w-10 p-0"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                Clear voice mappings & debug
              </TooltipContent>
            </Tooltip>

            {/* Retry Button */}
            {hasErrors && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRetry}
                    disabled={!isVoiceEnabled || isLoading || isProcessing}
                    className="h-10 w-10 p-0"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  Retry failed segments
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
                  Segments ({previewSegments.length})
                </Button>
              </CollapsibleTrigger>
            </Collapsible>
          </div>

          {/* Error Alert */}
          {hasErrors && !isLoading && !isProcessing && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {errorCount === 1 
                  ? "1 audio segment failed to generate. " 
                  : `${errorCount} audio segments failed to generate. `
                }
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
          {(isPlaying || isLoading || isProcessing) && (
            <div className="space-y-2">
              <Progress value={calculateProgress()} className="h-2" />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>
                  {currentSegmentIndex >= 0 ? `Segment ${currentSegmentIndex + 1} of ${segments.length}` : 'Preparing...'}
                </span>
                <span>
                  {segments[currentSegmentIndex]?.character || 'Narrator'}
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
                      <Badge variant={getSegmentTypeBadgeVariant(segments[currentSegmentIndex].type)} className="text-xs">
                        {segments[currentSegmentIndex].type}
                      </Badge>
                      {segments[currentSegmentIndex].character && (
                        <Badge variant="outline" className="text-xs">
                          {segments[currentSegmentIndex].character}
                        </Badge>
                      )}
                      <Badge variant="outline" className="text-xs">
                        {segments[currentSegmentIndex].voiceConfig.name}
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
                  Parsed Segments
                </h4>
                
                {previewSegments.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic">
                    No segments to display
                  </p>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {previewSegments.map((segment, index) => (
                      <div
                        key={`segment-${index}-${segment.text.substring(0, 20)}`}
                        className={`p-2 rounded-lg border transition-colors ${
                        index === currentSegmentIndex
                          ? 'bg-primary/10 border-primary/30'
                          : segment.error
                            ? 'bg-destructive/10 border-destructive/30'
                            : 'bg-muted/30 border-muted'
                      }`}>
                        <div className="flex items-start gap-2">
                          <span className="text-sm" role="img" aria-label={segment.type}>
                            {segment.error ? '⚠️' : getSegmentTypeIcon(segment.type)}
                          </span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1 mb-1">
                              <Badge 
                                variant={getSegmentTypeBadgeVariant(segment.type)} 
                                className="text-xs"
                              >
                                {segment.type}
                              </Badge>
                              {segment.character && (
                                <Badge variant="outline" className="text-xs">
                                  {segment.character}
                                </Badge>
                              )}
                              <Badge variant="secondary" className="text-xs">
                                {segment.voiceConfig.name}
                              </Badge>
                              {segment.error && (
                                <Badge variant="destructive" className="text-xs">
                                  Error
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
              </div>
            </CollapsibleContent>
          </Collapsible>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
};