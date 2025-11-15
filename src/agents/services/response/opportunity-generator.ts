/**
 * OpportunityGenerator
 *
 * Generates immediate actions, nearby points of interest, and quest hooks
 * for the AI Dungeon Master based on the current campaign context and data
 * fetched from Supabase (e.g., available quests).
 *
 * Main Class:
 * - OpportunityGenerator: Creates contextual opportunities for players.
 *
 * Dependencies:
 * - Supabase client (`@/integrations/supabase/client`)
 * - CampaignContext type (from `@/types/dm`)
 *
 * @author AI Dungeon Master Team
 */

// External/SDK Imports
import { supabase } from '@/integrations/supabase/client';

// Project Types
import { CampaignContext } from '@/types/dm';
import { logger } from '../../../lib/logger';

export class OpportunityGenerator {
  async generateOpportunities(campaignId: string, context: CampaignContext) {
    const { data: quests, error: questError } = await supabase
      .from('quests')
      .select('id, title, description, status') // Specify columns
      .eq('campaign_id', campaignId)
      .eq('status', 'available'); // Ensure this status matches enum or actual values

    if (questError) {
      logger.error('Error fetching quests:', questError);
      // Decide how to handle quest fetching errors, e.g., return empty or a default hook
    }

    return {
      immediate: this.generateImmediateActions(context.setting),
      // Ensure thematicElements and keyLocations exist and are arrays
      nearby: context.thematicElements?.keyLocations?.slice(0, 3) || [],
      questHooks: quests?.map((quest) => quest.title as string) || [], // Cast title as string
    };
  }

  private generateImmediateActions(setting: CampaignContext['setting'] | undefined): string[] {
    const actions: string[] = ['Look around more closely.', 'Consider your next move carefully.']; // Default actions

    if (setting?.atmosphere?.toLowerCase().includes('dangerous')) {
      actions.push('Stay alert and watch for threats.');
    }
    if (setting?.atmosphere?.toLowerCase().includes('mysterious')) {
      actions.push('Try to uncover a hidden detail.');
    }
    if (
      setting?.location?.toLowerCase().includes('tavern') ||
      setting?.location?.toLowerCase().includes('inn')
    ) {
      actions.push('Listen to any nearby conversations.');
      actions.push('Ask the barkeep for rumors.');
    }

    return actions;
  }
}
