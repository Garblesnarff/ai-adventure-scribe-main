/**
 * Character Background Generator Service
 *
 * Generates background images for character cards using AI image generation.
 * Creates dynamic prompts based on character attributes like race, class, description, etc.
 *
 * @author AI Dungeon Master Team
 */

import { openRouterService } from './openrouter-service';
import { Character } from '@/types/character';

interface ImageGenerationOptions {
  retryAttempts?: number;
  fallbackToDefault?: boolean;
}

/**
 * Service class for generating character background images
 */
export class CharacterBackgroundGenerator {
  private maxRetries = 3;
  private defaultFallbackImage = '/card-background.jpeg';

  /**
   * Generate a background image for a character
   * @param character - Character data to base the image on
   * @param options - Generation options
   * @returns Promise resolving to image URL
   */
  async generateCharacterBackground(
    character: Character,
    options: ImageGenerationOptions = {}
  ): Promise<string> {
    const { retryAttempts = this.maxRetries, fallbackToDefault = true } = options;

    try {
      const prompt = this.createImagePrompt(character);
      console.log('Generating character background with prompt:', prompt);

      const base64Image = await this.generateWithRetry(prompt, retryAttempts);
      const imageUrl = await openRouterService.uploadImage(base64Image);

      console.log('Successfully generated character background');
      return imageUrl;

    } catch (error) {
      console.error('Failed to generate character background:', error);

      if (fallbackToDefault) {
        console.log('Using fallback image due to generation failure');
        return this.defaultFallbackImage;
      }

      throw error;
    }
  }

  /**
   * Create a detailed image generation prompt based on character data
   * @param character - Character attributes
   * @returns Formatted prompt string
   */
  private createImagePrompt(character: Character): string {
    const promptParts: string[] = [];

    // Base request for character-focused 1:1 image
    promptParts.push("Can i get a 1:1 image of my D&D character:");

    // Add character description (core element)
    const characterDescription = character.description?.trim() ||
      this.createFallbackDescription(character);
    promptParts.push(characterDescription);

    // Add fitting background request
    promptParts.push("Can i get a fitting background for this character");

    // Add prominent text overlay requirements
    const name = character.name || 'Unknown Adventurer';
    const race = character.race?.name || 'mysterious';
    const characterClass = character.class?.name || 'adventurer';

    promptParts.push(`Can i get its name "${name}", race "${race}", and class "${characterClass}" displayed prominently on the image.`);

    // Style and technical requirements
    promptParts.push(
      "Style: Epic fantasy portrait background art, cinematic composition, rich colors, detailed environment.",
      "Format: Square 1:1 aspect ratio format suitable for card background with integrated character information text overlay.",
      "Quality: High detail, professional digital art style, atmospheric lighting.",
      "Text Integration: The character's name, race, and class must be rendered clearly as part of the image composition with proper typography, shadows, and effects that complement the fantasy theme.",
      "Composition: Focus on the character as the main subject, with background elements that enhance their personality and background."
    );

    return promptParts.join('\n\n');
  }

  /**
   * Create fallback description when character description is missing
   * @param character - Character data
   * @returns Generated fallback description
   */
  private createFallbackDescription(character: Character): string {
    const parts: string[] = [];

    const race = character.race?.name || 'mysterious';
    const className = character.class?.name || 'adventurer';
    const background = character.background?.name || character.background;
    const level = character.level || 1;

    parts.push(`A level ${level} ${race} ${className} with ${this.getAbilitySummary(character)} abilities.`);

    if (background) {
      parts.push(`They come from a ${background} background and have the following proficiencies: ${this.getProficienciesSummary(character)}.`);
    }

    if (character.alignment) {
      parts.push(`This character's alignment is ${character.alignment}, giving them a distinct personality and moral compass.`);
    }

    if (character.personality_traits || character.appearance) {
      const traits: string[] = [];
      if (character.personality_traits) traits.push(`personality: ${character.personality_traits}`);
      if (character.appearance) traits.push(`appearance: ${character.appearance}`);
      parts.push(`They are known for their ${traits.join(' and ')}.`);
    }

    return parts.join(' ');
  }

  /**
   * Get ability scores summary for fallback description
   */
  private getAbilitySummary(character: Character): string {
    if (!character.abilityScores) return 'balanced';

    const abilities = character.abilityScores;
    const modifiers: string[] = [];

    // Only include notable modifiers (4+)
    if (abilities.strength.modifier >= 4) modifiers.push('strong');
    if (abilities.dexterity.modifier >= 4) modifiers.push('nimble');
    if (abilities.constitution.modifier >= 4) modifiers.push('tough');
    if (abilities.intelligence.modifier >= 4) modifiers.push('intelligent');
    if (abilities.wisdom.modifier >= 4) modifiers.push('wise');
    if (abilities.charisma.modifier >= 4) modifiers.push('charismatic');

    return modifiers.length > 0 ? modifiers.slice(0, 2).join(' and ') : 'balanced';
  }

  /**
   * Get proficiencies summary for fallback description
   */
  private getProficienciesSummary(character: Character): string {
    const profs: string[] = [];

    if (character.skillProficiencies?.length) {
      profs.push(`skills in ${character.skillProficiencies.slice(0, 3).join(', ')}`);
    }

    if (character.toolProficiencies?.length) {
      profs.push(`tools including ${character.toolProficiencies.slice(0, 2).join(', ')}`);
    }

    if (character.languages?.length) {
      profs.push(`languages: ${character.languages.slice(0, 3).join(', ')}`);
    }

    return profs.length > 0 ? profs.join(', and ') : 'various skills';
  }

  /**
   * Generate image with retry logic
   */
  private async generateWithRetry(prompt: string, maxAttempts: number): Promise<string> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        console.log(`Background generation attempt ${attempt}/${maxAttempts}`);
        return await openRouterService.generateImage({ prompt });
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        console.warn(`Attempt ${attempt} failed:`, lastError.message);

        if (attempt < maxAttempts) {
          // Wait before retry with exponential backoff
          const waitTime = Math.pow(2, attempt - 1) * 1000;
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      }
    }

    throw lastError || new Error('All generation attempts failed');
  }
}

// Export singleton instance
export const characterBackgroundGenerator = new CharacterBackgroundGenerator();
