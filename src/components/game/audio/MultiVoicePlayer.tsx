import React from 'react';
import { Play, Pause, Square, Volume2, VolumeX, Users, Settings, AlertCircle, RefreshCw } from 'lucide-react';
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
import { AISegment } from '@/services/voice-director';
import { useLocalStorage } from '@/hooks/use-local-storage';

interface MultiVoicePlayerProps {
  text: string;
  narrationSegments?: AISegment[];
  isEnabled?: boolean;
  className?: string;
}

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
    isPaused,
    isProcessing,
    volume,
    isMuted,
    isVoiceEnabled,
    error,
    speakAISegments,
    speakPlainText,
    pausePlayback,
    resumePlayback,
    stopPlayback,
    setVolume,
    toggleMute,
    toggleVoiceEnabled,
    initializeAudioContext,
    retryApiKeyFetch,
  } = useProgressiveVoice();

  const [showSegments, setShowSegments] = React.useState(false);
  const [hasUserInteracted, setHasUserInteracted] = useLocalStorage('audio-user-interacted', false);
  const [autoPlayEnabled, setAutoPlayEnabled] = useLocalStorage('auto-play-enabled', true);

  const [lastText, setLastText] = React.useState('');

  React.useEffect(() => {
    if (text && text !== lastText && text.trim() && isVoiceEnabled) {
      setLastText(text);
      if (hasUserInteracted && autoPlayEnabled && !isPlaying && !isProcessing) {
        let mounted = true;
        const timeoutId = setTimeout(() => {
          if (!mounted) return;
          if (narrationSegments && narrationSegments.length > 0) {
            speakAISegments(narrationSegments);
          } else {
            speakPlainText(text);
          }
        }, 100);

        return () => {
          mounted = false;
          clearTimeout(timeoutId);
        };
      }
    }
  }, [text, narrationSegments, lastText, isVoiceEnabled, hasUserInteracted, autoPlayEnabled, isPlaying, isProcessing, speakAISegments, speakPlainText]);

  const handlePlayPause = React.useCallback(() => {
    if (!hasUserInteracted) {
      setHasUserInteracted(true);
      initializeAudioContext();
    }

    if (isPlaying) {
      pausePlayback();
    } else if (isPaused) {
      resumePlayback();
    } else if (!isProcessing) {
      if (narrationSegments && narrationSegments.length > 0) {
        speakAISegments(narrationSegments);
      } else {
        speakPlainText(text);
      }
    }
  }, [isPlaying, isPaused, isProcessing, pausePlayback, resumePlayback, speakAISegments, speakPlainText, text, narrationSegments, hasUserInteracted, initializeAudioContext, setHasUserInteracted]);

  const handleAutoPlayToggle = React.useCallback(() => {
    setAutoPlayEnabled(!autoPlayEnabled);
  }, [autoPlayEnabled, setAutoPlayEnabled]);

  const handleVolumeChange = React.useCallback((values: number[]) => {
    setVolume(values[0]);
  }, [setVolume]);

  const getSegmentTypeIcon = (type: string) => (type === 'character' ? '💬' : '📖');
  const getSegmentTypeBadgeVariant = (type: string): "default" | "secondary" => (type === 'character' ? 'default' : 'secondary');
  const calculateProgress = () => {
    if (segments.length === 0 || currentSegmentIndex < 0) return 0;
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
              <span>Progressive Voice Player</span>
              {isProcessing && <Badge variant="outline" className="animate-pulse">Processing...</Badge>}
              {error && <Badge variant="destructive"><AlertCircle className="h-3 w-3 mr-1" />Error</Badge>}
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Switch id="auto-play-enabled" checked={autoPlayEnabled && hasUserInteracted} onCheckedChange={handleAutoPlayToggle} disabled={!hasUserInteracted} />
                <Label htmlFor="auto-play-enabled" className="text-xs">Auto-play</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch id="multi-voice-enabled" checked={isVoiceEnabled} onCheckedChange={toggleVoiceEnabled} />
                <Label htmlFor="multi-voice-enabled" className="text-sm">Enable</Label>
              </div>
            </div>
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm" onClick={handlePlayPause} disabled={!isVoiceEnabled || isProcessing || !text} className="h-10 w-10 p-0">
                  {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{isPlaying ? 'Pause' : isPaused ? 'Resume' : 'Play'}</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm" onClick={stopPlayback} disabled={!isPlaying && !isProcessing} className="h-10 w-10 p-0">
                  <Square className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Stop</TooltipContent>
            </Tooltip>
            {error && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="sm" onClick={retryApiKeyFetch} className="h-10 w-10 p-0">
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Retry API Key</TooltipContent>
              </Tooltip>
            )}
            <div className="flex items-center gap-2 flex-1">
              <Button variant="ghost" size="sm" onClick={toggleMute} className="h-8 w-8 p-0">
                {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              </Button>
              <Slider value={[isMuted ? 0 : volume]} onValueChange={handleVolumeChange} max={1} step={0.05} className="flex-1" />
              <span className="text-xs text-muted-foreground w-10 text-right">{Math.round((isMuted ? 0 : volume) * 100)}%</span>
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

          {error && <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertDescription>{error}</AlertDescription></Alert>}

          {(isPlaying || isProcessing) && (
            <div className="space-y-2">
              <Progress value={calculateProgress()} className="h-2" />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{currentSegmentIndex >= 0 ? `Segment ${currentSegmentIndex + 1} of ${segments.length}` : 'Preparing...'}</span>
                <span>{segments[currentSegmentIndex]?.character || 'DM'}</span>
              </div>
            </div>
          )}

          {isPlaying && currentSegmentIndex >= 0 && segments[currentSegmentIndex] && (
            <Card className="bg-primary/5 border-primary/30">
              <CardContent className="p-3">
                <div className="flex items-start gap-3">
                  <span className="text-lg" role="img" aria-label={segments[currentSegmentIndex].type}>{getSegmentTypeIcon(segments[currentSegmentIndex].type)}</span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant={getSegmentTypeBadgeVariant(segments[currentSegmentIndex].type)} className="text-xs">{segments[currentSegmentIndex].type}</Badge>
                      {segments[currentSegmentIndex].character && <Badge variant="outline" className="text-xs">{segments[currentSegmentIndex].character}</Badge>}
                      <Badge variant="outline" className="text-xs">{segments[currentSegmentIndex].voiceName}</Badge>
                    </div>
                    <p className="text-sm leading-relaxed">{segments[currentSegmentIndex].text}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <CollapsibleContent className="space-y-2">
            <div className="border-t pt-4">
              <h4 className="text-sm font-medium mb-3 flex items-center gap-2"><Users className="h-4 w-4" />Processed Segments</h4>
              {segments.length === 0 ? <p className="text-sm text-muted-foreground italic">No segments to display</p> : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {segments.map((segment, index) => (
                    <div key={segment.id} className={`p-2 rounded-lg border transition-colors ${index === currentSegmentIndex ? 'bg-primary/10 border-primary/30' : segment.error ? 'bg-destructive/10 border-destructive/30' : 'bg-muted/30 border-muted'}`}>
                      <div className="flex items-start gap-2">
                        <span className="text-sm" role="img" aria-label={segment.type}>{segment.error ? '⚠️' : getSegmentTypeIcon(segment.type)}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1 mb-1">
                            <Badge variant={getSegmentTypeBadgeVariant(segment.type)} className="text-xs">{segment.type}</Badge>
                            {segment.character && <Badge variant="outline" className="text-xs">{segment.character}</Badge>}
                            <Badge variant="secondary" className="text-xs">{segment.voiceName}</Badge>
                            {segment.error && <Badge variant="destructive" className="text-xs">Error</Badge>}
                          </div>
                          <p className="text-xs text-muted-foreground truncate">{segment.error || segment.text}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CollapsibleContent>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
};