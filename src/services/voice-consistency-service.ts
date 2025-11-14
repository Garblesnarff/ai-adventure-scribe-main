/**
 * Voice Consistency Service
 *
 * Manages persistent character-to-voice mappings across game sessions.
 * Ensures characters maintain the same voice throughout the campaign.
 * Provides context to AI for voice category assignments.
 *
 * Dependencies:
 * - Supabase client (src/integrations/supabase/client.ts)
 * - Voice Mapper Service (src/services/voice-mapper.ts)
 *
 * @author AI Dungeon Master Team
 */

import { VoiceMapper } from './voice-mapper';

import type { VoiceConfig } from './voice-mapper';

import { supabase } from '@/integrations/supabase/client';
import logger from '@/lib/logger';

export interface CharacterVoiceMapping {
  id: string;
  campaign_id: string;
  character_name: string;
  character_type: string;
  voice_id: string;
  voice_provider: string;
  voice_settings: Record<string, unknown>;
  voice_description?: string;
  gender?: string;
  age_range?: string;
  personality_traits?: string[];
  accent?: string;
  created_at: Date;
  updated_at: Date;
}

export interface VoiceAssignment {
  character: string;
  voiceCategory: string;
  voiceConfig: VoiceConfig;
  isNewCharacter: boolean;
}

export interface SessionVoiceContext {
  knownCharacters: Record<
    string,
    {
      voiceCategory: string;
      appearances: number;
      lastUsed: Date;
    }
  >;
  availableVoiceCategories: string[];
}

export class VoiceConsistencyService {
  private sessionCache = new Map<string, Map<string, CharacterVoiceMapping>>();

  /**
   * Get voice context for a session to include in AI prompts
   */
  async getSessionVoiceContext(sessionId: string): Promise<SessionVoiceContext> {
    logger.info('🎭 Getting voice context for session:', sessionId);

    try {
      const mappings = await this.getSessionMappings(sessionId);

      const knownCharacters: SessionVoiceContext['knownCharacters'] =
        {} as SessionVoiceContext['knownCharacters'];
      mappings.forEach((mapping) => {
        knownCharacters[mapping.characterName] = {
          voiceCategory: mapping.voiceCategory,
          appearances: mapping.appearanceCount,
          lastUsed: mapping.lastUsed,
        };
      });

      // Get available voice categories from VoiceMapper
      const allVoices = VoiceMapper.getAllVoices();
      const availableVoiceCategories = Object.keys(allVoices).filter((key) => key !== 'default');

      logger.debug('📋 Voice context:', {
        knownCharacters: Object.keys(knownCharacters),
        availableCategories: availableVoiceCategories.length,
      });

      return {
        knownCharacters,
        availableVoiceCategories,
      };
    } catch (error) {
      logger.error('Error getting session voice context:', error);

      // Return minimal context on error
      const allVoices = VoiceMapper.getAllVoices();
      return {
        knownCharacters: {},
        availableVoiceCategories: Object.keys(allVoices).filter((key) => key !== 'default'),
      };
    }
  }

  /**
   * Process voice assignments from AI response segments
   */
  async processVoiceAssignments(
    sessionId: string,
    segments: Array<{
      type: string;
      text: string;
      character?: string;
      voice_category?: string;
    }>,
  ): Promise<VoiceAssignment[]> {
    logger.info('🎪 Processing voice assignments for', segments.length, 'segments');

    const assignments: VoiceAssignment[] = [];
    const existingMappings = await this.getSessionMappings(sessionId);
    const mappingLookup = new Map(existingMappings.map((m) => [m.characterName, m]));

    for (const segment of segments) {
      if (!segment.character) {
        // Narration - use narrator voice
        assignments.push({
          character: 'narrator',
          voiceCategory: 'narrator',
          voiceConfig: VoiceMapper.getNarratorVoice(),
          isNewCharacter: false,
        });
        continue;
      }

      const cleanCharacter = this.normalizeCharacterName(segment.character);
      const existingMapping = mappingLookup.get(cleanCharacter);

      if (existingMapping) {
        // Use existing voice assignment
        logger.debug(
          `♻️ Using existing voice for "${cleanCharacter}": ${existingMapping.voiceCategory}`,
        );

        assignments.push({
          character: cleanCharacter,
          voiceCategory: existingMapping.voiceCategory,
          voiceConfig:
            VoiceMapper.getAllVoices()[existingMapping.voiceCategory] ||
            VoiceMapper.getAllVoices().default,
          isNewCharacter: false,
        });

        // Update usage
        await this.updateCharacterUsage(existingMapping.id);
      } else {
        // New character - use AI's voice category assignment or fallback
        const voiceCategory = segment.voice_category || this.inferVoiceCategory(cleanCharacter);
        const voiceConfig =
          VoiceMapper.getAllVoices()[voiceCategory] || VoiceMapper.getAllVoices().default;

        logger.info(`✨ New character "${cleanCharacter}" assigned voice: ${voiceCategory}`);

        assignments.push({
          character: cleanCharacter,
          voiceCategory,
          voiceConfig,
          isNewCharacter: true,
        });

        // Save new mapping
        await this.saveCharacterVoiceMapping(
          sessionId,
          cleanCharacter,
          voiceCategory,
          voiceConfig.id,
        );

        // Cache the new mapping
        mappingLookup.set(cleanCharacter, {
          id: '', // Will be set by database
          sessionId,
          characterName: cleanCharacter,
          voiceCategory,
          voiceId: voiceConfig.id,
          firstAppearance: new Date(),
          lastUsed: new Date(),
          appearanceCount: 1,
          metadata: {},
        });
      }
    }

    logger.info(
      '🎯 Voice assignments completed:',
      assignments.map((a) => `${a.character}(${a.voiceCategory})`).join(', '),
    );

    return assignments;
  }

