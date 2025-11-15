/**
 * Opening Message Generator
 *
 * Generates immersive campaign opening scenes.
 * Split from narration-service.ts to maintain single responsibility.
 *
 * @module opening-message-generator
 */

import { getGeminiManager } from './shared/utils';

import type { GameContext } from './shared/types';

import { GEMINI_TEXT_MODEL } from '@/config/ai';
import logger from '@/lib/logger';

/**
 * Generate an opening message for a new campaign session
 *
 * Creates an engaging introduction based on campaign and character context.
 * Includes sensory details, NPC interactions, and clear action choices.
 *
 * @param context - Game context with campaign and character details
 * @returns Generated opening message text
 *
 * @example
 * ```typescript
 * const opening = await generateOpeningMessage({
 *   context: {
 *     campaignId: 'camp_123',
 *     characterId: 'char_456',
 *     campaignDetails: { name: 'The Lost Mines', description: '...' },
 *     characterDetails: { name: 'Thorin', class: 'Fighter', level: 1 }
 *   }
 * });
 * ```
 */
export async function generateOpeningMessage(params: { context: GameContext }): Promise<string> {
  logger.info('Generating opening message for new session...');

  try {
    const geminiManager = getGeminiManager();

    const result = await geminiManager.executeWithRotation(async (genAI) => {
      const model = genAI.getGenerativeModel({ model: GEMINI_TEXT_MODEL });

      // Build enhanced context for opening message
      let contextPrompt = `You are an expert D&D 5e Dungeon Master with years of experience creating memorable adventures. You have a vivid, immersive storytelling style that immediately draws players into the world.`;

      // Determine campaign tone and genre for appropriate DM voice
      let campaignTone = 'balanced';
      if (params.context.campaignDetails) {
        const rawDescription = params.context.campaignDetails.description || '';
        const description = rawDescription.toLowerCase();
        if (
          description.includes('dark') ||
          description.includes('horror') ||
          description.includes('grim')
        ) {
          campaignTone = 'dark';
        } else if (
          description.includes('light') ||
          description.includes('comedy') ||
          description.includes('fun')
        ) {
          campaignTone = 'lighthearted';
        } else if (
          description.includes('epic') ||
          description.includes('legendary') ||
          description.includes('heroic')
        ) {
          campaignTone = 'epic';
        }

        contextPrompt += `\n\nCAMPAIGN CONTEXT:\nTitle: "${params.context.campaignDetails.name}"\nDescription: ${params.context.campaignDetails.description}`;
      }

      if (params.context.characterDetails) {
        const char = params.context.characterDetails;
        contextPrompt += `\n\nPLAYER CHARACTER:\nName: ${char.name}\nRace: ${char.race}\nClass: ${char.class}\nLevel: ${char.level}`;
        if (char.background) {
          contextPrompt += `\nBackground: ${char.background}`;
        }
        if (char.description) {
          contextPrompt += `\nDescription: ${char.description}`;
        }
      }

      contextPrompt += `\n\nCampaign Tone: ${campaignTone}\n\nCreate an immersive opening scene that:
1. **Immediate Engagement**: Start in the middle of an intriguing situation, not just "you enter a tavern"
2. **Sensory Rich**: Include what you see, hear, smell, feel, and taste
3. **Character Integration**: Reference their ${params.context.characterDetails?.class || 'character'} abilities, equipment, or background naturally
4. **Decision Point**: End with a compelling choice between 2-3 distinct actions with clear stakes
5. **NPC Interaction**: Include at least one interesting NPC with direct quoted dialogue
6. **World Details**: Add unique elements that make this world feel alive and distinct
7. **Foreshadowing**: Hint at larger mysteries or conflicts without revealing everything
8. **Clear Stakes**: Make it obvious why this moment matters

**CRITICAL: NPC Dialogue Requirements**
- ALL NPC interactions MUST use direct quoted speech
- Examples: "Stranger, you look like you've seen trouble," or "Help me! The bandits took everything!"
- NEVER describe speech indirectly (e.g., "A merchant greets you" or "Someone calls for help")
- Every speaking NPC should have actual quoted words that reveal personality and plot

**CRITICAL: ACTION OPTIONS FORMATTING**
When providing choices to the player, you MUST format them as lettered options with bold action names:

Format: A. **Action Name**, brief description of what this choice involves

Examples:
- A. **Approach cautiously**, moving carefully to avoid detection while gathering information
- B. **Charge forward boldly**, relying on speed and surprise to overcome obstacles
- C. **Attempt to negotiate**, using your diplomatic skills to find a peaceful solution

This formatting is REQUIRED for the options to appear as clickable buttons in the game interface. Always include 2-3 options formatted this way at the end of your response.

TONE GUIDELINES:
- ${campaignTone === 'dark' ? 'Use atmospheric, tension-filled language. Emphasize danger and moral ambiguity.' : ''}
- ${campaignTone === 'lighthearted' ? 'Include moments of humor and whimsy. Keep things optimistic and fun.' : ''}
- ${campaignTone === 'epic' ? 'Use grand, inspiring language. Make the player feel heroic and destined for greatness.' : ''}
- ${campaignTone === 'balanced' ? 'Balance serious moments with lighter touches. Create realistic but hopeful atmosphere.' : ''}

FORMAT: Write 2-3 paragraphs in second person ("you"). End with a specific question about what the player wants to do, offering multiple viable options formatted as described above.

Remember: You're not just describing a scene - you're launching an epic story where the player is the hero. Make them excited to take their first action!`;

      const response = await model.generateContent(contextPrompt);
      const result = await response.response;
      return result.text();
    });

    logger.info('Successfully generated opening message');
    return result;
  } catch (error) {
    logger.error('Failed to generate opening message:', error);
    // Fallback generic opening
    return `Welcome to your adventure! You find yourself at the beginning of an epic journey. Your character stands ready to face whatever challenges lie ahead. What would you like to do?`;
  }
}
