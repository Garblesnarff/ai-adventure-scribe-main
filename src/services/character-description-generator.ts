/**
 * Character Description Generator Service
 * 
 * Generates and enhances character descriptions using AI to create rich, detailed
 * character backgrounds, personality traits, and physical appearances for D&D characters.
 * 
 * @author AI Dungeon Master Team
 */

import { geminiService } from './gemini-service';
import { openRouterService } from './openrouter-service';

interface CharacterData {
  name: string;
  description?: string | null;
  race?: string | null;
  subrace?: string | null;
  class?: string | null;
  background?: string | null;
  level?: number | null;
  ability_scores?: any;
  alignment?: string | null;
  personalityTraits?: string[];
  ideals?: string[];
  bonds?: string[];
  flaws?: string[];
  personality_notes?: string | null;
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

interface EnhancedDescription {
  description: string;
  appearance: string;
  personality_traits: string;
  backstory_elements: string;
}

interface DescriptionOptions {
  enhanceExisting?: boolean; // true = enhance existing description, false = generate new
  includeBackstory?: boolean;
  includePersonality?: boolean;
  includeAppearance?: boolean;
  tone?: 'heroic' | 'dark' | 'comedic' | 'serious' | 'mysterious';
}

/**
 * Service class for generating and enhancing character descriptions
 */
export class CharacterDescriptionGenerator {
  /**
   * Generate or enhance a character description using AI
   * @param characterData - Character data to base the description on
   * @param options - Generation options
   * @returns Promise resolving to enhanced description data
   */
  async generateDescription(
    characterData: CharacterData,
    options: DescriptionOptions = {}
  ): Promise<EnhancedDescription> {
    const {
      enhanceExisting = false,
      includeBackstory = true,
      includePersonality = true,
      includeAppearance = true,
      tone = 'heroic'
    } = options;

    try {
      const prompt = this.createDescriptionPrompt(characterData, options);
      console.log('Generating character description with Gemini...');

      const response = await geminiService.generateText({
        prompt,
        model: 'gemini-2.5-flash-lite',
        maxTokens: 1000,
        temperature: 0.8,
      });

      console.log('Raw Gemini response:', response);
      console.log('Response type:', typeof response);
      console.log('Response length:', response.length);

      if (!response || response.trim() === '') {
        console.warn('Empty or null response from Gemini API');
        throw new Error('Received empty response from AI service');
      }

      const enhancedDescription = this.parseDescriptionResponse(response, characterData);

      console.log('Successfully generated character description');
      return enhancedDescription;

    } catch (error) {
      console.error('Failed to generate character description with Gemini:', error);

      // Try OpenRouter as fallback
      try {
        console.log('Attempting to generate character description with OpenRouter fallback...');
        const prompt = this.createDescriptionPrompt(characterData, options);

        const response = await openRouterService.generateText({
          prompt,
          model: 'google/gemini-2.0-flash-exp:free',
          maxTokens: 1000,
          temperature: 0.8
        });

        console.log('Raw OpenRouter response:', response);

        if (!response || response.trim() === '') {
          throw new Error('Received empty response from OpenRouter');
        }

        const enhancedDescription = this.parseDescriptionResponse(response, characterData);
        console.log('Successfully generated character description with OpenRouter fallback');
        return enhancedDescription;

      } catch (fallbackError) {
        console.error('OpenRouter fallback also failed:', fallbackError);

        // Return static fallback description
        return {
          description: characterData.description || `${characterData.name || 'The character'} is a ${characterData.race || 'heroic'} ${characterData.class || 'adventurer'}.`,
          appearance: `A typical ${characterData.race || 'adventurer'} with ${characterData.class || 'heroic'} characteristics.`,
          personality_traits: 'Determined and adventurous, with a strong sense of justice.',
          backstory_elements: `${characterData.name || 'This character'} comes from a ${characterData.background || 'common'} background and has chosen the path of a ${characterData.class || 'heroic adventurer'}.`
        };
      }
    }
  }

