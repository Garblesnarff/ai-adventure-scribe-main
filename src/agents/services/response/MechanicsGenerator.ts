import { supabase } from '@/integrations/supabase/client';
import { CampaignContext } from '@/types/dm';

export class MechanicsGenerator {
  async generateMechanics(context: CampaignContext) {
    return {
      availableActions: ['Move', 'Interact', 'Attack', 'Cast Spell'],
      relevantRules: await this.getRulesForContext(),
      suggestions: this.generateActionSuggestions(context)
    };
  }

  private async getRulesForContext(): Promise<string[]> {
    const { data: rules } = await supabase
      .from('rule_validations')
      .select('rule_description')
      .eq('is_active', true)
      .limit(3);

    return rules?.map(rule => rule.rule_description) || [];
  }

  private generateActionSuggestions(context: CampaignContext): string[] {
    const suggestions = [];

    if (context.genre === 'mystery') {
      suggestions.push('Search for clues');
    }
    if (context.tone === 'humorous') {
      suggestions.push('Try telling a joke');
    }

    return suggestions;
  }
}