export type RulesMode = 'RAW' | 'RAI' | 'ROF'; // Rule-of-Fun

export interface ExplainContext { 
  mode: RulesMode; 
  ruleRef?: string; 
  note?: string; 
}

export function explainDC(skill: string, baseDC: number, ctx: ExplainContext): string {
  const ref = ctx.ruleRef ? ` [ref: ${ctx.ruleRef}]` : '';
  switch (ctx.mode) {
    case 'RAW': 
      return `RAW DC ${baseDC} for ${skill}.${ref}`;
    case 'RAI': 
      return `RAI DC ${baseDC} considering intent and fiction.${ref}`;
    case 'ROF': 
      return `Rule-of-Fun DC ${baseDC}, tuned for pacing.${ref}`;
    default:
      return `DC ${baseDC} for ${skill}.`;
  }
}

export function explainRoll(
  actorId: string, 
  rollType: 'check' | 'save' | 'attack' | 'damage',
  result: number, 
  dc?: number, 
  ctx?: ExplainContext
): string {
  const dcText = dc ? `DC ${dc}` : '';
  const mode = ctx?.mode || 'RAW';
  
  let baseExplanation = '';
  switch (rollType) {
    case 'check':
      baseExplanation = `${actorId} rolled ${result}`;
      break;
    case 'save':
      baseExplanation = `${actorId} saving throw for ${result}`;
      break;
    case 'attack':
      baseExplanation = `${actorId} attack roll: ${result}`;
      break;
    case 'damage':
      baseExplanation = `${actorId} damage: ${result}`;
      break;
    default:
      baseExplanation = `${actorId} rolled ${result}`;
  }
  
  if (ctx) {
    const modeModifier = ctx.mode === 'RAW' ? '' : 
      ctx.mode === 'RAI' ? ' (RAI)' : 
      ctx.mode === 'ROF' ? ' (ROF)' : '';
    baseExplanation += modeModifier;
    
    if (ctx.ruleRef) {
      baseExplanation += ` [${ctx.ruleRef}]`;
    }
    
    if (ctx.note) {
      baseExplanation += ` - ${ctx.note}`;
    }
  }
  
  return baseExplanation;
}

export function explainCombatOutcome(
  attackerId: string, 
  defenderId: string, 
  attackRoll: number, 
  ac: number, 
  crit?: boolean,
  ctx?: ExplainContext
): string {
  const base = `${ctx?.mode === 'RAW' ? 'RAW' : ctx?.mode === 'RAI' ? 'RAI' : ''} Combat`;
  const hit = attackRoll + 10 >= ac ? 'Hit' : 'Miss';
  const crit = crit ? ' (critical)' : '';
  
  let explanation = `${base}: ${attackerId} ${attackRoll} +10 ${crit} vs ${defenderId} AC ${ac} = ${hit}${crit}`;
  
  if (ctx && ctx.ruleRef) {
    explanation += ` [${ctx.ruleRef}]`;
  }
  
  return explanation;
}

export function getRuleReference(ruleName: string): string {
  // In a real implementation, this would map to actual rulebook references
  const ruleMap: Record<string, string> = {
    'perception': 'PHB p.178',
    'stealth': 'PHB p.177',
    'athletics': 'PHB p.177',
    'acrobatics': 'PHB p.177',
    'arcana': 'PHB p.178',
    'history': 'PHB p.178',
    'investigation': 'PHB p.178',
    'nature': 'PHB p.178',
    'religion': 'PHB p.178',
    'animal_handling': 'PHB p.178',
    'insight': 'PHB p.178',
    'medicine': 'PHB p.178',
    'survival': 'PHB p.178',
    'deception': 'PHB p.180',
    'intimidation': 'PHB p.180',
    'performance': 'PHB p.180',
    'persuasion': 'PHB p.180',
    'sleight_of_hand': 'PHB p.177',
  };
  
  return ruleMap[ruleName.toLowerCase()] || 'Unknown rule';
}
