import { supabase } from '@/integrations/supabase/client';
import { Character } from '@/types/character';

/**
 * Interface for formatted character context including equipment and stats
 */
interface FormattedCharacterContext {
  basicInfo: {
    name: string;
    race: string;
    class: string;
    level: number;
    background?: string;
    alignment?: string;
  };
  stats: {
    strength: number;
    dexterity: number;
    constitution: number;
    intelligence: number;
    wisdom: number;
    charisma: number;
    maxHp: number;
    currentHp: number;
    armorClass: number;
  };
  equipment: Array<{
    name: string;
    type: string;
    equipped: boolean;
    quantity: number;
  }>;
  activeQuests: Array<{
    questTitle: string;
    status: string;
    currentObjective?: string;
  }>;
}

/**
 * Fetches and formats character context with enhanced equipment and quest progress
 * @param characterId - UUID of the character
 * @returns Formatted character context or null if not found
 */
export const buildCharacterContext = async (
  characterId: string
): Promise<FormattedCharacterContext | null> => {
  try {
    console.log('[Context] Fetching character data:', characterId);

    // Fetch character with related stats and equipment
    const { data: character, error: characterError } = await supabase
      .from('characters')
      .select(`
        *,
        character_stats (*),
        character_equipment (*),
        quest_progress (
          *,
          quests (title)
        )
      `)
      .eq('id', characterId)
      .maybeSingle();

    if (characterError) throw characterError;
    if (!character) return null;

    const stats = character.character_stats?.[0];
    const equipment = character.character_equipment || [];
    const questProgress = character.quest_progress || [];

    return {
      basicInfo: {
        name: character.name,
        race: character.race,
        class: character.class,
        level: character.level || 1,
        background: character.background,
        alignment: character.alignment,
      },
      stats: stats ? {
        strength: stats.strength,
        dexterity: stats.dexterity,
        constitution: stats.constitution,
        intelligence: stats.intelligence,
        wisdom: stats.wisdom,
        charisma: stats.charisma,
        maxHp: stats.max_hit_points,
        currentHp: stats.current_hit_points,
        armorClass: stats.armor_class,
      } : {
        strength: 10,
        dexterity: 10,
        constitution: 10,
        intelligence: 10,
        wisdom: 10,
        charisma: 10,
        maxHp: 10,
        currentHp: 10,
        armorClass: 10,
      },
      equipment: equipment.map(item => ({
        name: item.item_name,
        type: item.item_type,
        equipped: item.equipped || false,
        quantity: item.quantity || 1,
      })),
      activeQuests: questProgress.map(progress => ({
        questTitle: progress.quests?.title || 'Unknown Quest',
        status: progress.status || 'in_progress',
        currentObjective: progress.current_objective,
      })),
    };
  } catch (error) {
    console.error('[Context] Error building character context:', error);
    return null;
  }
};