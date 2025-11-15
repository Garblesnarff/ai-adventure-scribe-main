/**
 * Game Interface Component
 *
 * Main container for the gameplay interface.
 * Initializes the game session, provides message and memory context,
 * and renders the core game content.
 *
 * Dependencies:
 * - React
 * - useGameSession hook (src/hooks/use-game-session.ts)
 * - MessageProvider (src/contexts/MessageContext.tsx)
 * - MemoryProvider (src/contexts/MemoryContext.tsx)
 * - GameContent component (src/components/game/GameContent.tsx)
 *
 * @author AI Dungeon Master Team
 */

// ============================
// SDK/library imports
// ============================
import React from 'react';

// Context providers and Feature components remain the same
// We remove useGameSession from here as it will be initialized in GameContent
// where campaignId and characterId are available.

// ============================
// Context providers
// ============================
// MessageProvider and MemoryProvider will get sessionId from GameContent
// This means GameContent will need to be structured to initialize useGameSession
// and then pass the sessionId to these providers if they are children of GameContent.
// Alternatively, if MessageProvider/MemoryProvider are siblings or parents,
// this becomes more complex.

// For now, let's assume GameContent will render these providers internally
// or GameInterface will be simplified if GameContent handles provider setup too.
// The prompt implies GameInterface sets up providers.

// Let's adjust GameContent to take over provider setup based on its own session.

// ============================
// Feature components
// ============================
import GameContent from './game/GameContent';

/**
 * Main gameplay interface component.
 *
 * Renders the core game content. Session and context providers
 * will be handled within or by GameContent.
 *
 * @returns {JSX.Element} The gameplay interface UI
 */
export const GameInterface: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* GameContent will now be responsible for its own session and context providers */}
      <GameContent />
    </div>
  );
};
