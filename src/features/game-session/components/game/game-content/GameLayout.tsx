import React, { useLayoutEffect, useState } from 'react';

import { GameCombatSheet } from './GameCombatSheet';
import { GameLeftPanel } from './GameLeftPanel';
import { GameMainContent } from './GameMainContent';
import { GameRightPanel } from './GameRightPanel';
import { FloatingActionPanel } from '../FloatingActionPanel';

/**
 * GameLayout Component
 *
 * Main layout orchestrator for the game interface.
 * Manages the three-column grid layout with responsive collapsing panels.
 * Handles top offset calculation for sticky navigation.
 */

interface GameLayoutProps {
  sessionId: string;
  campaignIdForHandler: string | null;
  characterIdForHandler: string | null;
  sessionData: any;
  updateGameSessionState: any;
  isLeftCollapsed: boolean;
  isRightCollapsed: boolean;
  setIsLeftCollapsed: (v: boolean) => void;
  setIsRightCollapsed: (v: boolean) => void;
  showSceneBlurb: boolean;
  setShowSceneBlurb: (v: boolean) => void;
  combatMode: boolean;
  showTracker: boolean;
  setShowTracker: (v: boolean) => void;
  isCombatDetected: boolean;
  isGeneratingGreeting: boolean;
  innerHandleAIResponse: (message: any) => Promise<void>;
  isDM: boolean;
  lastSafetyCommand?: {
    type: 'x_card' | 'veil' | 'pause' | 'resume';
    timestamp: string;
    autoTriggered?: boolean;
  };
  contentWarnings: string[];
  comfortLevel: 'pg' | 'pg13' | 'r' | 'custom';
  showSafetyInfo: boolean;
}

export const GameLayout: React.FC<GameLayoutProps> = ({
  sessionId,
  campaignIdForHandler,
  characterIdForHandler,
  sessionData,
  updateGameSessionState,
  isLeftCollapsed,
  isRightCollapsed,
  setIsLeftCollapsed,
  setIsRightCollapsed,
  showSceneBlurb,
  setShowSceneBlurb,
  combatMode,
  showTracker,
  setShowTracker,
  isCombatDetected,
  isGeneratingGreeting,
  innerHandleAIResponse,
  isDM,
  lastSafetyCommand,
  contentWarnings,
  comfortLevel,
  showSafetyInfo,
}) => {
  const [topOffset, setTopOffset] = useState(0);
  const [isFloatingPanelVisible, setIsFloatingPanelVisible] = useState(false);

  // Measure sticky nav + breadcrumbs height to constrain viewport
  useLayoutEffect(() => {
    const calc = () => {
      const nav = document.getElementById('app-nav')?.offsetHeight || 0;
      const crumbs = document.getElementById('app-breadcrumbs')?.offsetHeight || 0;
      setTopOffset(nav + crumbs);
    };
    calc();
    window.addEventListener('resize', calc);
    return () => window.removeEventListener('resize', calc);
  }, []);

  return (
    <div className="bg-background" style={{ ['--top-offset' as any]: `${topOffset}px` }}>
      <div className="w-full h-[calc(100dvh-var(--top-offset,0px))] mobile-bottom-safe overflow-hidden">
        <div
          key={sessionId}
          className={`grid transition-all duration-300 ease-in-out h-full gap-2 md:gap-3 items-stretch w-full ${
            isLeftCollapsed && isRightCollapsed
              ? 'grid-cols-1'
              : isLeftCollapsed
                ? 'grid-cols-1 md:grid-cols-[1fr_minmax(280px,320px)]'
                : isRightCollapsed
                  ? 'grid-cols-1 md:grid-cols-[minmax(200px,240px)_1fr]'
                  : 'grid-cols-1 md:grid-cols-[minmax(200px,240px)_1fr_minmax(280px,320px)]'
          }`}
        >
          {/* Left Campaign Panel */}
          <GameLeftPanel isCollapsed={isLeftCollapsed} onToggle={() => setIsLeftCollapsed(true)} />

          {/* Main Content Area */}
          <GameMainContent
            sessionId={sessionId}
            campaignIdForHandler={campaignIdForHandler}
            characterIdForHandler={characterIdForHandler}
            sessionData={sessionData}
            updateGameSessionState={updateGameSessionState}
            showSceneBlurb={showSceneBlurb}
            setShowSceneBlurb={setShowSceneBlurb}
            isLeftCollapsed={isLeftCollapsed}
            isRightCollapsed={isRightCollapsed}
            onLeftToggle={() => setIsLeftCollapsed(!isLeftCollapsed)}
            onRightToggle={() => setIsRightCollapsed(!isRightCollapsed)}
            showTracker={showTracker}
            setShowTracker={setShowTracker}
            isCombatDetected={isCombatDetected}
            isGeneratingGreeting={isGeneratingGreeting}
            innerHandleAIResponse={innerHandleAIResponse}
            lastSafetyCommand={lastSafetyCommand}
            contentWarnings={contentWarnings}
            comfortLevel={comfortLevel}
            showSafetyInfo={showSafetyInfo}
          />

          {/* Right Character/Memory Panel */}
          <div className={`${isLeftCollapsed ? 'order-2' : 'order-3'}`}>
            <GameRightPanel
              isCollapsed={isRightCollapsed}
              sessionData={sessionData}
              updateGameSessionState={updateGameSessionState}
              combatMode={combatMode}
              onToggle={() => setIsRightCollapsed(!isRightCollapsed)}
            />
          </div>

          {/* Floating Action Panel for Quick RPG Actions */}
          <FloatingActionPanel
            isVisible={isFloatingPanelVisible}
            onToggle={() => setIsFloatingPanelVisible(!isFloatingPanelVisible)}
            combatMode={combatMode}
          />

          {/* Combat Tracker Sheet */}
          <GameCombatSheet showTracker={showTracker} setShowTracker={setShowTracker} isDM={isDM} />
        </div>
      </div>
    </div>
  );
};
