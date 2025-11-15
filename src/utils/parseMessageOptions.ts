/**
 * Utility functions for parsing DM message options
 *
 * This module handles the extraction of numbered action options from DM messages,
 * separating narrative content from interactive choices.
 */

export interface ActionOption {
  id: string;
  number: number;
  letter?: string; // For A, B, C format
  text: string;
  fullText: string; // Original text with formatting
}

export interface ParsedMessage {
  content: string; // Narrative content without options
  options: ActionOption[];
  hasOptions: boolean;
}
import logger from '@/lib/logger';

/**
 * Parses DM message content to extract numbered or lettered options
 * Supports formats like:
 * - "1. **Approach cautiously**, gathering information..."
 * - "A. **Attempt to charm**, using your bardic magic..."
 * - "B. **Unsheathe your rapier**, and prepare to defend..."
 */
export function parseMessageOptions(messageContent: string): ParsedMessage {
  if (!messageContent) {
    return {
      content: '',
      options: [],
      hasOptions: false,
    };
  }

  // Regular expression to match both numbered and lettered options with bold formatting
  // Matches: 1. **Bold text**, description... OR A. **Bold text**, description...
  const numberedRegex = /^(\d+)\.\s+\*\*([^*]+)\*\*([^]*?)(?=^\d+\.\s+\*\*|\n\s*$|$)/gm;
  const letteredRegex = /^([A-Z])\.\s+\*\*([^*]+)\*\*([^]*?)(?=^[A-Z]\.\s+\*\*|\n\s*$|$)/gm;

  // Fallback patterns for non-bold options (backward compatibility)
  const numberedFallbackRegex = /^(\d+)\.\s+([^]*?)(?=^\d+\.|\n\s*$|$)/gm;
  const letteredFallbackRegex = /^([A-Z])\.\s+([^]*?)(?=^[A-Z]\.|\n\s*$|$)/gm;

  const options: ActionOption[] = [];
  let lastIndex = 0;

  // Try numbered format first (1., 2., 3.)
  let match;
  numberedRegex.lastIndex = 0; // Reset regex
  while ((match = numberedRegex.exec(messageContent)) !== null) {
    const [fullMatch, numberStr, boldText, description] = match;
    const number = parseInt(numberStr, 10);

    // Clean up the description text
    const cleanDescription = description.replace(/^\s*,\s*/, '').trim();
    const fullOptionText = `**${boldText}**${cleanDescription ? `, ${cleanDescription}` : ''}`;

    options.push({
      id: `option-${number}`,
      number,
      text: `${boldText}${cleanDescription ? `, ${cleanDescription}` : ''}`,
      fullText: fullOptionText,
    });

    // Track where options start in the content
    if (options.length === 1) {
      lastIndex = match.index;
    }
  }

  // If no numbered options found, try lettered format (A., B., C.)
  if (options.length === 0) {
    letteredRegex.lastIndex = 0; // Reset regex
    while ((match = letteredRegex.exec(messageContent)) !== null) {
      const [fullMatch, letterStr, boldText, description] = match;
      const letterCode = letterStr.charCodeAt(0) - 64; // A=1, B=2, C=3, etc.

      // Clean up the description text
      const cleanDescription = description.replace(/^\s*,\s*/, '').trim();
      const fullOptionText = `**${boldText}**${cleanDescription ? `, ${cleanDescription}` : ''}`;

      options.push({
        id: `option-${letterStr}`,
        number: letterCode,
        letter: letterStr,
        text: `${boldText}${cleanDescription ? `, ${cleanDescription}` : ''}`,
        fullText: fullOptionText,
      });

      // Track where options start in the content
      if (options.length === 1) {
        lastIndex = match.index;
      }
    }
  }

  // Fallback: Try numbered options without bold formatting
  if (options.length === 0) {
    numberedFallbackRegex.lastIndex = 0;
    while ((match = numberedFallbackRegex.exec(messageContent)) !== null) {
      const [fullMatch, numberStr, fullText] = match;
      const number = parseInt(numberStr, 10);

      // Extract first sentence or clause as the main action
      const sentences = fullText.trim().split(/[,.!?]/);
      const mainAction = sentences[0]?.trim() || fullText.trim();

      options.push({
        id: `option-${number}`,
        number,
        text: fullText.trim(),
        fullText: fullText.trim(),
      });

      if (options.length === 1) {
        lastIndex = match.index;
      }
    }
  }

  // Fallback: Try lettered options without bold formatting
  if (options.length === 0) {
    letteredFallbackRegex.lastIndex = 0;
    while ((match = letteredFallbackRegex.exec(messageContent)) !== null) {
      const [fullMatch, letterStr, fullText] = match;
      const letterCode = letterStr.charCodeAt(0) - 64;

      options.push({
        id: `option-${letterStr}`,
        number: letterCode,
        letter: letterStr,
        text: fullText.trim(),
        fullText: fullText.trim(),
      });

      if (options.length === 1) {
        lastIndex = match.index;
      }
    }
  }

  // Extract content before options (narrative only)
  let narrativeContent = messageContent;
  if (options.length > 0 && lastIndex > 0) {
    narrativeContent = messageContent.substring(0, lastIndex).trim();
  }

  // Clean up narrative content - remove trailing sentences that might be cut off
  if (options.length > 0) {
    // Find the last complete sentence before options
    const sentences = narrativeContent.split(/(?<=[.!?])\s+/);
    const lastSentence = sentences[sentences.length - 1];

    // If last sentence doesn't end with punctuation, remove it
    if (lastSentence && !lastSentence.match(/[.!?]\s*$/)) {
      sentences.pop();
      narrativeContent = sentences.join(' ');
    }
  }

  return {
    content: narrativeContent.trim(),
    options,
    hasOptions: options.length > 0,
  };
}

