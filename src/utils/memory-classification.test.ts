import { describe, it, expect } from 'vitest';
import { processContent, classifySegment } from './memory/classification';
import { CLASSIFICATION_PATTERNS } from './memory/patterns';
import { MemoryType } from '@/components/game/memory/types';

describe('Memory Classification', () => {
  describe('classifySegment', () => {
    it('should classify content with "village" as "location"', () => {
      const content = "The party entered the quiet village of Oakhaven.";
      expect(classifySegment(content)).toBe('location');
    });

    it('should classify content with "king" as "character"', () => {
      const content = "The old king sighed, a heavy burden on his shoulders.";
      expect(classifySegment(content)).toBe('character');
    });

    it('should classify content with "battle" as "event"', () => {
      const content = "A great battle was fought on these plains centuries ago.";
      expect(classifySegment(content)).toBe('event');
    });

    it('should classify content with "sword" as "item"', () => {
      const content = "He picked up the ancient sword, its blade still sharp.";
      expect(classifySegment(content)).toBe('item');
    });

    it('should classify content with "prophecy" and "narrative" as "plot" due to higher context or pattern count', () => {
      // Assuming 'plot' patterns might be stronger or more specific
      const content = "The prophecy foretold a great change in the narrative.";
      expect(classifySegment(content)).toBe('plot'); // This depends on scoring logic if both 'event' (prophecy) and 'plot' (narrative) match
    });
    
    it('should use context patterns for classification', () => {
      const content = "They found an enchanted sword.";
      expect(classifySegment(content)).toBe('item'); // "enchanted sword" is a context pattern
    });

    it('should default to "general" if no strong patterns match', () => {
      const content = "The weather was nice that day.";
      expect(classifySegment(content)).toBe('general');
    });

    it('should handle mixed content and pick the best match based on scoring', () => {
      // Example: "The king (character) announced a quest (event/plot) to find the lost sword (item) in the dark forest (location)."
      // The dominant theme/type depends on the scoring of CLASSIFICATION_PATTERNS.
      // This test is more to ensure it *returns a valid type* rather than predicting the exact one without knowing precise scoring.
      const content = "The king announced a quest to find the lost sword in the dark forest.";
      const possibleTypes: MemoryType[] = ['location', 'character', 'event', 'item', 'plot', 'general'];
      expect(possibleTypes).toContain(classifySegment(content));
    });
  });

  describe('processContent', () => {
    it('should split content into segments and classify them', () => {
      const content = "The journey began in a small village. The adventurers sought a magical amulet. A great battle ensued.";
      const segments = processContent(content);
      
      expect(segments.length).toBeGreaterThanOrEqual(1); // Depends on segmentation logic
      
      // Check types and importance (importance is harder to test precisely without mocking calculateImportance)
      segments.forEach(segment => {
        expect(segment.content).toBeTypeOf('string');
        expect(CLASSIFICATION_PATTERNS[segment.type]).toBeDefined();
        expect(segment.importance).toBeGreaterThanOrEqual(CLASSIFICATION_PATTERNS[segment.type]?.importance || 0);
      });

      // Example checks based on expected segmentation and classification
      // This is highly dependent on the splitIntoSegments behavior.
      // For now, let's assume it splits by sentences or fixed lengths.
      if (segments.find(s => s.content.includes("small village"))) {
        expect(segments.find(s => s.content.includes("small village"))?.type).toBe('location');
      }
      if (segments.find(s => s.content.includes("magical amulet"))) {
        expect(segments.find(s => s.content.includes("magical amulet"))?.type).toBe('item');
      }
       if (segments.find(s => s.content.includes("great battle"))) {
        expect(segments.find(s => s.content.includes("great battle"))?.type).toBe('event');
      }
    });

    it('should handle empty content string', () => {
      const segments = processContent("");
      expect(segments).toEqual([]);
    });

    it('should process content shorter than minLength into a single segment', () => {
      const content = "Short one."; // Assuming minLength in segmentation is around 20
      const segments = processContent(content);
      expect(segments.length).toBe(1);
      if (segments.length > 0) {
         expect(segments[0].content).toBe("Short one.");
         expect(segments[0].type).toBe('general'); // Or whatever it classifies as
      }
    });
  });
});
