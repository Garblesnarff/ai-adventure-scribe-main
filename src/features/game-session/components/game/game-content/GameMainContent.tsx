import { Dice6, Sword, X } from 'lucide-react';
import React from 'react';

import { ChatInput } from '../../chat/ChatInput';
import { MessageList } from '../../chat/MessageList';
import { MessageHandler } from '../message/MessageHandler';
import { StatsBar } from '../StatsBar';
import { TimelineRail } from '../TimelineRail';
import { GamePanelControls } from './GamePanelControls';

import { CombatStatus } from '@/components/combat/CombatStatus';
import { SafetyBanner } from '@/components/safety/SafetyBanner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

import { useCampaign } from '@/contexts/CampaignContext';
import { useMessageContext } from '@/contexts/MessageContext';
import { usePendingRolls } from '@/hooks/use-pending-rolls';

/**
 * GameMainContent Component
 *
 * Contains the primary game interface including chat, stats, combat status, and scene info.
 * Handles message flow, typing indicators, and pending roll notifications.
 */

interface GameMainContentProps {
  sessionId: string;
  campaignIdForHandler: string | null;
  characterIdForHandler: string | null;
  sessionData: any;
  updateGameSessionState: any;
  showSceneBlurb: boolean;
  setShowSceneBlurb: (v: boolean) => void;
  isLeftCollapsed: boolean;
  isRightCollapsed: boolean;
  onLeftToggle: () => void;
  onRightToggle: () => void;
  showTracker: boolean;
  setShowTracker: (v: boolean) => void;
  isCombatDetected: boolean;
  isGeneratingGreeting: boolean;
  innerHandleAIResponse: (message: any) => Promise<void>;
  lastSafetyCommand?: {
    type: 'x_card' | 'veil' | 'pause' | 'resume';
    timestamp: string;
    autoTriggered?: boolean;
  };
  contentWarnings: string[];
  comfortLevel: 'pg' | 'pg13' | 'r' | 'custom';
  showSafetyInfo: boolean;
}

