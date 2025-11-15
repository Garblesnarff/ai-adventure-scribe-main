/**
 * Enhancement Service
 *
 * Manages CRUD operations for enhancement options and selections,
 * integrating with Supabase database and AI generation services.
 */

import { enhancementAI } from './enhancement-ai-generator';

import type { Campaign } from '@/types/campaign';
import type { Character } from '@/types/character';
import type { AbilityScore, EnhancementOption, OptionSelection } from '@/types/enhancement-options';

import logger from '@/lib/logger';
import { supabase } from '@/lib/supabase';
import {
  EnhancementPackage,
  validateOptionSelection,
  checkOptionAvailability,
} from '@/types/enhancement-options';

// Value allowed for an option selection persisted in DB
type OptionSelectionValue = string | string[] | number;

// Context shape stored for AI-generated selections
interface GenerationContext {
  character?: Character;
  campaign?: Campaign;
  existingSelections?: OptionSelection[];
  userPreferences?: {
    tone?: 'serious' | 'humorous' | 'dramatic';
    complexity?: 'simple' | 'moderate' | 'complex';
    focus?: 'combat' | 'roleplay' | 'exploration' | 'social';
  };
}

// Database record for enhancement options
interface EnhancementOptionRecord {
  option_id: string;
  name: string;
  description: string;
  category: 'character' | 'campaign';
  type: 'single' | 'multiple' | 'number' | 'text';
  icon?: string | null;
  tags?: string[] | null;
  options?: string[] | null;
  min_value?: number | null;
  max_value?: number | null;
  mechanical_effects?: EnhancementOption['mechanicalEffects'] | null;
  campaign_effects?: EnhancementOption['campaignEffects'] | null;
  requires_race?: string[] | null;
  requires_class?: string[] | null;
  requires_background?: string[] | null;
  requires_level?: number | null;
  requires_ability_score?: { ability: AbilityScore; minimum: number }[] | null;
  excludes_with?: string[] | null;
  unlocks?: string[] | null;
  mutually_exclusive_with?: string[] | null;
  ai_generated?: boolean | null;
  ai_generation_prompt?: string | null;
  ai_context?: EnhancementOption['aiContext'] | null;
}

export interface EnhancementSelectionRecord {
  id: string;
  character_id?: string;
  campaign_id?: string;
  option_id: string;
  selection_value: OptionSelectionValue;
  custom_value?: string;
  ai_generated: boolean;
  ai_prompt_used?: string;
  generation_context?: GenerationContext | null;
  created_at: string;
  updated_at: string;
}

export class EnhancementService {
  private static instance: EnhancementService;

  private constructor() {}

  public static getInstance(): EnhancementService {
    if (!EnhancementService.instance) {
      EnhancementService.instance = new EnhancementService();
    }
    return EnhancementService.instance;
  }

  /**
   * Get all available enhancement options
   */
  public async getEnhancementOptions(
    category?: 'character' | 'campaign',
  ): Promise<EnhancementOption[]> {
    try {
      let query = supabase.from('enhancement_options').select('*').eq('is_active', true);

      if (category) {
        query = query.eq('category', category);
      }

      const { data, error } = await query.order('name');

      if (error) throw error;

      return data?.map(this.mapDatabaseOptionToType) || [];
    } catch (error) {
      logger.error('Failed to fetch enhancement options:', error);
      throw new Error('Failed to load enhancement options');
    }
  }

  /**
   * Get enhancement selections for a character or campaign
   */
  public async getSelections(
    targetId: string,
    targetType: 'character' | 'campaign',
  ): Promise<OptionSelection[]> {
    try {
      const column = targetType === 'character' ? 'character_id' : 'campaign_id';

      const { data, error } = await supabase
        .from('enhancement_selections')
        .select('*')
        .eq(column, targetId)
        .order('created_at');

      if (error) throw error;

      return data?.map(this.mapDatabaseSelectionToType) || [];
    } catch (error) {
      logger.error('Failed to fetch selections:', error);
      throw new Error('Failed to load enhancement selections');
    }
  }

