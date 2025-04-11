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

/**
 * Splits content into coherent segments based on natural language boundaries
 * @param content - The text content to split
 * @param options - Optional configuration for segmentation
 */
export const splitIntoSegments = (
  content: string,
  options: Partial<SegmentationOptions> = {}
): string[] => {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  // Split on major punctuation while preserving quotes
  const rawSegments = content
    .split(/(?<=[.!?;])\s+(?=[^"]*(?:"[^"]*"[^"]*)*$)/)
    .filter(segment => segment.trim().length >= opts.minLength);

  // Further process long segments
  const refinedSegments: string[] = [];
  
  for (const segment of rawSegments) {
    if (segment.length > opts.maxLength) {
      // Split on clauses for long segments
      const subSegments = segment
        .split(/,\s*(?=[A-Z])/)
        .filter(s => s.trim().length >= opts.minLength);
      
      refinedSegments.push(...subSegments);
    } else {
      refinedSegments.push(segment);
    }
  }

  return refinedSegments.map(s => s.trim());
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