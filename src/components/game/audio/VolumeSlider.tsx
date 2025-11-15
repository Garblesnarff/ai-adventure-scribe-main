import React from 'react';

import { Slider } from '@/components/ui/slider';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import logger from '@/lib/logger';

interface VolumeSliderProps {
  volume: number;
  onVolumeChange: (value: number) => void;
}

/**
 * VolumeSlider Component
 * Handles volume adjustment with visual feedback
 */
export const VolumeSlider: React.FC<VolumeSliderProps> = ({ volume, onVolumeChange }) => {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="w-32">
          <Slider
            value={[volume * 100]}
            max={100}
            step={1}
            onValueChange={(values) => {
              logger.debug('Volume changed:', values[0] / 100);
              onVolumeChange(values[0] / 100);
            }}
            className="cursor-pointer"
          />
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <p>Adjust volume</p>
      </TooltipContent>
    </Tooltip>
  );
};
