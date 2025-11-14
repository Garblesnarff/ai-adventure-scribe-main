import { Mic, MicOff } from 'lucide-react';
import React from 'react';

import { SpeakingIndicator } from './audio/SpeakingIndicator';
import { VolumeButton } from './audio/VolumeButton';
import { VolumeSlider } from './audio/VolumeSlider';

import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { TooltipProvider } from '@/components/ui/tooltip';
import logger from '@/lib/logger';

interface AudioControlsProps {
  isSpeaking: boolean;
  volume: number;
  onVolumeChange: (value: number) => void;
  onToggleMute: () => void;
  isMuted: boolean;
  isVoiceEnabled: boolean;
  onToggleVoice: () => void;
}

/**
 * AudioControls Component
 * Provides UI controls for audio playback including volume, mute functionality, and voice toggle
 */
export const AudioControls: React.FC<AudioControlsProps> = ({
  isSpeaking,
  volume,
  onVolumeChange,
  onToggleMute,
  isMuted,
  isVoiceEnabled,
  onToggleVoice,
}) => {
  // Add debug logs
  React.useEffect(() => {
    logger.debug('AudioControls mounted');
    logger.debug('Initial state:', {
      isSpeaking,
      volume,
      isMuted,
      isVoiceEnabled,
    });
  }, []);

  React.useEffect(() => {
    logger.debug('Audio state changed:', {
      isSpeaking,
      volume,
      isMuted,
      isVoiceEnabled,
    });
  }, [isSpeaking, volume, isMuted, isVoiceEnabled]);

  return (
    <TooltipProvider>
      <div className="flex items-center gap-4 p-4 mb-4 bg-white/90 backdrop-blur-sm rounded-lg shadow-xl border-2 border-primary/20 hover:border-primary/40 transition-all duration-200">
        <div className="flex items-center gap-2">
          <VolumeButton isMuted={isMuted} isSpeaking={isSpeaking} onToggleMute={onToggleMute} />
          <VolumeSlider volume={volume} onVolumeChange={onVolumeChange} />
          <SpeakingIndicator isSpeaking={isSpeaking} />
        </div>

        <div className="flex items-center gap-2 ml-4 border-l pl-4 border-primary/20">
          <Switch
            id="voice-mode"
            checked={isVoiceEnabled}
            onCheckedChange={onToggleVoice}
            className={`${isVoiceEnabled ? 'bg-primary' : 'bg-input'}`}
          />
          <Label
            htmlFor="voice-mode"
            className={`text-sm font-medium flex items-center gap-2 ${
              isVoiceEnabled ? 'text-primary' : 'text-muted-foreground'
            }`}
          >
            {isVoiceEnabled ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
            Voice Mode
          </Label>
        </div>
      </div>
    </TooltipProvider>
  );
};
