/**
 * Narration Service Implementation
 *
 * Contains the core Gemini response generation logic.
 * Split from narration-service.ts to maintain under 200 lines per file.
 *
 * @module narration-service-impl
 */

import { MemoryManager } from '../memory-manager';
import { voiceConsistencyService } from '../voice-consistency-service';
import {
  buildDMPersonaPrompt,
  buildGameContextPrompt,
  buildResponseStructurePrompt,
  buildCombatContextPrompt,
  buildOpeningScenePrompt,
} from './shared/prompts';
import { getGeminiManager, addEquipmentContext } from './shared/utils';

import type { Memory, MemoryContext } from '../memory-manager';
import type { SessionVoiceContext } from '../voice-consistency-service';
import type { ChatMessage, GameContext, AIResponse, NarrationSegment } from './shared/types';

import { GEMINI_TEXT_MODEL } from '@/config/ai';
import logger from '@/lib/logger';

/**
 * Generate response using Gemini API
 */
export async function generateGeminiResponse(
  params: {
    message: string;
    context: GameContext;
    conversationHistory?: ChatMessage[];
    onStream?: (chunk: string) => void;
  },
  relevantMemories: Memory[],
  voiceContext: SessionVoiceContext | null,
  combatDetection: any,
): Promise<AIResponse> {
  logger.info('Using local Gemini API for chat...');
  const geminiManager = getGeminiManager();

  const result = await geminiManager.executeWithRotation(async (genAI) => {
    const model = genAI.getGenerativeModel({ model: GEMINI_TEXT_MODEL });

    // Build enhanced context for DM interactions
    let contextPrompt = buildDMPersonaPrompt();
    contextPrompt += buildGameContextPrompt(params.context, relevantMemories);

    // Add equipment context if character details available
    if (params.context.characterDetails) {
      contextPrompt += addEquipmentContext(params.context.characterDetails);
    }

    // Detect if this is a campaign opening (first message)
    const isFirstMessage =
      (!params.conversationHistory || params.conversationHistory.length === 0) &&
      (!params.message || params.message.trim() === '');

    if (isFirstMessage) {
      contextPrompt += buildOpeningScenePrompt();
    }

    // Add combat context if detected
    contextPrompt += buildCombatContextPrompt(combatDetection);

    // Add specific dice roll requirements for combat
    if (combatDetection.isCombat) {
      contextPrompt += `<combat_roll_requirements>
<title>IMMEDIATE DICE ROLL REQUIREMENTS</title>
Based on the detected combat scenario, you MUST include these dice rolls in your response:
- Initiative rolls for any new combat participants.
- Attack rolls for any offensive actions.
- Damage rolls following successful attacks.
- Saving throws for any effects or spells.
- Any ability checks mentioned by the player.

**CRITICAL**: Include actual dice roll results in your "dice_rolls" array AND display them in the narrative text.
</combat_roll_requirements>`;
    }

    // Add voice context for multi-voice narration
    if (voiceContext) {
      contextPrompt += `<voice_optimization_format>
<title>CRITICAL: VOICE-OPTIMIZED RESPONSE FORMAT</title>
You MUST respond with JSON containing both display text AND pre-segmented narration for multi-voice synthesis.
**IMPORTANT: Return ONLY pure JSON - no markdown, no code blocks, no extra text!**

<segmentation_rules>
1. **Fewer, Better Segments**: Create 2-5 segments maximum per response.
2. **One Speaker Per Segment**: Each segment = one speaker (DM or specific character).
3. **Complete Thoughts**: Each segment should be a complete thought or dialogue turn.
4. **Speaker Turns**: Split only when the speaker changes (DM -> Character or Character A -> Character B).
</segmentation_rules>

<json_format>
{
  "text": "Your full response with proper quoted dialogue and dice roll results for display",
  "narration_segments": [
    { "type": "dm", "text": "Complete scene description and DM narration", "character": null, "voice_category": null },
    { "type": "character", "text": "Complete character dialogue without quotes", "character": "simple character name", "voice_category": "hero_male|villain_female|merchant|guard|elder|creature|etc" }
  ],
  "roll_requests": [
    { "type": "check|save|attack|damage|initiative", "formula": "1d20+5", "purpose": "Arcana check to understand the magical mechanism", "dc": 15, "advantage": false, "disadvantage": false }
  ]
}
</json_format>

<roll_request_requirements>
- ALWAYS include "roll_requests" array when requesting dice rolls from players.
- Include roll_requests for: player combat actions, skill checks, saving throws, initiative.
- Each roll_request must have: type, formula, purpose, and target (DC/AC) if applicable.
- Show roll requests in the "text" field: "Please roll 1d20+5 for your Arcana check (DC 15)"
</roll_request_requirements>

<voice_categories>hero_male, hero_female, villain_male, villain_female, merchant, guard, innkeeper, elder, child, creature, goblin, monster</voice_categories>
</voice_optimization_format>`;
    }

    contextPrompt += buildResponseStructurePrompt();

    if (voiceContext) {
      contextPrompt += `\n**REMEMBER: Always respond in the JSON format with narration_segments for voice synthesis!**`;
    }

    // Build conversation history
    const messages = [
      { role: 'user', parts: [{ text: contextPrompt }] },
      { role: 'model', parts: [{ text: "Understood! I'm ready to be your Dungeon Master." }] },
    ];

    // Add conversation history
    if (params.conversationHistory) {
      params.conversationHistory.forEach((msg) => {
        messages.push({
          role: msg.role === 'user' ? 'user' : 'model',
          parts: [{ text: msg.content }],
        });
      });
    }

    const chat = model.startChat({
      history: messages,
      generationConfig: {
        temperature: 0.9,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 2048,
      },
    });

    // Use streaming if callback provided (note: streaming won't work with JSON parsing)
    if (params.onStream && !voiceContext) {
      const response = await chat.sendMessageStream(params.message);
      let fullResponse = '';

      for await (const chunk of response.stream) {
        const chunkText = chunk.text();
        fullResponse += chunkText;
        params.onStream(chunkText);
      }

      return { text: fullResponse };
    } else {
      const response = await chat.sendMessage(params.message);
      const result = await response.response;
      const rawResponse = result.text();

      // Try to parse structured response if voice context is available
      if (voiceContext) {
        return parseStructuredResponse(rawResponse);
      }

      return { text: rawResponse };
    }
  });

  logger.info('Successfully generated DM response using local Gemini API');

  // Process voice assignments if we have structured data
  if (result.narrationSegments && params.context.sessionId && voiceContext) {
    await processVoiceAssignments(params.context.sessionId, result.narrationSegments);
  }

  // Extract memories and expand world
  if (params.context.sessionId) {
    await postProcessMemoriesAndWorld(params, result.text);
  }

  // Add combat detection data to the result
  return {
    ...result,
    combatDetection: {
      isCombat: combatDetection.isCombat,
      confidence: combatDetection.confidence,
      combatType: combatDetection.combatType,
      shouldStartCombat: combatDetection.shouldStartCombat,
      shouldEndCombat: combatDetection.shouldEndCombat,
      enemies: combatDetection.enemies || [],
      combatActions: combatDetection.combatActions || [],
    },
  };
}

