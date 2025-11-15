/**
 * CharacterLoader
 *
 * Loads character details from Supabase.
 *
 * Dependencies:
 * - Supabase client (src/integrations/supabase/client.ts)
 * - Character types (src/types/character.ts)
 *
 * @author AI Dungeon Master Team
 */

import { supabase } from '@/integrations/supabase/client';
import { Character, CharacterRace, CharacterClass, CharacterBackground } from '@/types/character';

export class CharacterLoader {
  /**
   * Loads character details by session ID.
   *
   * @param {string} sessionId - The session ID
   * @returns {Promise<Character | undefined>} The character or undefined if not found
   */
  async loadCharacter(sessionId: string): Promise<Character | undefined> {
    const { data: session } = await supabase
      .from('game_sessions')
      .select('character_id')
      .eq('id', sessionId)
      .single();

    if (!session?.character_id) return undefined;

    const { data: characterData } = await supabase
      .from('characters')
      .select(
        `
        *,
        character_stats (*),
        character_equipment (*)
      `,
      )
      .eq('id', session.character_id)
      .single();

    if (!characterData) return undefined;

    return {
      id: characterData.id,
      user_id: characterData.user_id,
      name: characterData.name,
      race: characterData.race as CharacterRace,
      class: characterData.class as CharacterClass,
      level: characterData.level,
      background: characterData.background
        ? (characterData.background as CharacterBackground)
        : null,
      description: characterData.description,
      abilityScores: characterData.character_stats?.[0]
        ? {
            strength: {
              score: characterData.character_stats[0].strength,
              modifier: Math.floor((characterData.character_stats[0].strength - 10) / 2),
              savingThrow: false,
            },
            dexterity: {
              score: characterData.character_stats[0].dexterity,
              modifier: Math.floor((characterData.character_stats[0].dexterity - 10) / 2),
              savingThrow: false,
            },
            constitution: {
              score: characterData.character_stats[0].constitution,
              modifier: Math.floor((characterData.character_stats[0].constitution - 10) / 2),
              savingThrow: false,
            },
            intelligence: {
              score: characterData.character_stats[0].intelligence,
              modifier: Math.floor((characterData.character_stats[0].intelligence - 10) / 2),
              savingThrow: false,
            },
            wisdom: {
              score: characterData.character_stats[0].wisdom,
              modifier: Math.floor((characterData.character_stats[0].wisdom - 10) / 2),
              savingThrow: false,
            },
            charisma: {
              score: characterData.character_stats[0].charisma,
              modifier: Math.floor((characterData.character_stats[0].charisma - 10) / 2),
              savingThrow: false,
            },
          }
        : undefined,
      experience: characterData.experience_points || 0,
      alignment: characterData.alignment || '',
      personalityTraits: [],
      ideals: [],
      bonds: [],
      flaws: [],
      equipment: characterData.character_equipment?.map((item) => item.item_name) || [],
    };
  }
}
