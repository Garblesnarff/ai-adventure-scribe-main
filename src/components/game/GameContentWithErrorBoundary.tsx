import React from 'react';

import GameContent from './GameContent';

import { ErrorBoundary } from '@/components/error/ErrorBoundary';
import { GameErrorFallback } from '@/components/error/GameErrorFallback';

/**
 * GameContentWithErrorBoundary Component
 *
 * Wraps the GameContent component with a route-level error boundary.
 * Provides specialized error handling for game session failures.
 *
 * This wrapper allows the router to use error boundaries at the route level
 * while keeping GameContent focused on game logic.
 */
const GameContentWithErrorBoundary: React.FC = () => {
  return (
    <ErrorBoundary level="route" fallback={<GameErrorFallback />}>
      <GameContent />
    </ErrorBoundary>
  );
};

export default GameContentWithErrorBoundary;
