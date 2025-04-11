import { Memory, MemoryType } from '@/components/game/memory/types';
import { CLASSIFICATION_PATTERNS } from './patterns';
import { splitIntoSegments } from './segmentation';
import { calculateImportance } from './importance';

/**
 * Interface for classified memory segment
 */
interface MemorySegment {
  content: string;
  type: MemoryType;
  importance: number;
}

/**
 * Determines the most appropriate type for a memory segment
 */
export const classifySegment = (content: string): MemoryType => {
  const scores = new Map<MemoryType, number>();
  const lowerContent = content.toLowerCase();

  // Initialize scores
  Object.keys(CLASSIFICATION_PATTERNS).forEach(type => {
    scores.set(type as MemoryType, 0);
  });

  // Calculate scores for each type
  Object.entries(CLASSIFICATION_PATTERNS).forEach(([type, { patterns, contextPatterns }]) => {
    // Check for exact pattern matches
    patterns.forEach(pattern => {
      const regex = new RegExp(`\\b${pattern}\\b`, 'i');
      if (regex.test(lowerContent)) {
        const currentScore = scores.get(type as MemoryType) || 0;
        scores.set(type as MemoryType, currentScore + 1);
      }
    });

    // Check for context pattern matches
    contextPatterns.forEach(pattern => {
      if (pattern.test(content)) {
        const currentScore = scores.get(type as MemoryType) || 0;
        scores.set(type as MemoryType, currentScore + 2);
      }
    });
  });

  // Find type with highest score
  let maxScore = 0;
  let bestType: MemoryType = 'general';

  scores.forEach((score, type) => {
    if (score > maxScore) {
      maxScore = score;
      bestType = type;
    }
  });

  return maxScore > 0 ? bestType : 'general';
};

/**
 * Processes content into classified memory segments
 */
export const processContent = (content: string): MemorySegment[] => {
  const segments = splitIntoSegments(content, {
    maxLength: 100,
    minLength: 20,
    preserveQuotes: true
  });
  
  return segments.map(segment => {
    const type = classifySegment(segment);
    const importance = calculateImportance(segment, 0, type);
    
    return {
      content: segment.trim(),
      type,
      importance
    };
  });
};