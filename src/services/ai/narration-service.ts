/**
 * Narration Service
 *
 * Handles DM chat interactions, opening messages, and narrative generation.
 * The core storytelling engine for AI-powered D&D sessions.
 * Extracted from ai-service.ts (lines reduced from ~700 to <200).
 *
 * @module narration-service
 */

import { AgentOrchestrator } from '../crewai/agent-orchestrator';
import { MemoryManager } from '../memory-manager';
import { SessionStateService } from '../session-state-service';
import { voiceConsistencyService } from '../voice-consistency-service';
import { WorldBuilderService } from '../world-builders/world-builder-service';
import {
  buildDMPersonaPrompt,
  buildGameContextPrompt,
  buildResponseStructurePrompt,
  buildCombatContextPrompt,
  buildOpeningScenePrompt,
} from './shared/prompts';
import {
  getGeminiManager,
  useCrewAI,
  keyFor,
  getOrCreateDeduped,
  addEquipmentContext,
} from './shared/utils';

import type { Memory, MemoryContext } from '../memory-manager';
import type { SessionVoiceContext } from '../voice-consistency-service';
import type { ChatMessage, GameContext, AIResponse, NarrationSegment } from './shared/types';

import { GEMINI_TEXT_MODEL } from '@/config/ai';
import logger from '@/lib/logger';
import { detectCombatFromText } from '@/utils/combatDetection';

/**
 * Parameters for chatWithDM function
 */
interface ChatParams {
  message: string;
  context: GameContext;
  conversationHistory?: ChatMessage[];
  onStream?: (chunk: string) => void;
}

/**
 * Chat with AI Dungeon Master
 *
 * Simplified chat with AI DM for MVP with fallback and streaming support.
 * Uses a single AI call instead of complex agent system.
 * Includes voice segmentation for multi-voice narration.
 *
 * @param params - Chat parameters including message, context, and history
 * @returns AI response with text, narration segments, and combat detection
 */
export async function chatWithDM(params: ChatParams): Promise<AIResponse> {
  // Dedupe in-flight chat calls (2s TTL)
  const key = keyFor(
    params.context?.sessionId,
    params.message,
    (params.conversationHistory || []).length,
  );

  return getOrCreateDeduped(key, async () => {
    try {
      // Retrieve relevant memories to enhance context
      let relevantMemories: Memory[] = [];
      if (params.context.sessionId) {
        try {
          relevantMemories = await MemoryManager.getRelevantMemories(
            params.context.sessionId,
            params.message,
            8,
          );
          logger.info(`📚 Retrieved ${relevantMemories.length} relevant memories`);
        } catch (memoryError) {
          logger.warn('Failed to retrieve memories:', memoryError);
        }
      }

      // Voice context temporarily disabled for option button testing
      const voiceContext: SessionVoiceContext | null = null;

      // Detect combat from player message
      const combatDetection = detectCombatFromText(params.message);
      logger.info(
        `⚔️ Combat detection: ${combatDetection.isCombat ? 'YES' : 'NO'} (confidence: ${Math.round(combatDetection.confidence * 100)}%)`,
      );

      if (combatDetection.isCombat) {
        logger.info(`🎯 Combat details:`, {
          type: combatDetection.combatType,
          shouldStart: combatDetection.shouldStartCombat,
          shouldEnd: combatDetection.shouldEndCombat,
          enemies: combatDetection.enemies?.length || 0,
          actions: combatDetection.combatActions?.length || 0,
        });
      }

      // Optional path: delegate to CrewAI orchestrator
      if (useCrewAI() && params.context.sessionId) {
        const crewResult = await attemptCrewAI(params, relevantMemories, combatDetection);
        if (crewResult) return crewResult;
      }

      // Use local Gemini API
      return await generateGeminiResponse(params, relevantMemories, voiceContext, combatDetection);
    } catch (geminiError) {
      logger.error('Local Gemini API failed:', geminiError);
      throw new Error('Failed to get DM response - AI service unavailable');
    }
  });
}

/**
 * Attempt CrewAI orchestration (feature-flagged)
 */
