/**
 * Campaign Image Generator Service
 *
 * Generates background images for campaign cards using AI image generation.
 * Creates dynamic prompts based on campaign attributes like genre, tone, setting, etc.
 *
 * @author AI Dungeon Master Team
 */

import { openRouterService, type UploadOptions } from './openrouter-service';

import logger from '@/lib/logger';

interface CampaignData {
  name: string;
  description?: string | null;
  genre?: string | null;
  difficulty_level?: string | null;
  campaign_length?: string | null;
  tone?: string | null;
  era?: string | null;
  location?: string | null;
  atmosphere?: string | null;
  setting_details?: unknown;
  thematic_elements?: unknown;
}

interface ImageGenerationOptions {
  retryAttempts?: number;
  fallbackToDefault?: boolean;
  storage?: UploadOptions;
  quality?: 'low' | 'medium' | 'high';
  model?: string;
}

/**
 * Service class for generating campaign background images
 */
export class CampaignImageGenerator {
  private maxRetries = 3;
  private defaultFallbackImage = '/card-background.jpeg';

  /**
   * Generate a background image for a campaign
   * @param campaignData - Campaign data to base the image on
   * @param options - Generation options
   * @returns Promise resolving to image URL
   */
  async generateCampaignImage(
    campaignData: CampaignData,
    options: ImageGenerationOptions = {},
  ): Promise<string> {
    const {
      retryAttempts = this.maxRetries,
      fallbackToDefault = true,
      quality = 'medium',
      model = 'google/gemini-2.5-flash-image-preview',
    } = options;

    try {
      const prompt = this.createImagePrompt(campaignData);
      logger.info('Generating campaign image with prompt:', prompt);

      const base64Image = await this.generateWithRetry(prompt, retryAttempts, quality, model);
      const imageUrl = await openRouterService.uploadImage(base64Image, options.storage);

      logger.info('Successfully generated campaign image');
      return imageUrl;
    } catch (error) {
      logger.error('Failed to generate campaign image:', error);

      if (fallbackToDefault) {
        logger.warn('Using fallback image due to generation failure');
        return this.defaultFallbackImage;
      }

      throw error;
    }
  }

  /**
   * Create a detailed image generation prompt based on campaign data
   * @param campaignData - Campaign attributes
   * @returns Formatted prompt string
   */
  private createImagePrompt(campaignData: CampaignData): string {
    const promptParts: string[] = [];

    // Start with base description including text overlay requirement
    promptParts.push(
      'Create a stunning D&D fantasy landscape background image suitable for a campaign card with the campaign title displayed prominently as text overlay.',
    );

    // Add specific text styling requirements
    promptParts.push(
      `The title "${campaignData.name}" should be displayed in bold, fantasy-style lettering at the top or center of the image, using a medieval or gothic font style with ornate decorative elements, glowing or metallic text effects, and high contrast against the background for excellent readability.`,
    );

    // Add genre-specific elements
    if (campaignData.genre) {
      promptParts.push(this.getGenrePrompt(campaignData.genre));
    }

    // Add location/setting details
    if (campaignData.location || campaignData.era) {
      const locationPrompt = this.getLocationPrompt(campaignData.location, campaignData.era);
      if (locationPrompt) promptParts.push(locationPrompt);
    }

    // Add atmosphere and tone
    if (campaignData.tone || campaignData.atmosphere) {
      promptParts.push(this.getTonePrompt(campaignData.tone, campaignData.atmosphere));
    }

    // Add difficulty-based intensity
    if (campaignData.difficulty_level) {
      promptParts.push(this.getDifficultyPrompt(campaignData.difficulty_level));
    }

    // Add thematic elements if available
    if (campaignData.thematic_elements) {
      promptParts.push(this.getThematicPrompt(campaignData.thematic_elements));
    }

    // Add technical requirements
    promptParts.push(
      'Style: Epic fantasy art, cinematic composition, rich colors, detailed environment.',
      'Format: Square 1:1 aspect ratio format suitable for card background with integrated title text overlay.',
      'Quality: High detail, professional digital art style, atmospheric lighting.',
      'Text Integration: The campaign title must be rendered as part of the image composition with proper typography, shadows, and effects that complement the fantasy theme.',
    );

    return promptParts.join(' ');
  }

  /**
   * Get genre-specific prompt elements
   */
  private getGenrePrompt(genre: string): string {
    const genreMap: Record<string, string> = {
      'high-fantasy':
        'Majestic medieval fantasy realm with castles, dragons, magical elements, enchanted forests.',
      'dark-fantasy':
        'Gothic dark fantasy landscape with ominous skies, twisted trees, mysterious ruins, shadowy atmosphere.',
      'urban-fantasy':
        'Modern city with magical elements, supernatural creatures, mystical energy flowing through urban environment.',
      steampunk:
        'Victorian-era landscape with brass machinery, airships, steam-powered technology, clockwork elements.',
      cyberpunk:
        'Futuristic neon-lit cityscape with holographic displays, cyber-enhanced architecture, digital rain effects.',
      'post-apocalyptic':
        'Desolate wasteland with crumbling ruins, overgrown vegetation, abandoned structures, harsh lighting.',
      'space-opera':
        'Epic space scene with distant planets, nebulae, starships, cosmic phenomena, alien architecture.',
      horror:
        'Eerie landscape with unsettling atmosphere, haunted locations, supernatural elements, foreboding mood.',
      mystery:
        'Atmospheric scene with hidden secrets, fog-shrouded environments, mysterious locations, investigation mood.',
      adventure:
        'Exciting landscape with exploration elements, hidden treasures, dangerous terrain, adventure spirit.',
    };

    return genreMap[genre.toLowerCase()] || `Fantasy landscape themed around ${genre}.`;
  }

