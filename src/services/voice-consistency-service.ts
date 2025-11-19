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

import { supabase } from '@/integrations/supabase/client';
import { VoiceMapper, VoiceConfig } from './voice-mapper';
import logger from '@/lib/logger';
import { geminiService } from './gemini-service';

export interface CharacterVoiceMapping {
  id: string;
  session_id: string | null;
  character_name: string;
  voice_id: string | null;
  voice_category: string;
  appearance_count: number | null;
  first_appearance: string | null;
  last_used: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string | null;
  updated_at: string | null;
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

export interface VoiceProfile {
  id?: string;
  character_id: string;
  voice_style: string;
  speech_patterns: string[];
  vocabulary_level: 'simple' | 'average' | 'advanced' | 'archaic';
  tone: string;
  quirks: string[];
  example_phrases: string[];
  consistency_score: number;
  created_at?: Date;
  updated_at?: Date;
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
   * Get voice mappings for a session
   * Retrieves all character voice mappings for this specific session
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
    try {
      // Query voice mappings directly by session_id
      const { data, error } = await supabase
        .from('character_voice_mappings')
        .select('*')
        .eq('session_id', sessionId);

      if (error) {
        logger.error('Error fetching voice mappings:', error);
        return [];
      }

      if (!data || data.length === 0) {
        logger.debug(`No voice mappings found for session: ${sessionId}`);
        return [];
      }

      // Transform to the expected format
      return data.map((mapping) => ({
        id: mapping.id,
        characterName: mapping.character_name,
        voiceCategory: mapping.voice_category,
        lastUsed: new Date(mapping.last_used || mapping.updated_at || Date.now()),
        appearanceCount: mapping.appearance_count || 1,
      }));
    } catch (error) {
      logger.error('Error getting session mappings:', error);
      return [];
    }
  }

  /**
   * Save a new character voice mapping
   */
  private async saveCharacterVoiceMapping(
    sessionId: string,
    characterName: string,
    voiceCategory: string,
    voiceId: string,
  ): Promise<void> {
    try {
      const now = new Date().toISOString();
      const { error } = await supabase.from('character_voice_mappings').insert({
        session_id: sessionId,
        character_name: characterName,
        voice_category: voiceCategory,
        voice_id: voiceId,
        appearance_count: 1,
        first_appearance: now,
        last_used: now,
        metadata: {},
      });

      if (error) throw error;

      logger.info(`💾 Saved voice mapping: ${characterName} -> ${voiceCategory} (${voiceId})`);
    } catch (error) {
      logger.error('Error saving character voice mapping:', error);
    }
  }

