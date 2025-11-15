/**
 * Voice Director Service
 *
 * Single source of truth for voice synthesis management.
 * Replaces complex parsing chain with simple, direct approach.
 *
 * Key principles:
 * - AI segments are trusted - no re-parsing needed
 * - Character names map to consistent voices via pools
 * - Progressive audio generation and playback
 * - Robust fallbacks at every step
 *
 * @author AI Dungeon Master Team
 */
import logger from '@/lib/logger';

// Core types for voice management
export interface VoiceSegment {
  id: string;
  type: 'dm' | 'character';
  text: string;
  character?: string;
  voiceId: string;
  voiceName: string;
  voiceSettings: {
    stability: number;
    similarity_boost: number;
    style?: number;
    use_speaker_boost?: boolean;
  };
  audioUrl?: string;
  audioBlob?: Blob;
  isGenerating?: boolean;
  isPlaying?: boolean;
  error?: string;
}

export interface VoicePool {
  dm: VoiceConfig[];
  heroes: VoiceConfig[];
  npcs: VoiceConfig[];
  villains: VoiceConfig[];
  creatures: VoiceConfig[];
}

export interface VoiceConfig {
  id: string;
  name: string;
  description: string;
  settings: {
    stability: number;
    similarity_boost: number;
    style?: number;
    use_speaker_boost?: boolean;
  };
}

export interface AISegment {
  type: 'dm' | 'character';
  text: string;
  character?: string;
  voice_category?: string;
}

export class VoiceDirector {
  // Logger
  // Centralized logging utility for level-based filtering

  private static readonly ELEVENLABS_MODEL = 'eleven_turbo_v2_5'; // Revert to working model

  // Persistent storage key for character-voice mappings
  private static readonly CHARACTER_VOICE_CACHE_KEY = 'voice-director-character-mappings';

  // Simplified voice pools - fewer options, clearer choices
  private static readonly VOICE_POOLS: VoicePool = {
    dm: [
      {
        id: 'T0GKiSwCb51L7pv1sshd', // Same voice ID as old AudioPlayer
        name: 'DM Voice',
        description: 'Main DM narrator voice (old compatible)',
        settings: {
          stability: 0.5,
          similarity_boost: 0.75,
          // Remove style and use_speaker_boost to match old settings
        },
      },
    ],

    heroes: [
      {
        id: 'GBv7mTt0atIp3Br8iCZE', // Thomas
        name: 'Thomas',
        description: 'Noble male hero voice',
        settings: {
          stability: 0.6,
          similarity_boost: 0.8,
          style: 0.2,
          use_speaker_boost: true,
        },
      },
      {
        id: 'BlgEcC0TfWpBak7FmvHW', // Fena
        name: 'Fena',
        description: 'Young female hero voice',
        settings: {
          stability: 0.5,
          similarity_boost: 0.75,
          style: 0.3,
          use_speaker_boost: true,
        },
      },
    ],

    npcs: [
      {
        id: 'pMsXgVXv3BLzUgSXRplE', // Serena
        name: 'Serena',
        description: 'Warm innkeeper voice',
        settings: {
          stability: 0.6,
          similarity_boost: 0.8,
          style: 0.2,
          use_speaker_boost: true,
        },
      },
      {
        id: 'g2W4HAjKvdW93AmsjsOx', // Nathan
        name: 'Nathan',
        description: 'Friendly merchant voice',
        settings: {
          stability: 0.4,
          similarity_boost: 0.8,
          style: 0.4,
          use_speaker_boost: true,
        },
      },
      {
        id: 'yoZ06aMxZJJ28mfd3POQ', // Sam
        name: 'Sam',
        description: 'Wise elder voice',
        settings: {
          stability: 0.8,
          similarity_boost: 0.8,
          style: 0.1,
          use_speaker_boost: true,
        },
      },
    ],

    villains: [
      {
        id: '2gPFXx8pN3Avh27Dw5Ma', // Oxley
        name: 'Oxley',
        description: 'Ominous male villain voice',
        settings: {
          stability: 0.7,
          similarity_boost: 0.9,
          style: 0.4,
          use_speaker_boost: true,
        },
      },
      {
        id: 'flHkNRp1BlvT73UL6gyz', // Jessica Anne Bogart
        name: 'Jessica Anne Bogart',
        description: 'Wickedly eloquent female villain voice',
        settings: {
          stability: 0.8,
          similarity_boost: 0.85,
          style: 0.5,
          use_speaker_boost: true,
        },
      },
    ],

    creatures: [
      {
        id: 'cPoqAvGWCPfCfyPMwe4z', // Kallixis
        name: 'Kallixis',
        description: 'Deep ancient malevolence voice',
        settings: {
          stability: 0.9,
          similarity_boost: 0.7,
          style: 0.1,
          use_speaker_boost: false,
        },
      },
      {
        id: 'dfZGXKiIzjizWtJ0NgPy', // Michael Mouse
        name: 'Michael Mouse',
        description: 'High-pitched comic character for goblins',
        settings: {
          stability: 0.3,
          similarity_boost: 0.6,
          style: 0.6,
          use_speaker_boost: true,
        },
      },
    ],
  };

