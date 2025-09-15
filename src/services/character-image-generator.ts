/**
 * Character Image Generator Service
 * 
 * Generates character portraits using AI image generation based on D&D character data.
 * Creates detailed prompts from race, class, description, and background information.
 * 
 * @author AI Dungeon Master Team
 */

import { openRouterService } from './openrouter-service';
import { geminiImageService } from './gemini-image-service';

enum ImageGenerationProvider {
  GEMINI_DIRECT = 'gemini-direct',
  OPENROUTER_PAID = 'openrouter-paid'
}

interface CharacterData {
  name: string;
  description?: string | null;
  race?: string | null;
  class?: string | null;
  background?: string | null;
  level?: number | null;
  ability_scores?: any;
  appearance?: string | null;
  personality_traits?: string | null;
  personality_notes?: string | null;
  alignment?: string | null;
  enhancementSelections?: Array<{
    optionId: string;
    value: string | string[] | number;
    customValue?: string;
    aiGenerated?: boolean;
  }>;
  enhancementEffects?: {
    traits?: string[];
    skillBonus?: string[];
    abilityBonus?: Record<string, number>;
    languages?: string[];
    equipment?: string[];
  };
}

interface CharacterImageOptions {
  retryAttempts?: number;
  fallbackToDefault?: boolean;
  style?: 'portrait' | 'action' | 'full-body' | 'character-sheet' | 'expression-sheet';
  artStyle?: 'fantasy-art' | 'anime' | 'realistic' | 'comic-book' | 'watercolor' | 'sketch' | 'oil-painting';
  preferredProvider?: ImageGenerationProvider;
}

/**
 * Service class for generating character portrait images
 */
export class CharacterImageGenerator {
  private maxRetries = 3;
  private defaultFallbackImage = '/default-character-avatar.png';

  /**
   * Generate a portrait image for a D&D character with intelligent provider fallbacks
   * @param characterData - Character data to base the image on
   * @param options - Generation options
   * @returns Promise resolving to image URL
   */
  async generateCharacterImage(
    characterData: CharacterData,
    options: CharacterImageOptions = {}
  ): Promise<string> {
    const {
      retryAttempts = this.maxRetries,
      fallbackToDefault = true,
      style = 'portrait',
      artStyle = 'fantasy-art',
      preferredProvider
    } = options;

    const prompt = this.createImagePrompt(characterData, style, artStyle);
    console.log('Generating character image with prompt:', prompt);

    // Determine the provider order based on preference and availability
    const providerOrder = this.getProviderOrder(preferredProvider);

    let lastError: Error | null = null;

    // Try each provider in order
    for (const provider of providerOrder) {
      try {
        console.log(`Attempting image generation with provider: ${provider}`);
        const base64Image = await this.generateWithProvider(prompt, provider, retryAttempts);
        const imageUrl = await openRouterService.uploadImage(base64Image);

        console.log(`Successfully generated character image with provider: ${provider}`);
        return imageUrl;

      } catch (error) {
        console.warn(`Provider ${provider} failed:`, error);
        lastError = error instanceof Error ? error : new Error(String(error));

        // Continue to next provider
        continue;
      }
    }

    // All providers failed
    console.error('All image generation providers failed. Last error:', lastError);

    if (fallbackToDefault) {
      console.log('Using fallback image due to all providers failing');
      return this.defaultFallbackImage;
    }

    throw lastError || new Error('All image generation providers failed');
  }

  /**
   * Determine the order of providers to try based on preference and availability
   * @param preferredProvider - Optional preferred provider
   * @returns Array of providers in order of preference
   */
  private getProviderOrder(preferredProvider?: ImageGenerationProvider): ImageGenerationProvider[] {
    const allProviders = [
      ImageGenerationProvider.GEMINI_DIRECT,
      ImageGenerationProvider.OPENROUTER_PAID
    ];

    if (preferredProvider) {
      // Put preferred provider first, then others
      const others = allProviders.filter(p => p !== preferredProvider);
      return [preferredProvider, ...others];
    }

    // Default order: try free Gemini direct first, then paid OpenRouter as fallback
    return [
      ImageGenerationProvider.GEMINI_DIRECT,      // Free with Gemini API (15/day)
      ImageGenerationProvider.OPENROUTER_PAID     // Paid OpenRouter as fallback
    ];
  }

