export interface VisualPromptExtraction {
  cleaned: string;
  prompt: string | null;
}

const VISUAL_PROMPT_FENCE = /```\s*VISUAL[_\-\s]*PROMPT\s*\n([\s\S]*?)```/i;
const VISUAL_PROMPT_FENCE_GLOBAL = /```\s*VISUAL[_\-\s]*PROMPT\s*\n([\s\S]*?)```/gi;
const VISUAL_PROMPT_INLINE = /(?:^|\n)[ \t]*VISUAL[ _\-]*PROMPT\s*:?[ \t]*(.+?)(?:\r?\n|$)/i;
const VISUAL_PROMPT_INLINE_GLOBAL =
  /(?:^|\n)[ \t]*VISUAL[ _\-]*PROMPT\s*:?[ \t]*(.+?)(?:\r?\n|$)/gi;

const normalizeWhitespace = (text: string) =>
  text
    .replace(/\s+$/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

/**
 * Extracts a VISUAL PROMPT directive from LLM output while returning cleaned display text.
 * Supports both fenced blocks (preferred) and legacy inline markers.
 */
export const extractVisualPrompt = (text: string): VisualPromptExtraction => {
  if (!text) {
    return { cleaned: '', prompt: null };
  }

  const inlineMatch = VISUAL_PROMPT_INLINE.exec(text);
  const fenceMatch = VISUAL_PROMPT_FENCE.exec(text);

  let prompt: string | null = null;
  if (inlineMatch && fenceMatch) {
    prompt = inlineMatch.index <= fenceMatch.index ? inlineMatch[1] : fenceMatch[1];
  } else if (inlineMatch) {
    prompt = inlineMatch[1];
  } else if (fenceMatch) {
    prompt = fenceMatch[1];
  }

  let working = text
    .replace(VISUAL_PROMPT_FENCE_GLOBAL, '')
    .replace(VISUAL_PROMPT_INLINE_GLOBAL, '');

  // Safety net: strip any remaining visual prompt lines to avoid leaking markers.
  working = working.replace(/^[ \t]*VISUAL[ _\-]*PROMPT.*$/gim, '');

  return {
    cleaned: normalizeWhitespace(working),
    prompt: prompt ? normalizeWhitespace(prompt) : null,
  };
};

export default extractVisualPrompt;
