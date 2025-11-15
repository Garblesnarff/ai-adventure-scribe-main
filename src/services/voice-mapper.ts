/**
 * Voice Mapping Service
 *
 * Maps character types and names to specific ElevenLabs voice IDs and settings.
 * Uses the most cost-effective Flash v2.5 model for all voices.
 *
 * @author AI Dungeon Master Team
 */

import type { VoiceSettings } from './dialogue-parser';

import logger from '@/lib/logger';

export interface VoiceConfig {
  id: string;
  name: string;
  description: string;
  model: string;
  settings: VoiceSettings;
  category: 'narrator' | 'hero' | 'villain' | 'creature' | 'npc' | 'child' | 'elder';
}

export class VoiceMapper {
  // ElevenLabs Flash v2.5 model - cheapest at 0.5 credits per character
  private static readonly MODEL_ID = 'eleven_flash_v2_5';

  // Available voice configurations
  private static readonly VOICE_CONFIGS: Record<string, VoiceConfig> = {
    // Main Narrator - Default DM voice
    narrator: {
      id: 'bIHbv24MWmeRgasZH58o', // Will - premade voice
      name: 'Will',
      description: 'Main DM narrator voice',
      model: VoiceMapper.MODEL_ID,
      category: 'narrator',
      settings: {
        stability: 0.5,
        similarity_boost: 0.75,
        style: 0.1,
        use_speaker_boost: true,
      },
    },

    // Heroes and Good Characters
    hero_male: {
      id: 'GBv7mTt0atIp3Br8iCZE', // Thomas - premade voice
      name: 'Thomas',
      description: 'Noble male hero voice',
      model: VoiceMapper.MODEL_ID,
      category: 'hero',
      settings: {
        stability: 0.6,
        similarity_boost: 0.8,
        style: 0.2,
        use_speaker_boost: true,
      },
    },

    hero_female: {
      id: 'BlgEcC0TfWpBak7FmvHW', // Fena - Young sassy girl character
      name: 'Fena',
      description: 'Young female hero voice',
      model: VoiceMapper.MODEL_ID,
      category: 'hero',
      settings: {
        stability: 0.5,
        similarity_boost: 0.75,
        style: 0.3,
        use_speaker_boost: true,
      },
    },

    // Villains and Evil Characters
    villain_male: {
      id: '2gPFXx8pN3Avh27Dw5Ma', // Oxley - Evil Character
      name: 'Oxley',
      description: 'Ominous male villain voice',
      model: VoiceMapper.MODEL_ID,
      category: 'villain',
      settings: {
        stability: 0.7,
        similarity_boost: 0.9,
        style: 0.4,
        use_speaker_boost: true,
      },
    },

    villain_female: {
      id: 'flHkNRp1BlvT73UL6gyz', // Jessica Anne Bogart - Character and Animation
      name: 'Jessica Anne Bogart',
      description: 'Wickedly eloquent female villain voice',
      model: VoiceMapper.MODEL_ID,
      category: 'villain',
      settings: {
        stability: 0.8,
        similarity_boost: 0.85,
        style: 0.5,
        use_speaker_boost: true,
      },
    },

    // Creatures and Monsters
    monster: {
      id: 'cPoqAvGWCPfCfyPMwe4z', // Kallixis - Monster & Deep
      name: 'Kallixis',
      description: 'Deep ancient malevolence voice',
      model: VoiceMapper.MODEL_ID,
      category: 'creature',
      settings: {
        stability: 0.9,
        similarity_boost: 0.7,
        style: 0.1,
        use_speaker_boost: false,
      },
    },

    goblin: {
      id: 'dfZGXKiIzjizWtJ0NgPy', // Michael Mouse - High Energy Comic Character
      name: 'Michael Mouse',
      description: 'High-pitched comic character for goblins',
      model: VoiceMapper.MODEL_ID,
      category: 'creature',
      settings: {
        stability: 0.3,
        similarity_boost: 0.6,
        style: 0.6,
        use_speaker_boost: true,
      },
    },

    // NPCs
    guard: {
      id: 'GBv7mTt0atIp3Br8iCZE', // Thomas - reused for authority figures
      name: 'Thomas',
      description: 'Authoritative guard voice',
      model: VoiceMapper.MODEL_ID,
      category: 'npc',
      settings: {
        stability: 0.8,
        similarity_boost: 0.7,
        style: 0.1,
        use_speaker_boost: true,
      },
    },

    merchant: {
      id: 'g2W4HAjKvdW93AmsjsOx', // Nathan - Funny Cartoon Character
      name: 'Nathan',
      description: 'Friendly merchant voice',
      model: VoiceMapper.MODEL_ID,
      category: 'npc',
      settings: {
        stability: 0.4,
        similarity_boost: 0.8,
        style: 0.4,
        use_speaker_boost: true,
      },
    },

    innkeeper: {
      id: 'pMsXgVXv3BLzUgSXRplE', // Serena - premade voice
      name: 'Serena',
      description: 'Warm innkeeper voice',
      model: VoiceMapper.MODEL_ID,
      category: 'npc',
      settings: {
        stability: 0.6,
        similarity_boost: 0.8,
        style: 0.2,
        use_speaker_boost: true,
      },
    },

    // Children
    child: {
      id: 'ha06sua2KFh5KIb2atMC', // Silly Billy - Cartoon Character
      name: 'Silly Billy',
      description: 'Light & cute cartoon voice for children',
      model: VoiceMapper.MODEL_ID,
      category: 'child',
      settings: {
        stability: 0.3,
        similarity_boost: 0.7,
        style: 0.5,
        use_speaker_boost: true,
      },
    },

    // Elders and Wise Characters
    elder: {
      id: 'yoZ06aMxZJJ28mfd3POQ', // Sam - premade voice
      name: 'Sam',
      description: 'Wise elder voice',
      model: VoiceMapper.MODEL_ID,
      category: 'elder',
      settings: {
        stability: 0.8,
        similarity_boost: 0.8,
        style: 0.1,
        use_speaker_boost: true,
      },
    },

    // Default fallback
    default: {
      id: 'bIHbv24MWmeRgasZH58o', // Will - same as narrator
      name: 'Will',
      description: 'Default voice for unknown characters',
      model: VoiceMapper.MODEL_ID,
      category: 'npc',
      settings: {
        stability: 0.5,
        similarity_boost: 0.75,
        style: 0.1,
        use_speaker_boost: true,
      },
    },
  };

