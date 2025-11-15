/**
 * Response Generator Node
 *
 * Generates the final DM narrative response.
 * Combines all gathered context and creates immersive storytelling.
 *
 * @module agents/langgraph/nodes/response-generator
 */

import { DMState, NarrativeResponse } from '../state';
import { GEMINI_TEXT_MODEL } from '@/config/ai';
import { getGeminiManager } from '@/services/ai/shared/utils';
import {
  buildDMPersonaPrompt,
  buildGameContextPrompt,
  buildResponseStructurePrompt,
} from '@/services/ai/shared/prompts';
import logger from '@/lib/logger';

/**
 * Response generation prompt template
 */
const RESPONSE_GENERATION_PROMPT = `{dmPersona}

{gameContext}

{responseStructure}

Player Intent: {intent}
Player Action: {action}
Rules Validation: {validation}
Dice Roll Status: {diceRoll}

Recent Memories:
{memories}

Generate a compelling DM response that:
1. Acknowledges the player's action
2. Describes the immediate outcome
3. Sets the atmosphere and scene
4. Introduces NPCs or environmental details
5. Presents consequences and available actions
6. Requests dice rolls if needed

Respond in JSON format:
{
  "description": "main narrative (2-3 paragraphs)",
  "atmosphere": "environmental mood",
  "npcs": [{"name": "NPC name", "dialogue": "what they say"}],
  "availableActions": ["action 1", "action 2", "action 3"],
  "consequences": ["immediate result 1", "immediate result 2"]
}`;

/**
 * Parse narrative response from AI
 */
function parseNarrative(text: string): NarrativeResponse | null {
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      // Fallback: use raw text as description
      return {
        description: text,
        atmosphere: 'neutral',
        npcs: [],
        availableActions: [],
        consequences: [],
      };
    }

    const parsed = JSON.parse(jsonMatch[0]);

    return {
      description: parsed.description || text,
      atmosphere: parsed.atmosphere || 'neutral',
      npcs: parsed.npcs || [],
      availableActions: parsed.availableActions || [],
      consequences: parsed.consequences || [],
    };
  } catch (error) {
    logger.error('Failed to parse narrative:', error);
    // Return raw text as fallback
    return {
      description: text,
      atmosphere: 'neutral',
      npcs: [],
      availableActions: [],
      consequences: [],
    };
  }
}

/**
 * Build memory context string
 */
function buildMemoryContext(state: DMState): string {
  const memories = state.worldContext?.recentMemories || [];

  if (memories.length === 0) {
    return 'No recent memories available.';
  }

  return memories.map((mem, i) => `${i + 1}. ${mem.content} (${mem.type})`).join('\n');
}

/**
 * Generate DM narrative response
 *
 * Creates the final response using:
 * - Player intent
 * - Rules validation results
 * - World context and memories
 * - Narrative style and pacing
 *
 * @param state - Current graph state
 * @returns Updated state with generated response
 */
export async function generateResponse(state: DMState): Promise<Partial<DMState>> {
  try {
    const { playerInput, playerIntent, rulesValidation, requiresDiceRoll, worldContext } = state;

    if (!playerInput || !playerIntent) {
      logger.warn('Missing player input or intent for response generation');
      return {
        response: {
          description: 'I need more information to respond. What would you like to do?',
          atmosphere: 'neutral',
          npcs: [],
          availableActions: [],
          consequences: [],
        },
        error: 'Missing player input or intent',
      };
    }

    logger.info('Generating DM response...');

    // Build context strings
    const dmPersona = buildDMPersonaPrompt();
    const gameContext = buildGameContextPrompt({
      sessionId: worldContext.sessionId || '',
      campaignId: worldContext.campaignId || '',
      characterId: worldContext.characterIds?.[0] || '',
    });
    const responseStructure = buildResponseStructurePrompt();
    const memoryContext = buildMemoryContext(state);

    // Format validation and dice roll status
    const validationSummary = rulesValidation
      ? `Valid: ${rulesValidation.isValid}, Reasoning: ${rulesValidation.reasoning}`
      : 'No validation performed';

    const diceRollStatus = requiresDiceRoll
      ? `DICE ROLL NEEDED: ${requiresDiceRoll.reason} (${requiresDiceRoll.formula})`
      : 'No dice roll needed';

    // Build prompt
    const prompt = RESPONSE_GENERATION_PROMPT.replace('{dmPersona}', dmPersona)
      .replace('{gameContext}', gameContext)
      .replace('{responseStructure}', responseStructure)
      .replace('{intent}', playerIntent)
      .replace('{action}', playerInput)
      .replace('{validation}', validationSummary)
      .replace('{diceRoll}', diceRollStatus)
      .replace('{memories}', memoryContext);

    // Use Gemini to generate response
    const geminiManager = getGeminiManager();

    const responseText = await geminiManager.executeWithRotation(async (genAI) => {
      const model = genAI.getGenerativeModel({ model: GEMINI_TEXT_MODEL });
      const result = await model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    });

    // Parse the narrative
    const narrative = parseNarrative(responseText);

    if (!narrative) {
      logger.error('Failed to generate narrative response');
      return {
        response: {
          description: 'Something went wrong. Please try again.',
          atmosphere: 'neutral',
          npcs: [],
          availableActions: [],
          consequences: [],
        },
        error: 'Failed to generate narrative',
      };
    }

    logger.info('DM response generated successfully');

    return {
      response: narrative,
      metadata: {
        ...state.metadata,
        stepCount: (state.metadata?.stepCount || 0) + 1,
      },
    };
  } catch (error) {
    logger.error('Response generation failed:', error);
    return {
      response: {
        description: `I encountered an error: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`,
        atmosphere: 'neutral',
        npcs: [],
        availableActions: [],
        consequences: [],
      },
      error: `Response generation error: ${error instanceof Error ? error.message : 'Unknown'}`,
      metadata: {
        ...state.metadata,
        stepCount: (state.metadata?.stepCount || 0) + 1,
      },
    };
  }
}
