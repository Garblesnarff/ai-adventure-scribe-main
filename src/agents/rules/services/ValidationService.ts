/**
 * Validation Service
 *
 * This file defines the ValidationService class, responsible for validating
 * game rules based on a given context. It fetches rule validation data from
 * Supabase and implements a caching mechanism to optimize performance for
 * repeated validation checks.
 *
 * Main Class:
 * - ValidationService: Validates rules against data fetched from the backend.
 *
 * Key Dependencies:
 * - Supabase client (`@/integrations/supabase/client`)
 *
 * @author AI Dungeon Master Team
 */

// External/SDK Imports
import { supabase } from '@/integrations/supabase/client';
import { logger } from '../../../lib/logger';

export class ValidationService {
  private validationCache: Map<string, any>;

  constructor() {
    this.validationCache = new Map();
  }

  async validateRules(ruleContext: any) {
    const cacheKey = `${ruleContext.type}_${JSON.stringify(ruleContext)}`;

    if (this.validationCache.has(cacheKey)) {
      logger.info('Using cached validation result');
      return this.validationCache.get(cacheKey);
    }

    try {
      const { data, error } = await supabase
        .from('rule_validations')
        .select('*')
        .eq('rule_type', ruleContext.type)
        .eq('is_active', true);

      if (error) throw error;

      this.validationCache.set(cacheKey, data);

      if (this.validationCache.size > 100) {
        const oldestKey = this.validationCache.keys().next().value;
        this.validationCache.delete(oldestKey);
      }

      return data;
    } catch (error) {
      logger.error('Error validating rules:', error);
      return null;
    }
  }
}
