import { supabase } from '@/integrations/supabase/client';
import { CampaignContext } from '@/types/dm';

export class OpportunityGenerator {
  async generateOpportunities(campaignId: string, context: CampaignContext) {
    const { data: quests } = await supabase
      .from('quests')
      .select('*')
      .eq('campaign_id', campaignId)
      .eq('status', 'available');

    return {
      immediate: this.generateImmediateActions(context.setting),
      nearby: context.thematicElements.keyLocations.slice(0, 3),
      questHooks: quests?.map(quest => quest.title) || []
    };
  }

  private generateImmediateActions(setting: CampaignContext['setting']): string[] {
    const actions = ['Look around', 'Talk to nearby NPCs'];
    
    if (setting.atmosphere.includes('dangerous')) {
      actions.push('Ready your weapon');
    }
    if (setting.atmosphere.includes('mysterious')) {
      actions.push('Investigate the surroundings');
    }
    
    return actions;
  }
}