  /**
   * Generate image using a specific provider
   * @param prompt - Image generation prompt
   * @param provider - Provider to use
   * @param retryAttempts - Number of retry attempts
   * @returns Promise resolving to base64 encoded image data
   */
  private async generateWithProvider(
    prompt: string,
    provider: ImageGenerationProvider,
    retryAttempts: number
  ): Promise<string> {
    switch (provider) {
      case ImageGenerationProvider.GEMINI_DIRECT:
        return this.generateWithGeminiDirect(prompt, retryAttempts);

      case ImageGenerationProvider.OPENROUTER_PAID:
        return this.generateWithOpenRouterPaid(prompt, retryAttempts);

      default:
        throw new Error(`Unknown provider: ${provider}`);
    }
  }

  /**
   * Generate image using Gemini direct API
   * @param prompt - Image generation prompt
   * @param retryAttempts - Number of retry attempts
   * @returns Promise resolving to base64 encoded image data
   */
  private async generateWithGeminiDirect(prompt: string, retryAttempts: number): Promise<string> {
    if (!geminiImageService.canUseFreeToday()) {
      throw new Error(`Gemini free tier exhausted for today. Remaining: ${geminiImageService.getRemainingFreeRequests()}`);
    }

    for (let attempt = 1; attempt <= retryAttempts; attempt++) {
      try {
        const base64Image = await geminiImageService.generateImage({ prompt });
        return base64Image;
      } catch (error) {
        console.warn(`Gemini direct attempt ${attempt}/${retryAttempts} failed:`, error);

        if (attempt === retryAttempts) {
          throw error;
        }

        // Wait before retry (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt - 1)));
      }
    }

    throw new Error('Max retries exceeded for Gemini direct');
  }


  /**
   * Generate image using OpenRouter paid tier
   * @param prompt - Image generation prompt
   * @param retryAttempts - Number of retry attempts
   * @returns Promise resolving to base64 encoded image data
   */
  private async generateWithOpenRouterPaid(prompt: string, retryAttempts: number): Promise<string> {
    for (let attempt = 1; attempt <= retryAttempts; attempt++) {
      try {
        // Use paid model directly
        const base64Image = await openRouterService.generateImage({
          prompt,
          model: 'google/gemini-2.5-flash-image-preview'
        });
        return base64Image;
      } catch (error) {
        console.warn(`OpenRouter paid attempt ${attempt}/${retryAttempts} failed:`, error);

        if (attempt === retryAttempts) {
          throw error;
        }

        // Wait before retry (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt - 1)));
      }
    }

    throw new Error('Max retries exceeded for OpenRouter paid');
  }

  /**
   * Create a detailed character portrait prompt based on character data
   * @param characterData - Character attributes
   * @param style - Image composition style
   * @param artStyle - Art style preference
   * @returns Formatted prompt string
   */
  private createImagePrompt(characterData: CharacterData, style: string, artStyle: string): string {
    const promptParts: string[] = [];

    // Extract key physical details from descriptions
    const extractedDetails = this.extractCharacterDetails(characterData);

    // Add style-specific base prompt
    switch (style) {
      case 'portrait':
        promptParts.push('D&D character portrait, head and shoulders view, facing forward or at slight angle');
        break;
      case 'action':
        promptParts.push('Dynamic D&D character action pose, showing character in combat or using abilities');
        break;
      case 'full-body':
        promptParts.push('Full body D&D character portrait, standing pose, complete outfit and equipment visible');
        break;
      case 'character-sheet':
        promptParts.push('D&D character turnaround sheet, multiple views of the same character, front view, side profile, back view, and 3/4 angle, consistent character across all poses');
        break;
      case 'expression-sheet':
        promptParts.push('D&D character expression sheet, same character with multiple facial expressions, happy, serious, angry, surprised, consistent character');
        break;
    }

    // Build character description
    const characterDesc = this.buildCharacterDescription(characterData, extractedDetails);
    promptParts.push(characterDesc);

    // Add art style
    promptParts.push(this.getArtStylePrompt(artStyle));

    // Add composition requirements
    if (style === 'character-sheet' || style === 'expression-sheet') {
      promptParts.push('Clean white background, organized layout, professional character reference');
    } else {
      promptParts.push('Clean background, character as main focus, professional composition');
    }

    // Add technical quality requirements
    promptParts.push('High detail, sharp focus, excellent lighting, rich colors, digital illustration quality');

    return promptParts.join(', ');
  }

