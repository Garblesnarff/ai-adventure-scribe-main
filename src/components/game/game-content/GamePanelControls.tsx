import React from 'react';

import { Button } from '@/components/ui/button';

/**
 * GamePanelControls Component
 *
 * Provides toggle buttons for controlling panel visibility (campaign, character, scene blurb).
 * Handles responsive layout adjustments.
 */

interface GamePanelControlsProps {
  isLeftCollapsed: boolean;
  isRightCollapsed: boolean;
  showSceneBlurb: boolean;
  onLeftToggle: () => void;
  onRightToggle: () => void;
  onSceneBlurbToggle: () => void;
}

export const GamePanelControls: React.FC<GamePanelControlsProps> = ({
  isLeftCollapsed,
  isRightCollapsed,
  showSceneBlurb,
  onLeftToggle,
  onRightToggle,
  onSceneBlurbToggle,
}) => {
  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="sm" onClick={onLeftToggle} title="Toggle campaign panel">
        {isLeftCollapsed ? 'Show Campaign' : 'Hide Campaign'}
      </Button>
      <Button variant="outline" size="sm" onClick={onRightToggle} title="Toggle character panel">
        {isRightCollapsed ? 'Show Character' : 'Hide Character'}
      </Button>
      <Button variant="outline" size="sm" onClick={onSceneBlurbToggle} title="Toggle scene blurb">
        {showSceneBlurb ? 'Hide Blurb' : 'Show Blurb'}
      </Button>
    </div>
  );
};
