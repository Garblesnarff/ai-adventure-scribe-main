/**
 * Roll Request Parser
 * Parses DM messages to detect and extract dice roll requests
 */

import { RollRequest } from '@/components/game/DiceRollRequest';

interface ParsedRollRequest extends RollRequest {
  originalText: string;
  confidence: number; // 0-1, how confident we are this is a roll request
}

/**
 * Parse a DM message for dice roll requests
 */
export function parseRollRequests(message: string): ParsedRollRequest[] {
  const requests: ParsedRollRequest[] = [];

  // Enhanced patterns for roll requests including attack rolls and more natural language
  const patterns = [
    // "Make a Perception check (1d20+3, DC 12)"
    /make\s+an?\s+(\w+(?:\s+\w+)?)\s+(?:check|save|roll).*?\(([^)]+)(?:,\s*DC\s+(\d+))?\)/gi,

    // "Roll initiative! (1d20+dex modifier)"
    /roll\s+initiative.*?\(([^)]+)\)/gi,

    // "Please roll 1d20+5 for your spellcasting check"
    /(?:please\s+)?roll\s+([\dd+\-\s]+)(?:\s+for\s+(.+?))?(?:\s+\((?:DC\s+(\d+)|AC\s+(\d+))\))?/gi,

    // "Make an attack roll with your longsword (1d20+5) against AC 15"
    /make\s+an?\s+attack\s+roll.*?\(([^)]+)\)(?:.*?(?:AC|against)\s+(\d+))?/gi,

    // "Roll damage for your longsword (1d8+3)"
    /roll\s+damage.*?\(([^)]+)\)/gi,

    // Generic "Roll [dice] to [purpose]"
    /roll\s+([\dd+\-\s]+)\s+(?:to|for)\s+(.+?)(?:\s+\((?:DC\s+(\d+)|AC\s+(\d+))\))?/gi,

    // Enhanced attack roll patterns
    // "Please roll an attack roll with your dagger"
    /(?:please\s+)?roll\s+an?\s+attack\s+roll/gi,

    // "Make an attack" or "Roll for attack"
    /(?:make\s+an?|roll\s+(?:for\s+)?)\s*attack(?:\s+roll)?/gi,

    // "Roll to attack" or "Roll to hit"
    /roll\s+to\s+(?:attack|hit)/gi,

    // Initiative patterns
    /roll\s+initiative/gi,

    // Generic ability checks without parentheses
    /make\s+a\s+(dexterity|strength|constitution|intelligence|wisdom|charisma)\s+(?:check|save|saving\s+throw)/gi,

    // Skill checks without parentheses
    /make\s+a\s+(perception|stealth|investigation|insight|persuasion|deception|intimidation|athletics|acrobatics|arcana|history|medicine|nature|religion|survival|performance|sleight\s+of\s+hand|animal\s+handling)\s+check/gi
  ];

  let match;

  // Pattern 1: Enhanced attack roll detection (without explicit dice)
  const attackPatterns = [
    /(?:please\s+)?(?:make\s+an?|roll\s+an?)\s*attack\s*(?:roll)?/gi,
    /roll\s+to\s+(?:attack|hit)/gi,
    /(?:make\s+an?|roll\s+(?:for\s+)?)\s*attack(?:\s+roll)?/gi
  ];

  attackPatterns.forEach(pattern => {
    while ((match = pattern.exec(message)) !== null) {
      requests.push({
        type: 'attack',
        formula: '1d20+modifier', // Will be calculated with character data
        purpose: 'Attack roll',
        originalText: match[0],
        confidence: 0.95
      });
    }
  });

  // Pattern 2: Initiative (enhanced)
  const initiativePatterns = [
    /roll\s+initiative.*?\(([^)]+)\)/gi,
    /roll\s+initiative/gi
  ];

  initiativePatterns.forEach(pattern => {
    while ((match = pattern.exec(message)) !== null) {
      const formula = match[1] ? normalizeFormula(match[1]) : '1d20+dex';
      requests.push({
        type: 'initiative',
        formula,
        purpose: 'Initiative roll for combat order',
        originalText: match[0],
        confidence: 0.95
      });
    }
  });

  // Pattern 3: Skill/Ability checks and saves with explicit dice
  const checkPattern = /make\s+an?\s+(constitution|dexterity|strength|intelligence|wisdom|charisma|[\w\s]+)\s+(check|save|saving\s+throw).*?\(([^)]+)(?:,\s*DC\s+(\d+))?\)/gi;
  while ((match = checkPattern.exec(message)) !== null) {
    const ability = match[1].toLowerCase();
    const type = match[2].toLowerCase();
    const formula = match[3].trim();
    const dc = match[4] ? parseInt(match[4]) : undefined;

    const rollType = type.includes('save') ? 'save' : 'check';
    const purpose = `${ability.charAt(0).toUpperCase() + ability.slice(1)} ${type}`;

    requests.push({
      type: rollType as 'save' | 'check',
      formula: normalizeFormula(formula),
      purpose,
      dc,
      originalText: match[0],
      confidence: 0.9
    });
  }

  // Pattern 2b: "Roll for <skill> (DC 14)" without explicit dice
  const rollForSkillPattern = /(?:please\s+)?roll\s+for\s+(perception|stealth|investigation|insight|persuasion|deception|intimidation|athletics|acrobatics|arcana|history|medicine|nature|religion|survival|performance|sleight\s+of\s+hand|animal\s+handling)(?:\s*\(?(?:dc|DC)\s*(\d+)\)?)?/gi;
  while ((match = rollForSkillPattern.exec(message)) !== null) {
    const skill = match[1].toLowerCase();
    const dc = match[2] ? parseInt(match[2]) : undefined;
    requests.push({
      type: 'check',
      formula: '1d20+modifier',
      purpose: `${skill.charAt(0).toUpperCase() + skill.slice(1)} check`,
      dc,
      originalText: match[0],
      confidence: 0.92
    });
  }

  // Pattern 4: Ability checks without explicit dice
  const abilityCheckPattern = /make\s+a\s+(dexterity|strength|constitution|intelligence|wisdom|charisma)\s+(?:check|save|saving\s+throw)/gi;
  while ((match = abilityCheckPattern.exec(message)) !== null) {
    const ability = match[1].toLowerCase();
    const isType = message.toLowerCase().includes('save') ? 'save' : 'check';

    requests.push({
      type: isType as 'save' | 'check',
      formula: `1d20+${ability.slice(0, 3)}`, // Will be calculated with character data
      purpose: `${ability.charAt(0).toUpperCase() + ability.slice(1)} ${isType}`,
      originalText: match[0],
      confidence: 0.9
    });
  }

  // Pattern 5: Skill checks without explicit dice
  const skillCheckPattern = /make\s+a\s+(perception|stealth|investigation|insight|persuasion|deception|intimidation|athletics|acrobatics|arcana|history|medicine|nature|religion|survival|performance|sleight\s+of\s+hand|animal\s+handling)\s+check/gi;
  while ((match = skillCheckPattern.exec(message)) !== null) {
    const skill = match[1].toLowerCase();

    requests.push({
      type: 'skill_check',
      formula: `1d20+${skill}`, // Will be calculated with character data
      purpose: `${skill.charAt(0).toUpperCase() + skill.slice(1)} check`,
      originalText: match[0],
      confidence: 0.9
    });
  }

  // Pattern 6: Enhanced damage rolls with multiple patterns
  const damagePatterns = [
    // "Roll damage for your longsword (1d8+3)"
    /roll\s+damage.*?\(([^)]+)\)/gi,

    // "Roll critical damage (2d6+2)"
    /roll\s+critical\s+damage.*?\(([^)]+)\)/gi,

    // "Roll [dice] for damage"
    /roll\s+([\dd+\s-]+)\s+for\s+damage/gi,

    // "Now roll damage"
    /now\s+roll\s+damage/gi,

    // "Roll your weapon damage"
    /roll\s+(?:your\s+)?(?:weapon\s+)?damage/gi,

    // "That hits! Roll damage" (contextual damage after hit)
    /(?:that\s+hits|you\s+hit).*?roll\s+damage/gi,

    // "Critical hit! Roll double damage"
    /critical\s+hit.*?roll.*?damage/gi
  ];

  damagePatterns.forEach((pattern, index) => {
    while ((match = pattern.exec(message)) !== null) {
      let formula = '1d6'; // Default damage
      let confidence = 0.85;
      let purpose = 'Damage roll';

      // If we have explicit dice notation
      if (match[1]) {
        formula = normalizeFormula(match[1]);
      }

      // Higher confidence for explicit patterns
      if (index < 2) confidence = 0.95;

      // Special handling for critical damage
      if (match[0].toLowerCase().includes('critical')) {
        purpose = 'Critical damage roll';
        confidence = 0.98;
      }

      requests.push({
        type: 'damage',
        formula,
        purpose,
        originalText: match[0],
        confidence
      });
    }
  });

  // Pattern 7: Generic roll requests with explicit dice
  const genericPattern = /(?:please\s+)?roll\s+([\dd+\s-]+)(?:\s+for\s+(.+?))?(?:\s+\((?:DC\s+(\d+)|AC\s+(\d+))\))?/gi;
  while ((match = genericPattern.exec(message)) !== null) {
    // Skip if we already found this as a more specific pattern
    if (requests.some(r => r.originalText.includes(match[0]))) continue;

    const formula = match[1].trim();
    const purpose = match[2] || 'Dice roll';
    const dc = match[3] ? parseInt(match[3]) : undefined;
    const ac = match[4] ? parseInt(match[4]) : undefined;

    // Determine type based on context
    let type: RollRequest['type'] = 'check';
    if (purpose.toLowerCase().includes('attack')) type = 'attack';
    else if (purpose.toLowerCase().includes('damage')) type = 'damage';
    else if (purpose.toLowerCase().includes('save')) type = 'save';
    else if (purpose.toLowerCase().includes('initiative')) type = 'initiative';

    requests.push({
      type,
      formula: normalizeFormula(formula),
      purpose: purpose.charAt(0).toUpperCase() + purpose.slice(1),
      dc,
      ac,
      originalText: match[0],
      confidence: 0.7
    });
  }

  // Remove duplicates and return highest confidence matches
  const uniqueRequests = requests
    .filter((request, index, self) => 
      index === self.findIndex(r => r.formula === request.formula && r.purpose === request.purpose)
    )
    .filter(r => r.confidence > 0.5)
    .sort((a, b) => b.confidence - a.confidence);

  return uniqueRequests;
}