  /**
   * Create a detailed prompt for character description generation
   * @param characterData - Character attributes
   * @param options - Generation options
   * @returns Formatted prompt string
   */
  private createDescriptionPrompt(characterData: CharacterData, options: DescriptionOptions): string {
    const { enhanceExisting, includeBackstory, includePersonality, includeAppearance, tone } = options;
    
    const promptParts: string[] = [];

    // Base instruction
    if (enhanceExisting && characterData.description) {
      promptParts.push('Enhance and expand the following D&D character description with rich details:');
      promptParts.push(`Current description: "${characterData.description}"`);
    } else {
      promptParts.push('Create a detailed D&D character description for the following character:');
    }

    // Character basics
    promptParts.push(`Character Name: ${characterData.name}`);
    if (characterData.race) promptParts.push(`Race: ${characterData.race}`);
    if (characterData.subrace) promptParts.push(`Subrace: ${characterData.subrace}`);
    if (characterData.class) promptParts.push(`Class: ${characterData.class}`);
    if (characterData.background) promptParts.push(`Background: ${characterData.background}`);
    if (characterData.level) promptParts.push(`Level: ${characterData.level}`);
    if (characterData.alignment) promptParts.push(`Alignment: ${characterData.alignment}`);
    
    // Add personality elements if provided
    if (characterData.personalityTraits && characterData.personalityTraits.length > 0) {
      const traits = characterData.personalityTraits.filter(trait => trait.trim()).join('; ');
      if (traits) {
        promptParts.push(`Personality Traits: ${traits}`);
      }
    }

    if (characterData.ideals && characterData.ideals.length > 0) {
      const ideals = characterData.ideals
        .filter(ideal => typeof ideal === 'string' && ideal.trim())
        .join('; ');
      if (ideals) {
        promptParts.push(`Ideals: ${ideals}`);
      }
    }

    if (characterData.bonds && characterData.bonds.length > 0) {
      const bonds = characterData.bonds
        .filter(bond => typeof bond === 'string' && bond.trim())
        .join('; ');
      if (bonds) {
        promptParts.push(`Bonds: ${bonds}`);
      }
    }

    if (characterData.flaws && characterData.flaws.length > 0) {
      const flaws = characterData.flaws
        .filter(flaw => typeof flaw === 'string' && flaw.trim())
        .join('; ');
      if (flaws) {
        promptParts.push(`Flaws: ${flaws}`);
      }
    }

    // Add personality notes if provided
    if (characterData.personality_notes) {
      promptParts.push(`Additional Personality Notes: ${characterData.personality_notes}`);
    }

    // Instructions for using provided personality data
    if ((characterData.personalityTraits && characterData.personalityTraits.some(t => t.trim())) ||
        (characterData.ideals && characterData.ideals.some(i => i.trim())) ||
        (characterData.bonds && characterData.bonds.some(b => b.trim())) ||
        (characterData.flaws && characterData.flaws.some(f => f.trim())) ||
        characterData.personality_notes) {
      promptParts.push('(IMPORTANT: Use the provided personality traits, ideals, bonds, and flaws EXACTLY as given. These are the character\'s defining characteristics and should be incorporated prominently into the description and personality section)');
    }

    // Add enhancement selections if provided
    if (characterData.enhancementSelections && characterData.enhancementSelections.length > 0) {
      promptParts.push('\nCharacter Enhancements:');
      characterData.enhancementSelections.forEach(selection => {
        if (Array.isArray(selection.value)) {
          promptParts.push(`- ${selection.value.join(', ')}`);
        } else {
          promptParts.push(`- ${selection.value}`);
        }
        if (selection.customValue) {
          promptParts.push(`  Note: ${selection.customValue}`);
        }
      });
      promptParts.push('(These enhancements are core parts of the character\'s identity and should be prominently featured in the description, personality, and backstory)');
    }

    // Add enhancement effects if provided
    if (characterData.enhancementEffects) {
      const effects = characterData.enhancementEffects;
      if (effects.traits && effects.traits.length > 0) {
        promptParts.push(`Special Traits: ${effects.traits.join(', ')}`);
      }
      if (effects.languages && effects.languages.length > 0) {
        promptParts.push(`Additional Languages: ${effects.languages.join(', ')}`);
      }
      if (effects.equipment && effects.equipment.length > 0) {
        promptParts.push(`Special Equipment: ${effects.equipment.join(', ')}`);
      }
      if (effects.skillBonus && effects.skillBonus.length > 0) {
        promptParts.push(`Skill Bonuses: ${effects.skillBonus.join(', ')}`);
      }
    }

    // Add ability score context if available
    if (characterData.ability_scores) {
      const scores = characterData.ability_scores;
      promptParts.push('Notable ability scores:');
      if (scores.strength >= 15) promptParts.push('- Strong and powerful');
      if (scores.dexterity >= 15) promptParts.push('- Agile and quick');
      if (scores.constitution >= 15) promptParts.push('- Hardy and resilient');
      if (scores.intelligence >= 15) promptParts.push('- Intelligent and clever');
      if (scores.wisdom >= 15) promptParts.push('- Wise and perceptive');
      if (scores.charisma >= 15) promptParts.push('- Charismatic and compelling');
    }

    // Tone specification
    promptParts.push(`Tone: Write in a ${tone} style appropriate for D&D fantasy setting.`);

    // Output format requirements
    promptParts.push('\nPlease provide the following sections with EXACT formatting using bold markdown headers:');
    promptParts.push('');
    promptParts.push('**DESCRIPTION:** A comprehensive overview of the character (2-3 sentences)');
    promptParts.push('');

    if (includeAppearance) {
      promptParts.push('**APPEARANCE:** Detailed physical description including height, build, facial features, hair, eyes, scars, tattoos, and clothing style (3-4 sentences)');
      promptParts.push('');
    }

    if (includePersonality) {
      promptParts.push('**PERSONALITY:** Character traits, mannerisms, speech patterns, motivations, fears, and quirks (3-4 sentences)');
      promptParts.push('');
    }

    if (includeBackstory) {
      promptParts.push('**BACKSTORY:** Brief background story explaining how they became who they are, their origins, and what drives them to adventure (3-4 sentences)');
      promptParts.push('');
    }

    promptParts.push('IMPORTANT: Always start each section with the bold header format shown above (e.g., **DESCRIPTION:**). Include all four section headers even if some sections are brief.');

    // D&D-specific guidelines
    promptParts.push('\nGuidelines:');
    promptParts.push('- Use D&D 5E lore and terminology');
    promptParts.push('- Make the character feel authentic to their SPECIFIED race and subrace (if provided)');
    promptParts.push('- Include specific details that make the character unique');
    promptParts.push('- Ensure the personality matches their background and alignment');
    promptParts.push('- Create hooks for future roleplay and storytelling');
    promptParts.push('- NEVER assume details not explicitly provided (e.g., do not assume Hill Dwarf if only Dwarf is specified)');
    promptParts.push('- Only use the specific subrace if explicitly provided in the character data');
    promptParts.push('- Base descriptions strictly on the provided information without making assumptions');
    
    return promptParts.join('\n');
  }