  /**
   * Save enhancement selections for a character or campaign
   */
  public async saveSelections(
    targetId: string,
    targetType: 'character' | 'campaign',
    selections: OptionSelection[],
  ): Promise<void> {
    try {
      const column = targetType === 'character' ? 'character_id' : 'campaign_id';

      // Delete existing selections
      await supabase.from('enhancement_selections').delete().eq(column, targetId);

      // Insert new selections
      if (selections.length > 0) {
        const records = selections.map((selection) => ({
          [column]: targetId,
          option_id: selection.optionId,
          selection_value: selection.value,
          custom_value: selection.customValue,
          ai_generated: selection.aiGenerated || false,
          ai_prompt_used: null, // Could be enhanced to track prompts
          generation_context: null,
        }));

        const { error } = await supabase.from('enhancement_selections').insert(records);

        if (error) throw error;
      }
    } catch (error) {
      logger.error('Failed to save selections:', error);
      throw new Error('Failed to save enhancement selections');
    }
  }

  /**
   * Add a single enhancement selection
   */
  public async addSelection(
    targetId: string,
    targetType: 'character' | 'campaign',
    selection: OptionSelection,
  ): Promise<void> {
    try {
      const column = targetType === 'character' ? 'character_id' : 'campaign_id';

      const record = {
        [column]: targetId,
        option_id: selection.optionId,
        selection_value: selection.value,
        custom_value: selection.customValue,
        ai_generated: selection.aiGenerated || false,
        ai_prompt_used: null,
        generation_context: null,
      };

      const { error } = await supabase.from('enhancement_selections').insert(record);

      if (error) throw error;
    } catch (error) {
      logger.error('Failed to add selection:', error);
      throw new Error('Failed to add enhancement selection');
    }
  }

  /**
   * Remove an enhancement selection
   */
  public async removeSelection(
    targetId: string,
    targetType: 'character' | 'campaign',
    optionId: string,
  ): Promise<void> {
    try {
      const column = targetType === 'character' ? 'character_id' : 'campaign_id';

      const { error } = await supabase
        .from('enhancement_selections')
        .delete()
        .eq(column, targetId)
        .eq('option_id', optionId);

      if (error) throw error;
    } catch (error) {
      logger.error('Failed to remove selection:', error);
      throw new Error('Failed to remove enhancement selection');
    }
  }

  /**
   * Generate AI-powered enhancement content
   */
  public async generateAIEnhancement(
    optionId: string,
    character?: Character,
    campaign?: Campaign,
    existingSelections?: OptionSelection[],
  ): Promise<string> {
    try {
      // Get the option details
      const options = await this.getEnhancementOptions();
      const option = options.find((o) => o.id === optionId);

      if (!option || !option.aiGenerated || !option.aiGenerationPrompt) {
        throw new Error('Option is not AI-generated or missing prompt');
      }

      // Generate using AI service
      const result = await enhancementAI.generateEnhancement({
        optionId,
        prompt: option.aiGenerationPrompt,
        context: {
          character,
          campaign,
          existingSelections,
        },
      });

      return result;
    } catch (error) {
      logger.error('AI generation failed:', error);
      throw new Error('Failed to generate AI enhancement');
    }
  }

  /**
   * Get recommended enhancements based on current context
   */
  public async getRecommendations(
    category: 'character' | 'campaign',
    character?: Character,
    campaign?: Campaign,
    existingSelections?: OptionSelection[],
  ): Promise<string[]> {
    try {
      return await enhancementAI.generateRecommendations(
        { character, campaign, existingSelections },
        category,
      );
    } catch (error) {
      logger.error('Failed to get recommendations:', error);
      return [];
    }
  }

