import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';

import { GameLoadingOverlay, GameLayout } from './game-content';
import { Button } from '../ui/button';

import type { Campaign as CampaignType } from '@/types/campaign';
import { ErrorBoundary } from '@/components/error/ErrorBoundary';
import { useAuth } from '@/contexts/AuthContext';
import { useCampaign } from '@/contexts/CampaignContext';
import { useCharacter } from '@/contexts/CharacterContext';
import { MessageProvider, useMessageContext } from '@/contexts/MessageContext';
import { VoiceProvider } from '@/contexts/VoiceContext';
import { useGameSession } from '@/hooks/use-game-session';
import { CombatProvider, useCombat } from '@/contexts/CombatContext';
import { GameProvider } from '@/contexts/GameContext';
import { MemoryProvider, useMemoryContext } from '@/contexts/MemoryContext';
import { useCombatAIIntegration } from '@/hooks/use-combat-ai-integration';
import { useInitialGreeting } from '@/hooks/use-initial-greeting';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { supabase } from '@/integrations/supabase/client';
import logger from '@/lib/logger';
import { characterLoaderService } from '@/services/character-loader';
import { handleAsyncError } from '@/utils/error-handler';

/**
 * GameContent Component
 *
 * Main component for the game interface. Handles data loading, session management,
 * and provides context providers. Delegates UI rendering to GameLayout sub-component.
 */