async function attemptCrewAI(
  params: ChatParams,
  relevantMemories: Memory[],
  combatDetection: any,
): Promise<AIResponse | null> {
  try {
    logger.info('Using CrewAI microservice for chat...');
    const sessionState = await SessionStateService.getState(params.context.sessionId!);
    const crewResult = await AgentOrchestrator.generateResponse({
      message: params.message,
      context: params.context,
      conversationHistory: params.conversationHistory || [],
      sessionState,
    });

    let finalText = crewResult.text || '';
    const isPlaceholder = finalText.trim().startsWith('[CrewAI placeholder]');
    const rollRequests = (crewResult as any).roll_requests || [];

    if (isPlaceholder) {
      if (Array.isArray(rollRequests) && rollRequests.length > 0) {
        const rr = rollRequests[0];
        const typeLabel =
          rr.type === 'check'
            ? 'Check'
            : rr.type === 'save'
              ? 'Saving Throw'
              : rr.type === 'attack'
                ? 'Attack'
                : rr.type === 'damage'
                  ? 'Damage'
                  : 'Initiative';
        const purpose = rr.purpose || (rr.type === 'check' ? 'Ability/Skill Check' : typeLabel);
        const target = rr.dc ? ` (DC ${rr.dc})` : rr.ac ? ` (AC ${rr.ac})` : '';
        const advantage = rr.advantage
          ? ' with advantage'
          : rr.disadvantage
            ? ' with disadvantage'
            : '';
        finalText = `Please roll ${purpose}${target}${advantage}.`;
      } else {
        const geminiText = await generateFallbackNarration(params.message);
        finalText = geminiText || finalText;
      }
    }

    // Post-processing: memory extraction and world expansion
    await postProcessResponse(params, finalText);

    return {
      ...crewResult,
      text: finalText,
      combatDetection: {
        isCombat: combatDetection.isCombat,
        confidence: combatDetection.confidence,
        combatType: combatDetection.combatType,
        shouldStartCombat: combatDetection.shouldStartCombat,
        shouldEndCombat: combatDetection.shouldEndCombat,
        enemies: combatDetection.enemies || [],
        combatActions: combatDetection.combatActions || [],
      },
    } as any;
  } catch (crewError) {
    logger.warn('CrewAI orchestrator failed, falling back to Gemini:', crewError);
    return null;
  }
}

/**
 * Generate fallback narration via Gemini
 */
async function generateFallbackNarration(message: string): Promise<string> {
  logger.info('CrewAI returned placeholder text; generating narration via local Gemini.');
  try {
    const geminiManager = getGeminiManager();
    return await geminiManager.executeWithRotation(async (genAI) => {
      const model = genAI.getGenerativeModel({ model: GEMINI_TEXT_MODEL });
      const prompt = `Respond to the player succinctly (2-3 short paragraphs) and end with 2-3 lettered options. Player said: "${message}"`;
      const response = await model.generateContent(prompt);
      const res = await response.response;
      return res.text();
    });
  } catch (e) {
    logger.warn('Gemini fallback for placeholder failed:', e);
    return '';
  }
}

/**
 * Post-process response: extract memories and expand world
 */
async function postProcessResponse(params: ChatParams, responseText: string): Promise<void> {
  if (!params.context.sessionId) return;

  try {
    const memoryContext: MemoryContext = {
      sessionId: params.context.sessionId,
      campaignId: params.context.campaignId,
      characterId: params.context.characterId,
      currentMessage: params.message,
      recentMessages: params.conversationHistory?.slice(-5).map((msg) => msg.content) || [],
    };

    const extractionResult = await MemoryManager.extractMemories(
      memoryContext,
      params.message,
      responseText,
    );

    if (extractionResult.memories.length > 0) {
      await MemoryManager.saveMemories(extractionResult.memories);
      logger.info(`🧠 Extracted and saved ${extractionResult.memories.length} memories`);
    }
  } catch (memoryError) {
    logger.warn('Memory extraction failed (non-fatal):', memoryError);
  }

  try {
    const worldExpansion = await WorldBuilderService.respondToPlayerAction(
      params.context.campaignId,
      params.context.sessionId!,
      params.context.characterId,
      params.message,
      responseText,
    );

    if (
      worldExpansion &&
      worldExpansion.locations.length + worldExpansion.npcs.length + worldExpansion.quests.length >
        0
    ) {
      logger.info(
        `🌍 World expanded: +${worldExpansion.locations.length} locations, +${worldExpansion.npcs.length} NPCs, +${worldExpansion.quests.length} quests`,
      );
    }
  } catch (worldError) {
    logger.warn('World building failed (non-fatal):', worldError);
  }
}

// Due to length constraints, generateGeminiResponse is continued in narration-service-impl.ts
export { generateGeminiResponse } from './narration-service-impl';
export { generateOpeningMessage } from './opening-message-generator';