  // Character voice assignments (persistent)
  private static characterVoiceMap: Map<string, VoiceConfig> | null = null;

  // Audio cache for generated segments
  private static audioCache: Map<string, { audioBlob: Blob; timestamp: number }> = new Map();
  private static readonly CACHE_MAX_SIZE = 50;
  private static readonly CACHE_MAX_AGE = 1000 * 60 * 60; // 1 hour

  /**
   * Generate cache key for audio segments
   */
  private static generateCacheKey(voiceId: string, text: string): string {
    // Simple hash function for text
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return `${voiceId}_${Math.abs(hash)}`;
  }

  /**
   * Clean expired cache entries
   */
  private static cleanExpiredCache(): void {
    const now = Date.now();
    for (const [key, value] of VoiceDirector.audioCache.entries()) {
      if (now - value.timestamp > VoiceDirector.CACHE_MAX_AGE) {
        VoiceDirector.audioCache.delete(key);
      }
    }
  }

  /**
   * Manage cache size
   */
  private static manageCacheSize(): void {
    if (VoiceDirector.audioCache.size > VoiceDirector.CACHE_MAX_SIZE) {
      // Remove oldest entries
      const entries = Array.from(VoiceDirector.audioCache.entries()).sort(
        (a, b) => a[1].timestamp - b[1].timestamp,
      );

      const toRemove = entries.slice(0, 10); // Remove 10 oldest
      toRemove.forEach(([key]) => {
        VoiceDirector.audioCache.delete(key);
      });

      logger.info(`🧹 Cleaned up ${toRemove.length} old audio cache entries`);
    }
  }

  /**
   * Ensure the characterVoiceMap is initialized
   */
  private static ensureMapInitialized(): Map<string, VoiceConfig> {
    if (!VoiceDirector.characterVoiceMap) {
      VoiceDirector.characterVoiceMap = new Map<string, VoiceConfig>();
    }
    return VoiceDirector.characterVoiceMap;
  }

  /**
   * Convert AI segments to voice-ready segments
   * This is the main entry point - replaces the complex parsing chain
   */
  static processAISegments(aiSegments: AISegment[], sessionId?: string): VoiceSegment[] {
    logger.info('🎭 VoiceDirector: Processing', aiSegments.length, 'AI segments');

    const voiceSegments: VoiceSegment[] = [];

    for (let i = 0; i < aiSegments.length; i++) {
      const segment = aiSegments[i];

      try {
        // Clean and validate text
        const cleanText = VoiceDirector.cleanSegmentText(segment.text);
        if (!cleanText) {
          logger.warn(`⚠️ Skipping empty segment ${i + 1}`);
          continue;
        }

        // Assign voice based on type and character
        const voiceConfig = VoiceDirector.assignVoice(segment);

        const voiceSegment: VoiceSegment = {
          id: `segment_${Date.now()}_${i}`,
          type: segment.type,
          text: cleanText,
          character: segment.character || (segment.type === 'dm' ? 'DM' : 'Unknown'),
          voiceId: voiceConfig.id,
          voiceName: voiceConfig.name,
          voiceSettings: voiceConfig.settings,
          isGenerating: false,
          isPlaying: false,
        };

        voiceSegments.push(voiceSegment);

        logger.info(
          `✅ Segment ${i + 1}: "${voiceSegment.character}" -> ${voiceSegment.voiceName} (${cleanText.substring(0, 50)}...)`,
        );
      } catch (error) {
        logger.error(`❌ Error processing segment ${i + 1}:`, error);
        // Continue processing other segments
      }
    }

    logger.info(`🎵 VoiceDirector: Created ${voiceSegments.length} voice segments`);
    return voiceSegments;
  }

  /**
   * Fallback: Process plain text when AI segments aren't available
   */
  static processPlainText(text: string): VoiceSegment[] {
    logger.info('📝 VoiceDirector: Processing plain text as single DM segment');

    const cleanText = VoiceDirector.cleanSegmentText(text);
    if (!cleanText) {
      return [];
    }

    const dmVoice = VoiceDirector.VOICE_POOLS.dm[0]; // Always use main DM voice

    return [
      {
        id: `fallback_${Date.now()}`,
        type: 'dm',
        text: cleanText,
        character: 'DM',
        voiceId: dmVoice.id,
        voiceName: dmVoice.name,
        voiceSettings: dmVoice.settings,
        isGenerating: false,
        isPlaying: false,
      },
    ];
  }