  /**
   * Extract key physical details from character descriptions
   */
  private extractCharacterDetails(characterData: CharacterData): {
    physicalFeatures: string[];
    equipment: string[];
    distinguishingMarks: string[];
  } {
    const details = {
      physicalFeatures: [],
      equipment: [],
      distinguishingMarks: []
    };

    // Extract from appearance description if available
    if (characterData.appearance) {
      const appearance = characterData.appearance.toLowerCase();
      
      // Look for height/build
      if (appearance.includes('tall')) details.physicalFeatures.push('tall stature');
      if (appearance.includes('short')) details.physicalFeatures.push('short stature');
      if (appearance.includes('muscular')) details.physicalFeatures.push('muscular build');
      if (appearance.includes('lean')) details.physicalFeatures.push('lean build');
      if (appearance.includes('stocky')) details.physicalFeatures.push('stocky build');
      
      // Look for hair
      if (appearance.includes('brown hair')) details.physicalFeatures.push('brown hair');
      if (appearance.includes('black hair')) details.physicalFeatures.push('black hair');
      if (appearance.includes('blonde hair')) details.physicalFeatures.push('blonde hair');
      if (appearance.includes('red hair')) details.physicalFeatures.push('red hair');
      if (appearance.includes('white hair')) details.physicalFeatures.push('white hair');
      if (appearance.includes('braid')) details.physicalFeatures.push('braided hair');
      
      // Look for eyes
      if (appearance.includes('blue eyes')) details.physicalFeatures.push('blue eyes');
      if (appearance.includes('green eyes')) details.physicalFeatures.push('green eyes');
      if (appearance.includes('brown eyes')) details.physicalFeatures.push('brown eyes');
      if (appearance.includes('piercing eyes')) details.physicalFeatures.push('piercing gaze');
      
      // Look for scars and marks
      if (appearance.includes('scar')) details.distinguishingMarks.push('battle scars');
      if (appearance.includes('tattoo')) details.distinguishingMarks.push('tattoos');
      
      // Look for armor/equipment
      if (appearance.includes('leather armor')) details.equipment.push('leather armor');
      if (appearance.includes('plate armor')) details.equipment.push('plate armor');
      if (appearance.includes('chainmail')) details.equipment.push('chainmail');
      if (appearance.includes('surcoat')) details.equipment.push('surcoat');
    }

    return details;
  }

