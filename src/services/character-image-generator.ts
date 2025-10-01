/**
 * Character Image Generator Service
 * 
 * Generates character portraits and design sheets using AI image generation based on D&D character data.
 * Creates detailed prompts from race, class, description, background, equipment, and personality information.
 * 
 * @author AI Dungeon Master Team
 * @version 2.0 - Added dynamic theme support and detailed character sheet generation
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
  subrace?: string | null;
  class?: string | null;
  background?: string | null;
  level?: number | null;
  ability_scores?: any;
  appearance?: string | null;
  personality_traits?: string | null;
  personality_notes?: string | null;
  alignment?: string | null;
  theme?: string | null; // Theme for design sheet generation (fantasy, cyberpunk, etc.)
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
  theme?: string; // Theme override for generation
  preferredProvider?: ImageGenerationProvider;
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
    characterData: CharacterData,
    options: Omit<CharacterImageOptions, 'style'> = {}
  ): Promise<string> {
    const {
      retryAttempts = this.maxRetries,
      artStyle = 'fantasy-art',
      theme = characterData.theme || 'fantasy',
      preferredProvider
    } = options;

    console.log(`Generating avatar portrait with theme: ${theme}, artStyle: ${artStyle}`);

    const prompt = this.createImagePrompt(characterData, 'portrait', artStyle, theme);
    console.log('Generated avatar prompt:', prompt);

    const providerOrder = this.getProviderOrder(preferredProvider, 'portrait');
    let lastError: Error | null = null;

    for (const provider of providerOrder) {
      try {
        console.log(`Attempting avatar generation with provider: ${provider}`);
        const base64Image = await this.generateWithProvider(prompt, provider, retryAttempts);
        console.log(`Successfully generated avatar with provider: ${provider}`);
        return base64Image;
      } catch (error) {
        console.warn(`Provider ${provider} failed:`, error);
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
    characterData: CharacterData,
    options: CharacterImageOptions = {},
    referenceImageBase64?: string
  ): Promise<string> {
    const {
      retryAttempts = this.maxRetries,
      fallbackToDefault = true,
      style = 'portrait',
      artStyle = 'fantasy-art',
      theme = characterData.theme || options.theme || 'fantasy', // Use character theme, options theme, or default
      preferredProvider
    } = options;

    console.log(`Generating ${style} with theme: ${theme}, artStyle: ${artStyle}`);

    const prompt = this.createImagePrompt(characterData, style, artStyle, theme);
    console.log('Generated prompt:', prompt);

    // Determine the provider order based on preference and availability
    const providerOrder = this.getProviderOrder(preferredProvider, style);

    let lastError: Error | null = null;

    // Try each provider in order
    for (const provider of providerOrder) {
      try {
        console.log(`Attempting image generation with provider: ${provider}`);
        const base64Image = await this.generateWithProvider(
          prompt,
          provider,
          retryAttempts,
          referenceImageBase64
        );
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
   * @param style - Image style (affects quality requirements)
   * @returns Array of providers in order of preference
   */
  private getProviderOrder(preferredProvider?: ImageGenerationProvider, style?: string): ImageGenerationProvider[] {
    const allProviders = [
      ImageGenerationProvider.GEMINI_DIRECT,
      ImageGenerationProvider.OPENROUTER_PAID
    ];

    if (preferredProvider) {
      // Put preferred provider first, then others
      const others = allProviders.filter(p => p !== preferredProvider);
      return [preferredProvider, ...others];
    }

    // For high-quality needs (cards, sheets), prefer OpenRouter paid (Gemini 2.5)
    // For avatars/portraits, use free Gemini 2.0 first
    const needsHighQuality = style && ['character-sheet', 'expression-sheet', 'full-body', 'action'].includes(style);

    if (needsHighQuality) {
      return [
        ImageGenerationProvider.OPENROUTER_PAID,    // Gemini 2.5 - Best quality for cards/sheets
        ImageGenerationProvider.GEMINI_DIRECT       // Gemini 2.0 - Fallback if paid fails
      ];
    }

    // Default for portraits/avatars: try free first
    return [
      ImageGenerationProvider.GEMINI_DIRECT,      // Free with Gemini API (500/day) - Good for avatars
      ImageGenerationProvider.OPENROUTER_PAID     // Paid fallback - Better quality if needed
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
    referenceImageBase64?: string
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
    referenceImageBase64?: string
  ): Promise<string> {
    if (!geminiImageService.canUseFreeToday()) {
      throw new Error(`Gemini free tier exhausted for today. Remaining: ${geminiImageService.getRemainingFreeRequests()}`);
    }

    for (let attempt = 1; attempt <= retryAttempts; attempt++) {
      try {
        const base64Image = await geminiImageService.generateImage({
          prompt,
          referenceImage: referenceImageBase64
        });
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
   * @param referenceImageBase64 - Optional reference image for style consistency
   * @returns Promise resolving to base64 encoded image data
   */
  private async generateWithOpenRouterPaid(
    prompt: string,
    retryAttempts: number,
    referenceImageBase64?: string
  ): Promise<string> {
    for (let attempt = 1; attempt <= retryAttempts; attempt++) {
      try {
        // Use paid model directly
        const base64Image = await openRouterService.generateImage({
          prompt,
          model: 'google/gemini-2.5-flash-image-preview',
          referenceImage: referenceImageBase64
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
   * Create a detailed character image prompt based on character data
   * @param characterData - Character attributes
   * @param style - Image composition style
   * @param artStyle - Art style preference
   * @param theme - Theme for design sheet (fantasy, cyberpunk, sci-fi, etc.)
   * @returns Formatted prompt string
   */
  private createImagePrompt(characterData: CharacterData, style: string, artStyle: string, theme: string): string {
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
      case 'character-sheet': {
        const characterConcept = this.buildCharacterConcept(characterData, extractedDetails);
        const designSheetPrompt = `Character design sheet for ${characterConcept}, detailed with front, back, and side views, including close-up sketches of facial features and accessories, annotated with design notes and labeled components, drawn in blueprint style with glowing trim in ${theme}. Detailed line work on the face and hands, detailed anatomy of the character, detailed lines around the edges. Detailed character sketches with flat color and detailed line art illustration. Professional concept art style.`;
        promptParts.push(designSheetPrompt);
        console.log('Generated design sheet concept:', characterConcept);
        console.log('Full design sheet prompt:', designSheetPrompt);
        break;
      }
      case 'expression-sheet':
        promptParts.push('D&D character expression sheet, same character with multiple facial expressions, happy, serious, angry, surprised, consistent character');
        break;
    }

    // For non-character-sheet styles, build character description
    if (style !== 'character-sheet') {
      const characterDesc = this.buildCharacterDescription(characterData, extractedDetails);
      promptParts.push(characterDesc);
    }

    // Add art style (for non-character-sheet styles)
    if (style !== 'character-sheet') {
      promptParts.push(this.getArtStylePrompt(artStyle));
    }

    // Add composition requirements
    if (style === 'character-sheet' || style === 'expression-sheet') {
      promptParts.push('Clean white background, organized layout, professional character reference, consistent character design across all views');
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
   * Build comprehensive character description from all available data for non-sheet styles
   */
  private buildCharacterDescription(characterData: CharacterData, extractedDetails: any): string {
    const descParts: string[] = [];

    // Add race/subrace and class
    const raceDescription = characterData.subrace
      ? `${characterData.subrace} ${characterData.race}`
      : characterData.race;

    if (raceDescription && characterData.class) {
      descParts.push(`${raceDescription} ${characterData.class}`);
    } else if (raceDescription) {
      descParts.push(raceDescription);
    } else if (characterData.class) {
      descParts.push(characterData.class);
    }

    // Add extracted physical features
    if (extractedDetails.physicalFeatures.length > 0) {
      descParts.push(extractedDetails.physicalFeatures.join(', '));
    }

    // Add race-specific features (prioritize subrace if available)
    const raceForPrompt = characterData.subrace || characterData.race;
    if (raceForPrompt) {
      descParts.push(this.getRacePrompt(raceForPrompt));
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
      const personalityVisuals = this.extractVisualPersonalityTraits(characterData.personality_notes);
      if (personalityVisuals.length > 0) {
        descParts.push(personalityVisuals.join(', '));
      }
    }

    return descParts.join(', ');
  }

  /**
   * Build detailed character concept for design sheet prompts
   * Combines race, class, appearance, outfit, weapons, and personality traits into a cohesive description
   */
  private buildCharacterConcept(characterData: CharacterData, extractedDetails: any): string {
    const conceptParts: string[] = [];

    // Core identity: race + class
    if (characterData.race && characterData.class) {
      conceptParts.push(`${characterData.race} ${characterData.class}`);
    } else if (characterData.race) {
      conceptParts.push(characterData.race);
    } else if (characterData.class) {
      conceptParts.push(characterData.class);
    }

    // Appearance description (if available)
    if (characterData.appearance) {
      conceptParts.push(characterData.appearance);
    }

    // Physical features from extraction
    if (extractedDetails.physicalFeatures.length > 0) {
      conceptParts.push(extractedDetails.physicalFeatures.join(' '));
    }

    // Outfit and equipment description
    const outfitParts: string[] = [];
    if (characterData.class) {
      // Get class-specific styling and equipment
      const classStyle = this.getClassPrompt(characterData.class);
      if (classStyle) {
        outfitParts.push(classStyle);
      }
    }
    
    // Add extracted equipment
    if (extractedDetails.equipment.length > 0) {
      outfitParts.push(...extractedDetails.equipment);
    }
    
    // Add enhancement equipment
    if (characterData.enhancementEffects?.equipment && characterData.enhancementEffects.equipment.length > 0) {
      outfitParts.push(...characterData.enhancementEffects.equipment);
    }
    
    if (outfitParts.length > 0) {
      // Create concise outfit description
      const outfitSummary = this.summarizeOutfit(outfitParts);
      conceptParts.push(outfitSummary);
    }

    // Weapons description
    const weaponParts: string[] = [];
    if (characterData.class) {
      const classWeapons = this.extractWeaponsFromClass(characterData.class);
      if (classWeapons.length > 0) {
        weaponParts.push(...classWeapons);
      }
    }
    if (characterData.enhancementSelections) {
      const enhancementWeapons = this.extractWeaponsFromEnhancements(characterData.enhancementSelections);
      if (enhancementWeapons.length > 0) {
        weaponParts.push(...enhancementWeapons);
      }
    }
    if (weaponParts.length > 0) {
      const weaponsSummary = this.summarizeWeapons(weaponParts);
      conceptParts.push(weaponsSummary);
    }

    // Personality traits influencing visual appearance
    if (characterData.personality_traits) {
      const personalityVisuals = this.extractVisualPersonalityTraits(characterData.personality_traits);
      if (personalityVisuals.length > 0) {
        conceptParts.push(...personalityVisuals);
      }
    }

    // Distinguishing marks
    if (extractedDetails.distinguishingMarks.length > 0) {
      conceptParts.push(...extractedDetails.distinguishingMarks);
    }

    // Join all parts into a cohesive concept description
    const fullConcept = conceptParts.join(', ');
    console.log('Built character concept:', fullConcept);
    return fullConcept;
  }

  /**
   * Summarize outfit description for concise prompt
   */
  private summarizeOutfit(outfitParts: string[]): string {
    if (outfitParts.length === 0) return '';
    
    // Group similar items and create summary
    const armorTypes = outfitParts.filter(part => 
      part.includes('armor') || part.includes('chainmail') || part.includes('plate') || part.includes('leather')
    );
    const clothingTypes = outfitParts.filter(part => 
      part.includes('robe') || part.includes('cloak') || part.includes('vestments') || part.includes('clothing')
    );
    const accessories = outfitParts.filter(part => 
      part.includes('symbol') || part.includes('focus') || part.includes('instrument') || part.includes('book')
    );

    const summaryParts: string[] = [];
    
    if (armorTypes.length > 0) {
      summaryParts.push(armorTypes[0].split(' with ')[0]); // Take base armor type
    }
    if (clothingTypes.length > 0) {
      summaryParts.push(clothingTypes[0]);
    }
    if (accessories.length > 0) {
      summaryParts.push(accessories[0]);
    }

    return `wearing ${summaryParts.join(' and ')}`;
  }

  /**
   * Summarize weapons for concise prompt
   */
  private summarizeWeapons(weaponParts: string[]): string {
    if (weaponParts.length === 0) return '';
    
    // Prioritize primary weapons
    const primaryWeapons = weaponParts.filter(w => 
      w.includes('sword') || w.includes('axe') || w.includes('staff') || w.includes('bow')
    );
    const secondaryWeapons = weaponParts.filter(w => 
      !primaryWeapons.includes(w) && (w.includes('dagger') || w.includes('mace'))
    );

    const summary = primaryWeapons.length > 0 
      ? `armed with ${primaryWeapons.join(' and ')}`
      : `armed with ${weaponParts[0]}`;

    return summary;
  }

  /**
   * Extract weapons from class description
   */
  private extractWeaponsFromClass(characterClass: string): string[] {
    const classWeaponsMap: Record<string, string[]> = {
      'barbarian': ['greataxe', 'battleaxe'],
      'fighter': ['longsword', 'shield'],
      'paladin': ['longsword', 'mace', 'shield'],
      'ranger': ['longbow', 'shortsword'],
      'rogue': ['rapier', 'dagger'],
      'bard': ['rapier', 'dagger'],
      'cleric': ['mace', 'shield'],
      'druid': ['quarterstaff', 'scimitar'],
      'monk': ['quarterstaff', 'unarmed strikes'],
      'sorcerer': ['light crossbow', 'dagger'],
      'warlock': ['light crossbow', 'eldritch blast'],
      'wizard': ['quarterstaff', 'dagger'],
      'artificer': ['hand crossbow', 'simple weapon'],
      'blood hunter': ['greatsword', 'hand crossbow'],
    };

    const weapons = classWeaponsMap[characterClass.toLowerCase()] || ['appropriate weapons'];
    return weapons;
  }

  /**
   * Extract weapons from enhancement selections
   */
  private extractWeaponsFromEnhancements(enhancementSelections: Array<{
    optionId: string;
    value: string | string[] | number;
    customValue?: string;
    aiGenerated?: boolean;
  }>): string[] {
    const weapons: string[] = [];

    enhancementSelections.forEach(selection => {
      const value = Array.isArray(selection.value) ? selection.value.join(' ') : String(selection.value);
      const combined = `${value} ${selection.customValue || ''}`.toLowerCase();

      if (combined.includes('sword') || combined.includes('blade')) {
        weapons.push('sword');
      }
      if (combined.includes('axe')) {
        weapons.push('axe');
      }
      if (combined.includes('bow') || combined.includes('arrow')) {
        weapons.push('bow');
      }
      if (combined.includes('dagger') || combined.includes('knife')) {
        weapons.push('dagger');
      }
      if (combined.includes('mace') || combined.includes('hammer')) {
        weapons.push('mace');
      }
      if (combined.includes('staff') || combined.includes('quarterstaff')) {
        weapons.push('quarterstaff');
      }
      if (combined.includes('crossbow')) {
        weapons.push('crossbow');
      }
      if (combined.includes('spear') || combined.includes('lance')) {
        weapons.push('spear');
      }
    });

    return [...new Set(weapons)]; // Remove duplicates
  }

  /**
   * Get art style specific prompting for non-sheet styles
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
      // Base races
      'human': 'human features with varied skin tones and expressive face',
      'elf': 'elven features with pointed ears, graceful build, and ethereal beauty',
      'dwarf': 'dwarven features with stocky build, beard, and sturdy appearance',
      'halfling': 'halfling features with small stature and cheerful expression',
      'dragonborn': 'dragonborn features with draconic scales and proud bearing',
      'gnome': 'gnomish features with small size and mischievous expression',
      'half-elf': 'half-elf features blending human and elven traits',
      'half-orc': 'half-orc features with tusks and muscular build',
      'tiefling': 'tiefling features with horns, tail, and infernal heritage',
      'celestialborn': 'celestialborn features with divine radiance',
      'elementalborn': 'elementalborn features with elemental manifestations',
      'catfolk': 'catfolk features with feline characteristics and agility',
      'ravenfolk': 'ravenfolk features with avian characteristics',
      'lizardfolk': 'lizardfolk features with reptilian scales',
      'tortle': 'tortle features with turtle shell and wise expression',

      // Elf subraces
      'high elf': 'high elven features with pointed ears, refined bearing, and arcane elegance',
      'wood elf': 'wood elven features with pointed ears, natural grace, and forest-dwelling appearance',
      'dark elf': 'dark elven features with pointed ears, pale or dark skin, and mysterious aura',
      'drow': 'drow features with pointed ears, dark skin, white hair, and underground nobility',

      // Dwarf subraces
      'mountain dwarf': 'mountain dwarven features with stocky build, thick beard, and hardy mountain appearance',
      'hill dwarf': 'hill dwarven features with stocky build, well-groomed beard, and pastoral strength',

      // Halfling subraces
      'lightfoot halfling': 'lightfoot halfling features with small stature, nimble build, and wandering spirit',
      'stout halfling': 'stout halfling features with small but robust build and determined expression',

      // Human variants
      'variant human': 'human features with varied skin tones, expressive face, and adaptable appearance',

      // Gnome subraces
      'forest gnome': 'forest gnomish features with small size, nature-connected appearance, and woodland charm',
      'rock gnome': 'rock gnomish features with small size, tinker-focused hands, and inventive expression',

      // Tiefling variants
      'asmodeus tiefling': 'tiefling features with prominent horns, forked tail, and regal infernal heritage',
      'zariel tiefling': 'tiefling features with warrior-like horns, strong tail, and martial infernal bearing'
    };

    return raceMap[race.toLowerCase()] || `${race.toLowerCase()} racial features`;
  }

  /**
   * Get class-specific equipment and styling description
   */
  private getClassPrompt(characterClass: string): string {
    const classMap: Record<string, string> = {
      'barbarian': 'wearing animal pelts and tribal markings',
      'bard': 'wearing colorful clothing with artistic accessories',
      'cleric': 'wearing religious vestments with holy symbol',
      'druid': 'wearing natural materials in earth tones',
      'fighter': 'wearing practical armor with martial equipment',
      'monk': 'wearing simple robes for martial arts',
      'paladin': 'wearing shining armor with holy symbols',
      'ranger': 'wearing leather armor with nature camouflage',
      'rogue': 'wearing dark clothing with stealth tools',
      'sorcerer': 'with innate magic aura and arcane symbols',
      'warlock': 'with eldritch energy and occult accessories',
      'wizard': 'wearing scholarly robes with spellbook',
      'artificer': 'with mechanical gadgets and crafting tools',
      'blood hunter': 'with scarred appearance and hunter gear',
    };

    return classMap[characterClass.toLowerCase()] || `${characterClass.toLowerCase()} class attire`;
  }

  /**
   * Get background-specific visual elements
   */
  private getBackgroundPrompt(background: string): string {
    const backgroundMap: Record<string, string> = {
      'acolyte': 'with religious accessories and prayer beads',
      'criminal': 'with streetwise appearance and hidden weapons',
      'folk hero': 'with simple but well-maintained community gear',
      'noble': 'with fine clothes and aristocratic jewelry',
      'sage': 'with scholarly accessories and books',
      'soldier': 'with military uniform and disciplined posture',
      'charlatan': 'with deceptive accessories and multiple identities',
      'entertainer': 'with performance accessories and flashy clothes',
      'guild artisan': 'with craft tools and trade symbols',
      'hermit': 'with simple robes and walking stick',
      'outlander': 'with survival gear and weathered appearance',
      'sailor': 'with maritime clothes and sea-weathered look',
    };

    return backgroundMap[background.toLowerCase()] || `${background.toLowerCase()} background elements`;
  }

  /**
   * Get alignment-based expression and mood
   */
  private getAlignmentPrompt(alignment: string): string {
    const alignmentMap: Record<string, string> = {
      'lawful good': 'noble and righteous expression',
      'neutral good': 'kind and compassionate expression',
      'chaotic good': 'free-spirited and good-hearted expression',
      'lawful neutral': 'disciplined and orderly expression',
      'true neutral': 'balanced and pragmatic expression',
      'chaotic neutral': 'unpredictable and wild expression',
      'lawful evil': 'controlled and calculating expression',
      'neutral evil': 'selfish and opportunistic expression',
      'chaotic evil': 'malevolent and destructive expression',
    };

    return alignmentMap[alignment.toLowerCase()] || 'balanced expression';
  }

  /**
   * Extract visually relevant elements from character enhancement selections
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
        visualElements.push('animal companion');
      }
    });

    // Remove duplicates and return
    return [...new Set(visualElements)];
  }

  /**
   * Extract visually relevant personality traits from notes or traits
   */
  private extractVisualPersonalityTraits(personalityText: string): string[] {
    const notes = personalityText.toLowerCase();
    const visualTraits: string[] = [];

    // Nervous traits
    if (notes.includes('tourettes') || notes.includes('tics')) {
      visualTraits.push('subtle facial tics');
    }
    if (notes.includes('fidgety') || notes.includes('restless')) {
      visualTraits.push('fidgety posture');
    }
    if (notes.includes('anxious') || notes.includes('nervous')) {
      visualTraits.push('anxious expression');
    }

    // Confident traits
    if (notes.includes('confident') || notes.includes('bold')) {
      visualTraits.push('confident stance');
    }
    if (notes.includes('proud') || notes.includes('arrogant')) {
      visualTraits.push('proud bearing');
    }

    // Social traits
    if (notes.includes('shy') || notes.includes('timid')) {
      visualTraits.push('shy demeanor');
    }
    if (notes.includes('friendly') || notes.includes('warm')) {
      visualTraits.push('warm expression');
    }

    // Physical quirks from personality
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