  /**
   * Generate audio for a single segment with caching
   */
  static async generateAudio(segment: VoiceSegment, apiKey: string): Promise<VoiceSegment> {
    const cacheKey = VoiceDirector.generateCacheKey(segment.voiceId, segment.text);

    // Check cache first
    VoiceDirector.cleanExpiredCache();
    const cachedAudio = VoiceDirector.audioCache.get(cacheKey);

    if (cachedAudio) {
      logger.debug(
        `🔄 Using cached audio for ${segment.character}: "${segment.text.substring(0, 50)}..."`,
      );
      const audioUrl = URL.createObjectURL(cachedAudio.audioBlob);
      return {
        ...segment,
        audioBlob: cachedAudio.audioBlob,
        audioUrl,
        isGenerating: false,
      };
    }

    logger.info(
      `🎵 Generating NEW audio for ${segment.character}: "${segment.text.substring(0, 50)}..."`,
    );

    try {
      const response = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${segment.voiceId}`,
        {
          method: 'POST',
          headers: {
            Accept: 'audio/mpeg',
            'Content-Type': 'application/json',
            'xi-api-key': apiKey,
          },
          body: JSON.stringify({
            text: segment.text,
            model_id: VoiceDirector.ELEVENLABS_MODEL,
            voice_settings: segment.voiceSettings,
          }),
        },
      );

      if (!response.ok) {
        throw new Error(`ElevenLabs API error: ${response.status} ${response.statusText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const audioBlob = new Blob([arrayBuffer], { type: 'audio/mpeg' });
      const audioUrl = URL.createObjectURL(audioBlob);

      // Cache the generated audio
      VoiceDirector.audioCache.set(cacheKey, {
        audioBlob,
        timestamp: Date.now(),
      });

      // Manage cache size
      VoiceDirector.manageCacheSize();

      logger.debug(`💾 Cached audio for key: ${cacheKey}`);

      return {
        ...segment,
        audioBlob,
        audioUrl,
        isGenerating: false,
      };
    } catch (error) {
      logger.error(`❌ Failed to generate audio for ${segment.character}:`, error);
      return {
        ...segment,
        error: error instanceof Error ? error.message : 'Audio generation failed',
        isGenerating: false,
      };
    }
  }

  /**
   * Assign voice to a segment based on character and type
   */
  private static assignVoice(segment: AISegment): VoiceConfig {
    // DM/Narrator always gets the DM voice
    if (segment.type === 'dm') {
      return VoiceDirector.VOICE_POOLS.dm[0];
    }

    // Character voices
    if (segment.character) {
      const character = VoiceDirector.normalizeCharacterName(segment.character);

      // Check if we've assigned a voice to this character before
      const voiceMap = VoiceDirector.ensureMapInitialized();
      if (voiceMap.has(character)) {
        return voiceMap.get(character)!;
      }

      // Assign new voice based on voice category hint or character fingerprint
      let voicePool: VoiceConfig[];

      if (segment.voice_category) {
        voicePool = VoiceDirector.getVoicePoolByCategory(segment.voice_category);
      } else {
        voicePool = VoiceDirector.getVoicePoolByCharacter(character);
      }

      // Use character name hash to pick consistent voice from pool
      const voiceIndex = VoiceDirector.hashCharacterName(character) % voicePool.length;
      const selectedVoice = voicePool[voiceIndex];

      // Remember this assignment
      voiceMap.set(character, selectedVoice);

      logger.info(
        `🎯 New voice assignment: "${character}" -> ${selectedVoice.name} (${segment.voice_category || 'auto'})`,
      );
      return selectedVoice;
    }

    // Fallback to DM voice
    return VoiceDirector.VOICE_POOLS.dm[0];
  }

  /**
   * Get voice pool based on AI's voice category hint
   */
  private static getVoicePoolByCategory(category: string): VoiceConfig[] {
    const categoryMap: Record<string, keyof VoicePool> = {
      narrator: 'dm',
      hero_male: 'heroes',
      hero_female: 'heroes',
      hero: 'heroes',
      villain_male: 'villains',
      villain_female: 'villains',
      villain: 'villains',
      monster: 'creatures',
      creature: 'creatures',
      goblin: 'creatures',
      merchant: 'npcs',
      guard: 'npcs',
      innkeeper: 'npcs',
      elder: 'npcs',
      child: 'npcs',
    };

    const poolKey = categoryMap[category.toLowerCase()] || 'npcs';
    return VoiceDirector.VOICE_POOLS[poolKey];
  }

  /**
   * Get voice pool based on character name patterns
   */
  private static getVoicePoolByCharacter(character: string): VoiceConfig[] {
    const lowerChar = character.toLowerCase();

    // Villain keywords
    if (
      lowerChar.includes('villain') ||
      lowerChar.includes('evil') ||
      lowerChar.includes('dark') ||
      lowerChar.includes('necromancer') ||
      lowerChar.includes('cultist') ||
      lowerChar.includes('bandit')
    ) {
      return VoiceDirector.VOICE_POOLS.villains;
    }

    // Creature keywords
    if (
      lowerChar.includes('dragon') ||
      lowerChar.includes('monster') ||
      lowerChar.includes('goblin') ||
      lowerChar.includes('orc') ||
      lowerChar.includes('troll') ||
      lowerChar.includes('beast')
    ) {
      return VoiceDirector.VOICE_POOLS.creatures;
    }

    // Hero keywords
    if (
      lowerChar.includes('hero') ||
      lowerChar.includes('champion') ||
      lowerChar.includes('knight') ||
      lowerChar.includes('paladin')
    ) {
      return VoiceDirector.VOICE_POOLS.heroes;
    }

    // Default to NPCs for most characters
    return VoiceDirector.VOICE_POOLS.npcs;
  }

  /**
   * Create a consistent hash from character name for voice assignment
   */
  private static hashCharacterName(character: string): number {
    let hash = 0;
    for (let i = 0; i < character.length; i++) {
      const char = character.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Normalize character names for consistent voice assignment
   */
  private static normalizeCharacterName(character: string): string {
    return character
      .toLowerCase()
      .trim()
      .replace(/^(the|a|an)\s+/i, '') // Remove articles
      .replace(/[^\w\s'-]/g, '') // Remove special characters except apostrophes and hyphens
      .replace(/\s+/g, ' ') // Normalize spaces
      .trim();
  }

  /**
   * Clean segment text for audio generation
   */
  private static cleanSegmentText(text: string): string {
    if (!text) return '';

    return text
      .replace(/[*_`#]/g, '') // Remove markdown
      .replace(/\s+/g, ' ') // Normalize spaces
      .trim();
  }

  /**
   * Get all available voice categories for AI prompting
   */
  static getAvailableVoiceCategories(): string[] {
    return [
      'narrator',
      'hero_male',
      'hero_female',
      'villain_male',
      'villain_female',
      'monster',
      'creature',
      'goblin',
      'merchant',
      'guard',
      'innkeeper',
      'elder',
      'child',
    ];
  }

  /**
   * Clear audio cache manually
   */
  static clearAudioCache(): void {
    const cacheSize = VoiceDirector.audioCache.size;
    VoiceDirector.audioCache.clear();
    logger.info(`🧹 Cleared ${cacheSize} cached audio segments`);
  }

  /**
   * Get audio cache statistics
   */
  static getAudioCacheStats(): { size: number; keys: string[] } {
    const stats = {
      size: VoiceDirector.audioCache.size,
      keys: Array.from(VoiceDirector.audioCache.keys()),
    };
    logger.debug('📊 Audio Cache Stats:', stats);
    return stats;
  }

  /**
   * Get current character-to-voice mappings
   */
  static getCharacterVoiceMappings(): Record<string, string> {
    const mappings: Record<string, string> = {};
    const voiceMap = VoiceDirector.ensureMapInitialized();
    voiceMap.forEach((voice, character) => {
      mappings[character] = voice.name;
    });
    return mappings;
  }

  /**
   * Clear character voice mappings (for debugging)
   */
  static clearCharacterVoiceMappings(): void {
    logger.info('🗑️ VoiceDirector: Clearing all character voice mappings');
    const voiceMap = VoiceDirector.ensureMapInitialized();
    voiceMap.clear();
  }

  /**
   * Validate segments before processing
   */
  static validateAISegments(segments: Array<Partial<AISegment>>): AISegment[] {
    const validSegments: AISegment[] = [];

    segments.forEach((segment, index) => {
      if (!segment?.text || !segment.text.trim()) {
        logger.warn(`⚠️ Skipping empty segment ${index + 1}`);
        return;
      }

      const segType = segment.type === 'dm' || segment.type === 'character' ? segment.type : 'dm';
      if (segType === 'dm' && segment.type !== 'dm') {
        logger.warn(`⚠️ Converting segment ${index + 1} type "${String(segment.type)}" to "dm"`);
      }

      validSegments.push({
        type: segType,
        text: segment.text,
        character: segment.character || undefined,
        voice_category: segment.voice_category || undefined,
      });
    });

    return validSegments;
  }
}
