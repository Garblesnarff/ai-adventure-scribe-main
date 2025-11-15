/**
 * Dice Command Parser for Chat Interface
 * Parses dice roll commands like /roll 1d20+5, /r 2d6 adv, etc.
 */

export interface ParsedDiceCommand {
  isValid: boolean;
  formula: string;
  count: number;
  dieType: number;
  modifier: number;
  advantage: boolean;
  disadvantage: boolean;
  label?: string;
  error?: string;
}

/**
 * Parse dice roll commands from chat input
 * Supports: /roll, /r, advantage/disadvantage, modifiers
 */
export function parseDiceCommand(input: string): ParsedDiceCommand | null {
  const trimmed = input.trim();

  // Check if it's a dice command
  const commandRegex = /^\/(?:roll|r)\s+(.+)$/i;
  const match = trimmed.match(commandRegex);

  if (!match) {
    return null;
  }

  const commandContent = match[1].trim();

  // Parse advantage/disadvantage
  let advantage = false;
  let disadvantage = false;
  let cleanContent = commandContent;

  if (/\b(?:adv|advantage)\b/i.test(commandContent)) {
    advantage = true;
    cleanContent = cleanContent.replace(/\b(?:adv|advantage)\b/gi, '').trim();
  }

  if (/\b(?:dis|disadvantage)\b/i.test(commandContent)) {
    disadvantage = true;
    cleanContent = cleanContent.replace(/\b(?:dis|disadvantage)\b/gi, '').trim();
  }

  // Parse optional label (quoted text at the end)
  let label: string | undefined;
  const labelMatch = cleanContent.match(/^(.+?)\s+"([^"]+)"$/);
  if (labelMatch) {
    cleanContent = labelMatch[1].trim();
    label = labelMatch[2];
  }

  // Parse dice formula: XdY+Z or XdY-Z or XdY
  const diceRegex = /^(\d+)d(\d+)([+-]\d+)?$/i;
  const diceMatch = cleanContent.match(diceRegex);

  if (!diceMatch) {
    return {
      isValid: false,
      formula: commandContent,
      count: 0,
      dieType: 0,
      modifier: 0,
      advantage: false,
      disadvantage: false,
      error: `Invalid dice formula: "${cleanContent}". Use format like "1d20", "2d6+3", etc.`,
    };
  }

  const count = parseInt(diceMatch[1]);
  const dieType = parseInt(diceMatch[2]);
  const modifierMatch = diceMatch[3];
  const modifier = modifierMatch ? parseInt(modifierMatch) : 0;

  // Validation
  if (count < 1 || count > 100) {
    return {
      isValid: false,
      formula: commandContent,
      count,
      dieType,
      modifier,
      advantage: false,
      disadvantage: false,
      error: 'Number of dice must be between 1 and 100',
    };
  }

  if (![4, 6, 8, 10, 12, 20, 100].includes(dieType)) {
    return {
      isValid: false,
      formula: commandContent,
      count,
      dieType,
      modifier,
      advantage: false,
      disadvantage: false,
      error: `Invalid die type: d${dieType}. Use d4, d6, d8, d10, d12, d20, or d100`,
    };
  }

  // Can't have both advantage and disadvantage
  if (advantage && disadvantage) {
    disadvantage = false; // Advantage takes precedence
  }

  // Build clean formula
  let formula = `${count}d${dieType}`;
  if (modifier !== 0) {
    formula += modifier > 0 ? `+${modifier}` : `${modifier}`;
  }

  return {
    isValid: true,
    formula,
    count,
    dieType,
    modifier,
    advantage,
    disadvantage,
    label,
  };
}

/**
 * Get autocomplete suggestions for dice commands
 */
export function getDiceCommandSuggestions(input: string): string[] {
  const trimmed = input.trim().toLowerCase();

  if (!trimmed.startsWith('/r')) {
    return [];
  }

  const suggestions: string[] = [];

  // Basic commands
  if ('/roll'.startsWith(trimmed) || '/r'.startsWith(trimmed)) {
    suggestions.push('/roll 1d20', '/roll 1d20+5', '/roll 2d6', '/roll 1d4');
  }

  // Common D&D rolls
  if (trimmed === '/r' || trimmed === '/roll') {
    suggestions.push(
      '/roll 1d20 "Initiative"',
      '/roll 1d20 adv "Attack with advantage"',
      '/roll 1d20 dis "Attack with disadvantage"',
      '/roll 2d6 "Damage"',
      '/roll 1d8+3 "Longsword damage"',
      '/roll 1d4 "Dagger damage"',
    );
  }

  return suggestions;
}

/**
 * Validate if a string looks like it might be a dice command
 * Used for showing autocomplete hints
 */
export function mightBeDiceCommand(input: string): boolean {
  return /^\s*\/r(?:oll)?(?:\s|$)/i.test(input);
}