/**
 * Parse structured JSON response for voice segments
 */
function parseStructuredResponse(rawResponse: string): AIResponse {
  try {
    let cleanedResponse = rawResponse.trim();

    // Remove markdown code blocks
    cleanedResponse = cleanedResponse.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');

    // Try to find JSON content
    const jsonStart = cleanedResponse.indexOf('{');
    const jsonEnd = cleanedResponse.lastIndexOf('}');

    if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
      cleanedResponse = cleanedResponse.substring(jsonStart, jsonEnd + 1);
    }

    // Additional cleanup for common JSON formatting issues
    cleanedResponse = cleanedResponse
      .replace(/,\s*}/g, '}')
      .replace(/,\s*]/g, ']')
      .replace(/}\s*{/g, '},{')
      .replace(/"\s*:\s*"([^"]*?)"\s*([,}])/g, '":"$1"$2');

    const structuredResponse = JSON.parse(cleanedResponse);
    logger.debug('🎭 Successfully parsed structured voice response');
    return structuredResponse;
  } catch (parseError) {
    logger.warn('Failed to parse structured response:', parseError);
    return { text: rawResponse };
  }
}

/**
 * Process voice assignments for character consistency
 */
async function processVoiceAssignments(
  sessionId: string,
  segments: NarrationSegment[],
): Promise<void> {
  try {
    const normalizedSegments = segments.map((segment) => ({
      ...segment,
      type:
        segment.type === 'dm'
          ? 'narration'
          : segment.type === 'character'
            ? 'dialogue'
            : (segment.type as string),
    }));

    await voiceConsistencyService.processVoiceAssignments(sessionId, normalizedSegments);
    logger.info('🎪 Processed voice assignments for character consistency');
  } catch (voiceError) {
    logger.warn('Voice assignment processing failed (non-fatal):', voiceError);
  }
}

/**
 * Post-process memories and world building
 */
async function postProcessMemoriesAndWorld(
  params: { message: string; context: GameContext; conversationHistory?: ChatMessage[] },
  responseText: string,
): Promise<void> {
  try {
    const memoryContext: MemoryContext = {
      sessionId: params.context.sessionId!,
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