  /**
   * Build comprehensive character description from all available data
   */
  private buildCharacterDescription(characterData: CharacterData, extractedDetails: any): string {
    const descParts: string[] = [];

    // Add race and class
    if (characterData.race && characterData.class) {
      descParts.push(`${characterData.race} ${characterData.class}`);
    } else if (characterData.race) {
      descParts.push(characterData.race);
    } else if (characterData.class) {
      descParts.push(characterData.class);
    }

    // Add extracted physical features
    if (extractedDetails.physicalFeatures.length > 0) {
      descParts.push(extractedDetails.physicalFeatures.join(', '));
    }

    // Add race-specific features
    if (characterData.race) {
      descParts.push(this.getRacePrompt(characterData.race));
    }

    // Add class-specific equipment
    if (characterData.class) {
      descParts.push(this.getClassPrompt(characterData.class));
    }

    // Add extracted equipment
    if (extractedDetails.equipment.length > 0) {
      descParts.push(extractedDetails.equipment.join(', '));
    }

    // Add distinguishing marks
    if (extractedDetails.distinguishingMarks.length > 0) {
      descParts.push(extractedDetails.distinguishingMarks.join(', '));
    }

    // Add enhancement-specific visual elements
    if (characterData.enhancementSelections && characterData.enhancementSelections.length > 0) {
      const enhancementVisuals = this.extractEnhancementVisuals(characterData.enhancementSelections);
      if (enhancementVisuals.length > 0) {
        descParts.push(enhancementVisuals.join(', '));
      }
    }

    // Add enhancement effects equipment
    if (characterData.enhancementEffects?.equipment && characterData.enhancementEffects.equipment.length > 0) {
      descParts.push(characterData.enhancementEffects.equipment.join(', '));
    }

    // Add alignment-based expression
    if (characterData.alignment) {
      descParts.push(this.getAlignmentPrompt(characterData.alignment));
    }

    // Add personality notes for visual character traits
    if (characterData.personality_notes) {
      // Extract visually relevant personality traits
      const personalityVisuals = this.extractVisualPersonalityTraits(characterData.personality_notes);
      if (personalityVisuals.length > 0) {
        descParts.push(personalityVisuals.join(', '));
      }
    }

    return descParts.join(', ');
  }

  /**
   * Get art style specific prompting
   */
  private getArtStylePrompt(artStyle: string): string {
    const styleMap: Record<string, string> = {
      'fantasy-art': 'fantasy art style, detailed digital painting, epic fantasy aesthetic',
      'anime': 'anime art style, cel-shaded, Japanese animation style, vibrant colors',
      'realistic': 'photorealistic style, highly detailed, lifelike rendering',
      'comic-book': 'comic book art style, bold lines, dynamic shading, superhero aesthetic',
      'watercolor': 'watercolor painting style, soft washes, artistic brushstrokes',
      'sketch': 'pencil sketch style, hand-drawn, artistic line work, monochromatic',
      'oil-painting': 'oil painting style, classical art, rich textures, masterwork quality'
    };

    return styleMap[artStyle] || styleMap['fantasy-art'];
  }

  /**
   * Get race-specific visual features
   */
  private getRacePrompt(race: string): string {
    const raceMap: Record<string, string> = {
      'human': 'Human features with medium build, varied skin tones, expressive face.',
      'elf': 'Elven features with pointed ears, graceful build, ethereal beauty, bright eyes.',
      'dwarf': 'Dwarven features with stocky build, impressive beard, sturdy appearance, weathered skin.',
      'halfling': 'Halfling features with small stature, cheerful expression, curly hair, bare feet.',
      'dragonborn': 'Dragonborn features with draconic scales, reptilian head, proud bearing, breath weapon hints.',
      'gnome': 'Gnomish features with small size, large nose, twinkling eyes, mischievous expression.',
      'half-elf': 'Half-elf features blending human and elven traits, slightly pointed ears, elegant build.',
      'half-orc': 'Half-orc features with tusks, green-tinted skin, muscular build, fierce expression.',
      'tiefling': 'Tiefling features with horns, tail, unusual skin color, demonic heritage, piercing eyes.',
      'celestialborn': 'Celestialborn features with celestial beauty, subtle divine radiance, perfect proportions.',
      'elementalborn': 'Elementalborn features with elemental manifestations, unique skin patterns, elemental aura.',
      'catfolk': 'Catfolk features with feline characteristics, fur patterns, cat-like agility, whiskers.',
      'ravenfolk': 'Ravenfolk features with raven-like appearance, black feathers, beak, dark eyes.',
      'lizardfolk': 'Lizardfolk features with reptilian scales, crocodilian head, primitive appearance.',
      'tortle': 'Tortle features with turtle-like shell, reptilian head, wise expression.',
    };

    return raceMap[race.toLowerCase()] || `${race} racial features with appropriate fantasy characteristics.`;
  }

