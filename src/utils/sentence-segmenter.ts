/**
 * Enhanced Sentence Segmentation Utility
 *
 * ⚠️ DEPRECATED: Complex segmentation is no longer needed.
 * The new Progressive Voice System uses AI-generated segments directly.
 * This eliminates the need for sentence boundary detection and parsing.
 *
 * New approach: Trust AI segments → VoiceDirector → Progressive playback
 *
 * @author AI Dungeon Master Team
 * @deprecated Use VoiceDirector with AI-generated segments instead
 */

/**
 * Enhanced sentence segmentation utility
 * Ensures splits only occur at proper sentence boundaries, never mid-word
 */
export class SentenceSegmenter {
  // Common abbreviations that end with periods but aren't sentence endings
  private static readonly ABBREVIATIONS = new Set([
    'dr',
    'mr',
    'mrs',
    'ms',
    'prof',
    'st',
    'ave',
    'blvd',
    'etc',
    'vs',
    'jr',
    'sr',
    'inc',
    'ltd',
    'corp',
    'co',
    'dept',
    'govt',
    'min',
    'max',
    'approx',
    'est',
    'ft',
    'in',
    'yd',
    'mi',
    'lb',
    'oz',
    'pt',
    'qt',
    'gal',
    'mph',
    'rpm',
    'no',
    'nos',
    'fig',
    'figs',
    'vol',
    'vols',
    'ch',
    'chs',
    'pg',
    'pgs',
    'ref',
    'refs',
    'ed',
    'eds',
    'rev',
    'revs',
    'jan',
    'feb',
    'mar',
    'apr',
    'may',
    'jun',
    'jul',
    'aug',
    'sep',
    'oct',
    'nov',
    'dec',
  ]);

  /**
   * Split text into sentences with proper boundary detection
   * Ensures no splits occur in the middle of words
   */
  static splitIntoSentences(text: string): string[] {
    if (!text || text.trim().length === 0) {
      return [];
    }

    const cleanText = text.trim();
    const sentences: string[] = [];

    // Use more sophisticated sentence boundary detection
    const potentialSentences = this.findSentenceBoundaries(cleanText);

    // Validate and clean each sentence
    for (const sentence of potentialSentences) {
      const trimmed = sentence.trim();
      if (trimmed.length > 0) {
        sentences.push(trimmed);
      }
    }

    // If no proper sentences found, return the whole text
    return sentences.length > 0 ? sentences : [cleanText];
  }

