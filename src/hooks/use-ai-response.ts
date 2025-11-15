// External/SDK Imports
import { useRef } from 'react';

// Project Hooks

// Project Utilities

// Project Services
import { SessionStateService } from '@/services/session-state-service';
import { RollManager } from '@/services/roll-manager';

// Project Types
import {
  Memory,
  isValidMemoryType,
  isValidMemorySubcategory,
} from '@/components/game/memory/types';
import { ChatMessage } from '@/types/game';
import type { Campaign } from '@/types/campaign';
import type { Character } from '@/types/character';
import type { DetectedEnemy, DetectedCombatAction } from '@/utils/combatDetection';
import { useAuth } from '@/contexts/AuthContext';
import { useCombat } from '@/contexts/CombatContext';
import { useGame } from '@/contexts/GameContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import logger from '@/lib/logger';
import { AIService } from '@/services/ai-service';
import { rollStateManager } from '@/services/combat/rollStateManager';
import { DiceEngine } from '@/services/dice/DiceEngine';
import { voiceConsistencyService } from '@/services/voice-consistency-service';
import { detectCombatFromText } from '@/utils/combatDetection';
import { selectRelevantMemories } from '@/utils/memory/selection';
import {
  parseRollRequests,
  detectsSuccessfulAttack,
  detectsCriticalHit,
} from '@/utils/rollRequestParser';

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
  imageRequests?: Array<{ prompt: string; style?: string; quality?: 'low' | 'medium' | 'high' }>;
  combatDetection?: {
    isCombat: boolean;
    confidence: number;
    combatType?: string;
    shouldStartCombat: boolean;
    shouldEndCombat: boolean;
    enemies: DetectedEnemy[];
    combatActions: DetectedCombatAction[];
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
  const { userPlan } = useAuth();
  const lastSigRef = useRef<string>('');

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
        playerEmotion: latestMessage.context?.emotion || 'neutral',
      },
    };
  };

  /**
   * Fetches campaign and character details for the DM Agent context.
   *
   * @param {string} sessionId - The session ID
   * @returns {Promise<{campaign: Campaign, character: Character} | null>} The game context or null if failed
   */
  const fetchGameContext = async (
    sessionId: string,
  ): Promise<{ campaign: Campaign; character: Character } | null> => {
    try {
      logger.info('Fetching game session details for:', sessionId);

      // Get game session with campaign and character details using JOIN
      const { data: sessionData, error: sessionError } = await supabase
        .from('game_sessions')
        .select(
          `
          *,
          campaigns:campaign_id (*),
          characters:character_id (*)
        `,
        )
        .eq('id', sessionId)
        .single();

      if (sessionError) {
        logger.error('Error fetching session:', sessionError);
        return null;
      }

      if (!sessionData?.campaign_id || !sessionData?.character_id) {
        logger.error('No campaign or character IDs found in session');
        return null;
      }

      return {
        campaign: sessionData.campaigns,
        character: sessionData.characters,
      };
    } catch (error) {
      logger.error('Error in fetchGameContext:', error);
      return null;
    }
  };

  /**
   * Calls the DM Agent to generate a response based on chat history and game context.
   * Now handles structured responses with narration segments for voice synthesis.
   *
   * @param {ChatMessage[]} messages - The full message history
   * @param {string} sessionId - The session ID
   * @param {number} turnCount - The current turn count for memory degradation
   * @returns {Promise<EnhancedChatMessage>} The generated AI response with optional narration segments
   * @throws {Error} If the DM Agent call fails
   */
  const getAIResponse = async (
    messages: ChatMessage[],
    sessionId: string,
    turnCount?: number,
  ): Promise<EnhancedChatMessage> => {
    try {
      logger.info('Getting AI response for session:', sessionId);

      // Get latest message context
      const latestMessage = messages[messages.length - 1];

      // Guard against repeated message processing
      const sig = `${sessionId}|${latestMessage.text}|${messages.length}`;
      if (lastSigRef.current === sig) {
        logger.debug('[useAIResponse] Skipping duplicate message processing for signature:', sig);
        // Return a minimal valid response to avoid breaking the UI
        return {
          text: '',
          sender: 'dm',
          timestamp: new Date().toISOString(),
          context: { emotion: 'neutral', intent: 'response' },
        };
      }
      lastSigRef.current = sig;
      // Log dice roll results into session_state for analytics/history
      try {
        const diceCtx: any = (latestMessage as any).context?.diceRoll;
        if ((latestMessage as any).context?.intent === 'dice_roll' && diceCtx) {
          await SessionStateService.appendRollEvent(sessionId, {
            kind: 'roll_result',
            payload: diceCtx,
          });
          // Optional durable logging (flag-gated)
          await RollManager.recordRollResult({
            sessionId,
            kind: 'check',
            resultTotal: Number(diceCtx.total) || 0,
            resultNatural:
              typeof diceCtx.naturalRoll === 'number' ? diceCtx.naturalRoll : undefined,
            meta: {
              formula: diceCtx.formula,
              advantage: !!diceCtx.advantage,
              disadvantage: !!diceCtx.disadvantage,
              kept: diceCtx.keptResults,
              results: diceCtx.results,
            },
          });
        } else if (typeof latestMessage.text === 'string') {
          const m = latestMessage.text.toLowerCase();
          let total: number | null = null;
          const patterns = [
            /\bi\s*rolled\s*(\d+)\b/,
            /rolled[^\d]*(\d+)\b/,
            /\btotal\s*[:=]\s*(\d+)\b/,
            /=\s*(\d+)\b/,
          ];
          for (const p of patterns) {
            const mm = m.match(p);
            if (mm && mm[1]) {
              total = parseInt(mm[1], 10);
              break;
            }
          }
          if (total !== null && !Number.isNaN(total)) {
            await SessionStateService.appendRollEvent(sessionId, {
              kind: 'roll_result',
              payload: { total, raw: latestMessage.text },
            });
            await RollManager.recordRollResult({
              sessionId,
              kind: 'check',
              resultTotal: total,
              meta: { raw: latestMessage.text },
            });
          }
        }
      } catch (e) {
        logger.warn('Non-fatal: failed to append roll result log', e);
      }

      // Detect if this is the first player message in the session
      const isFirstMessage = messages.filter((m) => m.sender === 'player').length <= 1;

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
        .filter((memory) => memory.created_at && memory.updated_at) // Filter out incomplete records
        .map((memory): Memory => {
          if (!isValidMemoryType(memory.type)) {
            logger.warn(
              `[Memory] Invalid memory type detected: ${memory.type}, defaulting to 'general'`,
            );
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
            tags: memory.tags || undefined,
          };
        });

      const selectedMemories = selectRelevantMemories(memories, latestMessage.context);

      // Analyze player message for combat context
      const combatDetection = detectCombatFromText(latestMessage.text);

      logger.debug('Calling DM Agent with context:', {
        gameContext,
        selectedMemories: selectedMemories.length,
        knownCharacters: Object.keys(voiceContext.knownCharacters).length,
        isFirstMessage: isFirstMessage,
        combatDetected: combatDetection.isCombat,
      });

      // Get conversation history in the format expected by AIService
      const conversationHistory = messages.slice(0, -1).map((msg) => ({
        id: `msg_${Date.now()}_${Math.random()}`,
        role: msg.sender === 'player' ? ('user' as const) : ('assistant' as const),
        content: msg.text,
        timestamp: new Date(),
        narrationSegments: msg.narrationSegments,
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
          pendingRolls: gameState.diceRollQueue.pendingRolls.length,
        },
      };

      logger.debug('🎮 AI Context with combat awareness:', {
        phase: gameState.currentPhase,
        inCombat: combatState.isInCombat,
        pendingRolls: gameState.diceRollQueue.pendingRolls.length,
        currentTurn: combatState.activeEncounter?.currentTurnParticipantId,
      });

      // Use AIService directly which has local Gemini integration and combat detection
      const result = await AIService.chatWithDM({
        message: latestMessage.text,
        context: aiContext,
        conversationHistory: conversationHistory,
        userPlan: userPlan || undefined,
        turnCount: turnCount,
      });

      // Extract response data
      const responseText = result.text;
      const narrationSegments =
        (result as any).narration_segments || (result as any).narrationSegments;
      const imageRequests =
        (result as any).image_requests || (result as any).imageRequests || undefined;

      // Parse roll requests from the response and process through GameContext
      let rollRequests: RollRequest[] = result.roll_requests || [];
      if (rollRequests.length === 0) {
        // Check for roll requests in the text
        const parsedRequests = parseRollRequests(responseText);
        logger.info(`🎲 Parsed roll requests from DM text: ${parsedRequests.length}`);
        rollRequests = parsedRequests.map((req) => ({
          type: req.type,
          formula: req.formula,
          purpose: req.purpose,
          dc: req.dc,
          ac: req.ac,
          advantage: req.advantage,
          disadvantage: req.disadvantage,
        }));

        // Check for context-dependent roll requests (like damage after successful attacks)
        if (detectsSuccessfulAttack(responseText)) {
          logger.info('🎯 Detected successful attack, checking for damage roll requirement');
          const isCritical = detectsCriticalHit(responseText);

          // Check if we're already waiting for damage and this confirms the hit
          if (rollStateManager.isAwaitingDamage()) {
            const awaitingRoll = rollStateManager.getAwaitingDamageRoll();
            if (awaitingRoll) {
              // Extract weapon name from context (this could be enhanced)
              const weaponMatch = responseText.match(/(?:your|the)\s+(\w+)/i);
              const weaponName = weaponMatch ? weaponMatch[1] : 'weapon';

              // Create damage roll request based on hit confirmation
              const damageRequest = DiceEngine.createDamageRollRequest(weaponName, isCritical);

              rollRequests.push({
                type: 'damage',
                formula: damageRequest.formula,
                purpose: damageRequest.purpose,
              });

              logger.info('🗡️ Added automatic damage roll request:', damageRequest);
            }
          }
        }
      }

      // Track attack rolls in roll state manager
      rollRequests.forEach((request) => {
        if (request.type === 'attack') {
          const rollId = rollStateManager.addPendingRoll({
            type: 'attack',
            targetAC: request.ac,
            context: request.purpose || 'Attack roll',
            actorId: gameContext.character?.id || 'player',
          });
          logger.info('⚔️ Tracking attack roll:', rollId);
        }
      });

      // NOTE: Roll requests are returned in the message object and will be processed
      // by MessageHandler AFTER the AI message is displayed to prevent premature response.
      // Logging is done here for tracking purposes.
      if (rollRequests.length > 0) {
        logger.info(
          '🎲 Found',
          rollRequests.length,
          'roll requests in AI response (will process after message display)',
        );

        // Persist roll request events to session state (lightweight logging)
        try {
          await SessionStateService.appendRollEvent(sessionId, {
            kind: 'roll_requests',
            payload: rollRequests,
          });
          // Durable roll request logging (flag-gated)
          for (const rr of rollRequests) {
            const kindMap: Record<string, 'check' | 'save' | 'attack' | 'initiative' | 'damage'> = {
              check: 'check',
              save: 'save',
              attack: 'attack',
              initiative: 'initiative',
              damage: 'damage',
            };
            const kind = kindMap[rr.type] || 'check';
            await RollManager.recordRollRequest({
              sessionId,
              kind,
              purpose: rr.purpose,
              formula: rr.formula,
              dc: typeof rr.dc === 'number' ? rr.dc : undefined,
              ac: typeof rr.ac === 'number' ? rr.ac : undefined,
              advantage: !!rr.advantage,
              disadvantage: !!rr.disadvantage,
            });
          }
        } catch (e) {
          logger.warn('Non-fatal: failed to append roll request log', e);
        }
      }

      // Update game phase based on combat detection (use currentPhase for idempotent transitions)
      if (result.combatDetection?.isCombat && gameState.currentPhase !== 'combat') {
        logger.info('⚔️ Combat detected, updating game phase');
        setGamePhase('combat');
      } else if (
        !result.combatDetection?.isCombat &&
        gameState.currentPhase === 'combat' &&
        !combatState.isInCombat
      ) {
        logger.info('🕊️ Combat ended, returning to exploration');
        setGamePhase('exploration');
      }

      // Process voice assignments if we have narration segments
      if (narrationSegments && narrationSegments.length > 0) {
        logger.info(
          '🎭 Received structured response with',
          narrationSegments.length,
          'narration segments',
        );

        try {
          await voiceConsistencyService.processVoiceAssignments(sessionId, narrationSegments);
          logger.info('✅ Processed voice assignments successfully');
        } catch (voiceError) {
          logger.warn('Warning: Failed to process voice assignments:', voiceError);
          // Don't fail the entire response for voice processing errors
        }
      } else {
        logger.info('📝 Received text-only response');
      }

      // Clamp combat intent flags to be mutually exclusive for logging/UX clarity
      let startHint = !!combatDetection.shouldStartCombat;
      let endHint = !!combatDetection.shouldEndCombat;
      if (startHint && endHint) {
        if (combatState.isInCombat) startHint = false;
        else endHint = false;
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
        diceRolls: (result as any).dice_rolls || [],
        rollRequests: rollRequests,
        imageRequests,
        combatDetection: {
          isCombat: combatDetection.isCombat,
          confidence: combatDetection.confidence,
          combatType: combatDetection.combatType,
          shouldStartCombat: startHint,
          shouldEndCombat: endHint,
          enemies: combatDetection.enemies || [],
          combatActions: combatDetection.combatActions || [],
        },
      };
    } catch (error) {
      logger.error('Error in getAIResponse:', error);
      throw error;
    }
  };

  return { getAIResponse };
};