  // Character type keywords for automatic mapping
  private static readonly CHARACTER_KEYWORDS = {
    villain: [
      'villain',
      'evil',
      'dark lord',
      'necromancer',
      'demon',
      'devil',
      'cultist',
      'bandit leader',
      'witch',
      'warlock',
    ],
    monster: [
      'dragon',
      'demon',
      'ancient',
      'beast',
      'lich',
      'vampire lord',
      'giant',
      'titan',
      'elemental',
    ],
    goblin: ['goblin', 'imp', 'sprite', 'fairy', 'pixie', 'gnome', 'halfling', 'kobold'],
    guard: ['guard', 'soldier', 'captain', 'sergeant', 'knight', 'paladin', 'sheriff', 'watchman'],
    merchant: ['merchant', 'trader', 'shopkeeper', 'vendor', 'peddler', 'salesman', 'fence'],
    innkeeper: ['innkeeper', 'barkeep', 'bartender', 'tavern keeper', 'proprietor', 'host'],
    child: ['child', 'kid', 'boy', 'girl', 'young', 'orphan', 'student', 'apprentice'],
    elder: [
      'elder',
      'sage',
      'wizard',
      'priest',
      'hermit',
      'scholar',
      'old man',
      'old woman',
      'grandmother',
      'grandfather',
      'thorne',
    ],
    hero_male: ['hero', 'champion', 'warrior', 'fighter', 'ranger', 'rogue', 'bard'],
    hero_female: [
      'heroine',
      'warrior woman',
      'ranger woman',
      'female fighter',
      'sorceress',
      'priestess',
    ],
  };

  /**
   * Get voice configuration for a character
   */
  static getVoiceForCharacter(character: string): VoiceConfig {
    logger.debug(`🔍 VoiceMapper.getVoiceForCharacter called with: "${character}"`);

    if (!character || character === 'unknown') {
      logger.info('↪️ Using default voice (no character name)');
      return this.VOICE_CONFIGS.default;
    }

    const cleanCharacter = character.toLowerCase().trim();
    logger.debug(`🧹 Cleaned character name: "${cleanCharacter}"`);

    // First, try to find exact match in saved character mappings
    const savedVoice = this.getSavedCharacterVoice(cleanCharacter);
    if (savedVoice) {
      logger.info(`💾 Found saved voice mapping: ${savedVoice.name} (${savedVoice.id})`);
      return savedVoice;
    }

    // Then, try keyword matching
    for (const [voiceType, keywords] of Object.entries(this.CHARACTER_KEYWORDS)) {
      for (const keyword of keywords) {
        if (cleanCharacter.includes(keyword)) {
          const voiceConfig = this.VOICE_CONFIGS[voiceType];
          if (voiceConfig) {
            logger.info(
              `🎯 Keyword match found: "${keyword}" -> ${voiceType} -> ${voiceConfig.name} (${voiceConfig.id})`,
            );
            // Save this mapping for future use
            this.saveCharacterVoice(cleanCharacter, voiceType);
            return voiceConfig;
          }
        }
      }
    }

    // Finally, use smart classification for unknown characters
    const classifiedType = this.classifyCharacter(cleanCharacter);
    const voiceConfig = this.VOICE_CONFIGS[classifiedType] || this.VOICE_CONFIGS.default;
    logger.info(
      `🤖 Smart classification: "${cleanCharacter}" -> ${classifiedType} -> ${voiceConfig.name} (${voiceConfig.id})`,
    );

    // Save this mapping
    this.saveCharacterVoice(cleanCharacter, classifiedType);

    return voiceConfig;
  }

