/**
 * Character Background Generator Service
 *
 * Generates character card backgrounds using AI image generation with reference to character sheet.
 * Creates themed card backgrounds with character integration and text overlay.
 *
 * @author AI Dungeon Master Team
 * @version 2.1 - Added reference image support with text overlay
 */

import { openRouterService } from './openrouter-service';

import type { Character } from '@/types/character';

import logger from '@/lib/logger';

interface ImageGenerationOptions {
  retryAttempts?: number;
  fallbackToDefault?: boolean;
  referenceImageUrl?: string;
  useSimplifiedPrompt?: boolean;
}

/**
 * Service class for generating character card backgrounds
 */
export class CharacterBackgroundGenerator {
  private maxRetries = 2;
  private defaultFallbackImage = '/card-background.jpeg';

  /**
   * Generate a character card background using the character sheet as reference
   * @param character - Character data to base the card on
   * @param options - Generation options
   * @returns Promise resolving to image URL
   */
  async generateCharacterBackground(
    character: Character,
    options: ImageGenerationOptions = {},
  ): Promise<string> {
    const {
      retryAttempts = this.maxRetries,
      fallbackToDefault = true,
      referenceImageUrl,
    } = options;

    try {
      logger.info(
        'Generating character card background with reference image:',
        referenceImageUrl ? 'yes' : 'no',
      );

      const prompt = this.createImagePrompt(character, !!referenceImageUrl);
      logger.debug('Background generation prompt:', prompt);

      let referenceImageBase64: string | undefined;

      // Convert reference image URL to base64 if provided
      if (referenceImageUrl) {
        try {
          referenceImageBase64 = await this.convertImageUrlToBase64(referenceImageUrl);
          logger.info('Successfully converted reference character sheet to base64');
        } catch (error) {
          logger.warn(
            'Failed to convert reference image to base64, proceeding without vision input:',
            error,
          );
        }
      }

      const base64Image = await this.generateWithRetry(prompt, retryAttempts, referenceImageBase64);
      const imageUrl = await openRouterService.uploadImage(base64Image);

      logger.info('Successfully generated character card background');
      return imageUrl;
    } catch (error) {
      logger.error('Failed to generate character background:', error);

      if (fallbackToDefault) {
        logger.warn('Using fallback image due to generation failure');
        return this.defaultFallbackImage;
      }

      throw error;
    }
  }

  /**
   * Create image generation prompt for character card background
   * @param character - Character attributes
   * @param hasReferenceImage - Whether a reference image is being used
   * @returns Formatted prompt string
   */
  private createImagePrompt(character: Character, hasReferenceImage: boolean = false): string {
    const promptParts: string[] = [];

    const name = character.name || 'Unknown Adventurer';
    const race = character.race?.name || 'mysterious';
    const characterClass = character.class?.name || 'adventurer';

    if (hasReferenceImage) {
      // Vision-enabled prompt: Use reference character sheet image
      promptParts.push(
        'Using the provided character sheet image as reference, generate a complete fantasy character card.',
        'The reference image shows the character from multiple angles with detailed design.',
        `The character is ${name}, a ${race} ${characterClass}.`,
        'Create a square card background (1:1 aspect ratio) with the character centered.',
        'Place the character from the reference image in the center of the card.',
        "Add a thematic fantasy background that complements the character's race and class.",
        "Include elegant text overlay at the bottom: '[name]' on the first line, '[race] [class]' on the second line.",
        'Use fantasy-style typography with subtle glow or shadow effects.',
        'The text should be readable and match the fantasy theme without overwhelming the character.',
        'Background should frame the character without distracting from them - subtle mystical elements, atmospheric lighting.',
        'Ensure the final image is a complete character card ready for display.',
      );

      // Theme based on race/class
      if (race.includes('elf')) {
        promptParts.push(
          'Theme: Mystical forest or ancient elven architecture with soft glowing lights',
        );
      } else if (race.includes('dwarf')) {
        promptParts.push('Theme: Stone mountain hall or forge with warm torchlight');
      } else if (characterClass.includes('wizard') || characterClass.includes('sorcerer')) {
        promptParts.push('Theme: Arcane library or magical ritual circle with floating runes');
      } else if (characterClass.includes('barbarian') || characterClass.includes('fighter')) {
        promptParts.push('Theme: Rugged wilderness camp or ancient battleground ruins');
      } else {
        promptParts.push('Theme: Classic fantasy landscape with mystical elements');
      }
    } else {
      // Text-only prompt for fallback
      promptParts.push(
        `Create a complete fantasy character card for ${name}, a ${race} ${characterClass}`,
        'Square 1:1 aspect ratio card format.',
        'Center a fantasy character illustration matching the description.',
        'Add thematic background appropriate for race and class.',
        "Include text overlay: '[name]' on first line, '[race] [class]' on second line in elegant fantasy font.",
        'Professional fantasy card art style with atmospheric lighting.',
      );
    }

    // Common style requirements
    promptParts.push(
      'Style: Epic fantasy character card art, high detail, professional digital illustration.',
      'Composition: Character centered, text at bottom, balanced design.',
      'Quality: High resolution, rich colors, atmospheric lighting, no artifacts.',
      'Format: Square 1:1 aspect ratio, suitable for card display.',
    );

    return promptParts.join('\n\n');
  }

  /**
   * Generate image with retry logic
   */
  private async generateWithRetry(
    prompt: string,
    maxAttempts: number,
    referenceImage?: string,
  ): Promise<string> {
    let lastError: Error | null = null;
    const chosenModel = 'google/gemini-2.5-flash-image-preview';

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        logger.info(`Card background generation attempt ${attempt}/${maxAttempts}`);

        // Use vision-capable model first; include reference image when available
        const base64Image = await openRouterService.generateImage({
          prompt,
          model: chosenModel,
          ...(referenceImage ? { referenceImage } : {}),
        });

        return base64Image;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        logger.warn(`Attempt ${attempt} failed:`, lastError.message);

        if (attempt < maxAttempts) {
          /* DEPRECATED: Removed fallback to gpt-image-1-mini (using OpenRouter only) */
          const waitTime = Math.pow(2, attempt - 1) * 1000;
          await new Promise((resolve) => setTimeout(resolve, waitTime));
        }
      }
    }

    throw lastError || new Error('All generation attempts failed');
  }

  /**
   * Convert image URL to base64 encoded string
   * @param imageUrl - URL of the image to convert
   * @returns Promise resolving to base64 encoded string (without data URL prefix)
   */
  private async convertImageUrlToBase64(imageUrl: string): Promise<string> {
    try {
      const response = await fetch(imageUrl);

      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
      }

      const blob = await response.blob();

      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const dataUrl = reader.result as string;
          const base64Data = dataUrl.split(',')[1];
          resolve(base64Data);
        };
        reader.onerror = () => reject(new Error('Failed to convert image to base64'));
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      logger.error('Error converting image URL to base64:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const characterBackgroundGenerator = new CharacterBackgroundGenerator();
