/**
 * Intent Detector Node
 *
 * Analyzes player input and determines the intent/action type.
 * First node in the DM graph execution pipeline.
 *
 * @module agents/langgraph/nodes/intent-detector
 */

import { DMState } from '../state';
import { GEMINI_TEXT_MODEL } from '@/config/ai';
import { getGeminiManager } from '@/services/ai/shared/utils';
import logger from '@/lib/logger';

/**
 * Intent detection prompt
 */
const INTENT_DETECTION_PROMPT = `Analyze the player's message and determine their intent.

Categories:
- attack: Combat action (attacking, casting offensive spells)
- social: Conversation, persuasion, deception, intimidation
- exploration: Moving, searching, investigating, perception
- spellcast: Casting non-offensive spells (utility, buffs, healing)
- skill_check: Using skills (lockpicking, stealth, athletics)
- movement: Simple movement without investigation
- other: Other actions

Respond in JSON format:
{
  "type": "category",
  "confidence": 0.0-1.0,
  "details": {
    "target": "what/who is being targeted",
    "action": "specific action being taken",
    "skill": "relevant skill if applicable"
  }
}

Player message: "{message}"`;

/**
 * Parse intent from AI response
 */
function parseIntent(text: string): any {
  try {
    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      logger.warn('No JSON found in intent detection response');
      return null;
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // Validate required fields
    if (!parsed.type || typeof parsed.confidence !== 'number') {
      logger.warn('Invalid intent structure:', parsed);
      return null;
    }

    return parsed;
  } catch (error) {
    logger.error('Failed to parse intent:', error);
    return null;
  }
}

/**
 * Detect player intent from input
 *
 * Analyzes the player's message and categorizes it into
 * common D&D action types (combat, exploration, social, etc.).
 *
 * @param state - Current graph state
 * @returns Updated state with detected intent
 */
export async function detectIntent(state: DMState): Promise<Partial<DMState>> {
  try {
    const playerInput = state.playerInput;

    if (!playerInput) {
      logger.warn('No player input to detect intent from');
      return {
        playerIntent: 'other',
        error: 'No player input provided',
      };
    }

    logger.info(`Detecting intent for: "${playerInput}"`);

    // Use Gemini to detect intent
    const geminiManager = getGeminiManager();
    const prompt = INTENT_DETECTION_PROMPT.replace('{message}', playerInput);

    const responseText = await geminiManager.executeWithRotation(async (genAI) => {
      const model = genAI.getGenerativeModel({ model: GEMINI_TEXT_MODEL });
      const result = await model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    });

    // Parse the intent
    const intent = parseIntent(responseText);

    if (!intent) {
      // Fallback: simple keyword detection
      const lowerInput = playerInput.toLowerCase();
      let fallbackType = 'other';

      if (/attack|hit|strike|shoot|stab/.test(lowerInput)) {
        fallbackType = 'attack';
      } else if (/talk|say|speak|ask|persuade|deceive|intimidate/.test(lowerInput)) {
        fallbackType = 'social';
      } else if (/search|look|investigate|examine|check/.test(lowerInput)) {
        fallbackType = 'exploration';
      } else if (/cast|spell/.test(lowerInput)) {
        fallbackType = 'spellcast';
      } else if (/move|walk|run|go/.test(lowerInput)) {
        fallbackType = 'movement';
      }

      logger.info(`Using fallback intent detection: ${fallbackType}`);
      return {
        playerIntent: fallbackType,
        metadata: {
          ...state.metadata,
          stepCount: (state.metadata?.stepCount || 0) + 1,
        },
      };
    }

    logger.info(`Detected intent: ${intent.type} (confidence: ${intent.confidence})`);

    return {
      playerIntent: intent.type,
      metadata: {
        ...state.metadata,
        stepCount: (state.metadata?.stepCount || 0) + 1,
      },
    };
  } catch (error) {
    logger.error('Intent detection failed:', error);
    return {
      playerIntent: 'other',
      error: `Intent detection error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      metadata: {
        ...state.metadata,
        stepCount: (state.metadata?.stepCount || 0) + 1,
      },
    };
  }
}
