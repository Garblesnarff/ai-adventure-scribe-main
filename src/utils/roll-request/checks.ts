export interface ValidationIssue {
  type:
    | 'missing_attack_roll'
    | 'missing_ac'
    | 'missing_dc'
    | 'missing_modifier'
    | 'missing_initiative'
    | 'wrong_sequence';
  severity: 'critical' | 'high' | 'medium' | 'low';
  message: string;
  suggestion: string;
}

export interface MessageValidation {
  isValid: boolean;
  issues: ValidationIssue[];
  warnings: ValidationIssue[];
}

export function validateDMMessage(message: string): MessageValidation {
  const issues: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];

  if (detectsDamageRequestOnly(message)) {
    issues.push({
      type: 'missing_attack_roll',
      severity: 'critical',
      message: 'Damage roll requested without attack roll',
      suggestion:
        'Request attack roll first: "Make an attack roll with your [weapon] (1d20+bonus) against AC [number]"',
    });
  }

  if (detectsAttackRequest(message) && !containsAC(message)) {
    issues.push({
      type: 'missing_ac',
      severity: 'high',
      message: 'Attack roll requested without target AC',
      suggestion: 'Include target AC: "Make an attack roll against AC [number]"',
    });
  }

  if (detectsSkillCheckOnly(message) && !containsDC(message)) {
    issues.push({
      type: 'missing_dc',
      severity: 'high',
      message: 'Skill check requested without DC',
      suggestion: 'Include DC: "Make a [skill] check (1d20+modifier, DC [number])"',
    });
  }

  if (detectsSavingThrow(message) && !containsDC(message)) {
    issues.push({
      type: 'missing_dc',
      severity: 'high',
      message: 'Saving throw requested without DC',
      suggestion: 'Include DC: "Make a [ability] saving throw (1d20+modifier, DC [number])"',
    });
  }

  if (detectsDamageRequest(message) && !containsModifier(message)) {
    warnings.push({
      type: 'missing_modifier',
      severity: 'medium',
      message: 'Damage roll missing ability modifier',
      suggestion: 'Include modifier: "Roll 1d8+STR modifier" or "Roll 1d6+3"',
    });
  }

  if (detectsCombatStart(message) && !detectsInitiativeRequest(message)) {
    issues.push({
      type: 'missing_initiative',
      severity: 'critical',
      message: 'Combat started without initiative request',
      suggestion: 'Request initiative first: "Combat begins! Roll initiative (1d20+dex modifier)"',
    });
  }

  return { isValid: issues.length === 0, issues, warnings };
}

export function detectsDamageRequestOnly(message: string): boolean {
  const damagePatterns = [/^roll\s+\d*d\d+/gi, /^roll\s+damage/gi, /^\d*d\d+\s+damage/gi];
  const hasDamageRequest = damagePatterns.some((pattern) => pattern.test(message.trim()));
  const hasAttackContext = /attack|hit|strike|blade|weapon/gi.test(message);
  return hasDamageRequest && !hasAttackContext;
}

export function detectsCombatStart(message: string): boolean {
  const combatPatterns = [
    /combat\s+begins/gi,
    /battle\s+starts/gi,
    /initiative/gi,
    /enters?\s+combat/gi,
    /fight\s+begins/gi,
  ];
  return combatPatterns.some((pattern) => pattern.test(message));
}

export function detectsInitiativeRequest(message: string): boolean {
  const initiativePatterns = [/roll\s+initiative/gi, /initiative\s+roll/gi, /1d20\s*\+\s*dex/gi];
  return initiativePatterns.some((pattern) => pattern.test(message));
}

export function detectsAttackRequest(message: string): boolean {
  const attackPatterns = [
    /make\s+an?\s+attack\s+roll/gi,
    /roll\s+(?:to\s+)?attack/gi,
    /attack\s+roll/gi,
    /1d20.*(?:attack|hit)/gi,
  ];
  return attackPatterns.some((pattern) => pattern.test(message));
}

export function detectsSkillCheckOnly(message: string): boolean {
  const skillPatterns = [/make\s+a\s+\w+\s+check/gi, /roll\s+a\s+\w+\s+check/gi, /\w+\s+check/gi];
  const hasSkillCheck = skillPatterns.some((pattern) => pattern.test(message));
  const hasAttackContext = /attack|damage|hit/gi.test(message);
  return hasSkillCheck && !hasAttackContext;
}

export function detectsSavingThrow(message: string): boolean {
  const savePatterns = [/saving\s+throw/gi, /make\s+a\s+\w+\s+save/gi, /\w+\s+save/gi];
  return savePatterns.some((pattern) => pattern.test(message));
}

export function detectsDamageRequest(message: string): boolean {
  const damagePatterns = [/roll.*damage/gi, /damage.*roll/gi, /\d*d\d+.*damage/gi];
  return damagePatterns.some((pattern) => pattern.test(message));
}

export function containsAC(message: string): boolean {
  return /AC\s+\d+/gi.test(message) || /armor\s+class\s+\d+/gi.test(message);
}

export function containsDC(message: string): boolean {
  return /DC\s+\d+/gi.test(message) || /difficulty\s+class\s+\d+/gi.test(message);
}

export function containsModifier(message: string): boolean {
  return (
    /\+\s*(?:str|dex|con|int|wis|cha|\d+)/gi.test(message) ||
    /(?:strength|dexterity|constitution|intelligence|wisdom|charisma)\s+modifier/gi.test(message)
  );
}

export function extractAC(message: string): number | null {
  const acMatch = message.match(/AC\s+(\d+)/gi) || message.match(/armor\s+class\s+(\d+)/gi);
  return acMatch ? parseInt(acMatch[1]) : null;
}

export function extractDC(message: string): number | null {
  const dcMatch = message.match(/DC\s+(\d+)/gi) || message.match(/difficulty\s+class\s+(\d+)/gi);
  return dcMatch ? parseInt(dcMatch[1]) : null;
}

export function suggestCorrection(message: string, validation: MessageValidation): string | null {
  if (validation.isValid) return null;
  const primaryIssue = validation.issues[0];
  if (!primaryIssue) return null;

  switch (primaryIssue.type) {
    case 'missing_attack_roll':
      return 'Make an attack roll with your weapon (1d20+attack bonus) against AC [number]';
    case 'missing_ac':
      return message.replace(
        /make\s+an?\s+attack\s+roll/gi,
        'Make an attack roll against AC [number]',
      );
    case 'missing_dc':
      if (message.includes('check')) return message + ' (DC [number])';
      if (message.includes('saving throw')) return message + ' (DC [number])';
      return message;
    case 'missing_initiative':
      return 'Combat begins! Roll initiative (1d20+dex modifier)';
    default:
      return primaryIssue.suggestion;
  }
}
