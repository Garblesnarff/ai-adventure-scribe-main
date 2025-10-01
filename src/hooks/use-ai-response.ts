// External/SDK Imports
import { supabase } from '@/integrations/supabase/client';

// Project Hooks
import { useToast } from '@/hooks/use-toast';
import { useGame } from '@/contexts/GameContext';
import { useCombat } from '@/contexts/CombatContext';

// Project Utilities
import { selectRelevantMemories } from '@/utils/memory/selection';

// Project Services
import { voiceConsistencyService } from '@/services/voice-consistency-service';
import { AIService } from '@/services/ai-service';
import { rollStateManager } from '@/services/combat/rollStateManager';

// Project Types
import { Memory, isValidMemoryType, isValidMemorySubcategory } from '@/components/game/memory/types';
import { ChatMessage } from '@/types/game';

// Voice narration types
export interface NarrationSegment {
  type: 'narration' | 'dialogue' | 'action' | 'thought' | 'dm' | 'character';
  text: string;
  character?: string;
  voice_category?: string;
}

export interface DiceRoll {
  type: 'attack' | 'damage' | 'saving_throw' | 'ability_check' | 'initiative' | 'skill_check';
  dice_notation: string; // e.g., "1d20+4", "2d6+3"
  result: number;
  modifier: number;
  target?: number; // DC or AC
  success?: boolean;
  critical?: boolean;
  actor: string;
  context: string; // Description of what the roll is for
}

export interface RollRequest {
  type: 'check' | 'save' | 'attack' | 'damage' | 'initiative';
  formula: string;
  purpose: string;
  dc?: number;
  ac?: number;
  advantage?: boolean;
  disadvantage?: boolean;
}

export interface StructuredAIResponse {
  response: string;
  narration_segments?: NarrationSegment[];
  dice_rolls?: DiceRoll[];
  roll_requests?: RollRequest[];
}

export interface EnhancedChatMessage extends ChatMessage {
  narrationSegments?: NarrationSegment[];
  diceRolls?: DiceRoll[];
  rollRequests?: RollRequest[];
  combatDetection?: {
    isCombat: boolean;
    confidence: number;
    combatType?: string;
    shouldStartCombat: boolean;
    shouldEndCombat: boolean;
    enemies: any[];
    combatActions: any[];
  };
}


/**
 * useAIResponse Hook
 * 
 * Handles AI response generation with memory context window.
 * Formats tasks, fetches game context, and calls the DM Agent.
 * 
 * Dependencies:
 * - Supabase client (src/integrations/supabase/client.ts)
 * - Toast hook (src/hooks/use-toast.ts)
 * - Memory selection utils (src/utils/memorySelection.ts)
 * - ChatMessage and Memory types (src/types/game.ts, src/components/game/memory/types.ts)
 * 
 * @author AI Dungeon Master Team
 */
