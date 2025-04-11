import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface RuleValidationRequest {
  task: {
    id: string;
    description: string;
    expectedOutput: string;
    context?: {
      ruleType: string;
      category?: string;
      data?: any;
    };
  };
  agentContext: {
    role: string;
    goal: string;
    backstory: string;
    ruleValidations?: any[];
  };
}

interface ValidationResult {
  isValid: boolean;
  validations: any[];
  reasoning: string;
  suggestions: string[];
  errors?: string[];
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { task, agentContext } = await req.json() as RuleValidationRequest;
    console.log('Processing rule validation request:', { task, agentContext });

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get relevant rule validations from the database
    const { data: ruleValidations, error } = await supabaseClient
      .from('rule_validations')
      .select('*')
      .eq('rule_type', task.context?.ruleType)
      .eq('is_active', true);

    if (error) {
      throw new Error(`Failed to fetch rule validations: ${error.message}`);
    }

    const result = await validateRules(task, ruleValidations || []);

    return new Response(
      JSON.stringify(result),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    console.error('Error in rules-interpreter-execute:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
})

async function validateRules(task: RuleValidationRequest['task'], ruleValidations: any[]): Promise<ValidationResult> {
  const result: ValidationResult = {
    isValid: true,
    validations: ruleValidations,
    reasoning: `Rule interpretation for task: ${task.description}`,
    suggestions: [],
    errors: []
  };

  switch (task.context?.ruleType) {
    case 'character_creation':
      return validateCharacterCreation(task, ruleValidations, result);
    case 'ability_scores':
      return validateAbilityScores(task, ruleValidations, result);
    case 'combat':
      return validateCombatRules(task, ruleValidations, result);
    case 'spellcasting':
      return validateSpellcasting(task, ruleValidations, result);
    default:
      result.suggestions.push('No specific validation type specified');
      return result;
  }
}

function validateCharacterCreation(
  task: RuleValidationRequest['task'],
  ruleValidations: any[],
  result: ValidationResult
): ValidationResult {
  const data = task.context?.data;
  
  // Validate race selection
  if (data?.race) {
    const raceRules = ruleValidations.find(r => 
      r.rule_category === 'race' && r.validation_data.races.includes(data.race)
    );
    
    if (!raceRules) {
      result.isValid = false;
      result.errors?.push(`Invalid race selection: ${data.race}`);
    }
  }

  // Validate class selection
  if (data?.class) {
    const classRules = ruleValidations.find(r => 
      r.rule_category === 'class' && r.validation_data.classes.includes(data.class)
    );
    
    if (!classRules) {
      result.isValid = false;
      result.errors?.push(`Invalid class selection: ${data.class}`);
    }
  }

  // Add suggestions for character optimization
  if (data?.race && data?.class) {
    const optimizationRules = ruleValidations.find(r => 
      r.rule_category === 'optimization' && 
      r.validation_data.combinations[data.race]?.includes(data.class)
    );
    
    if (optimizationRules) {
      result.suggestions.push(
        `${data.race} racial traits complement the ${data.class} class abilities`
      );
    }
  }

  return result;
}

function validateAbilityScores(
  task: RuleValidationRequest['task'],
  ruleValidations: any[],
  result: ValidationResult
): ValidationResult {
  const data = task.context?.data;
  
  if (!data?.abilityScores) {
    result.isValid = false;
    result.errors?.push('No ability scores provided');
    return result;
  }

  // Validate point-buy rules
  if (data.method === 'point-buy') {
    const pointBuyRules = ruleValidations.find(r => r.rule_category === 'point_buy');
    if (pointBuyRules) {
      const totalPoints = calculatePointBuyCost(data.abilityScores);
      if (totalPoints > pointBuyRules.validation_data.maxPoints) {
        result.isValid = false;
        result.errors?.push(`Point-buy total exceeds maximum (${pointBuyRules.validation_data.maxPoints})`);
      }
    }
  }

  // Validate minimum and maximum scores
  Object.entries(data.abilityScores).forEach(([ability, score]) => {
    if (score < 8 || score > 15) {
      result.isValid = false;
      result.errors?.push(`${ability} score must be between 8 and 15`);
    }
  });

  return result;
}

function validateCombatRules(
  task: RuleValidationRequest['task'],
  ruleValidations: any[],
  result: ValidationResult
): ValidationResult {
  const data = task.context?.data;
  
  if (data?.actionType) {
    const actionRules = ruleValidations.find(r => 
      r.rule_category === 'combat_actions' && 
      r.validation_data.actions[data.actionType]
    );
    
    if (actionRules) {
      const actionValidation = actionRules.validation_data.actions[data.actionType];
      
      // Validate action economy
      if (data.actionsUsed > actionValidation.actionCost) {
        result.isValid = false;
        result.errors?.push(`Insufficient actions remaining for ${data.actionType}`);
      }
      
      // Validate requirements
      actionValidation.requirements?.forEach((req: string) => {
        if (!data.conditions?.includes(req)) {
          result.suggestions.push(`${data.actionType} requires ${req}`);
        }
      });
    }
  }

  return result;
}

function validateSpellcasting(
  task: RuleValidationRequest['task'],
  ruleValidations: any[],
  result: ValidationResult
): ValidationResult {
  const data = task.context?.data;
  
  if (data?.spell) {
    const spellRules = ruleValidations.find(r => 
      r.rule_category === 'spellcasting' && 
      r.validation_data.spells[data.spell]
    );
    
    if (spellRules) {
      const spellValidation = spellRules.validation_data.spells[data.spell];
      
      // Validate spell slot usage
      if (data.spellLevel < spellValidation.minLevel) {
        result.isValid = false;
        result.errors?.push(`Spell slot level too low for ${data.spell}`);
      }
      
      // Validate components
      spellValidation.components?.forEach((component: string) => {
        if (!data.availableComponents?.includes(component)) {
          result.suggestions.push(`${data.spell} requires ${component}`);
        }
      });
    }
  }

  return result;
}

function calculatePointBuyCost(scores: Record<string, number>): number {
  const costTable: Record<number, number> = {
    8: 0, 9: 1, 10: 2, 11: 3, 12: 4, 13: 5, 14: 7, 15: 9
  };
  
  return Object.values(scores).reduce((total, score) => total + (costTable[score] || 0), 0);
}