  /**
   * Get location and era-specific prompt elements
   */
  private getLocationPrompt(location?: string | null, era?: string | null): string | null {
    if (!location && !era) return null;

    const parts: string[] = [];

    if (location) {
      const locationMap: Record<string, string> = {
        forest: 'Ancient mystical forest with towering trees, dappled sunlight, magical creatures.',
        mountains:
          'Majestic mountain range with snow-capped peaks, dramatic cliffs, alpine landscapes.',
        desert:
          'Vast desert landscape with rolling sand dunes, oasis, ancient ruins, golden light.',
        ocean:
          'Endless ocean with dramatic waves, mysterious islands, sea creatures, maritime elements.',
        city: 'Grand fantasy city with impressive architecture, bustling districts, magical lighting.',
        underground:
          'Underground cavern system with crystal formations, glowing minerals, subterranean beauty.',
        plains: 'Rolling grasslands with windswept fields, distant horizons, pastoral beauty.',
        swamp:
          'Mysterious swampland with twisted trees, murky water, ethereal mist, haunting atmosphere.',
      };
      parts.push(locationMap[location.toLowerCase()] || `Landscape set in ${location}.`);
    }

    if (era) {
      const eraMap: Record<string, string> = {
        medieval:
          'Medieval period with castles, knights, ancient architecture, historical authenticity.',
        renaissance:
          'Renaissance era with elegant architecture, artistic elements, refined aesthetics.',
        victorian:
          'Victorian period with ornate designs, industrial elements, steampunk influence.',
        modern: 'Contemporary setting with modern elements seamlessly blended with fantasy.',
        futuristic:
          'Advanced future technology integrated with magical elements, sci-fi fantasy fusion.',
        ancient: 'Ancient civilization with ruins, mysterious artifacts, lost empire aesthetics.',
        prehistoric:
          'Primordial landscape with untamed wilderness, ancient creatures, raw natural power.',
      };
      parts.push(eraMap[era.toLowerCase()] || `Set in the ${era} era.`);
    }

    return parts.join(' ');
  }

  /**
   * Get tone and atmosphere prompt elements
   */
  private getTonePrompt(tone?: string | null, atmosphere?: string | null): string {
    const parts: string[] = [];

    if (tone) {
      const toneMap: Record<string, string> = {
        heroic: 'Heroic and inspiring atmosphere with golden lighting, uplifting composition.',
        dark: 'Dark and brooding mood with dramatic shadows, ominous lighting.',
        mysterious: 'Mysterious ambiance with fog, hidden elements, enigmatic lighting.',
        lighthearted: 'Bright and cheerful atmosphere with vibrant colors, welcoming environment.',
        gritty: 'Gritty and realistic tone with weathered elements, harsh conditions.',
        epic: 'Epic grandeur with vast scale, dramatic composition, awe-inspiring elements.',
        romantic: 'Romantic atmosphere with soft lighting, beautiful scenery, enchanting mood.',
        comedic: 'Whimsical and playful elements with quirky details, amusing composition.',
      };
      parts.push(toneMap[tone.toLowerCase()] || `${tone} tone and mood.`);
    }

    if (atmosphere) {
      parts.push(`Atmospheric elements: ${atmosphere}.`);
    }

    return parts.join(' ');
  }

  /**
   * Get difficulty-based prompt elements
   */
  private getDifficultyPrompt(difficulty: string): string {
    const difficultyMap: Record<string, string> = {
      beginner: 'Welcoming and approachable landscape with bright, friendly atmosphere.',
      intermediate:
        'Moderately challenging terrain with balanced light and shadow, adventure elements.',
      advanced:
        'Treacherous landscape with dangerous elements, dramatic lighting, challenging terrain.',
      expert:
        'Extremely hostile environment with perilous conditions, intense dramatic atmosphere.',
    };

    return difficultyMap[difficulty.toLowerCase()] || 'Balanced adventure landscape.';
  }

  /**
   * Get thematic elements prompt
   */
  private getThematicPrompt(thematicElements: unknown): string {
    if (typeof thematicElements === 'string') {
      return `Incorporate thematic elements: ${thematicElements}.`;
    }

    if (Array.isArray(thematicElements)) {
      return `Include thematic elements: ${thematicElements.join(', ')}.`;
    }

    if (typeof thematicElements === 'object' && thematicElements !== null) {
      const elements = Object.values(thematicElements)
        .filter((value) => typeof value === 'string')
        .join(', ');
      return elements ? `Thematic elements: ${elements}.` : '';
    }

    return '';
  }

  /**
   * Generate image with retry logic
   */
  private async generateWithRetry(
    prompt: string,
    maxAttempts: number,
    quality: 'low' | 'medium' | 'high',
    model: string,
  ): Promise<string> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        logger.info(`Image generation attempt ${attempt}/${maxAttempts} using ${model}`);
        return await openRouterService.generateImage({
          prompt,
          quality,
          model,
        });
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        logger.warn(`Attempt ${attempt} failed:`, lastError.message);

        if (attempt < maxAttempts) {
          // Wait before retry with exponential backoff
          const waitTime = Math.pow(2, attempt - 1) * 1000;
          await new Promise((resolve) => setTimeout(resolve, waitTime));
        }
      }
    }

    throw lastError || new Error('All generation attempts failed');
  }
}

// Export singleton instance
export const campaignImageGenerator = new CampaignImageGenerator();
