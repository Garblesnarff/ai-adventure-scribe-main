import { supabase } from '@/integrations/supabase/client';
import { GameContext } from '@/types/game';
import { Campaign, ThematicElements } from '@/types/campaign';
import { Character } from '@/types/character';
import { Memory, MemoryContext } from '@/types/memory';
import { createDefaultContext } from './contextDefaults';

interface ContextParams {
  campaignId: string;
  characterId: string;
  sessionId: string;
}

class GameContextBuilder {
  private async fetchCampaign(campaignId: string) {
    const { data, error } = await supabase
      .from('campaigns')
      .select('*, worlds(*), quests(*)')
      .eq('id', campaignId)
      .maybeSingle();
    if (error) throw error;
    return data;
  }

  private async fetchCharacter(characterId: string) {
    const { data, error } = await supabase
      .from('characters')
      .select('*, character_stats(*), character_equipment(*), quest_progress(*, quests(title))')
      .eq('id', characterId)
      .maybeSingle();
    if (error) throw error;
    return data;
  }

  private async fetchMemories(sessionId: string) {
    const { data, error } = await supabase
      .from('memories')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false })
      .limit(15);
    if (error) throw error;
    return data;
  }

  private compose(
    campaignResult: PromiseSettledResult<any>,
    characterResult: PromiseSettledResult<any>,
    memoryResult: PromiseSettledResult<any>
  ): GameContext {
    const context = createDefaultContext();

    if (campaignResult.status === 'fulfilled' && campaignResult.value) {
      const campaign = campaignResult.value;
      const thematicElements = (campaign.thematic_elements || {}) as ThematicElements;
      context.campaign = {
        basic: {
          name: campaign.name,
          description: campaign.description,
          genre: campaign.genre,
          status: campaign.status || 'active',
        },
        setting: {
          era: campaign.era || 'unknown',
          location: campaign.location || 'unspecified',
          atmosphere: campaign.atmosphere || 'neutral',
        },
        thematicElements,
      };
    }

    if (characterResult.status === 'fulfilled' && characterResult.value) {
      const character = characterResult.value;
      const stats = character.character_stats?.[0] || {};
      context.character = {
        basic: {
          name: character.name,
          race: character.race,
          class: character.class,
          level: character.level || 1,
        },
        stats: {
          health: { current: stats.current_hit_points || 10, max: stats.max_hit_points || 10, temporary: 0 },
          armorClass: stats.armor_class || 10,
          abilities: {
            strength: stats.strength || 10,
            dexterity: stats.dexterity || 10,
            constitution: stats.constitution || 10,
            intelligence: stats.intelligence || 10,
            wisdom: stats.wisdom || 10,
            charisma: stats.charisma || 10,
          },
        },
        equipment: (character.character_equipment || []).map((item: any) => ({
          name: item.item_name,
          type: item.item_type,
          equipped: item.equipped || false,
        })),
      };
    }

    if (memoryResult.status === 'fulfilled' && memoryResult.value) {
      const memories = memoryResult.value as Memory[];
      context.memories = {
        recent: memories.filter(m => m.type === 'event').slice(0, 5),
        locations: memories.filter(m => m.type === 'location'),
        characters: memories.filter(m => m.type === 'character'),
        plot: memories.filter(m => m.type === 'plot'),
      };
    }

    return context;
  }

  public async build(params: ContextParams): Promise<GameContext> {
    try {
      const [campaign, character, memories] = await Promise.allSettled([
        this.fetchCampaign(params.campaignId),
        this.fetchCharacter(params.characterId),
        this.fetchMemories(params.sessionId),
      ]);

      return this.compose(campaign, character, memories);
    } catch (error) {
      console.error('[GameContextBuilder] Error building context:', error);
      return createDefaultContext();
    }
  }
}

export const gameContextBuilder = new GameContextBuilder();