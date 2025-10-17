import React, { useEffect, useLayoutEffect, useState } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { useParams, useSearchParams } from 'react-router-dom';
import { useCharacter } from '@/contexts/CharacterContext';
import { useCampaign } from '@/contexts/CampaignContext';
import { supabase } from '@/integrations/supabase/client';
import { Character } from '@/types/character'; // Assuming this type aligns with what CharacterContext expects
import { Campaign as CampaignType } from '@/types/campaign'; // Assuming this type aligns
import { characterLoaderService } from '@/services/character-loader';
import { MessageList } from './MessageList';
import { ChatInput } from './ChatInput';
import { GameSidePanel } from './MemoryPanel';
import { StatsBar } from './StatsBar';
import { SafetyBanner } from '../safety/SafetyBanner';
import { MessageHandler } from './message/MessageHandler';
import { TypingIndicator } from './TypingIndicator';
import { MemoryProvider } from '@/contexts/MemoryContext';
import { MessageProvider } from '@/contexts/MessageContext';
import { VoiceProvider } from '@/contexts/VoiceContext';
import { useGameSession } from '@/hooks/use-game-session';
import { CombatProvider, useCombat } from '@/contexts/CombatContext';
import { GameProvider } from '@/contexts/GameContext';
import CombatInterface from '@/components/combat/CombatInterface';
import { CombatStatus } from '@/components/combat/CombatStatus';
import { useCombatAIIntegration } from '@/hooks/use-combat-ai-integration';
import { useInitialGreeting } from '@/hooks/use-initial-greeting';
import { useMessageContext } from '@/contexts/MessageContext';
import { useMemoryContext } from '@/contexts/MemoryContext';
import { usePendingRolls } from '@/hooks/use-pending-rolls';
import { FloatingActionPanel } from './FloatingActionPanel';
import { Sword, X, Dice6, ChevronDown, Menu } from 'lucide-react';
import logger from '@/lib/logger';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { useAuth } from '@/contexts/AuthContext';
import { CampaignSidePanel } from './CampaignSidePanel';
import { TimelineRail } from './TimelineRail';

/**
 * GameContent Component
 * Main component for the game interface
 * Handles layout and component composition
 */