/**
 * Normalize dice formula to standard format
 */
function normalizeFormula(formula: string): string {
  // Clean up the formula
  let normalized = formula
    .replace(/\s+/g, '') // Remove spaces
    .toLowerCase()
    .replace(/modifier/g, '') // Remove "modifier" word
    .replace(/\+\+/g, '+') // Fix double plus
    .replace(/--/g, '-') // Fix double minus
    .replace(/\+$/, '') // Remove trailing plus
    .replace(/-$/, ''); // Remove trailing minus

  // If it doesn't start with a dice notation, assume it's d20
  if (!/^\d*d\d+/.test(normalized)) {
    if (/^[+-]?\d+$/.test(normalized)) {
      // Just a modifier, add d20
      normalized = '1d20' + (normalized.startsWith('+') || normalized.startsWith('-') ? '' : '+') + normalized;
    } else if (normalized.includes('dex') || normalized.includes('str') || normalized.includes('con') || 
               normalized.includes('int') || normalized.includes('wis') || normalized.includes('cha')) {
      // Contains ability modifier reference
      normalized = '1d20+modifier';
    } else {
      // Default to d20
      normalized = '1d20';
    }
  }

  // Ensure proper format
  if (!normalized.match(/^\d*d\d+([+-]\d+)*$/)) {
    // If still not valid, default to d20
    return '1d20';
  }

  return normalized;
}

