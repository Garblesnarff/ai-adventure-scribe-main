/**
 * Character Image Generator Service
 * 
 * Generates character portraits using AI image generation based on D&D character data.
 * Creates detailed prompts from race, class, description, and background information.
 * 
 * @author AI Dungeon Master Team
 */

import { openRouterService } from './openrouter-service';

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
  alignment?: string | null;
}

interface CharacterImageOptions {
  retryAttempts?: number;
  fallbackToDefault?: boolean;
  style?: 'portrait' | 'action' | 'full-body';
}

/**
 * Service class for generating character portrait images
 */
export class CharacterImageGenerator {
  private maxRetries = 3;
  private defaultFallbackImage = '/default-character-avatar.png';

  /**
   * Generate a portrait image for a D&D character
   * @param characterData - Character data to base the image on
   * @param options - Generation options
   * @returns Promise resolving to image URL
   */
  async generateCharacterImage(
    characterData: CharacterData, 
    options: CharacterImageOptions = {}
  ): Promise<string> {
    const { retryAttempts = this.maxRetries, fallbackToDefault = true, style = 'portrait' } = options;

    try {
      const prompt = this.createImagePrompt(characterData, style);
      console.log('Generating character image with prompt:', prompt);

      const base64Image = await this.generateWithRetry(prompt, retryAttempts);
      const imageUrl = await openRouterService.uploadImage(base64Image);

      console.log('Successfully generated character image');
      return imageUrl;

    } catch (error) {
      console.error('Failed to generate character image:', error);
      
      if (fallbackToDefault) {
        console.log('Using fallback image due to generation failure');
        return this.defaultFallbackImage;
      }
      
      throw error;
    }
  }

  /**
   * Create a detailed character portrait prompt based on character data
   * @param characterData - Character attributes
   * @param style - Image style preference
   * @returns Formatted prompt string
   */
  private createImagePrompt(characterData: CharacterData, style: string): string {
    const promptParts: string[] = [];

    // Base description with character name prominently displayed
    promptParts.push('Create a detailed D&D character portrait with the character name displayed prominently as text overlay.');
    
    // Add specific text styling requirements for character name
    promptParts.push(`The character name "${characterData.name}" should be displayed in bold, fantasy-style lettering at the bottom or top of the portrait, using a medieval or gothic font style with ornate decorative elements, glowing or metallic text effects, and high contrast against the background for excellent readability.`);

    // Add style-specific framing
    switch (style) {
      case 'portrait':
        promptParts.push('Head and shoulders portrait view, facing forward or at slight angle.');
        break;
      case 'action':
        promptParts.push('Dynamic action pose showing the character in combat or using abilities.');
        break;
      case 'full-body':
        promptParts.push('Full body standing portrait showing complete outfit and equipment.');
        break;
    }

    // Add race-specific features
    if (characterData.race) {
      promptParts.push(this.getRacePrompt(characterData.race));
    }

    // Add class-specific elements
    if (characterData.class) {
      promptParts.push(this.getClassPrompt(characterData.class));
    }

    // Add character description details
    if (characterData.description) {
      promptParts.push(`Character details: ${characterData.description}`);
    }

    // Add appearance details if available
    if (characterData.appearance) {
      promptParts.push(`Appearance: ${characterData.appearance}`);
    }

    // Add personality visual cues
    if (characterData.personality_traits) {
      promptParts.push(`Personality reflected in expression: ${characterData.personality_traits}`);
    }

    // Add background-based environmental hints
    if (characterData.background) {
      promptParts.push(this.getBackgroundPrompt(characterData.background));
    }

    // Add alignment-based mood/expression
    if (characterData.alignment) {
      promptParts.push(this.getAlignmentPrompt(characterData.alignment));
    }

    // Add technical requirements
    promptParts.push(
      'Style: Fantasy art, detailed digital painting, professional character illustration.',
      'Quality: High detail, sharp focus, excellent lighting, rich colors.',
      'Composition: Clean background, character as main focus, D&D fantasy aesthetic with integrated name text overlay.',
      'Technical: Portrait orientation, suitable for character card display.',
      'Text Integration: The character name must be rendered as part of the image composition with proper typography, shadows, and effects that complement the fantasy theme.'
    );

    return promptParts.join(' ');
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
      'aasimar': 'Aasimar features with celestial beauty, subtle divine radiance, perfect proportions.',
      'genasi': 'Genasi features with elemental manifestations, unique skin patterns, elemental aura.',
      'tabaxi': 'Tabaxi features with feline characteristics, fur patterns, cat-like agility, whiskers.',
      'kenku': 'Kenku features with raven-like appearance, black feathers, beak, dark eyes.',
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
   * Generate image with retry logic
   */
  private async generateWithRetry(prompt: string, maxAttempts: number): Promise<string> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        console.log(`Character image generation attempt ${attempt}/${maxAttempts}`);
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

    throw lastError || new Error('All character image generation attempts failed');
  }
}

// Export singleton instance
export const characterImageGenerator = new CharacterImageGenerator();