const GameContent: React.FC = () => {
  const { id: campaignIdFromParams } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const characterIdFromParams = searchParams.get('character');
  // const sessionIdFromParams = searchParams.get('session'); // This was for MessageHandler, will now come from useGameSession

  const { state: characterState, dispatch: characterDispatch } = useCharacter();
  const { dispatch: campaignDispatch } = useCampaign();
  
  // Initialize useGameSession here
  const { 
    sessionData, 
    sessionId, // This is the actual current sessionId from the hook
    sessionState, 
    updateGameSessionState, 
    // createGameSession // if manual creation is needed elsewhere
  } = useGameSession(campaignIdFromParams, characterIdFromParams || undefined);

  const [isLoading, setIsLoading] = useState(true);
  const [loadingPhase, setLoadingPhase] = useState<'initial' | 'data' | 'session' | 'greeting'>('initial');
  const [error, setError] = useState<string | null>(null);
  // Legacy: combatMode previously switched the main view away from chat.
  // New UX: chat is always primary. We use a sheet to show the tracker.
  const [combatMode, setCombatMode] = useState(false); // repurposed to control sheet visibility
  const [showCombatInterface, setShowCombatInterface] = useState(false); // unused after redesign
  const { user } = useAuth();
  const [isDM, setIsDM] = useState(false);

  useEffect(() => {
    const loadGameData = async () => {
      if (!characterIdFromParams || !campaignIdFromParams) {
        setError("Character ID or Campaign ID is missing from URL parameters.");
        setIsLoading(false);
        setLoadingPhase('initial');
        return;
      }

      setIsLoading(true);
      setLoadingPhase('data');
      setError(null);

      try {
        // Load character with all spell data populated
        setLoadingPhase('data');
        logger.info(`🔄 [GameContent] Loading character ${characterIdFromParams} with spells`);

        const loadedCharacter = await characterLoaderService.loadCharacterWithSpells(characterIdFromParams);

        if (!loadedCharacter) {
          throw new Error('Character not found or failed to load.');
        }

        logger.info(`✅ [GameContent] Successfully loaded character with spells:`, {
          name: loadedCharacter.name,
          id: loadedCharacter.id,
          cantrips: loadedCharacter.cantrips?.length || 0,
          knownSpells: loadedCharacter.knownSpells?.length || 0,
          preparedSpells: loadedCharacter.preparedSpells?.length || 0,
          ritualSpells: loadedCharacter.ritualSpells?.length || 0
        });

        characterDispatch({ type: 'SET_CHARACTER', payload: loadedCharacter });

        // Fetch Campaign Data
        setLoadingPhase('session');
        const { data: campaignData, error: campaignError } = await supabase
          .from('campaigns')
          .select('*')
          .eq('id', campaignIdFromParams)
          .single();

        if (campaignError) {
          throw new Error(`Failed to load campaign: ${campaignError.message}`);
        }
        if (!campaignData) {
          throw new Error('Campaign not found.');
        }
        
        // Assuming CampaignContext UPDATE_CAMPAIGN can handle partial updates of CampaignType
        campaignDispatch({ type: 'UPDATE_CAMPAIGN', payload: campaignData as unknown as Partial<CampaignType> });

        // Derive DM role: env override or campaign owner (user_id)
        try {
          const envVal = String(((import.meta as any)?.env?.VITE_FORCE_DM) || '');
          const forceDM = ['true', '1', 'yes', 'on'].includes(envVal.toLowerCase());
          const ownerId = (campaignData as any)?.user_id;
          setIsDM(Boolean(forceDM || (user?.id && ownerId && user.id === ownerId)));
        } catch (e) {
          setIsDM(false);
        }

      } catch (err: any) {
        logger.error("Error loading game data:", err);
        setError(err.message);
      } finally {
        setIsLoading(false);
        setLoadingPhase('greeting');
      }
    };

    loadGameData();
  }, [characterIdFromParams, campaignIdFromParams, characterDispatch, campaignDispatch, user?.id]);

  // Open/close the combat tracker sheet
  const handleCombatToggle = () => {
    setCombatMode((v) => !v);
    // Mark that user manually toggled the tracker so auto-open is avoided
    sessionStorage.setItem('manualCombatToggle', 'true');
    setTimeout(() => sessionStorage.removeItem('manualCombatToggle'), 30000);
  };

  // Handle AI response for combat detection - moved to inner component
  const handleAIResponse = React.useCallback(async (message: any) => {
    // Basic logging for now, actual combat detection handled in inner component
    logger.info('🎯 AI response received in outer component:', message.text?.substring(0, 100) + '...');
  }, []);

  // Combine loading states: initial data load and session loading
  const combinedIsLoading = isLoading || sessionState === 'loading';
  const combinedError = error || (sessionState === 'error' ? "Error with game session." : null);

  // Loading Overlay Component
  const LoadingOverlay = () => {
    const getPhaseMessage = () => {
      switch (loadingPhase) {
        case 'initial':
          return "Welcome to your infinite realm...";
        case 'data':
          return "Loading character and campaign data...";
        case 'session':
          return "Initializing game session...";
        case 'greeting':
          return "The Dungeon Master is crafting your opening scene...";
        default:
          return "Preparing your adventure...";
      }
    };

    return (
      <div className="fixed inset-0 z-50 bg-background/90 backdrop-blur-md flex items-center justify-center">
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
              <p className="text-sm text-muted-foreground leading-relaxed">
                {getPhaseMessage()}
              </p>
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

  if (combinedIsLoading) {
    return <LoadingOverlay />;
  }

  if (combinedError) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center p-10 max-w-md">
          <div className="text-destructive mb-4">Error: {combinedError}</div>
          <Button onClick={() => window.location.reload()}>Retry</Button>
        </div>
      </div>
    );
  }

  if (!sessionId || !sessionData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center p-10 max-w-md">
          <div className="text-muted-foreground mb-4">Initializing your infinite story... If this persists, check campaign/character selection.</div>
          <Button onClick={() => window.location.reload()}>Retry</Button>
        </div>
      </div>
    );
  }

  // These are validated ones from params, used for data loading.
  // MessageHandler will use the sessionId from useGameSession.
  const campaignIdForHandler = campaignIdFromParams;
  const characterIdForHandler = characterIdFromParams;

  return (
    <CombatProvider sessionId={sessionId}>
      <GameProvider>
        <MessageProvider sessionId={sessionId}>
          <MemoryProvider sessionId={sessionId}>
            <VoiceProvider>
              <GameContentInner
              sessionId={sessionId}
              campaignIdForHandler={campaignIdFromParams ?? null}
              characterIdForHandler={characterIdFromParams ?? null}
              sessionData={sessionData}
              updateGameSessionState={updateGameSessionState}
              characterState={characterState}
              combatMode={combatMode}
              setCombatMode={setCombatMode}
              handleCombatToggle={handleCombatToggle}
              handleAIResponse={handleAIResponse}
              isDM={isDM}
            />
          </VoiceProvider>
        </MemoryProvider>
      </MessageProvider>
      </GameProvider>
    </CombatProvider>
  );
};