  /**
   * Get class-specific equipment and styling
   */
  private getClassPrompt(characterClass: string): string {
    const classMap: Record<string, string> = {
      'barbarian': 'Barbarian with primitive weapons, animal pelts, fierce expression, tribal markings.',
      'bard': 'Bard with musical instrument, colorful clothing, charismatic smile, artistic accessories.',
      'cleric': 'Cleric with holy symbol, divine armor, peaceful expression, religious vestments.',
      'druid': 'Druid with natural materials, earth tones, animal companions, nature magic aura.',
      'fighter': 'Fighter with martial weapons, practical armor, battle-tested equipment, warrior stance.',
      'monk': 'Monk with simple robes, martial arts pose, serene expression, minimal equipment.',
      'paladin': 'Paladin with shining armor, holy weapons, righteous bearing, divine radiance.',
      'ranger': 'Ranger with bow and arrows, leather armor, nature camouflage, tracking gear.',
      'rogue': 'Rogue with dark clothing, daggers, stealthy posture, tools and lockpicks.',
      'sorcerer': 'Sorcerer with innate magic aura, elemental effects, mysterious appearance, arcane symbols.',
      'warlock': 'Warlock with dark magic signs, otherworldly patron marks, eldritch energy, occult accessories.',
      'wizard': 'Wizard with spellbook, arcane focus, scholarly robes, magical components, intelligent gaze.',
      'artificer': 'Artificer with magical inventions, mechanical gadgets, crafting tools, innovative gear.',
      'blood hunter': 'Blood hunter with scarred appearance, dark weapons, hunter markings, grim determination.',
    };

    return classMap[characterClass.toLowerCase()] || `${characterClass} with appropriate class equipment and styling.`;
  }

  /**
   * Get background-specific environmental or equipment hints
   */
  private getBackgroundPrompt(background: string): string {
    const backgroundMap: Record<string, string> = {
      'acolyte': 'Religious background with temple accessories, prayer beads, devotional items.',
      'criminal': 'Criminal background with street clothes, hidden weapons, streetwise appearance.',
      'folk hero': 'Folk hero background with simple but well-maintained gear, community symbols.',
      'noble': 'Noble background with fine clothes, jewelry, aristocratic bearing, quality materials.',
      'sage': 'Sage background with books, scrolls, scholarly accessories, intellectual appearance.',
      'soldier': 'Military background with disciplined posture, uniform elements, battle experience.',
      'charlatan': 'Charlatan background with deceptive appearance, multiple identities, tricks.',
      'entertainer': 'Entertainer background with performance accessories, flashy clothes, stage presence.',
      'guild artisan': 'Artisan background with craft tools, work clothes, skilled hands, trade symbols.',
      'hermit': 'Hermit background with simple robes, walking stick, withdrawn appearance, wisdom.',
      'outlander': 'Outlander background with survival gear, weathered appearance, natural elements.',
      'sailor': 'Sailor background with maritime clothes, rope accessories, sea-weathered skin.',
    };

    return backgroundMap[background.toLowerCase()] || `Background as ${background} with appropriate thematic elements.`;
  }

  /**
   * Get alignment-based expression and mood
   */
  private getAlignmentPrompt(alignment: string): string {
    const alignmentMap: Record<string, string> = {
      'lawful good': 'Noble and righteous expression, lawful bearing, heroic confidence.',
      'neutral good': 'Kind and compassionate expression, balanced demeanor, helpful nature.',
      'chaotic good': 'Free-spirited expression, rebellious confidence, good-hearted mischief.',
      'lawful neutral': 'Disciplined expression, orderly appearance, duty-bound demeanor.',
      'true neutral': 'Balanced expression, pragmatic appearance, measured demeanor.',
      'chaotic neutral': 'Unpredictable expression, free-spirited appearance, wild energy.',
      'lawful evil': 'Controlled malevolence, tyrannical bearing, cold calculation.',
      'neutral evil': 'Selfish expression, opportunistic demeanor, amoral confidence.',
      'chaotic evil': 'Malevolent chaos, destructive energy, unpredictable danger.',
    };

    return alignmentMap[alignment.toLowerCase()] || 'Balanced expression reflecting character alignment.';
  }


