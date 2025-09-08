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

export interface CharacterVoiceMapping {
  id: string;
  sessionId: string;
  characterName: string;
  voiceCategory: string;
  voiceId: string;
  firstAppearance: Date;
  lastUsed: Date;
  appearanceCount: number;
  metadata: Record<string, any>;
}

export interface VoiceAssignment {
  character: string;
  voiceCategory: string;
  voiceConfig: VoiceConfig;
  isNewCharacter: boolean;
}

export interface SessionVoiceContext {
  knownCharacters: Record<string, {
    voiceCategory: string;
    appearances: number;
    lastUsed: Date;
  }>;
  availableVoiceCategories: string[];
}

export class VoiceConsistencyService {
  private sessionCache = new Map<string, Map<string, CharacterVoiceMapping>>();

  /**
   * Get voice context for a session to include in AI prompts
   */
  async getSessionVoiceContext(sessionId: string): Promise<SessionVoiceContext> {
    console.log('🎭 Getting voice context for session:', sessionId);

    try {
      const mappings = await this.getSessionMappings(sessionId);
      
      const knownCharacters: Record<string, any> = {};
      mappings.forEach(mapping => {
        knownCharacters[mapping.characterName] = {
          voiceCategory: mapping.voiceCategory,
          appearances: mapping.appearanceCount,
          lastUsed: mapping.lastUsed
        };
      });

      // Get available voice categories from VoiceMapper
      const allVoices = VoiceMapper.getAllVoices();
      const availableVoiceCategories = Object.keys(allVoices).filter(key => key !== 'default');

      console.log('📋 Voice context:', {
        knownCharacters: Object.keys(knownCharacters),
        availableCategories: availableVoiceCategories.length
      });

      return {
        knownCharacters,
        availableVoiceCategories
      };
    } catch (error) {
      console.error('Error getting session voice context:', error);
      
      // Return minimal context on error
      const allVoices = VoiceMapper.getAllVoices();
      return {
        knownCharacters: {},
        availableVoiceCategories: Object.keys(allVoices).filter(key => key !== 'default')
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
    }>
  ): Promise<VoiceAssignment[]> {
    console.log('🎪 Processing voice assignments for', segments.length, 'segments');

    const assignments: VoiceAssignment[] = [];
    const existingMappings = await this.getSessionMappings(sessionId);
    const mappingLookup = new Map(
      existingMappings.map(m => [m.characterName, m])
    );

    for (const segment of segments) {
      if (!segment.character) {
        // Narration - use narrator voice
        assignments.push({
          character: 'narrator',
          voiceCategory: 'narrator',
          voiceConfig: VoiceMapper.getNarratorVoice(),
          isNewCharacter: false
        });
        continue;
      }

      const cleanCharacter = this.normalizeCharacterName(segment.character);
      const existingMapping = mappingLookup.get(cleanCharacter);

      if (existingMapping) {
        // Use existing voice assignment
        console.log(`♻️ Using existing voice for "${cleanCharacter}": ${existingMapping.voiceCategory}`);
        
        assignments.push({
          character: cleanCharacter,
          voiceCategory: existingMapping.voiceCategory,
          voiceConfig: VoiceMapper.getAllVoices()[existingMapping.voiceCategory] || VoiceMapper.getAllVoices().default,
          isNewCharacter: false
        });

        // Update usage
        await this.updateCharacterUsage(existingMapping.id);
      } else {
        // New character - use AI's voice category assignment or fallback
        const voiceCategory = segment.voice_category || this.inferVoiceCategory(cleanCharacter);
        const voiceConfig = VoiceMapper.getAllVoices()[voiceCategory] || VoiceMapper.getAllVoices().default;

        console.log(`✨ New character "${cleanCharacter}" assigned voice: ${voiceCategory}`);

        assignments.push({
          character: cleanCharacter,
          voiceCategory,
          voiceConfig,
          isNewCharacter: true
        });

        // Save new mapping
        await this.saveCharacterVoiceMapping(sessionId, cleanCharacter, voiceCategory, voiceConfig.id);
        
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
          metadata: {}
        });
      }
    }

    console.log('🎯 Voice assignments completed:', assignments.map(a => 
      `${a.character}(${a.voiceCategory})`
    ).join(', '));