// Inner component that has access to CombatProvider
interface GameContentInnerProps {
  sessionId: string;
  campaignIdForHandler: string | null;
  characterIdForHandler: string | null;
  sessionData: any;
  updateGameSessionState: any;
  characterState: any;
  combatMode: boolean;
  setCombatMode: (mode: boolean) => void;
  handleCombatToggle: () => void;
  handleAIResponse: (message: any) => Promise<void>;
  isDM: boolean;
}

const GameContentInner: React.FC<GameContentInnerProps> = ({
  sessionId,
  campaignIdForHandler,
  characterIdForHandler,
  sessionData,
  updateGameSessionState,
  characterState,
  combatMode,
  setCombatMode,
  handleCombatToggle,
  handleAIResponse,
  isDM,
}) => {
  // UI state management
  const [isRightCollapsed, setIsRightCollapsed] = useState(false);
  const [isLeftCollapsed, setIsLeftCollapsed] = useState(false);
  const [topOffset, setTopOffset] = useState(0);
  const [isFloatingPanelVisible, setIsFloatingPanelVisible] = useState(false);
  const [isCombatDetected, setIsCombatDetected] = useState(false);
  const [showTracker, setShowTracker] = useState(false);
  const chatScrollRef = React.useRef<HTMLDivElement>(null);
  const { state: campaignState } = useCampaign();

  // Persist collapsed states
  React.useEffect(() => {
    const left = localStorage.getItem('ui:leftPanelCollapsed');
    const right = localStorage.getItem('ui:rightPanelCollapsed');
    if (left) setIsLeftCollapsed(left === '1');
    if (right) setIsRightCollapsed(right === '1');
  }, []);
  React.useEffect(() => { localStorage.setItem('ui:leftPanelCollapsed', isLeftCollapsed ? '1' : '0'); }, [isLeftCollapsed]);
  React.useEffect(() => { localStorage.setItem('ui:rightPanelCollapsed', isRightCollapsed ? '1' : '0'); }, [isRightCollapsed]);

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
  
  // Safety state management
  const [lastSafetyCommand, setLastSafetyCommand] = useState<{
    type: 'x_card' | 'veil' | 'pause' | 'resume';
    timestamp: string;
    autoTriggered?: boolean;
  } | undefined>();
  const [contentWarnings] = useState<string[]>([]);
  const [comfortLevel] = useState<'pg' | 'pg13' | 'r' | 'custom'>('pg13');
  const [showSafetyInfo] = useState(false);

  // Get message context for sending initial greeting
  const { messages, sendMessage, queueStatus, isLoading: messagesLoading } = useMessageContext();

  // Get memory context for creating initial memories
  const { createMemory } = useMemoryContext();

  // Track pending dice roll requests
  const { hasPendingRolls, pendingRequests } = usePendingRolls();

  // Combat AI integration for automatic combat detection
  const combatAI = useCombatAIIntegration({
    sessionId,
    characterId: characterIdForHandler || undefined,
    campaignId: campaignIdForHandler || undefined
  });
  const { state: combatState } = useCombat();
  const prevInCombatRef = React.useRef(combatState.isInCombat);

  // Auto-generate initial greeting for new sessions
  const { isGenerating: isGeneratingGreeting, hasGenerated, error: greetingError } = useInitialGreeting({
    sessionId,
    sessionData,
    characterId: characterIdForHandler,
    campaignId: campaignIdForHandler,
    messages,
    messagesLoading,
    onGreetingGenerated: sendMessage,
    onMemoryCreated: async (memory: any) => {
      try {
        await createMemory(memory as any);
      } catch (e) {
        logger.error('Failed to create memory from greeting:', e);
      }
    },
  });

  // Detect combat but do not switch away from chat; only show HUD and let user open tracker.
  React.useEffect(() => {
    setIsCombatDetected(!!combatAI.isInCombat);
    // Do not auto-open the tracker unless a manual override is not set and user wants that behavior (future flag)
  }, [combatAI.isInCombat]);

  // Handle AI response for combat detection in inner component
  const innerHandleAIResponse = React.useCallback(async (message: any) => {
    try {
      logger.info('🎯 Processing AI response for combat detection:', message.text?.substring(0, 100) + '...');
      
      // Check if the message has combat detection data
      if (message.combatDetection) {
        logger.info('⚔️ Combat detection data found in AI response:', {
          isCombat: message.combatDetection.isCombat,
          confidence: message.combatDetection.confidence,
          shouldStartCombat: message.combatDetection.shouldStartCombat,
          shouldEndCombat: message.combatDetection.shouldEndCombat,
          enemies: message.combatDetection.enemies?.length || 0,
          actions: message.combatDetection.combatActions?.length || 0
        });
        
        // Use the combat AI integration to process the DM response
        const result = await combatAI.processDMResponse(message, characterState.character);
        
        logger.info('⚔️ Combat processing result:', {
          combatDetected: result.combatDetected,
          shouldStartCombat: result.shouldStartCombat,
          shouldEndCombat: result.shouldEndCombat,
          combatMessages: result.combatMessages.length
        });

        // Pipe any combat messages (initiative, rolls) into chat so users see them
        if (result.combatMessages && result.combatMessages.length > 0) {
          for (const m of result.combatMessages) {
            try {
              await sendMessage(m);
            } catch (e) {
              logger.warn('Failed to send combat message to chat', e);
            }
          }
        }
      } else {
        logger.info('📝 No combat detection data in AI response');
      }
      
      // Also call the outer handleAIResponse if needed
      await handleAIResponse(message);
      
    } catch (error) {
      logger.error('Error processing AI response for combat:', error);
    }
  }, [combatAI, characterState, handleAIResponse]);

  // When combat ends, emit a simple summary message and close the tracker if open.
  React.useEffect(() => {
    if (prevInCombatRef.current && !combatState.isInCombat) {
      // Combat transitioned from true -> false
      const enc = combatState.activeEncounter;
      const rounds = enc?.currentRound || enc?.roundsElapsed || 1;
      const participants = (enc?.participants || []).map((p: any) => ({
        name: p.name,
        damageDealt: (enc?.actions || []).filter((a: any) => a.participantId === p.id && a.damageDealt)
          .reduce((s: number, a: any) => s + (a.damageDealt || 0), 0),
        damageTaken: Math.max(0, (p.maxHitPoints || 0) - (p.currentHitPoints || 0)),
        status: p.isDead ? 'dead' : p.isUnconscious ? 'unconscious' : 'ok'
      }));
      const totalDamage = participants.reduce((s, x) => s + x.damageDealt, 0);
      sendMessage({
        text: 'Combat has ended.',
        sender: 'system',
        context: {
          combatData: {
            type: 'summary',
            summary: { rounds, totalDamage, participants, outcome: 'Combat concluded' }
          }
        }
      });
      setShowTracker(false);
    }
    prevInCombatRef.current = combatState.isInCombat;
  }, [combatState.isInCombat]);

  return (
          <div className="bg-background" style={{ ['--top-offset' as any]: `${topOffset}px` }}>
            <div className="w-full h-[calc(100dvh-var(--top-offset,0px))] mobile-bottom-safe overflow-hidden">
              <div key={sessionId} className={`grid transition-all duration-300 ease-in-out h-full gap-2 md:gap-4 items-stretch w-full ` +
                (
                  isLeftCollapsed && isRightCollapsed
                    ? 'grid-cols-1'
                    : isLeftCollapsed
                      ? 'grid-cols-1 md:grid-cols-[1fr_minmax(260px,360px)]'
                      : isRightCollapsed
                        ? 'grid-cols-1 md:grid-cols-[minmax(260px,320px)_1fr]'
                        : 'grid-cols-1 md:grid-cols-[minmax(260px,320px)_1fr_minmax(260px,360px)]'
                )
              }>
                {/* Left Campaign Panel */}
                {!isLeftCollapsed && (
                  <div className="order-1 md:order-1 w-full md:w-auto">
                    <CampaignSidePanel isCollapsed={false} onToggle={() => setIsLeftCollapsed(true)} />
                  </div>
                )}
                {/* Main Content Area - Optimized for Maximum Space */}
                <div className={`flex-1 min-w-0 ${isLeftCollapsed ? 'order-1' : 'order-2'} layout-main flex flex-col h-full`}>
                  <Card className="flex flex-col glass-strong shadow-2xl border-2 border-infinite-purple/30 overflow-hidden transition-all duration-300 hover:shadow-2xl hover-glow mobile-chat h-full">
                    {/* Cinematic Header with Atmospheric Effects */}
                    <div className="relative p-2 md:p-3 border-b border-white/10 bg-cosmic overflow-hidden transition-all duration-500">
                      {/* Animated Background Particles */}
                      <div className="absolute inset-0 overflow-hidden">
                        <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-infinite-gold rounded-full animate-pulse opacity-60" style={{animationDelay: '0s'}}></div>
                        <div className="absolute top-1/2 left-3/4 w-1 h-1 bg-infinite-teal rounded-full animate-pulse opacity-40" style={{animationDelay: '1s'}}></div>
                        <div className="absolute top-3/4 left-1/2 w-1.5 h-1.5 bg-infinite-purple rounded-full animate-pulse opacity-50" style={{animationDelay: '2s'}}></div>
                        <div className="absolute top-1/3 right-1/4 w-1 h-1 bg-infinite-gold rounded-full animate-pulse opacity-30" style={{animationDelay: '0.5s'}}></div>
                      </div>

                      {/* Atmospheric Gradient Overlay */}
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-infinite-purple/5 to-transparent opacity-60"></div>

                      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between animate-in fade-in slide-in-from-top-4 duration-700 gap-4">
                        <div className="flex-1">
                          <div className="mb-2">
                            <h1 className="text-xl md:text-2xl font-display mb-1 truncate">
                              {campaignState?.campaign?.name || 'InfiniteRealms Adventure'}
                            </h1>
                            <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-6 text-sm">
                              <div className="flex items-center gap-3 bg-infinite-gold/20 px-4 py-2 rounded-full border border-infinite-gold/30 w-fit">
                                <div className="w-2 h-2 bg-infinite-gold rounded-full animate-pulse"></div>
                                <span className="font-display text-infinite-gold font-medium text-responsive-sm">Chapter {sessionData.turn_count ?? 0}</span>
                              </div>
                              <div className="hidden md:block h-4 w-px bg-white/20"></div>
                              <div className="flex-1">
                                <p className="text-narrative text-muted-foreground leading-relaxed text-responsive-sm">
                                  {sessionData.current_scene_description ?? "Your infinite story unfolds across realms of endless possibility..."}
                                </p>
                              </div>
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
                          <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" onClick={() => setIsLeftCollapsed(v=>!v)} title="Toggle campaign panel">
                              {isLeftCollapsed ? 'Show Campaign' : 'Hide Campaign'}
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => setIsRightCollapsed(v=>!v)} title="Toggle character panel">
                              {isRightCollapsed ? 'Show Character' : 'Hide Character'}
                            </Button>
                          </div>
                          <Button
                            variant={showTracker ? "destructive" : "outline"}
                            size="lg"
                            onClick={() => setShowTracker((v) => !v)}
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
                              <span className="text-xs font-display font-medium text-infinite-teal">Realm Active</span>
                            </div>
                            {showTracker && (
                              <div className="flex items-center gap-2 px-4 py-2 bg-red-500/20 rounded-full border border-red-400/40 glass">
                                <div className="w-2 h-2 bg-red-400 rounded-full animate-pulse shadow-lg"></div>
                                <span className="text-xs font-display font-medium text-red-400">Tracker Open</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Content Area - Chat is always visible; tracker lives in a sheet */}
                    <div className="flex-1 flex flex-col overflow-hidden relative bg-card/50 transition-all duration-300">
                        {/* HUD Banner when combat is active/detected */}
                        {isCombatDetected && (
                          <div className="mx-3 mt-3 mb-1 px-3 py-2 bg-red-50 border border-red-200 rounded-md flex items-center justify-between">
                            <div className="text-sm text-red-700 font-medium">⚔️ Combat in progress</div>
                            <Button size="sm" variant="outline" onClick={() => setShowTracker(true)}>Open Tracker</Button>
                          </div>
                        )}

                        <MessageHandler
                          sessionId={sessionId} // Use sessionId from useGameSession
                          campaignId={campaignIdForHandler || null}
                          characterId={characterIdForHandler}
                          turnCount={sessionData.turn_count ?? 0}
                          updateGameSessionState={updateGameSessionState}
                          onAIResponse={innerHandleAIResponse}
                        >
                          {({ handleSendMessage, isProcessing }) => (
                            <>
                              <MessageList onSendFullMessage={handleSendMessage} sessionId={sessionId} containerRef={chatScrollRef} />
                              <TimelineRail rootRef={chatScrollRef} />

                              {/* Enhanced loading indicator for initial greeting - now only for greeting phase */}
                              {isGeneratingGreeting && (
                                <div className="absolute inset-0 bg-background/80 backdrop-blur-md flex items-center justify-center z-20 animate-in fade-in duration-300">
                                  <div className="bg-card border border-border/60 rounded-xl p-8 shadow-2xl max-w-md mx-4 transform animate-in slide-in-from-bottom-4 duration-500">
                                    <div className="flex flex-col items-center text-center space-y-6">
                                      {/* Animated DM icon */}
                                      <div className="relative">
                                        <div className="w-16 h-16 bg-gradient-to-br from-infinite-purple via-infinite-teal to-infinite-purple rounded-full flex items-center justify-center animate-pulse shadow-lg">
                                          <span className="text-3xl">🎭</span>
                                        </div>
                                        <div className="absolute -inset-1 bg-gradient-to-r from-infinite-purple to-infinite-teal rounded-full blur opacity-30 animate-ping"></div>
                                      </div>

                                      {/* Progress content */}
                                      <div className="space-y-3">
                                        <h3 className="text-lg font-semibold text-card-foreground">Crafting Opening Scene</h3>
                                        <p className="text-sm text-muted-foreground leading-relaxed">
                                          The Dungeon Master is generating your personalized adventure introduction based on your character and campaign.
                                        </p>
                                      </div>

                                      {/* Animated progress dots */}
                                      <div className="flex items-center justify-center gap-1">
                                        <div className="w-2 h-2 bg-infinite-purple rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                                        <div className="w-2 h-2 bg-infinite-teal rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                                        <div className="w-2 h-2 bg-infinite-purple rounded-full animate-bounce"></div>
                                      </div>

                                      {/* Subtle loading spinner */}
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
                                    <span className="text-xs text-muted-foreground font-medium">Dungeon Master is thinking...</span>
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
                                        : `Please complete ${pendingRequests.length} pending rolls above`
                                      }
                                    </span>
                                  </div>
                                </div>
                              )}

                              {/* Input Area at bottom - sticky */}
                              <div className="border-t border-border/60 bg-card/70 backdrop-blur-sm pb-4 md:pb-[env(safe-area-inset-bottom)] sticky bottom-0 left-0 right-0 z-20">
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

                {/* Responsive Side Panel */}
                {!isRightCollapsed && (
                  <div className={`${isLeftCollapsed ? 'order-2' : 'order-3'} w-full md:w-auto transition-all duration-300`}>
                    <GameSidePanel
                      sessionData={sessionData}
                      updateGameSessionState={updateGameSessionState}
                      combatMode={combatMode}
                      isCollapsed={isRightCollapsed}
                      onToggle={() => setIsRightCollapsed(!isRightCollapsed)}
                    />
                  </div>
                )}

                {/* Floating Toggle Button when Collapsed */}
                {isRightCollapsed && (
                  <div className="fixed right-4 bottom-4 md:top-1/2 md:bottom-auto md:right-6 z-40 md:transform md:-translate-y-1/2 transition-all duration-300">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsRightCollapsed(false)}
                      className={`rounded-full p-3 h-auto shadow-xl border-2 hover:scale-110 transition-all duration-300 hover-glow focus-glow ${
                        combatMode
                          ? 'bg-gradient-to-r from-red-500/20 to-red-600/20 border-red-400/50 animate-pulse'
                          : 'bg-gradient-to-r from-infinite-purple/20 to-infinite-teal/20 border-infinite-purple/50'
                      }`}
                    >
                      <Menu className="h-5 w-5 md:hidden" />
                      <ChevronDown className="h-4 w-4 hidden md:block rotate-90" />
                      {/* Context indicators */}
                      <div className="absolute -top-2 -right-2 flex flex-col gap-1">
                        {combatMode && (
                          <div className="w-2 h-2 bg-red-400 rounded-full animate-pulse shadow-lg"></div>
                        )}
                        <div className="w-2 h-2 bg-infinite-gold rounded-full animate-pulse shadow-lg"></div>
                      </div>
                    </Button>
                  </div>
                )}

                {/* Floating Action Panel for Quick RPG Actions */}
                <FloatingActionPanel
                  isVisible={isFloatingPanelVisible}
                  onToggle={() => setIsFloatingPanelVisible(!isFloatingPanelVisible)}
                  combatMode={combatMode}
                />

                {/* Tracker Sheet */}
                <Sheet open={showTracker} onOpenChange={setShowTracker}>
                  <SheetContent side="right" className="w-[420px] sm:max-w-[480px] overflow-y-auto">
                    <CombatInterface isDM={isDM} />
                  </SheetContent>
                </Sheet>
              </div>
            </div>
          </div>
  );
};

export default GameContent;