const GameContent: React.FC = () => {
  const { id: campaignIdFromParams } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const characterIdFromParams = searchParams.get('character');

  const { state: characterState, dispatch: characterDispatch } = useCharacter();
  const { dispatch: campaignDispatch } = useCampaign();

  // Initialize game session
  const { sessionData, sessionId, sessionState, updateGameSessionState } = useGameSession(
    campaignIdFromParams,
    characterIdFromParams || undefined,
  );

  const [isLoading, setIsLoading] = useState(true);
  const [loadingPhase, setLoadingPhase] = useState<'initial' | 'data' | 'session' | 'greeting'>(
    'initial',
  );
  const [error, setError] = useState<string | null>(null);
  const [combatMode, setCombatMode] = useState(false);
  const { user } = useAuth();
  const [isDM, setIsDM] = useState(false);
  const [showSceneBlurb, setShowSceneBlurb] = useLocalStorage('ui:sceneBlurb', true);

  // Load game data (character and campaign)
  useEffect(() => {
    const loadGameData = async () => {
      if (!characterIdFromParams || !campaignIdFromParams) {
        setError('Character ID or Campaign ID is missing from URL parameters.');
        setIsLoading(false);
        setLoadingPhase('initial');
        return;
      }

      setIsLoading(true);
      setLoadingPhase('data');
      setError(null);

      try {
        // Load character with all spell data populated
        logger.info(`🔄 [GameContent] Loading character ${characterIdFromParams} with spells`);

        const loadedCharacter =
          await characterLoaderService.loadCharacterWithSpells(characterIdFromParams);

        if (!loadedCharacter) {
          throw new Error('Character not found or failed to load.');
        }

        logger.info(`✅ [GameContent] Successfully loaded character with spells:`, {
          name: loadedCharacter.name,
          id: loadedCharacter.id,
          cantrips: loadedCharacter.cantrips?.length || 0,
          knownSpells: loadedCharacter.knownSpells?.length || 0,
          preparedSpells: loadedCharacter.preparedSpells?.length || 0,
          ritualSpells: loadedCharacter.ritualSpells?.length || 0,
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

        campaignDispatch({
          type: 'UPDATE_CAMPAIGN',
          payload: campaignData as unknown as Partial<CampaignType>,
        });

        // Derive DM role: env override or campaign owner
        try {
          const envVal = String((import.meta as any)?.env?.VITE_FORCE_DM || '');
          const forceDM = ['true', '1', 'yes', 'on'].includes(envVal.toLowerCase());
          const ownerId = (campaignData as any)?.user_id;
          setIsDM(Boolean(forceDM || (user?.id && ownerId && user.id === ownerId)));
        } catch (e) {
          setIsDM(false);
        }
      } catch (err: any) {
        const errorMessage = err.message || 'Failed to load game data';
        setError(errorMessage);
        handleAsyncError(err, {
          userMessage: 'Failed to load game data',
          context: {
            location: 'GameContent.loadGameData',
            campaignId: campaignIdFromParams,
            characterId: characterIdFromParams,
          },
        });
      } finally {
        setIsLoading(false);
        setLoadingPhase('greeting');
      }
    };

    loadGameData();
  }, [characterIdFromParams, campaignIdFromParams, characterDispatch, campaignDispatch, user?.id]);

  // Memoized toggle handlers
  const handleCombatToggle = useCallback(() => {
    setCombatMode((v) => !v);
    sessionStorage.setItem('manualCombatToggle', 'true');
    setTimeout(() => sessionStorage.removeItem('manualCombatToggle'), 30000);
  }, []);

  const handleAIResponse = useCallback(async (message: any) => {
    logger.info(
      '🎯 AI response received in outer component:',
      message.text?.substring(0, 100) + '...',
    );
  }, []);

  // Combine loading states
  const combinedIsLoading = isLoading || sessionState === 'loading';
  const combinedError = error || (sessionState === 'error' ? 'Error with game session.' : null);

  // Loading state
  if (combinedIsLoading) {
    return <GameLoadingOverlay loadingPhase={loadingPhase} />;
  }

  // Error state
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

  // Session validation
  if (!sessionId || !sessionData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center p-10 max-w-md">
          <div className="text-muted-foreground mb-4">
            Initializing your infinite story... If this persists, check campaign/character
            selection.
          </div>
          <Button onClick={() => window.location.reload()}>Retry</Button>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary level="feature">
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
                  showSceneBlurb={showSceneBlurb}
                  setShowSceneBlurb={setShowSceneBlurb}
                />
              </VoiceProvider>
            </MemoryProvider>
          </MessageProvider>
        </GameProvider>
      </CombatProvider>
    </ErrorBoundary>
  );
};

// Inner component with access to all context providers
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
  showSceneBlurb: boolean;
  setShowSceneBlurb: (v: boolean) => void;
}

const GameContentInner: React.FC<GameContentInnerProps> = ({
  sessionId,
  campaignIdForHandler,
  characterIdForHandler,
  sessionData,
  updateGameSessionState,
  characterState,
  combatMode,
  isDM,
  showSceneBlurb,
  setShowSceneBlurb,
  handleAIResponse,
}) => {
  // Calculate default panel states based on screen width
  const getDefaultLeftCollapsed = () => typeof window !== 'undefined' && window.innerWidth < 1200;
  const getDefaultRightCollapsed = () => typeof window !== 'undefined' && window.innerWidth < 1440;

  const [isLeftCollapsed, setIsLeftCollapsed] = useLocalStorage(
    'ui:leftPanelCollapsed',
    getDefaultLeftCollapsed(),
  );
  const [isRightCollapsed, setIsRightCollapsed] = useLocalStorage(
    'ui:rightPanelCollapsed',
    getDefaultRightCollapsed(),
  );
  const [isCombatDetected, setIsCombatDetected] = useState(false);
  const [showTracker, setShowTracker] = useState(false);

  // Safety state
  const [lastSafetyCommand] = useState<
    | {
        type: 'x_card' | 'veil' | 'pause' | 'resume';
        timestamp: string;
        autoTriggered?: boolean;
      }
    | undefined
  >();
  const [contentWarnings] = useState<string[]>([]);
  const [comfortLevel] = useState<'pg' | 'pg13' | 'r' | 'custom'>('pg13');
  const [showSafetyInfo] = useState(false);

  // Get message context for sending initial greeting
  const { messages, sendMessage, messagesLoading } = useMessageContext();
  const { createMemory } = useMemoryContext();

  // Combat AI integration
  const combatAI = useCombatAIIntegration({
    sessionId,
    characterId: characterIdForHandler || undefined,
    campaignId: campaignIdForHandler || undefined,
  });
  const { state: combatState } = useCombat();
  const prevInCombatRef = React.useRef(combatState.isInCombat);

  // Auto-generate initial greeting
  const { isGenerating: isGeneratingGreeting } = useInitialGreeting({
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
        handleAsyncError(e, {
          userMessage: 'Failed to save greeting memory',
          logLevel: 'warn',
          showToast: false,
          context: { location: 'GameContent.onMemoryCreated' },
        });
      }
    },
  });

  // Detect combat
  React.useEffect(() => {
    setIsCombatDetected(!!combatAI.isInCombat);
  }, [combatAI.isInCombat]);

  // Auto-open combat tracker when combat starts
  React.useEffect(() => {
    if (combatState.isInCombat && !showTracker) {
      setShowTracker(true);
      logger.info('⚔️ Combat started - auto-opening combat tracker');
    }
  }, [combatState.isInCombat, showTracker]);

  // Handle AI response with combat detection
  const innerHandleAIResponse = React.useCallback(
    async (message: any) => {
      try {
        logger.info(
          '🎯 Processing AI response for combat detection:',
          message.text?.substring(0, 100) + '...',
        );

        if (message.combatDetection) {
          logger.info('⚔️ Combat detection data found in AI response');
          const result = await combatAI.processDMResponse(message, characterState.character);

          // Send combat messages to chat
          if (result.combatMessages && result.combatMessages.length > 0) {
            for (const m of result.combatMessages) {
              try {
                await sendMessage(m);
              } catch (e) {
                handleAsyncError(e, {
                  userMessage: 'Failed to send combat message',
                  logLevel: 'warn',
                  showToast: false,
                  context: { location: 'GameContent.onAIResponseWithCombat.sendCombatMessage' },
                });
              }
            }
          }
        }

        await handleAIResponse(message);
      } catch (error) {
        handleAsyncError(error, {
          userMessage: 'Failed to process AI response for combat',
          context: { location: 'GameContent.onAIResponseWithCombat' },
        });
      }
    },
    [combatAI, characterState, handleAIResponse, sendMessage],
  );

  // Handle combat end
  React.useEffect(() => {
    if (prevInCombatRef.current && !combatState.isInCombat) {
      const enc = combatState.activeEncounter;
      const rounds = enc?.currentRound || enc?.roundsElapsed || 1;
      const participants = (enc?.participants || []).map((p: any) => ({
        name: p.name,
        damageDealt: (enc?.actions || [])
          .filter((a: any) => a.participantId === p.id && a.damageDealt)
          .reduce((s: number, a: any) => s + (a.damageDealt || 0), 0),
        damageTaken: Math.max(0, (p.maxHitPoints || 0) - (p.currentHitPoints || 0)),
        status: p.isDead ? 'dead' : p.isUnconscious ? 'unconscious' : 'ok',
      }));
      const totalDamage = participants.reduce((s, x) => s + x.damageDealt, 0);
      sendMessage({
        text: 'Combat has ended.',
        sender: 'system',
        context: {
          combatData: {
            type: 'summary',
            summary: { rounds, totalDamage, participants, outcome: 'Combat concluded' },
          },
        },
      });
      setShowTracker(false);
    }
    prevInCombatRef.current = combatState.isInCombat;
  }, [combatState.isInCombat, combatState.activeEncounter, sendMessage]);

  return (
    <GameLayout
      sessionId={sessionId}
      campaignIdForHandler={campaignIdForHandler}
      characterIdForHandler={characterIdForHandler}
      sessionData={sessionData}
      updateGameSessionState={updateGameSessionState}
      isLeftCollapsed={isLeftCollapsed}
      isRightCollapsed={isRightCollapsed}
      setIsLeftCollapsed={setIsLeftCollapsed}
      setIsRightCollapsed={setIsRightCollapsed}
      showSceneBlurb={showSceneBlurb}
      setShowSceneBlurb={setShowSceneBlurb}
      combatMode={combatMode}
      showTracker={showTracker}
      setShowTracker={setShowTracker}
      isCombatDetected={isCombatDetected}
      isGeneratingGreeting={isGeneratingGreeting}
      innerHandleAIResponse={innerHandleAIResponse}
      isDM={isDM}
      lastSafetyCommand={lastSafetyCommand}
      contentWarnings={contentWarnings}
      comfortLevel={comfortLevel}
      showSafetyInfo={showSafetyInfo}
    />
  );
};

export default GameContent;
