import React from 'react';
import { useMessageContext } from '@/contexts/SimpleMessageContext';
import { ProgressiveVoicePlayer } from './audio/ProgressiveVoicePlayer';
import { MultiVoicePlayer } from './audio/MultiVoicePlayer';
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Settings, Zap, Clock } from 'lucide-react';
import { Button } from "@/components/ui/button";

export const VoiceHandler: React.FC = () => {
  const { messages } = useMessageContext();
  const [useProgressiveVoice, setUseProgressiveVoice] = React.useState(() => {
    return localStorage.getItem('use-progressive-voice') !== 'false';
  });

  const lastMessage = messages[messages.length - 1];
  const shouldRenderPlayer = lastMessage?.sender === 'dm' && lastMessage.text;
  const cleanText = shouldRenderPlayer ? lastMessage.text.replace(/[*_`#]/g, '') : '';
  const narrationSegments = lastMessage?.narrationSegments;
  
  // Debug logging
  React.useEffect(() => {
    if (shouldRenderPlayer) {
      console.log('🎭 VoiceHandler: Processing message:', {
        hasLastMessage: !!lastMessage,
        messageType: lastMessage?.sender,
        textLength: lastMessage?.text?.length || 0,
        hasNarrationSegments: !!(narrationSegments && narrationSegments.length > 0),
        narrationSegmentsCount: narrationSegments?.length || 0,
        narrationSegments: narrationSegments
      });
    }
  }, [lastMessage, shouldRenderPlayer, narrationSegments]);

  const handleToggleVoiceMode = React.useCallback(() => {
    const newValue = !useProgressiveVoice;
    setUseProgressiveVoice(newValue);
    localStorage.setItem('use-progressive-voice', newValue.toString());
  }, [useProgressiveVoice]);

  if (!shouldRenderPlayer) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Voice Mode Settings */}
      <Card className="bg-white/90 backdrop-blur-sm border-2 border-primary/20 hover:border-primary/40 transition-all duration-200">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Settings className="h-5 w-5 text-primary" />
              <div>
                <Label className="text-sm font-medium">Voice Engine</Label>
                <p className="text-xs text-muted-foreground">
                  {useProgressiveVoice ? 'Progressive generation (faster, more reliable)' : 'Legacy system (complex parsing)'}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={handleToggleVoiceMode}
                className="h-10"
              >
                {useProgressiveVoice ? (
                  <>
                    <Zap className="h-4 w-4 mr-2" />
                    Progressive
                  </>
                ) : (
                  <>
                    <Clock className="h-4 w-4 mr-2" />
                    Legacy
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Voice Player */}
      {useProgressiveVoice ? (
        <ProgressiveVoicePlayer 
          text={cleanText} 
          narrationSegments={narrationSegments}
          isEnabled={true} 
        />
      ) : (
        <div className="space-y-2">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <p className="text-sm text-yellow-800">
              Legacy mode: Uses complex parsing layers and sequential generation. Switch to Progressive for better performance.
            </p>
          </div>
          <MultiVoicePlayer 
            text={cleanText} 
            narrationSegments={narrationSegments}
            isEnabled={true} 
          />
        </div>
      )}
    </div>
  );
};
