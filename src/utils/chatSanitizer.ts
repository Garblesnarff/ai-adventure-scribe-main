/**
 * Chat sanitizer utilities
 * Removes system-like lines that should not appear inside DM narration.
 */

const SYSTEM_LINE_PATTERNS: RegExp[] = [
  /^\s*Combat has begun!\s*Initiative order established\.?\s*$/i,
  /^\s*Unknown deals damage\s*$/i,
];

/**
 * Remove known system lines from arbitrary text. Works both line-based and inline.
 */
export function sanitizeDMText(input: string | undefined | null): string {
  if (!input) return '';

  // First, strip any inline repeated sequences
  const text = input
    .replace(/(?:Combat has begun!\s*Initiative order established\.?\s*)+/gi, '')
    .replace(/(?:Unknown deals damage\s*)+/gi, '');

  // Then, apply line-based filtering
  const lines = text.split(/\r?\n/);
  const filtered = lines.filter((line) => {
    const trimmed = line.trim();
    if (!trimmed) return true;
    return !SYSTEM_LINE_PATTERNS.some((re) => re.test(trimmed));
  });

  // Collapse consecutive blank lines
  const collapsed: string[] = [];
  for (const line of filtered) {
    if (
      line.trim() === '' &&
      (collapsed.length === 0 || collapsed[collapsed.length - 1].trim() === '')
    ) {
      continue;
    }
    collapsed.push(line);
  }

  return collapsed.join('\n').trim();
}