/**
 * Check if a message contains any roll requests
 */
export function containsRollRequest(message: string): boolean {
  const requests = parseRollRequests(message);
  return requests.length > 0;
}

/**
 * Check if a message indicates a successful attack that should trigger damage roll
 */
export function detectsSuccessfulAttack(message: string): boolean {
  const hitPatterns = [
    /that\s+hits/gi,
    /you\s+hit/gi,
    /attack\s+hits/gi,
    /\d+\s+hits/gi,
    /successful\s+attack/gi,
    /your\s+(?:sword|weapon|blade|attack).*?(?:hits|strikes|connects)/gi,
    /critical\s+hit/gi,
    /natural\s+20/gi
  ];

  return hitPatterns.some(pattern => pattern.test(message));
}

/**
 * Check if a message indicates a critical hit
 */
export function detectsCriticalHit(message: string): boolean {
  const critPatterns = [
    /critical\s+hit/gi,
    /natural\s+20/gi,
    /nat\s+20/gi,
    /crit(?:ical)?/gi
  ];

  return critPatterns.some(pattern => pattern.test(message));
}

/**
 * Extract the first/primary roll request from a message
 */
export function extractPrimaryRollRequest(message: string): ParsedRollRequest | null {
  const requests = parseRollRequests(message);
  return requests.length > 0 ? requests[0] : null;
}

