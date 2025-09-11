import React, { useEffect, useState } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { useParams, useSearchParams } from 'react-router-dom';
import { useCharacter } from '@/contexts/CharacterContext';
import { useCampaign } from '@/contexts/CampaignContext';
import { supabase } from '@/integrations/supabase/client';
import { Character } from '@/types/character'; // Assuming this type aligns with what CharacterContext expects
import { Campaign as CampaignType } from '@/types/campaign'; // Assuming this type aligns
import { MessageList } from './MessageList';
import { ChatInput } from './ChatInput';
import { VoiceHandler } from './VoiceHandler';
import { MemoryPanel } from './MemoryPanel'; // Will modify this later for notes
import { MessageHandler } from './message/MessageHandler';
import { TypingIndicator } from './TypingIndicator';
import { MemoryProvider } from '@/contexts/MemoryContext';
import { MessageProvider } from '@/contexts/MessageContext';
import { useGameSession } from '@/hooks/use-game-session';
import { CombatProvider, useCombat } from '@/contexts/CombatContext';
import CombatInterface from '@/components/combat/CombatInterface';
import { useCombatAIIntegration } from '@/hooks/use-combat-ai-integration';
import { Sword, X } from 'lucide-react';

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
  const [error, setError] = useState<string | null>(null);
  const [combatMode, setCombatMode] = useState(false);
  const [showCombatInterface, setShowCombatInterface] = useState(false);

  useEffect(() => {
    const loadGameData = async () => {
      if (!characterIdFromParams || !campaignIdFromParams) {
        setError("Character ID or Campaign ID is missing from URL parameters.");
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        // Fetch Character Data
        const { data: characterData, error: characterError } = await supabase
          .from('characters')
          .select(`
            *,
            character_stats(*)
          `)
          .eq('id', characterIdFromParams)
          .single();

        if (characterError) throw new Error(`Failed to load character: ${characterError.message}`);
        if (!characterData) throw new Error('Character not found.');

        // Basic transformation, assuming CharacterContext expects AbilityScores nested
        // and character_stats returns an array (hence [0]) or a single object if one-to-one.
        // This needs to align with how CharacterContext expects the data.
        const stats = Array.isArray(characterData.character_stats) ? characterData.character_stats[0] : characterData.character_stats;
        
        // Handling for race, class, background being potentially just strings from DB
        // For now, we'll pass them as is, assuming CharacterContext or downstream components
        // might expect simplified versions or will be updated.
        // Ideally, these would be fetched as related objects or mapped to the rich types.
        const characterRace = characterData.race ? { name: characterData.race } : null;
        const characterClass = characterData.class ? { name: characterData.class } : null;
        const characterBackground = characterData.background ? { name: characterData.background } : null;

        const defaultAbilityScore = { score: 10, modifier: 0, savingThrow: false };

        const loadedCharacter: Character = {
          id: characterData.id,
          user_id: characterData.user_id || '',
          name: characterData.name,
          // These are simplified to pass string names; context might need adjustment
          // For MVP, this might be acceptable, but full objects are better long-term.
          race: characterRace as any, // Using 'any' to bypass strict type checking for now
          class: characterClass as any, // Using 'any' to bypass strict type checking for now
          level: characterData.level || 1,
          background: characterBackground as any, // Using 'any' to bypass strict type checking for now
          abilityScores: {
            strength: { score: stats?.strength || 10, modifier: Math.floor(((stats?.strength || 10) - 10) / 2), savingThrow: false },
            dexterity: { score: stats?.dexterity || 10, modifier: Math.floor(((stats?.dexterity || 10) - 10) / 2), savingThrow: false },
            constitution: { score: stats?.constitution || 10, modifier: Math.floor(((stats?.constitution || 10) - 10) / 2), savingThrow: false },
            intelligence: { score: stats?.intelligence || 10, modifier: Math.floor(((stats?.intelligence || 10) - 10) / 2), savingThrow: false },
            wisdom: { score: stats?.wisdom || 10, modifier: Math.floor(((stats?.wisdom || 10) - 10) / 2), savingThrow: false },
            charisma: { score: stats?.charisma || 10, modifier: Math.floor(((stats?.charisma || 10) - 10) / 2), savingThrow: false },
          },
          experience: characterData.experience_points || 0,
          alignment: characterData.alignment || '',
          description: characterData.description || '',
          personalityTraits: [], 
          ideals: [],
          bonds: [],
          flaws: [],
          equipment: [],
          // created_at and updated_at are available on characterData if needed
        };
        characterDispatch({ type: 'SET_CHARACTER', payload: loadedCharacter });

        // Fetch Campaign Data
        const { data: campaignData, error: campaignError } = await supabase
          .from('campaigns')
          .select('*')
          .eq('id', campaignIdFromParams)
          .single();

        if (campaignError) throw new Error(`Failed to load campaign: ${campaignError.message}`);
        if (!campaignData) throw new Error('Campaign not found.');
        
        // Assuming CampaignContext UPDATE_CAMPAIGN can handle partial updates of CampaignType
        campaignDispatch({ type: 'UPDATE_CAMPAIGN', payload: campaignData as unknown as Partial<CampaignType> });

      } catch (err: any) {
        console.error("Error loading game data:", err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    loadGameData();
  }, [characterIdFromParams, campaignIdFromParams, characterDispatch, campaignDispatch]);

  // Handle manual combat mode toggle
  const handleCombatToggle = () => {
    setCombatMode(!combatMode);
    // Mark that user manually toggled combat mode
    sessionStorage.setItem('manualCombatToggle', 'true');
    // Clear the flag after 30 seconds to allow auto-toggle again
    setTimeout(() => {
      sessionStorage.removeItem('manualCombatToggle');
    }, 30000);
  };

  // Handle AI response for combat detection - moved to inner component
  const handleAIResponse = React.useCallback(async (message: any) => {
    // Basic logging for now, actual combat detection handled in inner component
    console.log('🎯 AI response received in outer component:', message.text?.substring(0, 100) + '...');
  }, []);

  // Combine loading states: initial data load and session loading
  const combinedIsLoading = isLoading || sessionState === 'loading';
  const combinedError = error || (sessionState === 'error' ? "Error with game session." : null);

  if (combinedIsLoading) {
    return <div className="text-center p-10 text-muted-foreground">Loading your realm...</div>;
  }

  if (combinedError) {
    return <div className="text-center p-10 text-destructive">Error: {combinedError}</div>;
  }

  if (!sessionId || !sessionData) {
    return <div className="text-center p-10 text-muted-foreground">Initializing your infinite story... If this persists, check campaign/character selection.</div>;
  }

  // These are validated ones from params, used for data loading.
  // MessageHandler will use the sessionId from useGameSession.
  const campaignIdForHandler = campaignIdFromParams;
  const characterIdForHandler = characterIdFromParams;

  return (
    <CombatProvider sessionId={sessionId}>
      <GameContentInner 
        sessionId={sessionId}
        campaignIdForHandler={campaignIdFromParams}
        characterIdForHandler={characterIdFromParams}
        sessionData={sessionData}
        updateGameSessionState={updateGameSessionState}
        characterState={characterState}
        combatMode={combatMode}
        setCombatMode={setCombatMode}
        handleCombatToggle={handleCombatToggle}
        handleAIResponse={handleAIResponse}
      />
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
}) => {
  // Combat AI integration for automatic combat detection
  const combatAI = useCombatAIIntegration({
    sessionId,
    characterId: characterIdForHandler || undefined,
    campaignId: campaignIdForHandler || undefined
  });

  // Auto-toggle combat mode based on combat detection
  React.useEffect(() => {
    if (combatAI.isInCombat && !combatMode) {
      setCombatMode(true);
      console.log('🗡️ Combat detected! Automatically switching to combat mode.');
    } else if (!combatAI.isInCombat && combatMode) {
      // Allow manual override - only auto-switch off if user hasn't manually toggled
      const shouldAutoExit = sessionStorage.getItem('manualCombatToggle') !== 'true';
      if (shouldAutoExit) {
        setCombatMode(false);
        console.log('✅ Combat ended! Automatically returning to conversation mode.');
      }
    }
  }, [combatAI.isInCombat, combatMode, setCombatMode]);

  // Handle AI response for combat detection in inner component
  const innerHandleAIResponse = React.useCallback(async (message: any) => {
    try {
      console.log('🎯 Processing AI response for combat detection:', message.text?.substring(0, 100) + '...');
      
      // Check if the message has combat detection data
      if (message.combatDetection) {
        console.log('⚔️ Combat detection data found in AI response:', {
          isCombat: message.combatDetection.isCombat,
          confidence: message.combatDetection.confidence,
          shouldStartCombat: message.combatDetection.shouldStartCombat,
          shouldEndCombat: message.combatDetection.shouldEndCombat,
          enemies: message.combatDetection.enemies?.length || 0,
          actions: message.combatDetection.combatActions?.length || 0
        });
        
        // Use the combat AI integration to process the DM response
        const result = await combatAI.processDMResponse(message, characterState.character);
        
        console.log('⚔️ Combat processing result:', {
          combatDetected: result.combatDetected,
          shouldStartCombat: result.shouldStartCombat,
          shouldEndCombat: result.shouldEndCombat,
          combatMessages: result.combatMessages.length
        });
      } else {
        console.log('📝 No combat detection data in AI response');
      }
      
      // Also call the outer handleAIResponse if needed
      await handleAIResponse(message);
      
    } catch (error) {
      console.error('Error processing AI response for combat:', error);
    }
  }, [combatAI, characterState, handleAIResponse]);

  return (
      <MessageProvider sessionId={sessionId}>
        <MemoryProvider sessionId={sessionId}>
          <div className="min-h-screen bg-background">
            <div className="max-w-7xl mx-auto p-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Content Area */}
                <div className="lg:col-span-2">
                  <Card className="h-[80vh] bg-card/90 backdrop-blur-sm shadow-xl border border-border/50 flex flex-col overflow-hidden">
                    {/* Enhanced Header with Combat Toggle */}
                    <div className="p-6 border-b border-border/60 bg-gradient-to-r from-infinite-dark/80 to-card/60">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h1 className="text-2xl font-semibold text-card-foreground mb-2">
                            {sessionData.campaign_id ? `Realm of ${sessionData.campaign_id}` : "InfiniteRealms Adventure"}
                          </h1>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 bg-infinite-gold rounded-full animate-pulse"></div>
                              <span>Chapter {sessionData.turn_count ?? 0}</span>
                            </div>
                            <span>•</span>
                            <span className="max-w-md truncate text-muted-foreground/80">
                              {sessionData.current_scene_description ?? "Your infinite story unfolds..."}
                            </span>
                          </div>
                        </div>

                        {/* Combat Mode Toggle */}
                        <div className="flex items-center gap-3 ml-4">
                          <Button
                            variant={combatMode ? "destructive" : "outline"}
                            size="sm"
                            onClick={handleCombatToggle}
                          >
                            {combatMode ? (
                              <>
                                <X className="w-4 h-4 mr-2" />
                                Exit Combat
                              </>
                            ) : (
                              <>
                                <Sword className="w-4 h-4 mr-2" />
                                Combat Mode
                              </>
                            )}
                          </Button>

                          {/* Status indicators */}
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2 px-3 py-1 bg-infinite-purple/20 rounded-full border border-infinite-purple/30">
                              <div className="w-2 h-2 bg-infinite-teal rounded-full animate-pulse"></div>
                              <span className="text-xs font-medium text-infinite-teal">Active Realm</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Content Area - Toggle between Chat and Combat */}
                    <div className="flex-1 flex flex-col overflow-hidden relative bg-card/50">
                      {combatMode ? (
                        <CombatInterface />
                      ) : (
                        <>
                          <MessageList />

                          {/* Typing Indicator */}
                          <div className="absolute bottom-24 left-6 z-10">
                            {/* This could be connected to a typing state in the future */}
                          </div>
                        </>
                      )}
                    </div>

                    {/* Input Area - Only show in chat mode */}
                    {!combatMode && (
                      <div className="border-t border-border/60 bg-card/70 backdrop-blur-sm">
                        <VoiceHandler />
                        <MessageHandler
                          sessionId={sessionId} // Use sessionId from useGameSession
                          campaignId={campaignIdForHandler || null}
                          characterId={characterIdForHandler}
                          turnCount={sessionData.turn_count ?? 0}
                          updateGameSessionState={updateGameSessionState}
                          onAIResponse={innerHandleAIResponse}
                        >
                          {({ handleSendMessage, isProcessing }) => (
                            <ChatInput
                              onSendMessage={handleSendMessage}
                              isDisabled={isProcessing}
                            />
                          )}
                        </MessageHandler>
                      </div>
                    )}
                  </Card>
                </div>

                {/* Memory Panel */}
                <div className="lg:col-span-1">
                  <MemoryPanel sessionData={sessionData} updateGameSessionState={updateGameSessionState} />
                </div>
              </div>
            </div>
          </div>
        </MemoryProvider>
      </MessageProvider>
  );
};

export default GameContent;
