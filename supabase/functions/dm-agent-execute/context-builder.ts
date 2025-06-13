import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { AgentContext, CampaignContext, CharacterContext } from './types.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Calculates ability score modifier
 */
const calculateModifier = (score: number): number => Math.floor((score - 10) / 2);

/**
 * Fetches and builds character context
 */
export async function buildCharacterContext(characterId: string): Promise<CharacterContext | null> {
  try {
    const { data: characterData, error } = await supabase
      .from('characters')
      .select(`
        *,
        character_stats!inner(*),
        character_equipment(*)
      `)
      .eq('id', characterId)
      .single();

    if (error) throw error;
    if (!characterData) return null;

    return {
      name: characterData.name,
      race: characterData.race,
      class: characterData.class,
      level: characterData.level,
      background: characterData.background,
      description: characterData.description,
      alignment: characterData.alignment,
      hitPoints: {
        current: characterData.character_stats.current_hit_points,
        max: characterData.character_stats.max_hit_points,
        temporary: characterData.character_stats.temporary_hit_points
      },
      abilityScores: {
        strength: { 
          score: characterData.character_stats.strength,
          modifier: calculateModifier(characterData.character_stats.strength)
        },
        dexterity: { 
          score: characterData.character_stats.dexterity,
          modifier: calculateModifier(characterData.character_stats.dexterity)
        },
        constitution: { 
          score: characterData.character_stats.constitution,
          modifier: calculateModifier(characterData.character_stats.constitution)
        },
        intelligence: { 
          score: characterData.character_stats.intelligence,
          modifier: calculateModifier(characterData.character_stats.intelligence)
        },
        wisdom: { 
          score: characterData.character_stats.wisdom,
          modifier: calculateModifier(characterData.character_stats.wisdom)
        },
        charisma: { 
          score: characterData.character_stats.charisma,
          modifier: calculateModifier(characterData.character_stats.charisma)
        }
      },
      armorClass: characterData.character_stats.armor_class,
      initiative: characterData.character_stats.initiative_bonus,
      speed: characterData.character_stats.speed,
      equipment: characterData.character_equipment.map((item: any) => ({
        name: item.item_name,
        type: item.item_type,
        equipped: item.equipped,
        quantity: item.quantity
      }))
    };
  } catch (error) {
    console.error('Error building character context:', error);
    return null;
  }
}

/**
 * Fetches and builds campaign context
 */
export async function buildCampaignContext(campaignId: string): Promise<CampaignContext | null> {
  try {
    const { data: campaign, error } = await supabase
      .from('campaigns')
      .select('*')
      .eq('id', campaignId)
      .single();

    if (error) throw error;
    if (!campaign) return null;

    return {
      name: campaign.name,
      genre: campaign.genre || 'fantasy',
      difficulty_level: campaign.difficulty_level || 'medium',
      tone: campaign.tone || 'serious',
      description: campaign.description,
      setting_details: campaign.setting_details || {}
    };
  } catch (error) {
    console.error('Error building campaign context:', error);
    return null;
  }
}