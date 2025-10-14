/**
 * Roll Request Parser (parse stage)
 * Parses DM messages to detect and extract dice roll requests
 */

import { RollRequest } from '@/components/game/DiceRollRequest';

export interface ParsedRollRequest extends RollRequest {
  originalText: string;
  confidence: number; // 0-1, how confident we are this is a roll request
}

/**
 * Parse a DM message for dice roll requests
 */
export function parseRollRequests(message: string): ParsedRollRequest[] {
  const requests: ParsedRollRequest[] = [];

  let match: RegExpExecArray | null;

  // Normalize message to improve regex robustness (strip basic markdown, collapse spaces)
  const text = (message || '')
    .replace(/\*\*/g, '') // bold
    .replace(/\*/g, '') // italics
    .replace(/_/g, '') // underscore emphasis
    .replace(/`/g, '') // inline code
    .replace(/\s+/g, ' ')
    .trim();

  // Common skill regex used across multiple patterns
  const skillRegex = '(perception|stealth|investigation|insight|persuasion|deception|intimidation|athletics|acrobatics|arcana|history|medicine|nature|religion|survival|performance|sleight\\s+of\\s+hand|animal\\s+handling)';

  // Enhanced attack roll detection (without explicit dice)
  const attackPatterns = [
    /(?:please\s+)?(?:make\s+an?|roll\s+an?)\s*attack\s*(?:roll)?/gi,
    /roll\s+to\s+(?:attack|hit)/gi,
    /(?:make\s+an?|roll\s+(?:for\s+)?)\s*attack(?:\s+roll)?/gi
  ];

  attackPatterns.forEach(pattern => {
    while ((match = pattern.exec(text)) !== null) {
      requests.push({
        type: 'attack',
        formula: '1d20+modifier',
        purpose: 'Attack roll',
        originalText: match[0],
        confidence: 0.95
      });
    }
  });

  // Initiative (enhanced)
  const initiativePatterns = [
    /roll\s+initiative.*?\(([^)]+)\)/gi,
    /roll\s+initiative/gi
  ];

  initiativePatterns.forEach(pattern => {
    while ((match = pattern.exec(text)) !== null) {
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

  // Skill/Ability checks and saves with explicit dice
  const checkPattern = /make\s+an?\s+(constitution|dexterity|strength|intelligence|wisdom|charisma|[\w\s]+)\s+(check|save|saving\s+throw).*?\(([^)]+)(?:,\s*DC\s+(\d+))?\)/gi;
  while ((match = checkPattern.exec(text)) !== null) {
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

  // "Roll for <skill> (DC 14)" without explicit dice
  const rollForSkillPattern = /(?:please\s+)?roll\s+for\s+(perception|stealth|investigation|insight|persuasion|deception|intimidation|athletics|acrobatics|arcana|history|medicine|nature|religion|survival|performance|sleight\s+of\s+hand|animal\s+handling)(?:\s*\(?:(?:dc|DC)\s*(\d+)\)?)?/gi;
  while ((match = rollForSkillPattern.exec(text)) !== null) {
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

  // Skill checks without explicit dice (article-agnostic: a/an)
  const skillCheckPattern = new RegExp(`make\\s+an?\\s+${skillRegex}\\s+check`, 'gi');
  while ((match = skillCheckPattern.exec(text)) !== null) {
    const skill = match[1].toLowerCase();
    // Try to capture nearby DC (e.g., "(target DC 14)") in the trailing window
    const tail = text.slice(match.index, Math.min(match.index + 200, text.length));
    const dcMatch = /(?:target\s*)?(?:dc|difficulty\s*class)\s*(\d+)/i.exec(tail);
    const dc = dcMatch ? parseInt(dcMatch[1], 10) : undefined;

    requests.push({
      type: 'skill_check',
      formula: '1d20+modifier',
      purpose: `${skill.charAt(0).toUpperCase() + skill.slice(1)} check`,
      dc,
      originalText: match[0],
      confidence: 0.9
    });
  }

  // "Roll an <skill> check" (optional DC)
  const rollSkillCheckPattern = new RegExp(
    `(?:please\\s+)?roll\\s+an?\\s+${skillRegex}\\s+check(?:\\s*\\(?\\s*(?:dc|DC)\\s*(\\d+)\\s*\\)?)?`,
    'gi'
  );
  while ((match = rollSkillCheckPattern.exec(text)) !== null) {
    const skill = match[1].toLowerCase();
    // Prefer explicit capture; otherwise search nearby for DC phrasing
    let dc = match[2] ? parseInt(match[2], 10) : undefined;
    if (typeof dc === 'undefined') {
      const tail = text.slice(match.index, Math.min(match.index + 200, text.length));
      const dcMatch = /(?:target\s*)?(?:dc|difficulty\s*class)\s*(\d+)/i.exec(tail);
      if (dcMatch) dc = parseInt(dcMatch[1], 10);
    }
    requests.push({
      type: 'skill_check',
      formula: '1d20+modifier',
      purpose: `${skill.charAt(0).toUpperCase() + skill.slice(1)} check`,
      dc,
      originalText: match[0],
      confidence: 0.95
    });
  }

  // Polite/requested forms: "Give me an Investigation check (DC 15)", "Perform a Stealth check"
  const requestSkillCheckPattern = new RegExp(
    `(?:please\\s+)?(?:i\\s+need\\s+|give\\s+me\\s+|perform\\s+)?an?\\s*${skillRegex}\\s+check(?:\\s*\\(?\\s*(?:dc|DC)\\s*(\\d+)\\s*\\)?)?`,
    'gi'
  );
  while ((match = requestSkillCheckPattern.exec(text)) !== null) {
    const skill = match[1].toLowerCase();
    let dc = match[2] ? parseInt(match[2], 10) : undefined;
    if (typeof dc === 'undefined') {
      const tail = text.slice(match.index, Math.min(match.index + 200, text.length));
      const dcMatch = /(?:target\s*)?(?:dc|difficulty\s*class)\s*(\d+)/i.exec(tail);
      if (dcMatch) dc = parseInt(dcMatch[1], 10);
    }
    requests.push({
      type: 'skill_check',
      formula: '1d20+modifier',
      purpose: `${skill.charAt(0).toUpperCase() + skill.slice(1)} check`,
      dc,
      originalText: match[0],
      confidence: 0.93
    });
  }

  // Simple form without the word "check": "Roll Investigation (DC 12)"
  const rollSkillSimplePattern = new RegExp(
    `(?:please\\s+)?roll\\s+${skillRegex}(?:\\s*\\(?\\s*(?:dc|DC)\\s*(\\d+)\\s*\\)?)?`,
    'gi'
  );
  while ((match = rollSkillSimplePattern.exec(text)) !== null) {
    const skill = match[1].toLowerCase();
    let dc = match[2] ? parseInt(match[2], 10) : undefined;
    if (typeof dc === 'undefined') {
      const tail = text.slice(match.index, Math.min(match.index + 200, text.length));
      const dcMatch = /(?:target\s*)?(?:dc|difficulty\s*class)\s*(\d+)/i.exec(tail);
      if (dcMatch) dc = parseInt(dcMatch[1], 10);
    }
    requests.push({
      type: 'skill_check',
      formula: '1d20+modifier',
      purpose: `${skill.charAt(0).toUpperCase() + skill.slice(1)} check`,
      dc,
      originalText: match[0],
      confidence: 0.92
    });
  }

  // Enhanced damage rolls
  const damagePatterns = [
    /roll\s+damage.*?\(([^)]+)\)/gi,
    /roll\s+critical\s+damage.*?\(([^)]+)\)/gi,
    /roll\s+([\dd+\s-]+)\s+for\s+damage/gi,
    /now\s+roll\s+damage/gi,
    /roll\s+(?:your\s+)?(?:weapon\s+)?damage/gi,
    /(?:that\s+hits|you\s+hit).*?roll\s+damage/gi,
    /critical\s+hit.*?roll.*?damage/gi
  ];

  damagePatterns.forEach((pattern, index) => {
    while ((match = pattern.exec(message)) !== null) {
      let formula = '1d6';
      let confidence = 0.85;
      let purpose = 'Damage roll';

      if (match[1]) formula = normalizeFormula(match[1]);
      if (index < 2) confidence = 0.95;
      if (match[0].toLowerCase().includes('critical')) {
        purpose = 'Critical damage roll';
        confidence = 0.98;
      }

      requests.push({ type: 'damage', formula, purpose, originalText: match[0], confidence });
    }
  });

  // Generic roll requests with explicit dice
  const genericPattern = /(?:please\s+)?roll\s+([\dd+\s-]+)(?:\s+for\s+(.+?))?(?:\s+\((?:[^)]*?\b(?:dc|DC)\s*(\d+)|[^)]*?\bAC\s*(\d+))\))?/gi;
  while ((match = genericPattern.exec(text)) !== null) {
    if (requests.some(r => r.originalText.includes(match[0]))) continue;

    const formula = match[1].trim();
    const purpose = match[2] || 'Dice roll';
    const dc = match[3] ? parseInt(match[3]) : undefined;
    const ac = match[4] ? parseInt(match[4]) : undefined;

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

  const uniqueRequests = requests
    .filter((request, index, self) => index === self.findIndex(r => r.formula === request.formula && r.purpose === request.purpose))
    .filter(r => r.confidence > 0.5)
    .sort((a, b) => b.confidence - a.confidence);

  return uniqueRequests;
}

/** Normalize dice formula to standard format */
export function normalizeFormula(formula: string): string {
  let normalized = formula
    .replace(/\s+/g, '')
    .toLowerCase()
    .replace(/modifier/g, '')
    .replace(/\+\+/g, '+')
    .replace(/--/g, '-')
    .replace(/\+$/, '')
    .replace(/-$/, '');

  if (!/^\d*d\d+/.test(normalized)) {
    if (/^[+-]?\d+$/.test(normalized)) {
      normalized = '1d20' + (normalized.startsWith('+') || normalized.startsWith('-') ? '' : '+') + normalized;
    } else if (normalized.includes('dex') || normalized.includes('str') || normalized.includes('con') || 
               normalized.includes('int') || normalized.includes('wis') || normalized.includes('cha')) {
      normalized = '1d20+modifier';
    } else {
      normalized = '1d20';
    }
  }

  if (!normalized.match(/^\d*d\d+([+-]\d+)*$/)) {
    return '1d20';
  }

  return normalized;
}
