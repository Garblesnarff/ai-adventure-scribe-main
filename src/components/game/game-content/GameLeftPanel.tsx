import React from 'react';

import { CampaignSidePanel } from '../CampaignSidePanel';

/**
 * GameLeftPanel Component
 *
 * Wrapper for the left sidebar containing campaign information.
 * Handles campaign panel visibility and toggle functionality.
 */

interface GameLeftPanelProps {
  isCollapsed: boolean;
  onToggle: () => void;
}

export const GameLeftPanel: React.FC<GameLeftPanelProps> = ({ isCollapsed, onToggle }) => {
  if (isCollapsed) return null;

  return (
    <div className="order-1 md:order-1 w-full md:w-auto min-h-0">
      <CampaignSidePanel isCollapsed={false} onToggle={onToggle} />
    </div>
  );
};
