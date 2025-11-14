import { Menu, ChevronDown } from 'lucide-react';
import React from 'react';

import { GameSidePanel } from '../MemoryPanel';

import { Button } from '@/components/ui/button';
import { Z_INDEX } from '@/constants/z-index';

/**
 * GameRightPanel Component
 *
 * Wrapper for the right sidebar containing character sheet, inventory, and game panels.
 * Includes floating toggle button when panel is collapsed.
 */

interface GameRightPanelProps {
  isCollapsed: boolean;
  sessionData: any;
  updateGameSessionState: any;
  combatMode: boolean;
  onToggle: () => void;
}

export const GameRightPanel: React.FC<GameRightPanelProps> = ({
  isCollapsed,
  sessionData,
  updateGameSessionState,
  combatMode,
  onToggle,
}) => {
  if (!isCollapsed) {
    return (
      <div className="w-full md:w-auto min-h-0 transition-all duration-300">
        <GameSidePanel
          sessionData={sessionData}
          updateGameSessionState={updateGameSessionState}
          combatMode={combatMode}
          isCollapsed={isCollapsed}
          onToggle={onToggle}
        />
      </div>
    );
  }

  // Floating toggle button when collapsed
  return (
    <div
      className={`fixed right-3 bottom-3 md:top-1/2 md:bottom-auto md:right-6 z-[${Z_INDEX.FLOATING_PANEL}] md:transform md:-translate-y-1/2 transition-all duration-300`}
    >
      <Button
        variant="outline"
        size="sm"
        onClick={onToggle}
        className={`rounded-full p-4 h-auto shadow-2xl border-2 hover:scale-110 transition-all duration-300 hover-glow focus-glow touch-manipulation min-h-[48px] min-w-[48px] ${
          combatMode
            ? 'bg-gradient-to-r from-red-500/20 to-red-600/20 border-red-400/50 animate-pulse'
            : 'bg-gradient-to-r from-infinite-purple/20 to-infinite-teal/20 border-infinite-purple/50'
        }`}
      >
        <Menu className="h-6 w-6 md:hidden" />
        <ChevronDown className="h-5 w-5 hidden md:block rotate-90" />
        {/* Enhanced Context indicators */}
        <div className="absolute -top-2 -right-2 flex flex-col gap-1">
          {combatMode && (
            <div className="w-3 h-3 bg-red-400 rounded-full animate-pulse shadow-lg"></div>
          )}
          <div className="w-3 h-3 bg-infinite-gold rounded-full animate-pulse shadow-lg"></div>
        </div>
      </Button>
    </div>
  );
};
