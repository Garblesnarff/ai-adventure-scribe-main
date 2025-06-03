import React, { useEffect, useState } from 'react';
import { Card } from '../ui/card';
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
import { MemoryProvider } from '@/contexts/MemoryContext';
import { MessageProvider } from '@/contexts/MessageContext';
import { useGameSession } from '@/hooks/use-game-session';

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

  const { dispatch: characterDispatch } = useCharacter();
  const { dispatch: campaignDispatch } = useCampaign();
  
  // Initialize useGameSession here
  const { 
    sessionData, 
    sessionId, // This is the actual current sessionId from the hook
    sessionState, 
    updateGameSessionState, 
    // createGameSession // if manual creation is needed elsewhere
  } = useGameSession(campaignIdFromParams, characterIdFromParams);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
        campaignDispatch({ type: 'UPDATE_CAMPAIGN', payload: campaignData as Partial<CampaignType> });

      } catch (err: any) {
        console.error("Error loading game data:", err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    loadGameData();
  }, [characterIdFromParams, campaignIdFromParams, characterDispatch, campaignDispatch]);

  // Combine loading states: initial data load and session loading
  const combinedIsLoading = isLoading || sessionState === 'loading';
  const combinedError = error || (sessionState === 'error' ? "Error with game session." : null);

  if (combinedIsLoading) {
    return <div className="text-center p-10">Loading game data...</div>;
  }

  if (combinedError) {
    return <div className="text-center p-10 text-red-600">Error: {combinedError}</div>;
  }
  
  if (!sessionId || !sessionData) {
    return <div className="text-center p-10">Initializing session... If this persists, check campaign/character selection.</div>;
  }

  // These are validated ones from params, used for data loading.
  // MessageHandler will use the sessionId from useGameSession.
  const campaignIdForHandler = campaignIdFromParams;
  const characterIdForHandler = characterIdFromParams;

  return (
    // Now GameContent sets up the providers with its own session
    <MessageProvider sessionId={sessionId}>
      <MemoryProvider sessionId={sessionId}>
        <div className="flex gap-4 max-w-7xl mx-auto">
          <Card className="flex-1 bg-white/90 backdrop-blur-sm shadow-xl p-6">
            <h1 className="text-4xl text-center mb-6 text-primary">
              {sessionData.campaign_id ? `Adventure in ${sessionData.campaign_id}` : "D&D Adventure"}
            </h1>
            <div>Turn: {sessionData.turn_count ?? 0}</div>
            <div>Scene: {sessionData.current_scene_description ?? "The adventure unfolds..."}</div>
            <div className="flex flex-col">
              <MessageList />
              <div className="mt-4">
                <VoiceHandler />
                <MessageHandler
                  sessionId={sessionId} // Use sessionId from useGameSession
                  campaignId={campaignIdForHandler}
                  characterId={characterIdForHandler}
                >
                  {({ handleSendMessage, isProcessing }) => (
                    <ChatInput 
                      onSendMessage={handleSendMessage}
                      isDisabled={isProcessing}
                    />
                  )}
                </MessageHandler>
              </div>
            </div>
          </Card>
          {/* Pass sessionData and updateGameSessionState to MemoryPanel for notes */}
          <MemoryPanel sessionData={sessionData} updateGameSessionState={updateGameSessionState} />
        </div>
      </MemoryProvider>
    </MessageProvider>
  );
};

export default GameContent;