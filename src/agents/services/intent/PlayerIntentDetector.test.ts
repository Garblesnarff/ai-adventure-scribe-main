import { describe, it, expect } from 'vitest';
import { PlayerIntentDetector, PlayerIntent } from './PlayerIntentDetector';

describe('PlayerIntentDetector', () => {
  const detector = new PlayerIntentDetector();

  it('should detect dialogue intent for messages containing dialogue keywords', () => {
    expect(detector.detectIntent('I want to talk to the bartender.')).toBe<PlayerIntent>(
      'dialogue',
    );
    expect(detector.detectIntent('Ask him about the rumors.')).toBe<PlayerIntent>('dialogue');
    expect(detector.detectIntent('Tell me more about this place.')).toBe<PlayerIntent>('dialogue');
    expect(detector.detectIntent("She says, 'Hello there!'")).toBe<PlayerIntent>('dialogue');
  });

  it('should detect exploration intent for messages containing exploration keywords', () => {
    expect(detector.detectIntent("Let's explore the cave.")).toBe<PlayerIntent>('exploration');
    expect(detector.detectIntent('I look around the room.')).toBe<PlayerIntent>('exploration');
    expect(detector.detectIntent('Search for clues near the desk.')).toBe<PlayerIntent>(
      'exploration',
    );
    expect(detector.detectIntent('Can I investigate the strange markings?')).toBe<PlayerIntent>(
      'exploration',
    );
  });

  it('should default to "other" intent if no specific keywords are found', () => {
    expect(detector.detectIntent('I attack the goblin!')).toBe<PlayerIntent>('other');
    expect(detector.detectIntent('What time is it?')).toBe<PlayerIntent>('other');
    expect(detector.detectIntent('This is a statement.')).toBe<PlayerIntent>('other');
  });

  it('should be case-insensitive', () => {
    expect(detector.detectIntent('I want to EXPLORE the area.')).toBe<PlayerIntent>('exploration');
    expect(detector.detectIntent('Can we TALK about this?')).toBe<PlayerIntent>('dialogue');
  });

  it('should handle messages with mixed keywords (first match wins based on current implementation)', () => {
    // Current implementation checks dialogue keywords first.
    expect(detector.detectIntent('I want to talk about exploring the map.')).toBe<PlayerIntent>(
      'dialogue',
    );
    expect(detector.detectIntent("Let's explore and then ask questions.")).toBe<PlayerIntent>(
      'exploration',
    ); // Dialogue keyword "ask" appears after "explore"
  });

  it('should handle empty strings', () => {
    expect(detector.detectIntent('')).toBe<PlayerIntent>('other');
  });

  it('should handle strings with only spaces', () => {
    expect(detector.detectIntent('   ')).toBe<PlayerIntent>('other');
  });
});
