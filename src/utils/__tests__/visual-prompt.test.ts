import { describe, expect, it } from 'vitest';

import { extractVisualPrompt } from '../visualPrompt';

describe('extractVisualPrompt', () => {
  it('returns original text when no prompt is present', () => {
    const sample = 'A simple response without visual hints.';
    const { cleaned, prompt } = extractVisualPrompt(sample);
    expect(cleaned).toBe(sample);
    expect(prompt).toBeNull();
  });

  it('pulls prompt from fenced block and removes it from text', () => {
    const sample = `Scene description leading to image.\n\n\`\`\`VISUAL_PROMPT\nStormy sky above ruined citadel with glowing runes\n\`\`\``;
    const { cleaned, prompt } = extractVisualPrompt(sample);
    expect(cleaned).toBe('Scene description leading to image.');
    expect(prompt).toBe('Stormy sky above ruined citadel with glowing runes');
  });

  it('supports legacy inline marker', () => {
    const sample = 'Narrative text here.\nVISUAL PROMPT: Moonlit forest with ancient stones';
    const { cleaned, prompt } = extractVisualPrompt(sample);
    expect(cleaned).toBe('Narrative text here.');
    expect(prompt).toBe('Moonlit forest with ancient stones');
  });

  it('handles multiple prompts by keeping first and stripping all markers', () => {
    const sample = `Intro.\nVISUAL PROMPT: First prompt\n\n\`\`\`VISUAL_PROMPT\nSecond prompt\n\`\`\``;
    const { cleaned, prompt } = extractVisualPrompt(sample);
    expect(cleaned).toBe('Intro.');
    expect(prompt).toBe('First prompt');
  });

  it('normalizes excessive blank lines after removal', () => {
    const sample = `Line one.\n\n\nVISUAL PROMPT: Something\n\nLine two.`;
    const { cleaned } = extractVisualPrompt(sample);
    expect(cleaned).toBe('Line one.\n\nLine two.');
  });
});
