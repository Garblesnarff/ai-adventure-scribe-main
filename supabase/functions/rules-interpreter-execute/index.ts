import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-request-id, x-release, x-environment',
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

  const requestId = req.headers.get('x-request-id') || (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`);

  try {
    const { task, agentContext } = await req.json() as RuleValidationRequest;
    console.log('Processing rule validation request:', { task, agentContext, requestId });

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
      JSON.stringify({ ...result, requestId }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json', 'x-request-id': requestId },
        status: 200,
      },
    )
  } catch (error: any) {
    console.error('Error in rules-interpreter-execute:', error, { requestId });
    return new Response(
      JSON.stringify({ error: error.message, requestId }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json', 'x-request-id': requestId },
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
  const action = data?.action;
  const participant = data?.participant;
  const encounter = data?.encounter;
  
  // Enhanced combat validation with real D&D 5e rules
  if (action && participant) {
    // Validate action economy
    if (action.actionType === 'attack' || action.actionType === 'cast_spell' || action.actionType === 'grapple' || action.actionType === 'shove') {
      if (participant.actionTaken) {
        result.isValid = false;
        result.errors?.push(`${participant.name} has already used their action this turn`);
      }
    }
    
    if (action.actionType === 'bonus_action' && participant.bonusActionTaken) {
      result.isValid = false;
      result.errors?.push(`${participant.name} has already used their bonus action this turn`);
    }
    
    if (['reaction', 'opportunity_attack', 'counterspell', 'deflect_missiles'].includes(action.actionType) && participant.reactionTaken) {
      result.isValid = false;
      result.errors?.push(`${participant.name} has already used their reaction this turn`);
    }
    
    // Validate conditions affecting actions
    const incapacitatingConditions = ['stunned', 'paralyzed', 'unconscious', 'petrified'];
    const hasIncapacitatingCondition = participant.conditions?.some(c => 
      incapacitatingConditions.includes(c.name)
    );
    
    if (hasIncapacitatingCondition) {
      result.isValid = false;
      result.errors?.push(`${participant.name} is incapacitated and cannot take actions`);
    }
    
    // Validate racial trait usage
    if (participant.racialTraits) {
      for (const trait of participant.racialTraits) {
        if (trait.type === 'active' && !canUseRacialTrait(trait)) {
          result.suggestions.push(`${trait.name} is not available (${trait.currentUses}/${trait.maxUses} uses remaining)`);
        }
      }
    }
    
    // Validate class feature usage
    if (participant.classFeatures && participant.resources) {
      for (const feature of participant.classFeatures) {
        if (feature.type !== 'passive' && !canUseClassFeature(feature, participant.resources)) {
          result.suggestions.push(`${feature.name} is not available`);
        }
      }
    }
    
    // Validate Barbarian Rage requirements
    if (action.actionType === 'rage' && participant.characterClass === 'barbarian') {
      if (participant.isRaging) {
        result.isValid = false;
        result.errors?.push(`${participant.name} is already raging`);
      }
      
      const rageFeature = participant.classFeatures?.find(f => f.name === 'rage');
      if (!rageFeature || (rageFeature.currentUses || 0) <= 0) {
        result.isValid = false;
        result.errors?.push(`${participant.name} has no rage uses remaining`);
      }
    }
    
    // Validate Sneak Attack conditions
    if (action.actionType === 'attack' && participant.characterClass === 'rogue') {
      const target = encounter?.participants?.find(p => p.id === action.targetParticipantId);
      if (target) {
        const hasAdvantage = checkSneakAttackAdvantage(participant, target, encounter);
        if (hasAdvantage) {
          result.suggestions.push(`Sneak Attack available - add ${getSneakAttackDice(participant.level || 1)}d6 damage`);
        }
      }
    }
    
    // Validate Divine Smite usage
    if (action.actionType === 'divine_smite' && participant.characterClass === 'paladin') {
      if (!participant.spellSlots || !hasAvailableSpellSlots(participant.spellSlots)) {
        result.isValid = false;
        result.errors?.push(`${participant.name} has no spell slots for Divine Smite`);
      }
    }
    
    // Validate spell casting
    if (action.actionType === 'cast_spell') {
      const spellLevel = action.spellLevel || 1;
      const spellSlots = participant.spellSlots;
      
      if (spellSlots && spellSlots[spellLevel]?.current <= 0) {
        result.isValid = false;
        result.errors?.push(`No spell slots remaining for level ${spellLevel} spells`);
      }
      
      // Check concentration
      if (participant.activeConcentration && action.requiresConcentration) {
        result.suggestions.push(`Casting this spell will end concentration on ${participant.activeConcentration}`);
      }
    }
    
    // Validate attack actions
    if (action.actionType === 'attack') {
      if (action.targetParticipantId) {
        const target = encounter?.participants?.find(p => p.id === action.targetParticipantId);
        if (target?.currentHitPoints <= 0) {
          result.suggestions.push(`Target ${target.name} is unconscious - consider stabilizing instead`);
        }
      }
    }
    
    // Validate movement-based actions
    if (['dash', 'dodge'].includes(action.actionType)) {
      const restrainingConditions = ['grappled', 'restrained', 'paralyzed'];
      const isRestrained = participant.conditions?.some(c => 
        restrainingConditions.includes(c.name)
      );
      
      if (isRestrained && action.actionType === 'dash') {
        result.isValid = false;
        result.errors?.push(`${participant.name} is restrained and cannot dash`);
      }
    }
    
    // Provide tactical suggestions
    if (participant.currentHitPoints <= participant.maxHitPoints * 0.25) {
      result.suggestions.push(`${participant.name} is badly wounded - consider defensive actions or healing`);
    }
    
    if (participant.conditions?.some(c => c.name === 'poisoned')) {
      result.suggestions.push(`${participant.name} is poisoned - attacks have disadvantage`);
    }
  }
  
  // Validate encounter state
  if (encounter) {
    if (encounter.phase !== 'active') {
      result.isValid = false;
      result.errors?.push('Combat is not currently active');
    }
    
    // Check if it's the participant's turn
    if (encounter.currentTurnParticipantId !== participant?.id) {
      result.isValid = false;
      result.errors?.push(`It is not ${participant?.name}'s turn`);
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

// Helper functions for enhanced combat validation
function canUseRacialTrait(trait: any): boolean {
  if (trait.type === 'passive') return true;
  if (!trait.maxUses) return true;
  return (trait.currentUses || 0) > 0;
}

function canUseClassFeature(feature: any, resources: any): boolean {
  if (feature.type === 'passive') return true;
  if (!feature.maxUses) return true;
  
  switch (feature.name) {
    case 'ki':
      return (resources.kiPoints?.current || 0) > (feature.resourceCost || 1);
    default:
      return (feature.currentUses || 0) > 0;
  }
}

function getSneakAttackDice(level: number): number {
  return Math.ceil(level / 2);
}

function checkSneakAttackAdvantage(attacker: any, target: any, encounter: any): boolean {
  // Check if attacker has advantage on the attack
  // This is simplified - in a real implementation you'd check all advantage sources
  
  // Check if there's an ally within 5 feet of the target
  const alliesNearTarget = encounter?.participants?.filter((p: any) => 
    p.id !== attacker.id && 
    p.id !== target.id &&
    p.participantType === attacker.participantType &&
    p.currentHitPoints > 0 &&
    isWithinRange(p, target, 5) // Simplified range check
  );
  
  return alliesNearTarget?.length > 0;
}

function isWithinRange(participant1: any, participant2: any, range: number): boolean {
  // Simplified range check - in a real implementation you'd have proper positioning
  return true; // Assume most combat happens within range
}

function hasAvailableSpellSlots(spellSlots: Record<number, { max: number; current: number }>): boolean {
  for (let level = 1; level <= 9; level++) {
    if (spellSlots[level]?.current > 0) {
      return true;
    }
  }
  return false;
}