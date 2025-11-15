/**
 * AI Enhancement Generator Service
 *
 * Integrates with Google Gemini to generate contextual enhancement options
 * for characters and campaigns based on user choices and preferences.
 */

import type { Campaign } from '@/types/campaign';
import type { Character } from '@/types/character';
import type { OptionSelection } from '@/types/enhancement-options';

import logger from '@/lib/logger';
import { EnhancementOption } from '@/types/enhancement-options';

interface AIGenerationContext {
  character?: Character;
  campaign?: Campaign;
  existingSelections?: OptionSelection[];
  userPreferences?: {
    tone?: 'serious' | 'humorous' | 'dramatic';
    complexity?: 'simple' | 'moderate' | 'complex';
    focus?: 'combat' | 'roleplay' | 'exploration' | 'social';
  };
}

interface AIGenerationRequest {
  optionId: string;
  prompt: string;
  context: AIGenerationContext;
  maxLength?: number;
  temperature?: number;
}

export class EnhancementAIGenerator {
  private static instance: EnhancementAIGenerator;
  private apiKey: string | null = null;

  private constructor() {
    // Initialize with environment variable or configuration
    this.apiKey = process.env.REACT_APP_GEMINI_API_KEY || null;
  }

  public static getInstance(): EnhancementAIGenerator {
    if (!EnhancementAIGenerator.instance) {
      EnhancementAIGenerator.instance = new EnhancementAIGenerator();
    }
    return EnhancementAIGenerator.instance;
  }

  /**
   * Generate AI-powered enhancement content
   */
  public async generateEnhancement(request: AIGenerationRequest): Promise<string> {
    if (!this.apiKey) {
      throw new Error('AI generation not available - API key not configured');
    }

    try {
      const enhancedPrompt = this.buildContextualPrompt(request);

      // Make API call to Gemini
      const response = await this.callGeminiAPI(enhancedPrompt, {
        temperature: request.temperature || 0.7,
        maxTokens: request.maxLength || 150,
      });

      return this.postProcessResponse(response, request.optionId);
    } catch (error) {
      logger.error('AI generation failed:', error);
      throw new Error('Failed to generate AI content. Please try again.');
    }
  }

  /**
   * Generate multiple AI suggestions for an option
   */
  public async generateMultipleSuggestions(
    request: AIGenerationRequest,
    count: number = 3,
  ): Promise<string[]> {
    const suggestions: string[] = [];

    for (let i = 0; i < count; i++) {
      try {
        const suggestion = await this.generateEnhancement({
          ...request,
          temperature: 0.8 + i * 0.1, // Vary temperature for diversity
        });
        suggestions.push(suggestion);
      } catch (error) {
        logger.warn(`Failed to generate suggestion ${i + 1}:`, error);
      }
    }

    return suggestions;
  }

  /**
   * Generate contextual recommendations based on current selections
   */
  public async generateRecommendations(
    context: AIGenerationContext,
    category: 'character' | 'campaign',
  ): Promise<string[]> {
    const prompt = this.buildRecommendationPrompt(context, category);

    try {
      const response = await this.callGeminiAPI(prompt, {
        temperature: 0.6,
        maxTokens: 200,
      });

      // Parse response into individual recommendations
      return response
        .split('\n')
        .filter((line) => line.trim())
        .map((line) => line.replace(/^\d+\.\s*/, '').trim())
        .slice(0, 5);
    } catch (error) {
      logger.error('Failed to generate recommendations:', error);
      return [];
    }
  }

  /**
   * Build contextual prompt with character/campaign information
   */
  private buildContextualPrompt(request: AIGenerationRequest): string {
    const { prompt, context } = request;
    let enhancedPrompt = prompt;

    // Replace template variables with actual context
    if (context.character) {
      enhancedPrompt = enhancedPrompt
        .replace(/{characterClass}/g, context.character.class?.name || 'Adventurer')
        .replace(/{characterRace}/g, context.character.race?.name || 'Human')
        .replace(/{characterBackground}/g, context.character.background?.name || 'Unknown');
    }

    if (context.campaign) {
      enhancedPrompt = enhancedPrompt
        .replace(/{campaignTheme}/g, context.campaign.genre || 'fantasy')
        .replace(/{campaignTone}/g, context.campaign.tone || 'balanced');
    }

    // Add contextual information
    const contextInfo = this.buildContextInfo(context);
    if (contextInfo) {
      enhancedPrompt += `\n\nAdditional Context: ${contextInfo}`;
    }

    // Add formatting instructions
    enhancedPrompt += `\n\nInstructions:
- Provide a single, creative ${request.optionId.includes('character') ? 'character trait' : 'campaign element'}
- Keep it concise but evocative (1-2 sentences)
- Make it unique and memorable
- Ensure it enhances gameplay without breaking game balance
- Avoid overpowered or game-breaking elements`;

    return enhancedPrompt;
  }