  /**
   * Get voice configuration for narration
   */
  static getNarratorVoice(): VoiceConfig {
    return this.VOICE_CONFIGS.narrator;
  }

  /**
   * Get all available voice configurations
   */
  static getAllVoices(): Record<string, VoiceConfig> {
    return { ...this.VOICE_CONFIGS };
  }

  /**
   * Classify unknown character using simple heuristics
   */
  private static classifyCharacter(character: string): string {
    // Simple classification based on name patterns
    if (character.includes('sir') || character.includes('lord') || character.includes('lady')) {
      return 'hero_male';
    }

    if (character.includes('captain') || character.includes('commander')) {
      return 'guard';
    }

    if (character.includes('master') || character.includes('wise')) {
      return 'elder';
    }

    // Default to generic NPC voice
    return 'default';
  }

  /**
   * Save character to voice mapping to localStorage
   */
  private static saveCharacterVoice(character: string, voiceType: string): void {
    try {
      const saved = JSON.parse(localStorage.getItem('character-voice-mappings') || '{}');
      saved[character] = voiceType;
      localStorage.setItem('character-voice-mappings', JSON.stringify(saved));
    } catch (error) {
      logger.warn('Failed to save character voice mapping:', error);
    }
  }

  /**
   * Get saved character to voice mapping from localStorage
   */
  private static getSavedCharacterVoice(character: string): VoiceConfig | null {
    try {
      const saved = JSON.parse(localStorage.getItem('character-voice-mappings') || '{}');
      const voiceType = saved[character];
      return voiceType ? this.VOICE_CONFIGS[voiceType] : null;
    } catch (error) {
      logger.warn('Failed to load character voice mapping:', error);
      return null;
    }
  }

  /**
   * Update voice configuration for a specific character
   */
  static updateCharacterVoice(character: string, voiceType: string): boolean {
    if (!this.VOICE_CONFIGS[voiceType]) {
      return false;
    }

    this.saveCharacterVoice(character.toLowerCase().trim(), voiceType);
    return true;
  }

  /**
   * Get all saved character mappings
   */
  static getSavedMappings(): Record<string, string> {
    try {
      return JSON.parse(localStorage.getItem('character-voice-mappings') || '{}');
    } catch (error) {
      logger.warn('Failed to load character voice mappings:', error);
      return {};
    }
  }

  /**
   * Clear all saved character mappings
   */
  static clearSavedMappings(): void {
    try {
      logger.info('🗑️ Clearing all saved character voice mappings');
      localStorage.removeItem('character-voice-mappings');
    } catch (error) {
      logger.warn('Failed to clear character voice mappings:', error);
    }
  }

  /**
   * Debug and clear specific character mapping
   */
  static debugAndClearCharacter(character: string): void {
    try {
      const saved = JSON.parse(localStorage.getItem('character-voice-mappings') || '{}');
      const cleanCharacter = character.toLowerCase().trim();

      logger.info(`🔍 Debug character "${character}" (cleaned: "${cleanCharacter}"):`);
      logger.info('   Current saved mapping:', saved[cleanCharacter] || 'none');
      logger.info('   All saved mappings:', saved);

      if (saved[cleanCharacter]) {
        delete saved[cleanCharacter];
        localStorage.setItem('character-voice-mappings', JSON.stringify(saved));
        logger.info(`   ✅ Cleared mapping for "${cleanCharacter}"`);
      }

      // Test what voice would be assigned now
      const voiceConfig = this.getVoiceForCharacter(character);
      logger.info(`   🎭 Would now map to: ${voiceConfig.name} (${voiceConfig.id})`);
    } catch (error) {
      logger.warn('Failed to debug character mapping:', error);
    }
  }

  /**
   * Get voice categories for UI organization
   */
  static getVoiceCategories(): Record<string, VoiceConfig[]> {
    const categories: Record<string, VoiceConfig[]> = {};

    Object.values(this.VOICE_CONFIGS).forEach((voice) => {
      if (!categories[voice.category]) {
        categories[voice.category] = [];
      }
      if (!categories[voice.category].find((v) => v.id === voice.id)) {
        categories[voice.category].push(voice);
      }
    });

    return categories;
  }
}
