import { Volume2, VolumeX } from 'lucide-react';
import React from 'react';

import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface VolumeButtonProps {
  isMuted: boolean;
  isSpeaking: boolean;
  onToggleMute: () => void;
}

/**
 * VolumeButton Component
 * Handles the mute/unmute functionality with visual feedback
 */
export const VolumeButton: React.FC<VolumeButtonProps> = ({
  isMuted,
  isSpeaking,
  onToggleMute,
}) => {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleMute}
          className={`bg-primary/10 hover:bg-primary/20 transition-colors ${
            isSpeaking ? 'animate-pulse ring-2 ring-primary shadow-lg shadow-primary/50' : ''
          }`}
        >
          {isMuted ? (
            <VolumeX className="h-4 w-4 text-primary" />
          ) : (
            <Volume2 className="h-4 w-4 text-primary" />
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>{isMuted ? 'Unmute' : 'Mute'} voice</p>
      </TooltipContent>
    </Tooltip>
  );
};
