import { supabase } from '@/integrations/supabase/client';
import { Campaign, ThematicElements } from '@/types/campaign';

/**
 * Interface for formatted campaign context including world and quest data
 */
interface FormattedCampaignContext {
  basicInfo: {
    name: string;
    description?: string;
    genre?: string;
    difficulty_level?: string;
    status?: string;
  };
  setting: {
    era: string;
    location: string;
    atmosphere: string;
    world?: {
      name?: string;
      climate_type?: string;
      magic_level?: string;
      technology_level?: string;
    };
  };
  thematicElements: ThematicElements;
  activeQuests?: Array<{
    title: string;
    description?: string;
    difficulty?: string;
    status: string;
  }>;
}

/**
 * Fetches and formats campaign context with enhanced world and quest information
 * @param campaignId - UUID of the campaign
 * @returns Formatted campaign context or null if not found
 */
export const buildCampaignContext = async (
  campaignId: string
): Promise<FormattedCampaignContext | null> => {
  try {
    console.log('[Context] Fetching campaign data:', campaignId);
    
    // Fetch campaign with related world and quest data
    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .select(`
        *,
        worlds (
          name,
          climate_type,
          magic_level,
          technology_level
        ),
        quests (
          title,
          description,
          difficulty,
          status
        )
      `)
      .eq('id', campaignId)
      .maybeSingle();

    if (campaignError) throw campaignError;
    if (!campaign) return null;

    // Parse thematic elements with type safety
    const rawThematicElements = campaign.thematic_elements as Record<string, unknown>;
    
    // Ensure thematic elements are properly typed with validation
    const thematicElements: ThematicElements = {
      mainThemes: Array.isArray(rawThematicElements?.mainThemes) 
        ? rawThematicElements.mainThemes as string[]
        : [],
      recurringMotifs: Array.isArray(rawThematicElements?.recurringMotifs)
        ? rawThematicElements.recurringMotifs as string[]
        : [],
      keyLocations: Array.isArray(rawThematicElements?.keyLocations)
        ? rawThematicElements.keyLocations as string[]
        : [],
      importantNPCs: Array.isArray(rawThematicElements?.importantNPCs)
        ? rawThematicElements.importantNPCs as string[]
        : []
    };

    // Get the first associated world (assuming one world per campaign)
    const world = campaign.worlds?.[0];

    // Filter active quests
    const activeQuests = campaign.quests?.filter(q => q.status === 'active') || [];

    return {
      basicInfo: {
        name: campaign.name,
        description: campaign.description,
        genre: campaign.genre,
        difficulty_level: campaign.difficulty_level,
        status: campaign.status,
      },
      setting: {
        era: campaign.era || 'unknown',
        location: campaign.location || 'unspecified',
        atmosphere: campaign.atmosphere || 'neutral',
        world: world ? {
          name: world.name,
          climate_type: world.climate_type,
          magic_level: world.magic_level,
          technology_level: world.technology_level,
        } : undefined,
      },
      thematicElements,
      activeQuests: activeQuests.map(quest => ({
        title: quest.title,
        description: quest.description,
        difficulty: quest.difficulty,
        status: quest.status
      }))
    };
  } catch (error) {
    console.error('[Context] Error building campaign context:', error);
    return null;
  }
};