/**
 * Extracts only the narrative content from a DM message (for TTS)
 * This ensures options are not read aloud
 */
export function extractNarrativeContent(messageContent: string): string {
  const parsed = parseMessageOptions(messageContent);
  return parsed.content;
}

/**
 * Formats an option for display in a button
 */
export function formatOptionForButton(option: ActionOption): string {
  const prefix = option.letter ? `${option.letter}.` : `${option.number}.`;
  return `${prefix} ${option.text}`;
}

/**
 * Converts text from second person to first person perspective
 */
function convertToFirstPerson(text: string): string {
  let converted = text;

  // Convert common second-person phrases to first-person
  // Handle "your" -> "my" with case preservation
  converted = converted.replace(/\byour\b/gi, (match) => {
    return match === 'Your' ? 'My' : match === 'your' ? 'my' : match;
  });

  // Handle "you" -> "I" with case preservation and context awareness
  converted = converted.replace(/\byou\b(?!\s+are|'\w)/gi, (match) => {
    return match === 'You' ? 'I' : match === 'you' ? 'I' : match;
  });

  // Handle "you are" -> "I am"
  converted = converted.replace(/\byou\s+are\b/gi, (match) => {
    return match.startsWith('You') ? 'I am' : 'I am';
  });

  // Handle "you're" -> "I'm"
  converted = converted.replace(/\byou're\b/gi, (match) => {
    return match === "You're" ? "I'm" : "I'm";
  });

  // Handle "you have" -> "I have"
  converted = converted.replace(/\byou\s+have\b/gi, (match) => {
    return match.startsWith('You') ? 'I have' : 'I have';
  });

  // Handle "you've" -> "I've"
  converted = converted.replace(/\byou've\b/gi, (match) => {
    return match === "You've" ? "I've" : "I've";
  });

  // Handle "you will" -> "I will"
  converted = converted.replace(/\byou\s+will\b/gi, (match) => {
    return match.startsWith('You') ? 'I will' : 'I will';
  });

  // Handle "you'll" -> "I'll"
  converted = converted.replace(/\byou'll\b/gi, (match) => {
    return match === "You'll" ? "I'll" : "I'll";
  });

  // Handle "yourself" -> "myself"
  converted = converted.replace(/\byourself\b/gi, (match) => {
    return match === 'Yourself' ? 'Myself' : 'myself';
  });

  // Handle remaining "you" patterns that weren't caught above
  converted = converted.replace(/\bdefend yourself\b/gi, 'defend myself');
  converted = converted.replace(/\byou\b/gi, (match) => {
    return match === 'You' ? 'I' : 'I';
  });

  return converted;
}

/**
 * Creates a player message from a selected option
 */
export function createPlayerMessageFromOption(option: ActionOption): string {
  // Remove numbering and formatting for the player's choice
  let cleaned = option.text.replace(/^\d+\.\s*/, '').trim();
  logger.debug('[parseMessageOptions] Original option text:', cleaned);

  // Convert from second person to first person
  cleaned = convertToFirstPerson(cleaned);
  logger.debug('[parseMessageOptions] Converted to first person:', cleaned);

  return cleaned;
}
