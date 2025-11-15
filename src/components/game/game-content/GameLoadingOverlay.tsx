import React from 'react';

import { Z_INDEX } from '@/constants/z-index';

/**
 * GameLoadingOverlay Component
 *
 * Displays a cinematic loading screen during game initialization.
 * Shows different messages based on the current loading phase.
 */

type LoadingPhase = 'initial' | 'data' | 'session' | 'greeting';

interface GameLoadingOverlayProps {
  loadingPhase: LoadingPhase;
}

export const GameLoadingOverlay: React.FC<GameLoadingOverlayProps> = ({ loadingPhase }) => {
  const getPhaseMessage = () => {
    switch (loadingPhase) {
      case 'initial':
        return 'Welcome to your infinite realm...';
      case 'data':
        return 'Loading character and campaign data...';
      case 'session':
        return 'Initializing game session...';
      case 'greeting':
        return 'The Dungeon Master is crafting your opening scene...';
      default:
        return 'Preparing your adventure...';
    }
  };

  return (
    <div
      className={`fixed inset-0 z-[${Z_INDEX.LOADING_OVERLAY}] bg-background/90 backdrop-blur-md flex items-center justify-center`}
    >
      <div className="bg-card border border-border/60 rounded-xl p-8 shadow-2xl max-w-md mx-4 text-center">
        <div className="flex flex-col items-center space-y-6">
          {/* Animated DM icon */}
          <div className="relative">
            <div className="w-16 h-16 bg-gradient-to-br from-infinite-purple via-infinite-teal to-infinite-purple rounded-full flex items-center justify-center animate-pulse shadow-lg">
              <span className="text-3xl">🎭</span>
            </div>
            <div className="absolute -inset-1 bg-gradient-to-r from-infinite-purple to-infinite-teal rounded-full blur opacity-30 animate-ping"></div>
          </div>

          {/* Progress content */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-card-foreground">Preparing Your Adventure</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{getPhaseMessage()}</p>
          </div>

          {/* Animated progress dots */}
          <div className="flex items-center justify-center gap-1">
            <div className="w-2 h-2 bg-infinite-purple rounded-full animate-bounce [animation-delay:-0.3s]"></div>
            <div className="w-2 h-2 bg-infinite-teal rounded-full animate-bounce [animation-delay:-0.15s]"></div>
            <div className="w-2 h-2 bg-infinite-purple rounded-full animate-bounce"></div>
          </div>

          {/* Loading spinner */}
          <div className="w-8 h-8 border-2 border-infinite-purple/20 border-t-infinite-purple rounded-full animate-spin"></div>
        </div>
      </div>
    </div>
  );
};
