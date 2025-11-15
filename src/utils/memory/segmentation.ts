/**
 * Options for content segmentation
 */
interface SegmentationOptions {
  minLength: number;
  maxLength: number;
  preserveQuotes: boolean;
}

const DEFAULT_OPTIONS: SegmentationOptions = {
  minLength: 20,
  maxLength: 200,
  preserveQuotes: true,
};

// Import the enhanced sentence segmenter
import { SentenceSegmenter } from '@/utils/sentence-segmenter';

/**
 * Splits content into coherent segments based on natural language boundaries
 * Now uses improved sentence boundary detection to prevent mid-word splits
 * @param content - The text content to split
 * @param options - Optional configuration for segmentation
 */
export const splitIntoSegments = (
  content: string,
  options: Partial<SegmentationOptions> = {},
): string[] => {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // Use enhanced sentence splitting instead of basic regex
  const sentences = SentenceSegmenter.splitIntoSentences(content);

  // Filter by minimum length
  const validSentences = sentences.filter((sentence) => sentence.trim().length >= opts.minLength);

  // Use the SentenceSegmenter's optimization for proper segment lengths
  const optimizedSegments = SentenceSegmenter.optimizeSegmentLengths(
    validSentences,
    opts.minLength,
    opts.maxLength,
  );

  return optimizedSegments.map((s) => s.trim()).filter((s) => s.length > 0);
};

/**
 * Checks if a segment contains quoted speech
 */
export const containsQuotedSpeech = (segment: string): boolean => {
  return /"[^"]+"/g.test(segment);
};

/**
 * Extracts named entities from a segment
 */
export const extractNamedEntities = (segment: string): string[] => {
  const matches = segment.match(/[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*/g);
  return matches || [];
};