  /**
   * Validate selections against constraints
   */
  public validateSelections(
    selections: OptionSelection[],
    options: EnhancementOption[],
    character?: Character,
    campaign?: Campaign,
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check individual selection validity
    for (const selection of selections) {
      const option = options.find((o) => o.id === selection.optionId);
      if (!option) {
        errors.push(`Option ${selection.optionId} not found`);
        continue;
      }

      if (!validateOptionSelection(option, selection)) {
        errors.push(`Invalid selection for ${option.name}`);
      }

      // Check availability
      const selectedOptionIds = selections.map((s) => s.optionId);
      if (!checkOptionAvailability(option, character, campaign, selectedOptionIds)) {
        errors.push(`Option ${option.name} is not available for current context`);
      }
    }

    // Check for conflicts
    const optionIds = selections.map((s) => s.optionId);
    const duplicates = optionIds.filter((id, index) => optionIds.indexOf(id) !== index);
    if (duplicates.length > 0) {
      errors.push(`Duplicate selections: ${duplicates.join(', ')}`);
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Apply enhancement effects to character or campaign
   */
  public applyEnhancementEffects(
    selections: OptionSelection[],
    options: EnhancementOption[],
    target: Character | Campaign,
  ): {
    mechanical: Partial<NonNullable<EnhancementOption['mechanicalEffects']>>;
    campaign: Partial<NonNullable<EnhancementOption['campaignEffects']>>;
    narrative: Array<{ option: string; value: OptionSelectionValue; custom?: string }>;
  } {
    const effects: {
      mechanical: Partial<NonNullable<EnhancementOption['mechanicalEffects']>>;
      campaign: Partial<NonNullable<EnhancementOption['campaignEffects']>>;
      narrative: Array<{ option: string; value: OptionSelectionValue; custom?: string }>;
    } = {
      mechanical: {},
      campaign: {},
      narrative: [],
    };

    selections.forEach((selection) => {
      const option = options.find((o) => o.id === selection.optionId);
      if (!option) return;

      // Apply mechanical effects for characters
      if (option.mechanicalEffects && 'race' in target) {
        Object.assign(effects.mechanical, option.mechanicalEffects);
      }

      // Apply campaign effects for campaigns
      if (option.campaignEffects && 'setting' in target) {
        Object.assign(effects.campaign, option.campaignEffects);
      }

      // Collect narrative elements
      effects.narrative.push({
        option: option.name,
        value: selection.value,
        custom: selection.customValue,
      });
    });

    return effects;
  }

  /**
   * Map database option record to TypeScript interface
   */
  private mapDatabaseOptionToType(record: EnhancementOptionRecord): EnhancementOption {
    return {
      id: record.option_id,
      name: record.name,
      description: record.description,
      category: record.category,
      type: record.type,
      icon: record.icon ?? undefined,
      tags: record.tags ?? [],
      options: record.options ?? [],
      min: record.min_value ?? undefined,
      max: record.max_value ?? undefined,
      mechanicalEffects: record.mechanical_effects ?? undefined,
      campaignEffects: record.campaign_effects ?? undefined,
      requiresRace: record.requires_race ?? undefined,
      requiresClass: record.requires_class ?? undefined,
      requiresBackground: record.requires_background ?? undefined,
      requiresLevel: record.requires_level ?? undefined,
      requiresAbilityScore: record.requires_ability_score ?? undefined,
      excludesWith: record.excludes_with ?? undefined,
      unlocks: record.unlocks ?? undefined,
      mutuallyExclusiveWith: record.mutually_exclusive_with ?? undefined,
      aiGenerated: record.ai_generated ?? undefined,
      aiGenerationPrompt: record.ai_generation_prompt ?? undefined,
      aiContext: record.ai_context ?? undefined,
    };
  }

  /**
   * Map database selection record to TypeScript interface
   */
  private mapDatabaseSelectionToType(record: EnhancementSelectionRecord): OptionSelection {
    return {
      optionId: record.option_id,
      value: record.selection_value,
      customValue: record.custom_value,
      aiGenerated: record.ai_generated,
      timestamp: record.created_at,
    };
  }
}

// Export singleton instance
export const enhancementService = EnhancementService.getInstance();
