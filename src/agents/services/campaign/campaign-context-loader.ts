/**
 * CampaignContextLoader
 *
 * Loads campaign context data from Supabase, including detailed parsing for thematic elements.
 *
 * Dependencies:
 * - Supabase client (src/integrations/supabase/client.ts)
 * - CampaignContext type (src/types/dm.ts)
 *
 * @author AI Dungeon Master Team
 */

import { supabase } from '@/integrations/supabase/client';
import { CampaignContext } from '@/types/dm'; // Ensure this type aligns with returned structure
import { logger } from '../../../lib/logger';

// Define ThematicElements locally if not imported or different from CampaignContext's version
interface ThematicElements {
  mainThemes: string[];
  recurringMotifs: string[];
  keyLocations: string[];
  importantNPCs: string[];
}

export class CampaignContextLoader {
  /**
   * Loads and parses campaign context by campaign ID.
   *
   * @param {string} campaignId - The campaign ID
   * @returns {Promise<CampaignContext>} The campaign context
   * @throws {Error} If the campaign is not found or there's a database error
   */
  async loadCampaignContext(campaignId: string): Promise<CampaignContext> {
    const { data: campaign, error } = await supabase
      .from('campaigns')
      .select(
        `
        name, 
        description, 
        genre,
        tone,
        setting_details, // Assuming this contains era, location, atmosphere as JSON
        thematic_elements
      `,
      )
      .eq('id', campaignId)
      .single();

    if (error) {
      logger.error(`Error loading campaign context for ID ${campaignId}:`, error.message);
      throw new Error(`Failed to load campaign context: ${error.message}`);
    }
    if (!campaign) {
      throw new Error(`Campaign with ID ${campaignId} not found.`);
    }

    // Parse and validate thematic elements
    let thematicElements: ThematicElements = {
      mainThemes: [],
      recurringMotifs: [],
      keyLocations: [],
      importantNPCs: [],
    };

    if (campaign.thematic_elements && typeof campaign.thematic_elements === 'object') {
      const rawElements = campaign.thematic_elements as any; // Cast to any for parsing
      thematicElements = {
        mainThemes: Array.isArray(rawElements?.mainThemes)
          ? rawElements.mainThemes.filter(String)
          : [],
        recurringMotifs: Array.isArray(rawElements?.recurringMotifs)
          ? rawElements.recurringMotifs.filter(String)
          : [],
        keyLocations: Array.isArray(rawElements?.keyLocations)
          ? rawElements.keyLocations.filter(String)
          : [],
        importantNPCs: Array.isArray(rawElements?.importantNPCs)
          ? rawElements.importantNPCs.filter(String)
          : [],
      };
    }

    // Parse setting_details if it's a JSON object
    let setting = {
      era: 'medieval',
      location: 'unknown',
      atmosphere: 'mysterious',
    };

    if (campaign.setting_details && typeof campaign.setting_details === 'object') {
      const rawSetting = campaign.setting_details as any;
      setting = {
        era: rawSetting.era || 'medieval',
        location: rawSetting.location || 'unknown',
        atmosphere: rawSetting.atmosphere || 'mysterious',
      };
    }

    // Construct the CampaignContext, ensuring alignment with the imported type
    // The CampaignContext type from '@/types/dm' must match this structure.
    // If CampaignContext from '@/types/dm' expects e.g. campaign.name directly, adjust accordingly.
    // This example assumes CampaignContext is an object that contains these fields.
    return {
      id: campaignId, // Added campaignId
      name: campaign.name || 'Unnamed Campaign', // Added name
      description: campaign.description || '', // Added description
      genre: campaign.genre || 'fantasy',
      tone: campaign.tone || 'serious',
      setting: setting,
      thematicElements: thematicElements,
    };
  }
}