  /**
   * Parse the AI response and extract different description components
   * @param response - Raw AI response text
   * @param characterData - Original character data for fallbacks
   * @returns Parsed description components
   */
  private parseDescriptionResponse(response: string, characterData: CharacterData): EnhancedDescription {
    try {
      const sections = this.extractSections(response);
      console.log('Extracted sections:', sections);
      
      const result = {
        description: sections.DESCRIPTION || sections.description || 
                    `${characterData.name || 'The character'} is a ${characterData.race || 'heroic'} ${characterData.class || 'adventurer'}.`,
        appearance: sections.APPEARANCE || sections.appearance || 
                   `A typical ${characterData.race || 'adventurer'} with ${characterData.class || 'heroic'} characteristics.`,
        personality_traits: sections.PERSONALITY || sections.personality || 
                           'Determined and adventurous, ready for any challenge.',
        backstory_elements: sections.BACKSTORY || sections.backstory || 
                           `${characterData.name || 'This character'} has chosen the adventuring life to fulfill their destiny.`
      };
      console.log('Parsed description result:', result);
      return result;
    } catch (error) {
      console.error('Error parsing description response:', error);
      
      // If parsing fails, use the entire response as description
      const cleanResponse = response.replace(/[A-Z]+:/g, '').trim();
      const sentences = cleanResponse.split('.').filter(s => s.trim());
      
      return {
        description: sentences.slice(0, 2).join('.') + '.' || `${characterData.name || 'The character'} is a ${characterData.race || 'heroic'} ${characterData.class || 'adventurer'}.`,
        appearance: sentences.slice(2, 4).join('.') + '.' || `A typical ${characterData.race || 'adventurer'} with ${characterData.class || 'heroic'} characteristics.`,
        personality_traits: sentences.slice(4, 6).join('.') + '.' || 'Determined and adventurous, ready for any challenge.',
        backstory_elements: sentences.slice(6, 8).join('.') + '.' || `${characterData.name || 'This character'} has chosen the adventuring life to fulfill their destiny.`
      };
    }
  }