    return assignments;
  }

  /**
   * Get all voice mappings for a session
   */
  private async getSessionMappings(sessionId: string): Promise<CharacterVoiceMapping[]> {
    // TODO: Database table 'character_voice_mappings' doesn't exist yet
    // Return empty array for now to prevent errors
    console.log('⚠️ Voice consistency database not available, using in-memory mapping');
    return [];
    
    // Check cache first
    // const cached = this.sessionCache.get(sessionId);
    // if (cached) {
    //   return Array.from(cached.values());
    // }

    // try {
    //   const { data, error } = await supabase
    //     .from('character_voice_mappings')
    //     .select('*')
    //     .eq('session_id', sessionId)
    //     .order('first_appearance', { ascending: true });

    //   if (error) throw error;

    //   const mappings: CharacterVoiceMapping[] = (data || []).map(row => ({
    //     id: row.id,
    //     sessionId: row.session_id,
    //     characterName: row.character_name,
    //     voiceCategory: row.voice_category,
    //     voiceId: row.voice_id,
    //     firstAppearance: new Date(row.first_appearance),
    //     lastUsed: new Date(row.last_used),
    //     appearanceCount: row.appearance_count,
    //     metadata: row.metadata || {}
    //   }));

    //   // Update cache
    //   const mappingMap = new Map();
    //   mappings.forEach(mapping => {
    //     mappingMap.set(mapping.characterName, mapping);
    //   });
    //   this.sessionCache.set(sessionId, mappingMap);

    //   return mappings;
    // } catch (error) {
    //   console.error('Error fetching session mappings:', error);
    //   return [];
    // }
  }

  /**
   * Save a new character voice mapping
   */
  private async saveCharacterVoiceMapping(
    sessionId: string,
    characterName: string,
    voiceCategory: string,
    voiceId: string
  ): Promise<void> {
    // TODO: Database table doesn't exist yet, skip database save
    console.log(`⚠️ Voice mapping not saved to database: ${characterName} -> ${voiceCategory}`);
    return;
    
    // try {
    //   const { error } = await supabase
    //     .from('character_voice_mappings')
    //     .insert({
    //       session_id: sessionId,
    //       character_name: characterName,
    //       voice_category: voiceCategory,
    //       voice_id: voiceId,
    //       appearance_count: 1,
    //       metadata: {}
    //     });

    //   if (error) throw error;

    //   // Invalidate cache
    //   this.sessionCache.delete(sessionId);

    //   console.log(`💾 Saved voice mapping: ${characterName} -> ${voiceCategory}`);
    // } catch (error) {
    //   console.error('Error saving character voice mapping:', error);
    // }
  }

  /**
   * Update character usage statistics
   */
  private async updateCharacterUsage(mappingId: string): Promise<void> {
    // TODO: Database table doesn't exist yet, skip update
    console.log(`⚠️ Character usage update skipped for mapping: ${mappingId}`);
    return;
    
    // try {
    //   // First get the current appearance count
    //   const { data: currentData, error: fetchError } = await supabase
    //     .from('character_voice_mappings')
    //     .select('appearance_count')
    //     .eq('id', mappingId)
    //     .single();

    //   if (fetchError) throw fetchError;

    //   const newCount = (currentData?.appearance_count || 0) + 1;

    //   // Update with incremented count
    //   const { error } = await supabase
    //     .from('character_voice_mappings')
    //     .update({
    //       last_used: new Date().toISOString(),
    //       appearance_count: newCount,
    //       updated_at: new Date().toISOString()
    //     })
    //     .eq('id', mappingId);

    //   if (error) throw error;
    // } catch (error) {
    //   console.error('Error updating character usage:', error);
    // }
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
      goblin: ['goblin', 'imp', 'sprite', 'kobold']
    };

    for (const [category, keywordList] of Object.entries(keywords)) {
      if (keywordList.some(keyword => name.includes(keyword))) {
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
    console.log(`🗑️ Cleared voice cache for session: ${sessionId}`);
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
    mappings.forEach(mapping => {
      voiceCategoryCounts[mapping.voiceCategory] = 
        (voiceCategoryCounts[mapping.voiceCategory] || 0) + 1;
    });

    const recentCharacters = mappings
      .sort((a, b) => b.lastUsed.getTime() - a.lastUsed.getTime())
      .slice(0, 5)
      .map(m => `${m.characterName}(${m.voiceCategory})`);

    return {
      totalCharacters: mappings.length,
      voiceCategoryCounts,
      recentCharacters
    };
  }
}

// Singleton instance
export const voiceConsistencyService = new VoiceConsistencyService();