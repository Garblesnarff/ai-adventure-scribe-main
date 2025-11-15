/**
 * Character Image Generator Service
 *
 * Generates character portraits and design sheets using AI image generation based on D&D character data.
 * Creates detailed prompts from race, class, description, background, equipment, and personality information.
 *
 * @author AI Dungeon Master Team
 * @version 2.0 - Added dynamic theme support and detailed character sheet generation
 */

import { geminiImageService } from './gemini-image-service';
import { openRouterService, type UploadOptions } from './openrouter-service';

import logger from '@/lib/logger';
import {
  buildCharacterImagePrompt,
  type CharacterPromptData,
  type ImagePromptOptions,
} from '@/services/prompts/characterPrompts';

enum ImageGenerationProvider {
  GEMINI_DIRECT = 'gemini-direct',
  OPENROUTER_PAID = 'openrouter-paid',
}

interface CharacterImageOptions {
  retryAttempts?: number;
  fallbackToDefault?: boolean;
  style?: 'portrait' | 'action' | 'full-body' | 'character-sheet' | 'expression-sheet';
  artStyle?:
    | 'fantasy-art'
    | 'anime'
    | 'realistic'
    | 'comic-book'
    | 'watercolor'
    | 'sketch'
    | 'oil-painting';
  theme?: string; // Theme override for generation
  quality?: 'low' | 'medium' | 'high'; // Image quality setting
  model?: string; // Model override (defaults to gpt-image-1-mini)
  preferredProvider?: ImageGenerationProvider;
  storage?: UploadOptions; // optional storage scoping
}

/**
 * Service class for generating character images and design sheets
 */
export class CharacterImageGenerator {
  private maxRetries = 3;
  private defaultFallbackImage = '/default-character-avatar.png';

  /**
   * Generate character avatar (portrait) image
   * @param characterData - Character data to base the avatar on
   * @param options - Generation options
   * @returns Promise resolving to base64 encoded image data
   */
  async generateAvatarImage(
    characterData: CharacterPromptData,
    options: Omit<CharacterImageOptions, 'style'> = {},
  ): Promise<string> {
    const {
      retryAttempts = this.maxRetries,
      artStyle = 'fantasy-art',
      theme = characterData.theme || 'fantasy',
      preferredProvider,
    } = options;

    logger.info(`Generating avatar portrait with theme: ${theme}, artStyle: ${artStyle}`);

    const prompt = this.createImagePrompt(characterData, 'portrait', artStyle, theme);
    logger.debug('Generated avatar prompt:', prompt);

    /* DEPRECATED: Removed gpt-image-1-mini attempt (using OpenRouter only) */

    const providerOrder = this.getProviderOrder(preferredProvider, 'portrait');
    let lastError: Error | null = null;

    for (const provider of providerOrder) {
      try {
        logger.info(`Attempting avatar generation with provider: ${provider}`);
        const base64Image = await this.generateWithProvider(prompt, provider, retryAttempts);
        logger.info(`Successfully generated avatar with provider: ${provider}`);
        return base64Image;
      } catch (error) {
        logger.warn(`Provider ${provider} failed:`, error);
        lastError = error instanceof Error ? error : new Error(String(error));
        continue;
      }
    }

    throw lastError || new Error('All image generation providers failed for avatar');
  }

  /**
   * Generate character image or design sheet with intelligent provider fallbacks
   * @param characterData - Character data to base the image on
   * @param options - Generation options including style and theme
   * @param referenceImageBase64 - Optional base64 reference image (e.g., avatar)
   * @returns Promise resolving to image URL
   */
  async generateCharacterImage(
    characterData: CharacterPromptData,
    options: CharacterImageOptions = {},
    referenceImageBase64?: string,
  ): Promise<string> {
    const {
      retryAttempts = this.maxRetries,
      fallbackToDefault = true,
      style = 'portrait',
      artStyle = 'fantasy-art',
      theme = characterData.theme || options.theme || 'fantasy', // Use character theme, options theme, or default
      preferredProvider,
    } = options;

    logger.info(`Generating ${style} with theme: ${theme}, artStyle: ${artStyle}`);

    const prompt = this.createImagePrompt(characterData, style, artStyle, theme);
    logger.debug('Generated prompt:', prompt);

    /* DEPRECATED: Removed gpt-image-1-mini attempt (using OpenRouter only) */

    // Determine the provider order based on preference and availability
    const providerOrder = this.getProviderOrder(preferredProvider, style);

    let lastError: Error | null = null;

    // Try each provider in order
    for (const provider of providerOrder) {
      try {
        logger.info(`Attempting image generation with provider: ${provider}`);
        const base64Image = await this.generateWithProvider(
          prompt,
          provider,
          retryAttempts,
          referenceImageBase64,
        );
        const imageUrl = await openRouterService.uploadImage(base64Image, options.storage);

        logger.info(`Successfully generated character image with provider: ${provider}`);
        return imageUrl;
      } catch (error) {
        logger.warn(`Provider ${provider} failed:`, error);
        lastError = error instanceof Error ? error : new Error(String(error));

        // Continue to next provider
        continue;
      }
    }

    // All providers failed
    logger.error('All image generation providers failed. Last error:', lastError);

    if (fallbackToDefault) {
      logger.warn('Using fallback image due to all providers failing');
      return this.defaultFallbackImage;
    }

    throw lastError || new Error('All image generation providers failed');
  }