export const GameMainContent: React.FC<GameMainContentProps> = ({
  sessionId,
  campaignIdForHandler,
  characterIdForHandler,
  sessionData,
  updateGameSessionState,
  showSceneBlurb,
  setShowSceneBlurb,
  isLeftCollapsed,
  isRightCollapsed,
  onLeftToggle,
  onRightToggle,
  showTracker,
  setShowTracker,
  isCombatDetected,
  isGeneratingGreeting,
  innerHandleAIResponse,
  lastSafetyCommand,
  contentWarnings,
  comfortLevel,
  showSafetyInfo,
}) => {
  const chatScrollRef = React.useRef<HTMLDivElement>(null);
  const { queueStatus } = useMessageContext();
  const { hasPendingRolls, pendingRequests } = usePendingRolls();
  const { state: campaignState } = useCampaign();

  return (
    <div
      className={`flex-1 min-w-0 min-h-0 ${isLeftCollapsed ? 'order-1' : 'order-2'} layout-main flex flex-col h-full`}
    >
      <Card className="flex flex-col shadow-2xl border-2 border-infinite-purple/40 overflow-hidden transition-all duration-300 hover:shadow-3xl hover:scale-100 mobile-chat h-full bg-gradient-to-b from-card/95 to-card/90">
        {/* Enhanced Cinematic Header with Improved Visual Hierarchy */}
        <div className="relative p-3 md:p-4 border-b border-white/10 bg-gradient-to-br from-slate-900/95 via-purple-900/90 to-slate-900/95 backdrop-blur-md overflow-hidden transition-all duration-500">
          {/* Enhanced Animated Background Particles */}
          <div className="absolute inset-0 overflow-hidden">
            <div
              className="absolute top-1/4 left-1/4 w-2 h-2 bg-infinite-gold rounded-full animate-pulse opacity-70"
              style={{ animationDelay: '0s' }}
            ></div>
            <div
              className="absolute top-1/2 left-3/4 w-1 h-1 bg-infinite-teal rounded-full animate-pulse opacity-50"
              style={{ animationDelay: '1s' }}
            ></div>
            <div
              className="absolute top-3/4 left-1/2 w-1.5 h-1.5 bg-infinite-purple rounded-full animate-pulse opacity-60"
              style={{ animationDelay: '2s' }}
            ></div>
            <div
              className="absolute top-1/3 right-1/4 w-1 h-1 bg-infinite-gold rounded-full animate-pulse opacity-40"
              style={{ animationDelay: '0.5s' }}
            ></div>
            <div
              className="absolute top-2/3 right-1/3 w-1.5 h-1.5 bg-infinite-teal rounded-full animate-pulse opacity-30"
              style={{ animationDelay: '1.5s' }}
            ></div>
            <div
              className="absolute top-1/6 left-2/3 w-1 h-1 bg-infinite-purple rounded-full animate-pulse opacity-50"
              style={{ animationDelay: '2.5s' }}
            ></div>
          </div>

          {/* Enhanced Atmospheric Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-infinite-purple/8 to-transparent opacity-80"></div>
          <div className="absolute inset-0 bg-gradient-to-b from-purple-900/10 via-transparent to-slate-900/10"></div>

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between animate-in fade-in slide-in-from-top-4 duration-700 gap-4 md:gap-6">
            <div className="flex-1">
              <div className="mb-2">
                <h1 className="text-xl md:text-2xl font-display mb-1 truncate">
                  {campaignState?.campaign?.name || 'InfiniteRealms Adventure'}
                </h1>
                <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4 text-sm">
                  <div className="flex items-center gap-3 bg-infinite-gold/20 px-4 py-2 rounded-full border border-infinite-gold/30 w-fit">
                    <div className="w-2 h-2 bg-infinite-gold rounded-full animate-pulse"></div>
                    <span className="font-display text-infinite-gold font-medium text-responsive-sm">
                      Chapter {sessionData.turn_count ?? 0}
                    </span>
                  </div>
                  <div className="hidden md:block h-4 w-px bg-white/20"></div>
                  {showSceneBlurb && (
                    <div className="flex-1 hidden xl:block">
                      <p className="text-narrative text-muted-foreground leading-relaxed text-xs line-clamp-2">
                        {sessionData.current_scene_description ??
                          'Your infinite story unfolds across realms of endless possibility...'}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Enhanced Stats and Combat Status (compact) */}
              <div className="flex items-center gap-3 text-sm mt-0">
                <div className="flex-1 min-w-0">
                  <div className="text-sm">
                    <StatsBar />
                  </div>
                </div>
                <div className="shrink-0">
                  <CombatStatus />
                </div>
              </div>
            </div>

            {/* Safety Banner */}
            <SafetyBanner
              isPaused={sessionData?.is_paused || false}
              lastSafetyCommand={lastSafetyCommand}
              contentWarnings={contentWarnings}
              comfortLevel={comfortLevel}
              showSafetyInfo={showSafetyInfo}
            />

            {/* Sidebar Toggles + Tracker */}
            <div className="flex flex-col md:flex-row items-center gap-3 md:gap-4 md:ml-8 w-full md:w-auto">
              <GamePanelControls
                isLeftCollapsed={isLeftCollapsed}
                isRightCollapsed={isRightCollapsed}
                showSceneBlurb={showSceneBlurb}
                onLeftToggle={onLeftToggle}
                onRightToggle={onRightToggle}
                onSceneBlurbToggle={() => setShowSceneBlurb(!showSceneBlurb)}
              />
              <Button
                variant={showTracker ? 'destructive' : 'outline'}
                size="lg"
                onClick={() => setShowTracker(!showTracker)}
                className={`relative overflow-hidden transition-all duration-300 border-2 hover-glow focus-glow ${
                  showTracker
                    ? 'bg-gradient-to-r from-red-600 to-red-700 border-red-500 animate-pulse shadow-2xl'
                    : 'bg-gradient-to-r from-infinite-purple/20 to-infinite-teal/20 border-infinite-purple/50 hover:from-infinite-purple/30 hover:to-infinite-teal/30'
                }`}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
                <div className="relative flex items-center gap-2">
                  {showTracker ? (
                    <>
                      <X className="w-5 h-5" />
                      <span className="font-display font-medium">Close Tracker</span>
                    </>
                  ) : (
                    <>
                      <Sword className="w-5 h-5" />
                      <span className="font-display font-medium">Open Tracker</span>
                    </>
                  )}
                </div>
              </Button>

              {/* Enhanced Status Indicators */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2 px-4 py-2 bg-infinite-teal/20 rounded-full border border-infinite-teal/40 glass">
                  <div className="w-2 h-2 bg-infinite-teal rounded-full animate-pulse shadow-lg"></div>
                  <span className="text-xs font-display font-medium text-infinite-teal">
                    Realm Active
                  </span>
                </div>
                {showTracker && (
                  <div className="flex items-center gap-2 px-4 py-2 bg-red-500/20 rounded-full border border-red-400/40 glass">
                    <div className="w-2 h-2 bg-red-400 rounded-full animate-pulse shadow-lg"></div>
                    <span className="text-xs font-display font-medium text-red-400">
                      Tracker Open
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Content Area - Chat is always visible; tracker lives in a sheet */}
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden relative bg-gradient-to-b from-card/60 via-card/40 to-card/60 transition-all duration-300">
          {/* HUD Banner when combat is active/detected */}
          {isCombatDetected && (
            <div className="mx-3 mt-3 mb-1 px-3 py-2 bg-red-50 border border-red-200 rounded-md flex items-center justify-between">
              <div className="text-sm text-red-700 font-medium">⚔️ Combat in progress</div>
              <Button size="sm" variant="outline" onClick={() => setShowTracker(true)}>
                Open Tracker
              </Button>
            </div>
          )}

          <MessageHandler
            sessionId={sessionId}
            campaignId={campaignIdForHandler || null}
            characterId={characterIdForHandler}
            turnCount={sessionData.turn_count ?? 0}
            updateGameSessionState={updateGameSessionState}
            onAIResponse={innerHandleAIResponse}
          >
            {({ handleSendMessage, isProcessing }) => (
              <>
                <div className="flex-1 min-h-0 flex flex-col overflow-hidden relative">
                  <MessageList
                    onSendFullMessage={handleSendMessage}
                    sessionId={sessionId}
                    containerRef={chatScrollRef}
                    suppressEmptyState={isGeneratingGreeting}
                  />
                  <TimelineRail rootRef={chatScrollRef} />
                </div>

                {/* Enhanced loading indicator for initial greeting */}
                {isGeneratingGreeting && (
                  <div className="absolute inset-0 bg-background/80 backdrop-blur-md flex items-center justify-center z-20 animate-in fade-in duration-300">
                    <div className="bg-card border border-border/60 rounded-xl p-8 shadow-2xl max-w-md mx-4 transform animate-in slide-in-from-bottom-4 duration-500">
                      <div className="flex flex-col items-center text-center space-y-6">
                        <div className="relative">
                          <div className="w-16 h-16 bg-gradient-to-br from-infinite-purple via-infinite-teal to-infinite-purple rounded-full flex items-center justify-center animate-pulse shadow-lg">
                            <span className="text-3xl">🎭</span>
                          </div>
                          <div className="absolute -inset-1 bg-gradient-to-r from-infinite-purple to-infinite-teal rounded-full blur opacity-30 animate-ping"></div>
                        </div>
                        <div className="space-y-3">
                          <h3 className="text-lg font-semibold text-card-foreground">
                            Crafting Opening Scene
                          </h3>
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            The Dungeon Master is generating your personalized adventure
                            introduction based on your character and campaign.
                          </p>
                        </div>
                        <div className="flex items-center justify-center gap-1">
                          <div className="w-2 h-2 bg-infinite-purple rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                          <div className="w-2 h-2 bg-infinite-teal rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                          <div className="w-2 h-2 bg-infinite-purple rounded-full animate-bounce"></div>
                        </div>
                        <div className="w-8 h-8 border-2 border-infinite-purple/20 border-t-infinite-purple rounded-full animate-spin"></div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Typing Indicator - shows when AI is responding */}
                {queueStatus === 'processing' && (
                  <div className="absolute bottom-24 left-6 z-10 animate-in slide-in-from-left-2 duration-300 md:bottom-20">
                    <div className="flex items-center gap-3 px-4 py-2 bg-card/90 backdrop-blur-sm border border-border/60 rounded-full shadow-lg">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-infinite-purple to-infinite-teal flex items-center justify-center">
                        <span className="text-xs font-medium text-white">DM</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-1.5 h-1.5 bg-infinite-purple rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                        <div className="w-1.5 h-1.5 bg-infinite-teal rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                        <div className="w-1.5 h-1.5 bg-infinite-purple rounded-full animate-bounce"></div>
                      </div>
                      <span className="text-xs text-muted-foreground font-medium">
                        Dungeon Master is thinking...
                      </span>
                    </div>
                  </div>
                )}

                {/* Pending Roll Indicator */}
                {hasPendingRolls && (
                  <div className="border-t border-orange-200 bg-orange-50 p-3">
                    <div className="flex items-center gap-2 text-orange-700">
                      <Dice6 className="w-4 h-4" />
                      <span className="text-sm font-medium">
                        {pendingRequests.length === 1
                          ? `Please complete the ${pendingRequests[0].type} roll above`
                          : `Please complete ${pendingRequests.length} pending rolls above`}
                      </span>
                    </div>
                  </div>
                )}

                {/* Input Area at bottom - sticky */}
                <div className="border-t border-border/60 bg-card/70 backdrop-blur-sm pb-4 md:pb-[env(safe-area-inset-bottom)] sticky bottom-0 left-0 right-0 z-30 shrink-0">
                  <ChatInput
                    onSendMessage={handleSendMessage}
                    isDisabled={isProcessing || hasPendingRolls}
                  />
                </div>
              </>
            )}
          </MessageHandler>
        </div>
      </Card>
    </div>
  );
};