  /**
   * Update character usage statistics
   */
  private async updateCharacterUsage(mappingId: string): Promise<void> {
    try {
      // First, get the current appearance count
      const { data: mapping, error: fetchError } = await supabase
        .from('character_voice_mappings')
        .select('appearance_count')
        .eq('id', mappingId)
        .single();

      if (fetchError) throw fetchError;

      const currentCount = mapping?.appearance_count || 0;

      // Update with incremented count and new timestamp
      const { error } = await supabase
        .from('character_voice_mappings')
        .update({
          appearance_count: currentCount + 1,
          last_used: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', mappingId);

      if (error) throw error;

      logger.debug(`📊 Updated character usage for mapping: ${mappingId} (count: ${currentCount + 1})`);
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

  /**
   * Retrieves the voice profile for a character
   */
  async getVoiceProfile(characterId: string): Promise<VoiceProfile | null> {
    try {
      const { data, error } = await supabase
        .from('character_voice_profiles')
        .select('*')
        .eq('character_id', characterId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No voice profile found (not an error)
          logger.debug(`No voice profile found for character: ${characterId}`);
          return null;
        }
        logger.error('Error fetching voice profile:', error);
        return null;
      }

      return data as VoiceProfile;
    } catch (error) {
      logger.error('Error accessing voice profile database:', error);
      return null;
    }
  }

  /**
   * Creates or updates a character's voice profile
   */
  async upsertVoiceProfile(
    characterId: string,
    profile: Partial<Omit<VoiceProfile, 'id' | 'character_id' | 'created_at' | 'updated_at'>>,
  ): Promise<VoiceProfile | null> {
    try {
      const { data, error } = await supabase
        .from('character_voice_profiles')
        .upsert({
          character_id: characterId,
          voice_style: profile.voice_style || '',
          speech_patterns: profile.speech_patterns || [],
          vocabulary_level: profile.vocabulary_level || 'average',
          tone: profile.tone || '',
          quirks: profile.quirks || [],
          example_phrases: profile.example_phrases || [],
          consistency_score: profile.consistency_score || 0.0,
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        logger.error('Failed to upsert voice profile:', error);
        throw new Error(`Failed to upsert voice profile: ${error.message}`);
      }

      logger.info(`✅ Voice profile saved for character: ${characterId}`);
      return data as VoiceProfile;
    } catch (error) {
      logger.error('Error upserting voice profile:', error);
      return null;
    }
  }

  /**
   * Analyzes dialogue to extract voice characteristics using AI
   */
  async analyzeDialogue(dialogue: string[]): Promise<Partial<VoiceProfile>> {
    try {
      if (!dialogue || dialogue.length === 0) {
        logger.warn('No dialogue provided for analysis');
        return {
          voice_style: 'neutral',
          speech_patterns: [],
          vocabulary_level: 'average',
          tone: 'neutral',
          quirks: [],
          example_phrases: [],
          consistency_score: 0.0,
        };
      }

      const prompt = `Analyze the following dialogue samples and extract voice characteristics:

Dialogue samples:
${dialogue.map((line, i) => `${i + 1}. "${line}"`).join('\n')}

Please analyze and provide a JSON response with the following structure:
{
  "voice_style": "string describing overall style (e.g., gruff, eloquent, timid, confident)",
  "speech_patterns": ["array", "of", "speech", "pattern", "descriptors"],
  "vocabulary_level": "simple|average|advanced|archaic",
  "tone": "string describing emotional tone (e.g., serious, humorous, sarcastic)",
  "quirks": ["array", "of", "unique", "speech", "quirks"],
  "example_phrases": ["array", "of", "representative", "phrases"],
  "consistency_score": 0.85
}

Be specific and base your analysis on the actual dialogue provided. The consistency_score should be between 0 and 1.`;

      const response = await geminiService.generateText({
        prompt,
        model: 'gemini-1.5-flash',
        temperature: 0.3,
        maxTokens: 1000,
      });

      // Parse the JSON response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        logger.error('Failed to parse AI response for voice analysis');
        throw new Error('Invalid AI response format');
      }

      const analysis = JSON.parse(jsonMatch[0]);

      // Validate and normalize the response
      const voiceProfile: Partial<VoiceProfile> = {
        voice_style: analysis.voice_style || 'neutral',
        speech_patterns: Array.isArray(analysis.speech_patterns) ? analysis.speech_patterns : [],
        vocabulary_level: ['simple', 'average', 'advanced', 'archaic'].includes(
          analysis.vocabulary_level,
        )
          ? analysis.vocabulary_level
          : 'average',
        tone: analysis.tone || 'neutral',
        quirks: Array.isArray(analysis.quirks) ? analysis.quirks : [],
        example_phrases: Array.isArray(analysis.example_phrases)
          ? analysis.example_phrases
          : dialogue.slice(0, 3),
        consistency_score:
          typeof analysis.consistency_score === 'number'
            ? Math.max(0, Math.min(1, analysis.consistency_score))
            : 0.0,
      };

      logger.info('🎭 Voice analysis completed:', voiceProfile);
      return voiceProfile;
    } catch (error) {
      logger.error('Error analyzing dialogue:', error);

      // Return a default profile on error
      return {
        voice_style: 'neutral',
        speech_patterns: ['conversational'],
        vocabulary_level: 'average',
        tone: 'neutral',
        quirks: [],
        example_phrases: dialogue.slice(0, 3),
        consistency_score: 0.5,
      };
    }
  }
}

// Singleton instance
export const voiceConsistencyService = new VoiceConsistencyService();