/**
 * Remove roll request text from message (for cleaner display)
 */
export function removeRollRequestsFromMessage(message: string): string {
  const requests = parseRollRequests(message);
  let cleanMessage = message;

  // Remove each request's original text
  requests.forEach(request => {
    cleanMessage = cleanMessage.replace(request.originalText, '').trim();
  });

  // Clean up extra whitespace and punctuation
  cleanMessage = cleanMessage
    .replace(/\s+/g, ' ')
    .replace(/\.\s*\./g, '.')
    .replace(/!\s*!/g, '!')
    .replace(/\?\s*\?/g, '?')
    .trim();

  return cleanMessage;
}

/**
 * Validate a DM message for proper D&D 5e mechanics
 */
export interface ValidationIssue {
  type: 'missing_attack_roll' | 'missing_ac' | 'missing_dc' | 'missing_modifier' | 'missing_initiative' | 'wrong_sequence';
  severity: 'critical' | 'high' | 'medium' | 'low';
  message: string;
  suggestion: string;
}

export interface MessageValidation {
  isValid: boolean;
  issues: ValidationIssue[];
  warnings: ValidationIssue[];
}

/**
 * Validate a DM message for proper combat mechanics
 */
export function validateDMMessage(message: string): MessageValidation {
  const issues: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];

  // Check for damage roll without preceding attack roll
  if (detectsDamageRequestOnly(message)) {
    issues.push({
      type: 'missing_attack_roll',
      severity: 'critical',
      message: 'Damage roll requested without attack roll',
      suggestion: 'Request attack roll first: "Make an attack roll with your [weapon] (1d20+bonus) against AC [number]"'
    });
  }

  // Check for attack roll without AC
  if (detectsAttackRequest(message) && !containsAC(message)) {
    issues.push({
      type: 'missing_ac',
      severity: 'high',
      message: 'Attack roll requested without target AC',
      suggestion: 'Include target AC: "Make an attack roll against AC [number]"'
    });
  }

  // Check for skill check without DC
  if (detectsSkillCheckOnly(message) && !containsDC(message)) {
    issues.push({
      type: 'missing_dc',
      severity: 'high',
      message: 'Skill check requested without DC',
      suggestion: 'Include DC: "Make a [skill] check (1d20+modifier, DC [number])"'
    });
  }

  // Check for saving throw without DC
  if (detectsSavingThrow(message) && !containsDC(message)) {
    issues.push({
      type: 'missing_dc',
      severity: 'high',
      message: 'Saving throw requested without DC',
      suggestion: 'Include DC: "Make a [ability] saving throw (1d20+modifier, DC [number])"'
    });
  }

  // Check for damage roll without modifier
  if (detectsDamageRequest(message) && !containsModifier(message)) {
    warnings.push({
      type: 'missing_modifier',
      severity: 'medium',
      message: 'Damage roll missing ability modifier',
      suggestion: 'Include modifier: "Roll 1d8+STR modifier" or "Roll 1d6+3"'
    });
  }

  // Check for combat start without initiative
  if (detectsCombatStart(message) && !detectsInitiativeRequest(message)) {
    issues.push({
      type: 'missing_initiative',
      severity: 'critical',
      message: 'Combat started without initiative request',
      suggestion: 'Request initiative first: "Combat begins! Roll initiative (1d20+dex modifier)"'
    });
  }

  return {
    isValid: issues.length === 0,
    issues,
    warnings
  };
}

/**
 * Check if message requests damage roll only (without attack context)
 */
export function detectsDamageRequestOnly(message: string): boolean {
  const damagePatterns = [
    /^roll\s+\d*d\d+/gi,
    /^roll\s+damage/gi,
    /^\d*d\d+\s+damage/gi
  ];

  // Must contain damage request but NOT attack context
  const hasDamageRequest = damagePatterns.some(pattern => pattern.test(message.trim()));
  const hasAttackContext = /attack|hit|strike|blade|weapon/gi.test(message);

  return hasDamageRequest && !hasAttackContext;
}

/**
 * Check if message contains combat start indicators
 */