  /**
   * Get all voice mappings for a campaign
   */
  private async getCampaignMappings(campaignId: string): Promise<CharacterVoiceMapping[]> {
    try {
      const { data, error } = await supabase
        .from('character_voice_mappings')
        .select('*')
        .eq('campaign_id', campaignId);

      if (error) {
        logger.error('Error fetching voice mappings:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      logger.error('Error accessing voice mappings database:', error);
      return [];
    }
  }

  /**
   * Get voice mappings for a session (placeholder to avoid runtime errors in dev)
   * TODO: Implement proper lookup once schema and table are finalized
   */
  private async getSessionMappings(sessionId: string): Promise<
    Array<{
      id: string;
      characterName: string;
      voiceCategory: string;
      lastUsed: Date;
      appearanceCount: number;
    }>
  > {
    return [];
  }

  /**
   * Save a new character voice mapping
   */
  private async saveCharacterVoiceMapping(
    campaignId: string,
    characterName: string,
    characterType: string,
    voiceId: string,
    voiceProvider: string = 'elevenlabs',
  ): Promise<void> {
    try {
      const { error } = await supabase.from('character_voice_mappings').insert({
        campaign_id: campaignId,
        character_name: characterName,
        character_type: characterType,
        voice_id: voiceId,
        voice_provider: voiceProvider,
        voice_settings: {},
      });

      if (error) throw error;

      logger.info(`💾 Saved voice mapping: ${characterName} -> ${voiceId}`);
    } catch (error) {
      logger.error('Error saving character voice mapping:', error);
    }
  }

  /**
   * Update character usage statistics
   */
  private async updateCharacterUsage(mappingId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('character_voice_mappings')
        .update({
          updated_at: new Date().toISOString(),
        })
        .eq('id', mappingId);

      if (error) throw error;

      logger.debug(`📊 Updated character usage for mapping: ${mappingId}`);
    } catch (error) {
      logger.error('Error updating character usage:', error);
    }
  }

  /**
   * Normalize character names for consistency
   */
  private normalizeCharacterName(name: string): string {
    return name
      .trim()
      .toLowerCase()
      .replace(/^(the|a|an)\s+/i, '') // Remove articles
      .replace(/[^\w\s'-]/g, '') // Keep only letters, spaces, apostrophes, hyphens
      .replace(/\s+/g, ' ') // Normalize spaces
      .trim();
  }

  /**
   * Infer voice category from character name when AI doesn't provide one
   */
  private inferVoiceCategory(characterName: string): string {
    const name = characterName.toLowerCase();

    // Check for character type keywords
    const keywords = {
      elder: ['wizard', 'sage', 'old', 'ancient', 'elder', 'master', 'thorne'],
      villain_male: ['villain', 'dark', 'evil', 'lord', 'demon', 'shadow'],
      villain_female: ['witch', 'sorceress', 'dark lady', 'empress'],
      guard: ['guard', 'soldier', 'captain', 'knight', 'watchman'],
      merchant: ['merchant', 'trader', 'shopkeeper', 'vendor'],
      child: ['child', 'kid', 'young', 'boy', 'girl'],
      monster: ['dragon', 'beast', 'creature', 'monster', 'giant'],
      goblin: ['goblin', 'imp', 'sprite', 'kobold'],
    };

    for (const [category, keywordList] of Object.entries(keywords)) {
      if (keywordList.some((keyword) => name.includes(keyword))) {
        return category;
      }
    }

    // Default fallbacks
    if (name.includes('female') || name.includes('woman') || name.includes('lady')) {
      return 'hero_female';
    }

    // Default to male hero voice
    return 'hero_male';
  }

  /**
   * Clear cache for a session (useful for debugging)
   */
  clearSessionCache(sessionId: string): void {
    this.sessionCache.delete(sessionId);
    logger.info(`🗑️ Cleared voice cache for session: ${sessionId}`);
  }

  /**
   * Get character mapping statistics for debugging
   */
  async getSessionStats(sessionId: string): Promise<{
    totalCharacters: number;
    voiceCategoryCounts: Record<string, number>;
    recentCharacters: string[];
  }> {
    const mappings = await this.getSessionMappings(sessionId);

    const voiceCategoryCounts: Record<string, number> = {};
    mappings.forEach((mapping) => {
      voiceCategoryCounts[mapping.voiceCategory] =
        (voiceCategoryCounts[mapping.voiceCategory] || 0) + 1;
    });

    const recentCharacters = mappings
      .sort((a, b) => b.lastUsed.getTime() - a.lastUsed.getTime())
      .slice(0, 5)
      .map((m) => `${m.characterName}(${m.voiceCategory})`);

    return {
      totalCharacters: mappings.length,
      voiceCategoryCounts,
      recentCharacters,
    };
  }
}

// Singleton instance
export const voiceConsistencyService = new VoiceConsistencyService();
