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
import logger from '@/lib/logger';
import { GEMINI_TEXT_MODEL } from '@/config/ai';
import {
  buildCharacterDescriptionPrompt,
  type CharacterPromptData,
  type DescriptionPromptOptions,
} from '@/services/prompts/characterPrompts';

interface EnhancedDescription {
  description: string;
  appearance: string;
  personality_traits: string;
  backstory_elements: string;
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
    characterData: CharacterPromptData,
    options: DescriptionPromptOptions = {}
  ): Promise<EnhancedDescription> {
    try {
      const prompt = buildCharacterDescriptionPrompt(characterData, options);
      logger.info('Generating character description with Gemini...');

      const response = await geminiService.generateText({
        prompt,
        model: GEMINI_TEXT_MODEL,
        maxTokens: 1000,
        temperature: 0.8,
      });

      logger.debug('Raw Gemini response:', response);
      logger.debug('Response type:', typeof response);
      logger.debug('Response length:', response.length);

      if (!response || response.trim() === '') {
        logger.warn('Empty or null response from Gemini API');
        throw new Error('Received empty response from AI service');
      }

      const enhancedDescription = this.parseDescriptionResponse(response, characterData);

      logger.info('Successfully generated character description');
      return enhancedDescription;

    } catch (error) {
      logger.error('Failed to generate character description with Gemini:', error);

      // Try OpenRouter as fallback
      try {
        logger.info('Attempting to generate character description with OpenRouter fallback...');
        const prompt = buildCharacterDescriptionPrompt(characterData, options);

        const response = await openRouterService.generateText({
          prompt,
          model: 'google/gemini-2.0-flash-exp:free',
          maxTokens: 1000,
          temperature: 0.8
        });

        logger.debug('Raw OpenRouter response:', response);

        if (!response || response.trim() === '') {
          throw new Error('Received empty response from OpenRouter');
        }

        const enhancedDescription = this.parseDescriptionResponse(response, characterData);
        logger.info('Successfully generated character description with OpenRouter fallback');
        return enhancedDescription;

      } catch (fallbackError) {
        logger.error('OpenRouter fallback also failed:', fallbackError);

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
   * Parse the AI response and extract different description components
   * @param response - Raw AI response text
   * @param characterData - Original character data for fallbacks
   * @returns Parsed description components
   */
  private parseDescriptionResponse(response: string, characterData: CharacterPromptData): EnhancedDescription {
    try {
      const sections = this.extractSections(response);
      logger.debug('Extracted sections:', sections);
      
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
      logger.debug('Parsed description result:', result);
      return result;
    } catch (error) {
      logger.error('Error parsing description response:', error);
      
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

    logger.debug('=== PARSING DEBUG ===');
    logger.debug('Full text to parse:', text);
    logger.debug('Text length:', text.length);

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

    logger.debug('Found section positions:', sectionPositions);

    // Sort by position
    sectionPositions.sort((a, b) => a.start - b.start);

    // Extract each section
    for (let i = 0; i < sectionPositions.length; i++) {
      const currentPos = sectionPositions[i];
      const nextPos = sectionPositions[i + 1];

      // Extract the header
      const header = currentPos.header.replace(/^\*\*(.*):\*\*$/, '$1').toUpperCase();

      // Extract the content
      const contentStart = currentPos.start + currentPos.header.length;
      const contentEnd = nextPos ? nextPos.start : text.length;
      const content = text.substring(contentStart, contentEnd).trim();

      if (content) {
        sections[header] = content;
        logger.debug(`✅ Extracted ${header}:`, content.substring(0, 100) + '...');
      }
    }

    // If no sections were found with the position-based approach, try the original regex as fallback
    if (Object.keys(sections).length === 0) {
      logger.debug('Position-based approach failed, trying regex fallback...');

      // Try bold markdown headers with colon (**SECTION:**)
      const boldMarkdownRegex = /\*\*(DESCRIPTION|APPEARANCE|PERSONALITY|BACKSTORY)\*\*:\s*([\s\S]*?)(?=\*\*[A-Z]+:\*\*|$)/g;
      let match;
      while ((match = boldMarkdownRegex.exec(text)) !== null) {
        const [, key, value] = match;
        const sectionKey = key.trim().toUpperCase();
        const cleanedValue = value.trim();
        if (cleanedValue) {
          sections[sectionKey] = cleanedValue;
          logger.debug(`Extracted ${sectionKey} (regex fallback):`, cleanedValue.substring(0, 100) + '...');
        }
      }
    }

    // Log final extraction results
    logger.debug('=== PARSING RESULTS ===');
    logger.debug('Final extracted sections:', Object.keys(sections));
    logger.debug('Section count:', Object.keys(sections).length);
    Object.entries(sections).forEach(([key, value]) => {
      logger.debug(`${key}: ${value.substring(0, 150)}...`);
    });

    return sections;
  }

  /**
   * Generate a quick description for immediate use
   * @param characterData - Character data
   * @returns Simple description string
   */
  async generateQuickDescription(characterData: CharacterPromptData): Promise<string> {
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
        model: GEMINI_TEXT_MODEL,
        maxTokens: 100,
        temperature: 0.7,
      });

      return response.trim();
    } catch (error) {
      logger.error('Failed to generate quick description with Gemini:', error);

      // Try OpenRouter as fallback
      try {
        logger.info('Attempting to generate quick description with OpenRouter fallback...');

        const response = await openRouterService.generateText({
          prompt,
          model: 'google/gemini-2.0-flash-exp:free',
          maxTokens: 100,
          temperature: 0.7
        });

        logger.info('Successfully generated quick description with OpenRouter fallback');
        return response.trim();
      } catch (fallbackError) {
        logger.error('OpenRouter fallback also failed for quick description:', fallbackError);
        return `${characterData.name || 'This character'} is a ${characterData.race || 'heroic'} ${characterData.class || 'adventurer'} ready for adventure.`;
      }
    }
  }
}

// Export singleton instance
export const characterDescriptionGenerator = new CharacterDescriptionGenerator();
