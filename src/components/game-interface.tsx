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

 // ============================
 // Project hooks
 // ============================
import { useGameSession } from '@/hooks/use-game-session';

 // ============================
 // Context providers
 // ============================
import { MessageProvider } from '@/contexts/MessageContext';
import { MemoryProvider } from '@/contexts/MemoryContext';

 // ============================
 // Feature components
 // ============================
import GameContent from './game/GameContent';

/**
 * Main gameplay interface component.
 * 
 * Provides message and memory context, initializes the game session,
 * and renders the core game content.
 * 
 * @returns {JSX.Element} The gameplay interface UI
 */
export const GameInterface: React.FC = () => {
  const { sessionId } = useGameSession();

  return (
    <div className="min-h-screen bg-[url('/parchment-bg.png')] bg-cover p-4">
      <MessageProvider sessionId={sessionId}>
        <MemoryProvider sessionId={sessionId}>
          <GameContent />
        </MemoryProvider>
      </MessageProvider>
    </div>
  );
};
