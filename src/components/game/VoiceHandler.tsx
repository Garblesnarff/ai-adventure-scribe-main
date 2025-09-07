import React from 'react';
import { useMessageContext } from '@/contexts/SimpleMessageContext';
import { MultiVoicePlayer } from './audio/MultiVoicePlayer';
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Settings, Mic, MicOff } from 'lucide-react';
import { Button } from "@/components/ui/button";

export const VoiceHandler: React.FC = () => {
  const { messages } = useMessageContext();
  const [useMultiVoice, setUseMultiVoice] = React.useState(() => {
    return localStorage.getItem('use-multi-voice') !== 'false';
  });

  const lastMessage = messages[messages.length - 1];
  const shouldRenderPlayer = lastMessage?.role === 'assistant' && lastMessage.content;
  const cleanText = shouldRenderPlayer ? lastMessage.content.replace(/[*_`#]/g, '') : '';

  const handleToggleMultiVoice = React.useCallback(() => {
    const newValue = !useMultiVoice;
    setUseMultiVoice(newValue);
    localStorage.setItem('use-multi-voice', newValue.toString());
  }, [useMultiVoice]);

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
                <Label className="text-sm font-medium">Voice Mode</Label>
                <p className="text-xs text-muted-foreground">
                  {useMultiVoice ? 'Multiple character voices' : 'Single narrator voice'}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={handleToggleMultiVoice}
                className="h-10"
              >
                {useMultiVoice ? (
                  <>
                    <Mic className="h-4 w-4 mr-2" />
                    Multi-Voice
                  </>
                ) : (
                  <>
                    <MicOff className="h-4 w-4 mr-2" />
                    Single Voice
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Voice Player */}
      {useMultiVoice ? (
        <MultiVoicePlayer text={cleanText} isEnabled={true} />
      ) : (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-sm text-yellow-800">
            Single voice mode is temporarily unavailable. Using multi-voice mode instead.
          </p>
          <MultiVoicePlayer text={cleanText} isEnabled={true} className="mt-3" />
        </div>
      )}
    </div>
  );
};
