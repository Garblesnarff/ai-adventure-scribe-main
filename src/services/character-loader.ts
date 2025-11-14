/**
 * Character Loading Service
 *
 * Loads complete character data including spells from database
 * and transforms it into the proper format for the frontend
 *
 * @author AI Dungeon Master Team
 */

import { characterSpellService } from './characterSpellApi';

import type {
  Character,
  CharacterRace,
  CharacterClass,
  CharacterBackground,
} from '@/types/character';

import { supabase } from '@/integrations/supabase/client';
import logger from '@/lib/logger';
import { convertSpellIdsToFrontend } from '@/utils/spell-id-mapping';

export class CharacterLoaderService {
  /**
   * Load a complete character with all spell data populated
   * @param characterId - Character ID to load
   * @returns Complete character object with spell arrays populated
   */
  async loadCharacterWithSpells(characterId: string): Promise<Character | null> {
    try {
      logger.info(`🔄 [CharacterLoader] Loading character ${characterId} with spells`);

      // Fetch Character Data from database
      const { data: characterData, error: characterError } = await supabase
        .from('characters')
        .select(
          `
          *,
          character_stats(*)
        `,
        )
        .eq('id', characterId)
        .single();

      if (characterError) {
        logger.error('[CharacterLoader] Database error:', characterError);
        throw new Error(`Failed to load character: ${characterError.message}`);
      }

      if (!characterData) {
        logger.error('[CharacterLoader] Character not found');
        return null;
      }

      // Transform basic character data
      const stats = Array.isArray(characterData.character_stats)
        ? characterData.character_stats[0]
        : characterData.character_stats;

      const characterRace = characterData.race
        ? ({ name: characterData.race } as Partial<CharacterRace>)
        : null;
      const characterClass = characterData.class
        ? ({ name: characterData.class } as Partial<CharacterClass>)
        : null;
      const characterBackground = characterData.background
        ? ({ name: characterData.background } as Partial<CharacterBackground>)
        : null;

      // Parse spell data from the characters table first (primary source)
      let cantrips: string[] = [];
      let knownSpells: string[] = [];
      let preparedSpells: string[] = [];
      let ritualSpells: string[] = [];

      // Parse spell data from database fields - handles comma-separated TEXT format
      const parseSpellString = (spellString: string | null): string[] => {
        if (!spellString || spellString.trim() === '') return [];
        return spellString
          .split(',')
          .map((spell) => spell.trim())
          .filter((spell) => spell.length > 0);
      };

      logger.info(`📖 [CharacterLoader] Loading spells from characters table for ${characterId}`);
      cantrips = parseSpellString(characterData.cantrips);
      knownSpells = parseSpellString(characterData.known_spells);
      preparedSpells = parseSpellString(characterData.prepared_spells); // Now exists in database
      ritualSpells = parseSpellString(characterData.ritual_spells); // Now exists in database

      logger.debug(`📊 [CharacterLoader] Parsed spells from characters table:`, {
        cantrips: cantrips.length,
        knownSpells: knownSpells.length,
        preparedSpells: preparedSpells.length,
        ritualSpells: ritualSpells.length,
        rawCantrips: characterData.cantrips,
        rawKnownSpells: characterData.known_spells,
      });

      // Optional enhancement: Try to load additional spell data from API
      try {
        logger.info(`🔍 [CharacterLoader] Attempting to enhance with API data...`);
        const spellData = await characterSpellService.getCharacterSpells(characterId);

        if (spellData && (spellData.cantrips.length > 0 || spellData.spells.length > 0)) {
          logger.info(`🎯 [CharacterLoader] Found API spell data:`, {
            apiCantrips: spellData.cantrips.length,
            apiSpells: spellData.spells.length,
          });

          // Convert database UUID spell IDs back to frontend kebab-case IDs
          const cantripUUIDs = spellData.cantrips.map((c) => c.spell_id);
          const spellUUIDs = spellData.spells.map((s) => s.spell_id);

          const apiCantrips = convertSpellIdsToFrontend(cantripUUIDs);
          const apiKnownSpells = convertSpellIdsToFrontend(spellUUIDs);

          // Merge API data with database data (prefer API data if available)
          if (apiCantrips.length > 0) {
            logger.info(`🔄 [CharacterLoader] Using API cantrips instead of database cantrips`);
            cantrips = apiCantrips;
          }
          if (apiKnownSpells.length > 0) {
            logger.info(`🔄 [CharacterLoader] Using API spells instead of database spells`);
            knownSpells = apiKnownSpells;
            // Update prepared spells if we got new known spells
            if (preparedSpells.length === 0) {
              preparedSpells = [...knownSpells];
            }
          }

          logger.info(`✅ [CharacterLoader] Enhanced with API data:`, {
            finalCantrips: cantrips.length,
            finalKnownSpells: knownSpells.length,
            finalPreparedSpells: preparedSpells.length,
          });
        } else {
          logger.info(`📝 [CharacterLoader] No API spell data found, using database data`);
        }
      } catch (spellError) {
        logger.warn(
          `⚠️ [CharacterLoader] API enhancement failed, using database data:`,
          spellError,
        );
        // Continue with database spell data - this is not a fatal error
      }

      // Construct complete character object
      const loadedCharacter: Character = {
        id: characterData.id,
        user_id: characterData.user_id || '',
        name: characterData.name,
        race: characterRace as CharacterRace | null,
        class: characterClass as CharacterClass | null,
        level: characterData.level || 1,
        background: characterBackground as CharacterBackground | null,
        abilityScores: {
          strength: {
            score: stats?.strength || 10,
            modifier: Math.floor(((stats?.strength || 10) - 10) / 2),
            savingThrow: false,
          },
          dexterity: {
            score: stats?.dexterity || 10,
            modifier: Math.floor(((stats?.dexterity || 10) - 10) / 2),
            savingThrow: false,
          },
          constitution: {
            score: stats?.constitution || 10,
            modifier: Math.floor(((stats?.constitution || 10) - 10) / 2),
            savingThrow: false,
          },
          intelligence: {
            score: stats?.intelligence || 10,
            modifier: Math.floor(((stats?.intelligence || 10) - 10) / 2),
            savingThrow: false,
          },
          wisdom: {
            score: stats?.wisdom || 10,
            modifier: Math.floor(((stats?.wisdom || 10) - 10) / 2),
            savingThrow: false,
          },
          charisma: {
            score: stats?.charisma || 10,
            modifier: Math.floor(((stats?.charisma || 10) - 10) / 2),
            savingThrow: false,
          },
        },
        experience: characterData.experience_points || 0,
        alignment: characterData.alignment || '',
        description: characterData.description || '',
        personalityTraits: [],
        ideals: [],
        bonds: [],
        flaws: [],
        equipment: [],
        // Character images
        avatar_url: characterData.avatar_url,
        image_url: characterData.image_url,
        background_image: characterData.background_image,
        // Spell data - this is the key fix!
        cantrips,
        knownSpells,
        preparedSpells,
        ritualSpells,
      };

      logger.info(`🎯 [CharacterLoader] Successfully loaded character with spells:`, {
        name: loadedCharacter.name,
        id: loadedCharacter.id,
        cantrips: loadedCharacter.cantrips?.length || 0,
        knownSpells: loadedCharacter.knownSpells?.length || 0,
      });

      return loadedCharacter;
    } catch (error) {
      logger.error('[CharacterLoader] Error loading character with spells:', error);
      return null;
    }
  }
}

// Export singleton instance
export const characterLoaderService = new CharacterLoaderService();
