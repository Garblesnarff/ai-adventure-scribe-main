import { parseRollRequests } from './parse';

import type { ParsedRollRequest } from './parse';

export function containsRollRequest(message: string): boolean {
  return parseRollRequests(message).length > 0;
}

export function detectsSuccessfulAttack(message: string): boolean {
  const hitPatterns = [
    /that\s+hits/gi,
    /you\s+hit/gi,
    /attack\s+hits/gi,
    /\d+\s+hits/gi,
    /successful\s+attack/gi,
    /your\s+(?:sword|weapon|blade|attack).*?(?:hits|strikes|connects)/gi,
    /critical\s+hit/gi,
    /natural\s+20/gi,
  ];
  return hitPatterns.some((pattern) => pattern.test(message));
}

export function detectsCriticalHit(message: string): boolean {
  const critPatterns = [/critical\s+hit/gi, /natural\s+20/gi, /nat\s+20/gi, /crit(?:ical)?/gi];
  return critPatterns.some((pattern) => pattern.test(message));
}

export function extractPrimaryRollRequest(message: string): ParsedRollRequest | null {
  const requests = parseRollRequests(message);
  return requests.length > 0 ? requests[0] : null;
}

export function removeRollRequestsFromMessage(message: string): string {
  if (!message) return message;

  // FIRST: Remove all ROLL_REQUESTS_V1 code blocks (handles AI responses with only code blocks)
  // Using flexible regex pattern that doesn't require specific newline positioning
  let cleanMessage = message.replace(/```ROLL_REQUESTS_V1[\s\S]*?```/g, '');

  // THEN: Parse remaining message for any regex-matched roll requests and remove them too
  const requests = parseRollRequests(message);
  requests.forEach((request) => {
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
