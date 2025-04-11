import { supabase } from '@/integrations/supabase/client';

export class ValidationService {
  private validationCache: Map<string, any>;

  constructor() {
    this.validationCache = new Map();
  }

  async validateRules(ruleContext: any) {
    const cacheKey = `${ruleContext.type}_${JSON.stringify(ruleContext)}`;
    
    if (this.validationCache.has(cacheKey)) {
      console.log('Using cached validation result');
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
      console.error('Error validating rules:', error);
      return null;
    }
  }
}