export function detectsCombatStart(message: string): boolean {
  const combatPatterns = [
    /combat\s+begins/gi,
    /battle\s+starts/gi,
    /initiative/gi,
    /enters?\s+combat/gi,
    /fight\s+begins/gi
  ];
  return combatPatterns.some(pattern => pattern.test(message));
}

/**
 * Check if message requests initiative
 */
export function detectsInitiativeRequest(message: string): boolean {
  const initiativePatterns = [
    /roll\s+initiative/gi,
    /initiative\s+roll/gi,
    /1d20\s*\+\s*dex/gi
  ];
  return initiativePatterns.some(pattern => pattern.test(message));
}

/**
 * Check if message contains attack roll request
 */
export function detectsAttackRequest(message: string): boolean {
  const attackPatterns = [
    /make\s+an?\s+attack\s+roll/gi,
    /roll\s+(?:to\s+)?attack/gi,
    /attack\s+roll/gi,
    /1d20.*(?:attack|hit)/gi
  ];
  return attackPatterns.some(pattern => pattern.test(message));
}

/**
 * Check if message contains skill check request only
 */
export function detectsSkillCheckOnly(message: string): boolean {
  const skillPatterns = [
    /make\s+a\s+\w+\s+check/gi,
    /roll\s+a\s+\w+\s+check/gi,
    /\w+\s+check/gi
  ];

  // Must be skill check but not attack or damage
  const hasSkillCheck = skillPatterns.some(pattern => pattern.test(message));
  const hasAttackContext = /attack|damage|hit/gi.test(message);

  return hasSkillCheck && !hasAttackContext;
}

/**
 * Check if message contains saving throw request
 */
export function detectsSavingThrow(message: string): boolean {
  const savePatterns = [
    /saving\s+throw/gi,
    /make\s+a\s+\w+\s+save/gi,
    /\w+\s+save/gi
  ];
  return savePatterns.some(pattern => pattern.test(message));
}

/**
 * Check if message contains damage request
 */
export function detectsDamageRequest(message: string): boolean {
  const damagePatterns = [
    /roll.*damage/gi,
    /damage.*roll/gi,
    /\d*d\d+.*damage/gi
  ];
  return damagePatterns.some(pattern => pattern.test(message));
}

/**
 * Check if message contains AC information
 */
export function containsAC(message: string): boolean {
  return /AC\s+\d+/gi.test(message) || /armor\s+class\s+\d+/gi.test(message);
}

/**
 * Check if message contains DC information
 */
export function containsDC(message: string): boolean {
  return /DC\s+\d+/gi.test(message) || /difficulty\s+class\s+\d+/gi.test(message);
}

/**
 * Check if message contains ability modifier
 */
export function containsModifier(message: string): boolean {
  return /\+\s*(?:str|dex|con|int|wis|cha|\d+)/gi.test(message) ||
         /(?:strength|dexterity|constitution|intelligence|wisdom|charisma)\s+modifier/gi.test(message);
}

/**
 * Extract AC value from message
 */
export function extractAC(message: string): number | null {
  const acMatch = message.match(/AC\s+(\d+)/gi) || message.match(/armor\s+class\s+(\d+)/gi);
  return acMatch ? parseInt(acMatch[1]) : null;
}

/**
 * Extract DC value from message
 */
export function extractDC(message: string): number | null {
  const dcMatch = message.match(/DC\s+(\d+)/gi) || message.match(/difficulty\s+class\s+(\d+)/gi);
  return dcMatch ? parseInt(dcMatch[1]) : null;
}

/**
 * Generate corrected message suggestion
 */
export function suggestCorrection(message: string, validation: MessageValidation): string | null {
  if (validation.isValid) return null;

  const primaryIssue = validation.issues[0];
  if (!primaryIssue) return null;

  switch (primaryIssue.type) {
    case 'missing_attack_roll':
      return 'Make an attack roll with your weapon (1d20+attack bonus) against AC [number]';
    case 'missing_ac':
      return message.replace(/make\s+an?\s+attack\s+roll/gi, 'Make an attack roll against AC [number]');
    case 'missing_dc':
      if (message.includes('check')) {
        return message + ' (DC [number])';
      }
      if (message.includes('saving throw')) {
        return message + ' (DC [number])';
      }
      return message;
    case 'missing_initiative':
      return 'Combat begins! Roll initiative (1d20+dex modifier)';
    default:
      return primaryIssue.suggestion;
  }
}