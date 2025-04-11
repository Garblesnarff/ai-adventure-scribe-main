import { supabase } from '@/integrations/supabase/client';
import { CampaignContext } from '@/types/dm';

interface ThematicElements {
  mainThemes: string[];
  recurringMotifs: string[];
  keyLocations: string[];
  importantNPCs: string[];
}

export class CampaignContextLoader {
  async loadCampaignContext(campaignId: string): Promise<CampaignContext> {
    const { data: campaign, error } = await supabase
      .from('campaigns')
      .select(`
        genre,
        tone,
        era,
        location,
        atmosphere,
        thematic_elements
      `)
      .eq('id', campaignId)
      .single();

    if (error) throw error;

    // Parse and validate thematic elements
    let thematicElements: ThematicElements;
    
    try {
      const rawElements = campaign.thematic_elements as Record<string, unknown>;
      thematicElements = {
        mainThemes: Array.isArray(rawElements?.mainThemes) ? rawElements.mainThemes : [],
        recurringMotifs: Array.isArray(rawElements?.recurringMotifs) ? rawElements.recurringMotifs : [],
        keyLocations: Array.isArray(rawElements?.keyLocations) ? rawElements.keyLocations : [],
        importantNPCs: Array.isArray(rawElements?.importantNPCs) ? rawElements.importantNPCs : []
      };
    } catch (e) {
      thematicElements = {
        mainThemes: [],
        recurringMotifs: [],
        keyLocations: [],
        importantNPCs: []
      };
    }

    return {
      genre: campaign.genre || 'fantasy',
      tone: campaign.tone || 'serious',
      setting: {
        era: campaign.era || 'medieval',
        location: campaign.location || 'unknown',
        atmosphere: campaign.atmosphere || 'mysterious'
      },
      thematicElements
    };
  }
}