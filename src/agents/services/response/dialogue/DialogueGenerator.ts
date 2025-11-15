/**
 * Dialogue Generator
 *
 * This file defines the DialogueGenerator class, responsible for creating
 * contextual and initial dialogue snippets for NPCs based on player character
 * details, NPC personality, and conversation history.
 *
 * Main Class:
 * - DialogueGenerator: Generates NPC dialogue.
 *
 * Key Dependencies:
 * - Character type (from `@/types/character`)
 * - DialogueHistory type (from `@/types/dialogue`)
 *
 * @author AI Dungeon Master Team
 */

// Project Types
import { Character } from '@/types/character';
import { DialogueHistory } from '@/types/dialogue';

export class DialogueGenerator {
  generateContextualDialogue(
    lastPlayerMessage: string,
    npcPersonality: string,
    character: Character,
    history: DialogueHistory[],
  ): string {
    const responseOptions = [
      `"Interesting perspective, ${character.name}. Tell me more about your adventures."`,
      `"I've never met a ${character.race?.name} ${character.class?.name} before. Your presence here is... intriguing."`,
      `"These are dangerous times. Someone with your abilities could be quite useful..."`,
      `"Perhaps you'd be interested in helping us with a certain... situation?"`,
    ];

    return responseOptions[Math.floor(Math.random() * responseOptions.length)];
  }

  generateInitialDialogue(character: Character): string {
    const dialogueOptions = [
      `"We don't see many ${character.race?.name}s in these parts," a local remarks with interest.`,
      `"A wielder of the arcane arts? These are... interesting times," a merchant muses quietly.`,
      `"Welcome to our humble village," the guard says, though their eyes betray a mix of wonder and unease.`,
      `"Perhaps you're here about the... recent troubles?" an elderly villager asks cryptically.`,
    ];

    return dialogueOptions[Math.floor(Math.random() * dialogueOptions.length)];
  }
}
