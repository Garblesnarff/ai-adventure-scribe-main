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
  
  // Common patterns for roll requests
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
    /roll\s+([\dd+\-\s]+)\s+(?:to|for)\s+(.+?)(?:\s+\((?:DC\s+(\d+)|AC\s+(\d+))\))?/gi
  ];

  let match;
  
  // Pattern 1: Skill/Ability checks and saves
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

  // Pattern 2: Initiative
  const initiativePattern = /roll\s+initiative.*?\(([^)]+)\)/gi;
  while ((match = initiativePattern.exec(message)) !== null) {
    requests.push({
      type: 'initiative',
      formula: normalizeFormula(match[1]),
      purpose: 'Initiative roll for combat order',
      originalText: match[0],
      confidence: 0.95
    });
  }

  // Pattern 3: Attack rolls
  const attackPattern = /make\s+an?\s+attack\s+roll.*?\(([^)]+)\)(?:.*?(?:AC|against).*?(\d+))?/gi;
  while ((match = attackPattern.exec(message)) !== null) {
    const ac = match[2] ? parseInt(match[2]) : undefined;
    
    requests.push({
      type: 'attack',
      formula: normalizeFormula(match[1]),
      purpose: 'Attack roll',
      ac,
      originalText: match[0],
      confidence: 0.9
    });
  }

  // Pattern 4: Damage rolls
  const damagePattern = /roll\s+damage.*?\(([^)]+)\)/gi;
  while ((match = damagePattern.exec(message)) !== null) {
    requests.push({
      type: 'damage',
      formula: normalizeFormula(match[1]),
      purpose: 'Damage roll',
      originalText: match[0],
      confidence: 0.85
    });
  }

  // Pattern 5: Generic roll requests
  const genericPattern = /(?:please\s+)?roll\s+([\dd+\-\s]+)(?:\s+for\s+(.+?))?(?:\s+\((?:DC\s+(\d+)|AC\s+(\d+))\))?/gi;
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
    .replace(/\-\-/g, '-') // Fix double minus
    .replace(/\+$/, '') // Remove trailing plus
    .replace(/\-$/, ''); // Remove trailing minus

  // If it doesn't start with a dice notation, assume it's d20
  if (!/^\d*d\d+/.test(normalized)) {
    if (/^[+\-]?\d+$/.test(normalized)) {
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
  if (!normalized.match(/^\d*d\d+([+\-]\d+)*$/)) {
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