  /**
   * Determine the order of providers to try based on preference and availability
   * @param preferredProvider - Optional preferred provider
   * @param style - Image style (affects quality requirements)
   * @returns Array of providers in order of preference
   */
  private getProviderOrder(
    preferredProvider?: ImageGenerationProvider,
    style?: string,
  ): ImageGenerationProvider[] {
    const allProviders = [
      ImageGenerationProvider.GEMINI_DIRECT,
      ImageGenerationProvider.OPENROUTER_PAID,
    ];

    if (preferredProvider) {
      // Put preferred provider first, then others
      const others = allProviders.filter((p) => p !== preferredProvider);
      return [preferredProvider, ...others];
    }

    // For high-quality needs (cards, sheets), prefer OpenRouter paid (Gemini 2.5)
    // For avatars/portraits, use free Gemini 2.0 first
    const needsHighQuality =
      style && ['character-sheet', 'expression-sheet', 'full-body', 'action'].includes(style);

    if (needsHighQuality) {
      return [
        ImageGenerationProvider.OPENROUTER_PAID, // Gemini 2.5 - Best quality for cards/sheets
        ImageGenerationProvider.GEMINI_DIRECT, // Gemini 2.0 - Fallback if paid fails
      ];
    }

    // Default for portraits/avatars: try free first
    return [
      ImageGenerationProvider.GEMINI_DIRECT, // Free with Gemini API (500/day) - Good for avatars
      ImageGenerationProvider.OPENROUTER_PAID, // Paid fallback - Better quality if needed
    ];
  }

  /**
   * Generate image using a specific provider
   * @param prompt - Image generation prompt
   * @param provider - Provider to use
   * @param retryAttempts - Number of retry attempts
   * @param referenceImageBase64 - Optional reference image
   * @returns Promise resolving to base64 encoded image data
   */
  private async generateWithProvider(
    prompt: string,
    provider: ImageGenerationProvider,
    retryAttempts: number,
    referenceImageBase64?: string,
  ): Promise<string> {
    switch (provider) {
      case ImageGenerationProvider.GEMINI_DIRECT:
        return this.generateWithGeminiDirect(prompt, retryAttempts, referenceImageBase64);

      case ImageGenerationProvider.OPENROUTER_PAID:
        return this.generateWithOpenRouterPaid(prompt, retryAttempts, referenceImageBase64);

      default:
        throw new Error(`Unknown provider: ${provider}`);
    }
  }

  /**
   * Generate image using Gemini direct API
   * @param prompt - Image generation prompt
   * @param retryAttempts - Number of retry attempts
   * @param referenceImageBase64 - Optional reference image
   * @returns Promise resolving to base64 encoded image data
   */
  private async generateWithGeminiDirect(
    prompt: string,
    retryAttempts: number,
    referenceImageBase64?: string,
  ): Promise<string> {
    if (!geminiImageService.canUseFreeToday()) {
      throw new Error(
        `Gemini free tier exhausted for today. Remaining: ${geminiImageService.getRemainingFreeRequests()}`,
      );
    }

    for (let attempt = 1; attempt <= retryAttempts; attempt++) {
      try {
        const base64Image = await geminiImageService.generateImage({
          prompt,
          referenceImage: referenceImageBase64,
        });
        return base64Image;
      } catch (error) {
        logger.warn(`Gemini direct attempt ${attempt}/${retryAttempts} failed:`, error);

        if (attempt === retryAttempts) {
          throw error;
        }

        // Wait before retry (exponential backoff)
        await new Promise((resolve) => setTimeout(resolve, 1000 * Math.pow(2, attempt - 1)));
      }
    }

    throw new Error('Max retries exceeded for Gemini direct');
  }

  /**
   * Generate image using OpenRouter paid tier
   * @param prompt - Image generation prompt
   * @param retryAttempts - Number of retry attempts
   * @param referenceImageBase64 - Optional reference image for style consistency
   * @returns Promise resolving to base64 encoded image data
   */
  private async generateWithOpenRouterPaid(
    prompt: string,
    retryAttempts: number,
    referenceImageBase64?: string,
  ): Promise<string> {
    for (let attempt = 1; attempt <= retryAttempts; attempt++) {
      try {
        // Use paid model directly
        const base64Image = await openRouterService.generateImage({
          prompt,
          model: 'google/gemini-2.5-flash-image-preview',
          referenceImage: referenceImageBase64,
        });
        return base64Image;
      } catch (error) {
        logger.warn(`OpenRouter paid attempt ${attempt}/${retryAttempts} failed:`, error);

        if (attempt === retryAttempts) {
          throw error;
        }

        // Wait before retry (exponential backoff)
        await new Promise((resolve) => setTimeout(resolve, 1000 * Math.pow(2, attempt - 1)));
      }
    }

    throw new Error('Max retries exceeded for OpenRouter paid');
  }

  /**
   * Create a detailed character image prompt based on character data
   * @param characterData - Character attributes
   * @param style - Image composition style
   * @param artStyle - Art style preference
   * @param theme - Theme for design sheet (fantasy, cyberpunk, sci-fi, etc.)
   * @returns Formatted prompt string
   */
  private createImagePrompt(
    characterData: CharacterPromptData,
    style: string,
    artStyle: string,
    theme: string,
  ): string {
    return buildCharacterImagePrompt(characterData, {
      style: style as ImagePromptOptions['style'],
      artStyle: artStyle as ImagePromptOptions['artStyle'],
      theme,
    });
  }
}

// Export singleton instance
export const characterImageGenerator = new CharacterImageGenerator();
