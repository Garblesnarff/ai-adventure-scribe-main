/**
 * CampaignContextLoader
 * 
 * Loads campaign context data from Supabase.
 * 
 * Dependencies:
 * - Supabase client (src/integrations/supabase/client.ts)
 * - CampaignContext type (src/types/dm.ts)
 * 
 * @author AI Dungeon Master Team
 */

import { supabase } from '@/integrations/supabase/client';
import { CampaignContext } from '@/types/dm';

export class CampaignContextLoader {
  /**
   * Loads campaign context by campaign ID.
   * 
   * @param {string} campaignId - The campaign ID
   * @returns {Promise<CampaignContext | undefined>} The campaign context or undefined if not found
   */
  async loadCampaignContext(campaignId: string): Promise<CampaignContext | undefined> {
    const { data } = await supabase
      .from('campaigns')
      .select('*')
      .eq('id', campaignId)
      .single();

    return data as CampaignContext | undefined;
  }
}