  /**
   * Extract sections from AI response text
   * @param text - Response text containing sections
   * @returns Object with extracted sections
   */
  private extractSections(text: string): Record<string, string> {
    const sections: Record<string, string> = {};

    console.log('=== PARSING DEBUG ===');
    console.log('Full text to parse:', text);
    console.log('Text length:', text.length);

    // First, let's try a more reliable approach by splitting the text by section headers
    const sectionHeaders = ['**DESCRIPTION:**', '**APPEARANCE:**', '**PERSONALITY:**', '**BACKSTORY:**'];

    // Find all section positions
    const sectionPositions: Array<{header: string, start: number}> = [];
    sectionHeaders.forEach(header => {
      const index = text.indexOf(header);
      if (index !== -1) {
        sectionPositions.push({header, start: index});
      }
    });

    console.log('Found section positions:', sectionPositions);

    // Sort by position
    sectionPositions.sort((a, b) => a.start - b.start);

    // Extract each section
    for (let i = 0; i < sectionPositions.length; i++) {
      const currentPos = sectionPositions[i];
      const nextPos = sectionPositions[i + 1];

      // Extract the header
      const header = currentPos.header.replace(/^\*\*(.*):\*\*$/, '$1').toUpperCase();

      // Extract the content
      let contentStart = currentPos.start + currentPos.header.length;
      let contentEnd = nextPos ? nextPos.start : text.length;
      let content = text.substring(contentStart, contentEnd).trim();

      if (content) {
        sections[header] = content;
        console.log(`✅ Extracted ${header}:`, content.substring(0, 100) + '...');
      }
    }

    // If no sections were found with the position-based approach, try the original regex as fallback
    if (Object.keys(sections).length === 0) {
      console.log('Position-based approach failed, trying regex fallback...');

      // Try bold markdown headers with colon (**SECTION:**)
      const boldMarkdownRegex = /\*\*(DESCRIPTION|APPEARANCE|PERSONALITY|BACKSTORY)\*\*:\s*([\s\S]*?)(?=\*\*[A-Z]+:\*\*|$)/g;
      let match;
      while ((match = boldMarkdownRegex.exec(text)) !== null) {
        const [, key, value] = match;
        const sectionKey = key.trim().toUpperCase();
        const cleanedValue = value.trim();
        if (cleanedValue) {
          sections[sectionKey] = cleanedValue;
          console.log(`Extracted ${sectionKey} (regex fallback):`, cleanedValue.substring(0, 100) + '...');
        }
      }
    }

    // Log final extraction results
    console.log('=== PARSING RESULTS ===');
    console.log('Final extracted sections:', Object.keys(sections));
    console.log('Section count:', Object.keys(sections).length);
    Object.entries(sections).forEach(([key, value]) => {
      console.log(`${key}: ${value.substring(0, 150)}...`);
    });

    return sections;
  }

  /**
   * Generate a quick description for immediate use
   * @param characterData - Character data
   * @returns Simple description string
   */
  async generateQuickDescription(characterData: CharacterData): Promise<string> {
    try {
      const enhancementText = characterData.enhancementSelections && characterData.enhancementSelections.length > 0
        ? `\n        Special Traits: ${characterData.enhancementSelections.map(s => Array.isArray(s.value) ? s.value.join(', ') : s.value).join('; ')}`
        : '';

      const prompt = `Create a brief, engaging description (1-2 sentences) for this D&D character:
        Name: ${characterData.name}
        Race: ${characterData.race || 'Human'}
        Class: ${characterData.class || 'Adventurer'}
        Background: ${characterData.background || 'Unknown'}${enhancementText}

        Make it exciting and suitable for a character card. If special traits are provided, incorporate them prominently.`;

      const response = await geminiService.generateText({
        prompt,
        model: 'gemini-2.5-flash-lite',
        maxTokens: 100,
        temperature: 0.7,
      });

      return response.trim();
    } catch (error) {
      console.error('Failed to generate quick description with Gemini:', error);

      // Try OpenRouter as fallback
      try {
        console.log('Attempting to generate quick description with OpenRouter fallback...');

        const response = await openRouterService.generateText({
          prompt,
          model: 'google/gemini-2.0-flash-exp:free',
          maxTokens: 100,
          temperature: 0.7
        });

        console.log('Successfully generated quick description with OpenRouter fallback');
        return response.trim();
      } catch (fallbackError) {
        console.error('OpenRouter fallback also failed for quick description:', fallbackError);
        return `${characterData.name || 'This character'} is a ${characterData.race || 'heroic'} ${characterData.class || 'adventurer'} ready for adventure.`;
      }
    }
  }
}

// Export singleton instance
export const characterDescriptionGenerator = new CharacterDescriptionGenerator();