export const useAIResponse = () => {
  const { toast } = useToast();
  const { processAiResponse, setGamePhase, state: gameState } = useGame();
  const { state: combatState } = useCombat();

  /**
   * Formats chat messages into a task object for the DM Agent.
   * 
   * @param {ChatMessage[]} messages - The full message history
   * @param {ChatMessage} latestMessage - The latest player message
   * @returns {object} The formatted task object
   */
  const formatDMTask = (messages: ChatMessage[], latestMessage: ChatMessage) => {
    return {
      id: `task_${Date.now()}`,
      description: `Respond to player message: ${latestMessage.text}`,
      expectedOutput: 'D&D appropriate response with game context',
      context: {
        messageHistory: messages,
        playerIntent: latestMessage.context?.intent || 'query',
        playerEmotion: latestMessage.context?.emotion || 'neutral'
      }
    };
  };

  /**
   * Fetches campaign and character details for the DM Agent context.
   * 
   * @param {string} sessionId - The session ID
   * @returns {Promise<{campaign: any, character: any} | null>} The game context or null if failed
   */
  const fetchGameContext = async (sessionId: string): Promise<{campaign: any, character: any} | null> => {
    try {
      console.log('Fetching game session details for:', sessionId);
      
      // Get game session with campaign and character details using JOIN
      const { data: sessionData, error: sessionError } = await supabase
        .from('game_sessions')
        .select(`
          *,
          campaigns:campaign_id (*),
          characters:character_id (*)
        `)
        .eq('id', sessionId)
        .single();

      if (sessionError) {
        console.error('Error fetching session:', sessionError);
        return null;
      }

      if (!sessionData?.campaign_id || !sessionData?.character_id) {
        console.error('No campaign or character IDs found in session');
        return null;
      }

      return {
        campaign: sessionData.campaigns,
        character: sessionData.characters
      };
    } catch (error) {
      console.error('Error in fetchGameContext:', error);
      return null;
    }
  };

  /**
   * Calls the DM Agent to generate a response based on chat history and game context.
   * Now handles structured responses with narration segments for voice synthesis.
   * 
   * @param {ChatMessage[]} messages - The full message history
   * @param {string} sessionId - The session ID
   * @returns {Promise<EnhancedChatMessage>} The generated AI response with optional narration segments
   * @throws {Error} If the DM Agent call fails
   */
  const getAIResponse = async (messages: ChatMessage[], sessionId: string): Promise<EnhancedChatMessage> => {
    try {
      console.log('Getting AI response for session:', sessionId);

      // Get latest message context
      const latestMessage = messages[messages.length - 1];
      
      // Detect if this is the first player message in the session
      const isFirstMessage = messages.filter(m => m.sender === 'player').length <= 1;
      
      // Fetch campaign and character context
      const gameContext = await fetchGameContext(sessionId);
      
      if (!gameContext) {
        throw new Error('Failed to fetch game context');
      }

      // Get voice context for consistent character voices
      const voiceContext = await voiceConsistencyService.getSessionVoiceContext(sessionId);

      // Fetch and select relevant memories
      const { data: memoriesData } = await supabase
        .from('memories')
        .select('*')
        .eq('session_id', sessionId);

      // Validate and transform memories
      const memories: Memory[] = (memoriesData || [])
        .filter(memory => memory.created_at && memory.updated_at) // Filter out incomplete records
        .map((memory): Memory => {
          if (!isValidMemoryType(memory.type)) {
            console.warn(`[Memory] Invalid memory type detected: ${memory.type}, defaulting to 'general'`);
            memory.type = 'general';
          }
          
          // Handle subcategory validation and conversion
          let subcategory: Memory['subcategory'] = undefined;
          if (memory.subcategory && isValidMemorySubcategory(memory.subcategory)) {
            subcategory = memory.subcategory;
          }
          
          return {
            id: memory.id,
            type: isValidMemoryType(memory.type) ? memory.type : 'general',
            subcategory,
            content: memory.content,
            importance: memory.importance ?? 1, // Default importance if null
            embedding: memory.embedding,
            metadata: memory.metadata,
            created_at: memory.created_at!, // We filtered for non-null above
            session_id: memory.session_id,
            updated_at: memory.updated_at!, // We filtered for non-null above
            context_id: memory.context_id || undefined,
            related_memories: memory.related_memories || undefined,
            tags: memory.tags || undefined
          };
        });

      const selectedMemories = selectRelevantMemories(memories, latestMessage.context);

      // Import combat detection to analyze player message
      const { detectCombatFromText } = await import('@/utils/combatDetection');
      const combatDetection = detectCombatFromText(latestMessage.text);

      console.log('Calling DM Agent with context:', {
        gameContext,
        selectedMemories: selectedMemories.length,
        knownCharacters: Object.keys(voiceContext.knownCharacters).length,
        isFirstMessage: isFirstMessage,
        combatDetected: combatDetection.isCombat
      });

      // Get conversation history in the format expected by AIService
      const conversationHistory = messages.slice(0, -1).map(msg => ({
        id: `msg_${Date.now()}_${Math.random()}`,
        role: msg.sender === 'player' ? 'user' as const : 'assistant' as const,
        content: msg.text,
        timestamp: new Date(),
        narrationSegments: msg.narrationSegments
      }));

      // Create proper GameContext for AIService with combat awareness
      const aiContext = {
        campaignId: gameContext.campaign?.id || '',
        characterId: gameContext.character?.id || '',
        sessionId: sessionId,
        campaignDetails: gameContext.campaign,
        characterDetails: gameContext.character,
        // Add current game state for combat awareness
        gameState: {
          currentPhase: gameState.currentPhase,
          isInCombat: combatState.isInCombat,
          currentTurnPlayerId: combatState.activeEncounter?.currentTurnParticipantId,
          pendingRolls: gameState.diceRollQueue.pendingRolls.length
        }
      };

      console.log('🎮 AI Context with combat awareness:', {
        phase: gameState.currentPhase,
        inCombat: combatState.isInCombat,
        pendingRolls: gameState.diceRollQueue.pendingRolls.length,
        currentTurn: combatState.activeEncounter?.currentTurnParticipantId
      });

      // Use AIService directly which has local Gemini integration and combat detection
      const result = await AIService.chatWithDM({
        message: latestMessage.text,
        context: aiContext,
        conversationHistory: conversationHistory
      });

      // Extract response data
      let responseText = result.text;
      let narrationSegments = result.narrationSegments;

      // Parse roll requests from the response and process through GameContext
      let rollRequests: RollRequest[] = result.roll_requests || [];
      if (rollRequests.length === 0) {
        // Import roll request parser and check for roll requests in the text
        const { parseRollRequests, detectsSuccessfulAttack, detectsCriticalHit } = await import('@/utils/rollRequestParser');
        const parsedRequests = parseRollRequests(responseText);
        rollRequests = parsedRequests.map(req => ({
          type: req.type,
          formula: req.formula,
          purpose: req.purpose,
          dc: req.dc,
          ac: req.ac,
          advantage: req.advantage,
          disadvantage: req.disadvantage
        }));

        // Check for context-dependent roll requests (like damage after successful attacks)
        if (detectsSuccessfulAttack(responseText)) {
          console.log('🎯 Detected successful attack, checking for damage roll requirement');
          const isCritical = detectsCriticalHit(responseText);

          // Check if we're already waiting for damage and this confirms the hit
          if (rollStateManager.isAwaitingDamage()) {
            const awaitingRoll = rollStateManager.getAwaitingDamageRoll();
            if (awaitingRoll) {
              // Extract weapon name from context (this could be enhanced)
              const weaponMatch = responseText.match(/(?:your|the)\s+(\w+)/i);
              const weaponName = weaponMatch ? weaponMatch[1] : 'weapon';

              // Create damage roll request based on hit confirmation
              const { DiceEngine } = await import('@/services/dice/DiceEngine');
              const damageRequest = DiceEngine.createDamageRollRequest(weaponName, isCritical);

              rollRequests.push({
                type: 'damage',
                formula: damageRequest.formula,
                purpose: damageRequest.purpose
              });

              console.log('🗡️ Added automatic damage roll request:', damageRequest);
            }
          }
        }
      }

      // Track attack rolls in roll state manager
      rollRequests.forEach(request => {
        if (request.type === 'attack') {
          const rollId = rollStateManager.addPendingRoll({
            type: 'attack',
            targetAC: request.ac,
            context: request.purpose || 'Attack roll',
            actorId: gameContext.character?.id || 'player'
          });
          console.log('⚔️ Tracking attack roll:', rollId);
        }
      });

      // Process roll requests through GameContext for deduplication and proper queue management
      if (rollRequests.length > 0) {
        console.log('🎲 Processing', rollRequests.length, 'roll requests through GameContext');
        processAiResponse(rollRequests);
      }

      // Update game phase based on combat detection
      if (result.combatDetection?.isCombat && !gameState.isInCombat) {
        console.log('⚔️ Combat detected, updating game phase');
        setGamePhase('combat');
      } else if (!result.combatDetection?.isCombat && gameState.currentPhase === 'combat' && !combatState.isInCombat) {
        console.log('🕊️ Combat ended, returning to exploration');
        setGamePhase('exploration');
      }

      // Process voice assignments if we have narration segments
      if (narrationSegments && narrationSegments.length > 0) {
        console.log('🎭 Received structured response with', narrationSegments.length, 'narration segments');
        
        try {
          await voiceConsistencyService.processVoiceAssignments(sessionId, narrationSegments);
          console.log('✅ Processed voice assignments successfully');
        } catch (voiceError) {
          console.warn('Warning: Failed to process voice assignments:', voiceError);
          // Don't fail the entire response for voice processing errors
        }
      } else {
        console.log('📝 Received text-only response');
      }

      // Format the response as an EnhancedChatMessage
      return {
        text: responseText,
        sender: 'dm',
        timestamp: new Date().toISOString(),
        context: {
          emotion: 'neutral',
          intent: 'response',
        },
        narrationSegments: narrationSegments,
        diceRolls: result.dice_rolls || [],
        rollRequests: rollRequests,
        combatDetection: {
          isCombat: combatDetection.isCombat,
          confidence: combatDetection.confidence,
          combatType: combatDetection.combatType,
          shouldStartCombat: combatDetection.shouldStartCombat,
          shouldEndCombat: combatDetection.shouldEndCombat,
          enemies: combatDetection.enemies || [],
          combatActions: combatDetection.combatActions || []
        }
      };
    } catch (error) {
      console.error('Error in getAIResponse:', error);
      throw error;
    }
  };

  return { getAIResponse };
};