  /**
   * Build context information string
   */
  private buildContextInfo(context: AIGenerationContext): string {
    const info: string[] = [];

    if (context.character) {
      const char = context.character;
      if (char.level) info.push(`Level ${char.level}`);
      if (char.alignment) info.push(`${char.alignment} alignment`);
      if (char.personalityTraits?.length) {
        info.push(`Personality: ${char.personalityTraits.join(', ')}`);
      }
    }

    if (context.campaign) {
      const camp = context.campaign;
      if (camp.difficulty_level) info.push(`${camp.difficulty_level} difficulty`);
      if (camp.campaign_length) info.push(`${camp.campaign_length} campaign`);
      if (camp.setting?.atmosphere) info.push(`${camp.setting.atmosphere} atmosphere`);
    }

    if (context.existingSelections?.length) {
      const selectionTypes = context.existingSelections
        .map((s) => s.optionId)
        .slice(0, 3)
        .join(', ');
      info.push(`Existing enhancements: ${selectionTypes}`);
    }

    if (context.userPreferences) {
      const prefs = context.userPreferences;
      if (prefs.tone) info.push(`Preferred tone: ${prefs.tone}`);
      if (prefs.focus) info.push(`Focus: ${prefs.focus}`);
    }

    return info.join('. ');
  }

  /**
   * Build recommendation prompt
   */
  private buildRecommendationPrompt(
    context: AIGenerationContext,
    category: 'character' | 'campaign',
  ): string {
    const basePrompt =
      category === 'character'
        ? 'Suggest enhancement options for this D&D character that would create interesting roleplay opportunities and complement their build:'
        : 'Suggest campaign enhancement elements that would create an engaging and memorable tabletop RPG experience:';

    const contextInfo = this.buildContextInfo(context);

    return `${basePrompt}

${contextInfo}

Provide 3-5 specific enhancement suggestions, each on a new line. Focus on:
- Unique and creative elements
- Balanced gameplay impact
- Rich storytelling potential
- Memorable and evocative details`;
  }

  /**
   * Mock API call (replace with actual Gemini integration)
   */
  private async callGeminiAPI(
    prompt: string,
    options: { temperature: number; maxTokens: number },
  ): Promise<string> {
    // For now, return mock responses based on prompt content
    // In production, this would make actual API calls to Google Gemini

    await new Promise((resolve) => setTimeout(resolve, 1000 + Math.random() * 1000));

    // Mock responses based on prompt keywords
    if (prompt.includes('quirk') || prompt.includes('personality')) {
      const quirks = [
        'Always hums the same tune when concentrating, a melody learned from a mysterious street performer in their youth',
        'Keeps a small journal where they write down the "last words" of defeated enemies, believing it honors their memory',
        'Has an unusual compulsion to taste everything once before eating, claiming it helps them "understand the essence" of food',
        'Speaks to their shadow as if it were a separate entity, occasionally asking it for advice in difficult situations',
        'Collects small, smooth stones from every place they visit, arranging them in precise geometric patterns when making camp',
      ];
      return quirks[Math.floor(Math.random() * quirks.length)];
    }

    if (prompt.includes('mystery') || prompt.includes('campaign')) {
      const mysteries = [
        'Strange crystalline formations have begun appearing overnight in populated areas, and anyone who touches them experiences vivid dreams of a forgotten civilization',
        'The local wildlife has started exhibiting organized, almost intelligent behavior, as if responding to some unseen coordinator',
        'People throughout the region report the same recurring dream of a massive door deep underground, and some have begun sleepwalking toward a specific location',
        'Ancient coins bearing unknown symbols keep appearing in marketplaces, but no one remembers spending or receiving them',
        "The stars have begun forming new constellations that somehow feel familiar, as if they're trying to communicate a long-lost message",
      ];
      return mysteries[Math.floor(Math.random() * mysteries.length)];
    }

    if (prompt.includes('recommendation') || prompt.includes('suggest')) {
      const recommendations = [
        'A unique magical quirk that manifests under stress',
        'A mysterious connection to an ancient organization',
        'An unusual pet or companion with special abilities',
        'A secret skill learned during a forgotten adventure',
        'A prophetic dream that guides important decisions',
      ];
      return recommendations.join('\n');
    }

    // Default response
    return "A mysterious trait that adds depth and intrigue to your character's story, creating new opportunities for adventure and roleplay.";
  }

  /**
   * Post-process and clean up AI response
   */
  private postProcessResponse(response: string, optionId: string): string {
    // Clean up the response
    let cleaned = response.trim();

    // Remove any leading numbers or bullets
    cleaned = cleaned.replace(/^\d+\.\s*/, '');
    cleaned = cleaned.replace(/^[-*]\s*/, '');

    // Ensure proper capitalization
    cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);

    // Ensure it ends with proper punctuation
    if (!/[.!?]$/.test(cleaned)) {
      cleaned += '.';
    }

    // Length validation
    if (cleaned.length < 10) {
      throw new Error('Generated content too short');
    }

    if (cleaned.length > 300) {
      cleaned = cleaned.substring(0, 297) + '...';
    }

    return cleaned;
  }
}

// Export singleton instance
export const enhancementAI = EnhancementAIGenerator.getInstance();