  /**
   * Extract visually relevant elements from character enhancement selections
   * @param enhancementSelections - Array of selected enhancement options
   * @returns Array of visual descriptors based on enhancement content
   */
  private extractEnhancementVisuals(enhancementSelections: Array<{
    optionId: string;
    value: string | string[] | number;
    customValue?: string;
    aiGenerated?: boolean;
  }>): string[] {
    const visualElements: string[] = [];

    enhancementSelections.forEach(selection => {
      const value = Array.isArray(selection.value) ? selection.value.join(' ') : String(selection.value);
      const combined = `${value} ${selection.customValue || ''}`.toLowerCase();

      // Extract visual elements from enhancement text
      if (combined.includes('scar') || combined.includes('scarred')) {
        visualElements.push('distinctive scars');
      }
      if (combined.includes('tattoo') || combined.includes('tattooed')) {
        visualElements.push('meaningful tattoos');
      }
      if (combined.includes('piercing') || combined.includes('pierced')) {
        visualElements.push('piercings');
      }
      if (combined.includes('jewelry') || combined.includes('ring') || combined.includes('necklace')) {
        visualElements.push('distinctive jewelry');
      }
      if (combined.includes('weapon') || combined.includes('sword') || combined.includes('axe') || combined.includes('bow')) {
        visualElements.push('special weapon');
      }
      if (combined.includes('armor') || combined.includes('shield')) {
        visualElements.push('unique armor');
      }
      if (combined.includes('cloak') || combined.includes('cape') || combined.includes('robe')) {
        visualElements.push('distinctive clothing');
      }
      if (combined.includes('mark') || combined.includes('brand') || combined.includes('symbol')) {
        visualElements.push('mystical markings');
      }
      if (combined.includes('aura') || combined.includes('glow') || combined.includes('magic')) {
        visualElements.push('magical aura');
      }
      if (combined.includes('eye') || combined.includes('gaze')) {
        visualElements.push('striking eyes');
      }
      if (combined.includes('hair') || combined.includes('beard')) {
        visualElements.push('distinctive hair');
      }
      if (combined.includes('posture') || combined.includes('stance')) {
        visualElements.push('unique posture');
      }
      if (combined.includes('familiar') || combined.includes('companion') || combined.includes('pet')) {
        visualElements.push('animal companion nearby');
      }
    });

    // Remove duplicates and return
    return [...new Set(visualElements)];
  }

  /**
   * Extract visually relevant personality traits from personality notes
   * @param personalityNotes - User's personality notes
   * @returns Array of visual descriptors
   */
  private extractVisualPersonalityTraits(personalityNotes: string): string[] {
    const notes = personalityNotes.toLowerCase();
    const visualTraits: string[] = [];

    // Nervous traits
    if (notes.includes('tourettes') || notes.includes('tics')) {
      visualTraits.push('subtle facial tics or nervous expressions');
    }
    if (notes.includes('fidgety') || notes.includes('restless')) {
      visualTraits.push('fidgety posture');
    }
    if (notes.includes('anxious') || notes.includes('nervous')) {
      visualTraits.push('slightly anxious expression');
    }

    // Confident traits
    if (notes.includes('confident') || notes.includes('bold')) {
      visualTraits.push('confident stance and expression');
    }
    if (notes.includes('proud') || notes.includes('arrogant')) {
      visualTraits.push('proud bearing');
    }

    // Social traits
    if (notes.includes('shy') || notes.includes('timid')) {
      visualTraits.push('shy demeanor');
    }
    if (notes.includes('friendly') || notes.includes('warm')) {
      visualTraits.push('warm, friendly expression');
    }

    // Physical quirks
    if (notes.includes('scar') || notes.includes('scarred')) {
      visualTraits.push('visible scars');
    }
    if (notes.includes('tattoo') || notes.includes('tattooed')) {
      visualTraits.push('tattoos');
    }

    return visualTraits;
  }
}

// Export singleton instance
export const characterImageGenerator = new CharacterImageGenerator();