  /**
   * Find sentence boundaries with sophisticated punctuation handling
   */
  private static findSentenceBoundaries(text: string): string[] {
    const sentences: string[] = [];
    let currentSentence = '';
    let i = 0;

    while (i < text.length) {
      const char = text[i];
      currentSentence += char;

      // Check for sentence-ending punctuation
      if (char === '.' || char === '!' || char === '?') {
        const nextChar = i + 1 < text.length ? text[i + 1] : '';
        const followingChar = i + 2 < text.length ? text[i + 2] : '';

        // Check if this is actually a sentence ending
        if (this.isSentenceEnd(currentSentence, nextChar, followingChar)) {
          // Look ahead to include any closing quotes or parentheses
          let endIndex = i + 1;
          while (endIndex < text.length && /[\s"')\]}-]/.test(text.charAt(endIndex))) {
            if (text.charAt(endIndex).match(/["')\]}-]/)) {
              currentSentence += text.charAt(endIndex);
              endIndex++;
            } else {
              break;
            }
          }

          sentences.push(currentSentence.trim());
          currentSentence = '';
          i = endIndex;
          continue;
        }
      }

      i++;
    }

    // Add any remaining text as the last sentence
    if (currentSentence.trim()) {
      sentences.push(currentSentence.trim());
    }

    return sentences;
  }

  /**
   * Check if punctuation marks the end of a sentence
   */
  private static isSentenceEnd(
    currentSentence: string,
    nextChar: string,
    followingChar: string,
  ): boolean {
    // Must have whitespace or end of text after punctuation
    if (!nextChar || !/\s/.test(nextChar)) {
      return nextChar === ''; // Only true at end of text
    }

    // Check for abbreviations
    const words = currentSentence.trim().split(/\s+/);
    const lastWord = words[words.length - 1];
    if (lastWord) {
      const wordWithoutPunct = lastWord.replace(/[.!?]+$/, '').toLowerCase();
      if (this.ABBREVIATIONS.has(wordWithoutPunct)) {
        return false;
      }

      // Check for initials (single letters followed by periods)
      if (/^[a-z]\.$/i.test(lastWord) && words.length > 1) {
        return false;
      }
    }

    // Following character should be uppercase letter or quote + uppercase (new sentence)
    const afterWhitespace = followingChar;
    if (afterWhitespace && /[A-Z"']/.test(afterWhitespace)) {
      return true;
    }

    // End of text
    if (!afterWhitespace) {
      return true;
    }

    return false;
  }

  /**
   * Ensure no segment splits mid-word by checking word boundaries
   */
  static validateSegmentBoundaries(segments: string[]): string[] {
    const validatedSegments: string[] = [];

    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      const trimmed = segment.trim();

      if (trimmed.length === 0) continue;

      // Check if segment starts or ends mid-word
      const startsClean = this.startsOnWordBoundary(trimmed);
      const endsClean = this.endsOnWordBoundary(trimmed);

      if (startsClean && endsClean) {
        validatedSegments.push(trimmed);
      } else {
        // If boundary issues, merge with adjacent segments
        if (i > 0 && !startsClean) {
          const prevIndex = validatedSegments.length - 1;
          if (prevIndex >= 0) {
            validatedSegments[prevIndex] += ' ' + trimmed;
            continue;
          }
        }
        validatedSegments.push(trimmed);
      }
    }

    return validatedSegments;
  }

  /**
   * Check if text starts on a word boundary
   */
  private static startsOnWordBoundary(text: string): boolean {
    if (!text) return true;

    const firstChar = text.charAt(0);
    // Should start with whitespace, letter, number, quote, or punctuation
    return /[\s\w"'([-]/u.test(firstChar) || /^[A-Z]/u.test(firstChar);
  }

  /**
   * Check if text ends on a word boundary
   */
  private static endsOnWordBoundary(text: string): boolean {
    if (!text) return true;

    const lastChar = text.charAt(text.length - 1);
    // Should end with letter, number, punctuation, quote, or closing symbols
    return /[\s\w.!?)"'\]-]/u.test(lastChar);
  }

  /**
   * Split long segments at clause boundaries while maintaining complete thoughts
   */
  static splitLongSegmentAtClauses(
    segment: string,
    minLength: number = 20,
    maxLength: number = 200,
  ): string[] {
    if (segment.length <= maxLength) {
      return [segment];
    }

    // Try to split on natural clause boundaries
    const clausePatterns = [
      /,\s+(?=(and|but|or|yet|so|for|nor)\s+)/g, // Coordinating conjunctions
      /,\s+(?=which|that|who|whom|whose|where|when|why|how)/g, // Relative clauses
      /;\s+/g, // Semicolons
      /\.\.\.\s+/g, // Ellipses
    ];

    for (const pattern of clausePatterns) {
      const parts = segment.split(pattern);
      if (parts.length > 1) {
        const result: string[] = [];
        let current = '';

        for (const part of parts) {
          const trimmed = part.trim();
          if (!trimmed) continue;

          if (current && (current + ' ' + trimmed).length <= maxLength) {
            current += (current ? ' ' : '') + trimmed;
          } else {
            if (current && current.length >= minLength) {
              result.push(current);
            }
            current = trimmed;
          }
        }

        if (current && current.length >= minLength) {
          result.push(current);
        }

        // If we got good splits, return them
        if (result.length > 1) {
          return result;
        }
      }
    }

    // If no good clause splits found, try sentence splitting
    const sentences = this.splitIntoSentences(segment);
    if (sentences.length > 1) {
      return sentences;
    }

    // Last resort: return the original segment
    return [segment];
  }

  /**
   * Optimize segment lengths for audio generation
   * Ensures segments are not too short or too long
   */
  static optimizeSegmentLengths(
    segments: string[],
    minLength: number = 20,
    maxLength: number = 200,
  ): string[] {
    const optimized: string[] = [];

    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      const trimmed = segment.trim();

      if (!trimmed) continue;

      // Handle long segments
      if (trimmed.length > maxLength) {
        const subSegments = this.splitLongSegmentAtClauses(trimmed, minLength, maxLength);
        optimized.push(...subSegments);
        continue;
      }

      // Handle short segments - try to merge with next segment
      if (trimmed.length < minLength && i < segments.length - 1) {
        const nextSegment = segments[i + 1];
        const combined = trimmed + ' ' + nextSegment.trim();

        if (combined.length <= maxLength) {
          optimized.push(combined);
          i++; // Skip the next segment as we merged it
          continue;
        }
      }

      optimized.push(trimmed);
    }

    return optimized.filter((segment) => segment.length > 0);
  }
}
