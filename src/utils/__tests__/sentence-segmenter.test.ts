import { describe, it, expect } from 'vitest';

import { SentenceSegmenter } from '@/utils/sentence-segmenter';

describe('SentenceSegmenter', () => {
  it('splitIntoSentences should respect abbreviations and real sentence ends', () => {
    const input = 'Dr. Smith went home. It was late.';
    const out = SentenceSegmenter.splitIntoSentences(input);
    expect(out).toEqual(['Dr. Smith went home.', 'It was late.']);
  });

  it('validateSegmentBoundaries should merge segments that start mid-token', () => {
    const segments = ['Hello world.', '@And then it continued.'];
    const out = SentenceSegmenter.validateSegmentBoundaries(segments);
    expect(out).toEqual(['Hello world. @And then it continued.']);
  });

  it('splitLongSegmentAtClauses should split on semicolons or clause boundaries', () => {
    const long =
      'He paused, and considered the options; ultimately, he chose the safer path which seemed wise.';
    const parts = SentenceSegmenter.splitLongSegmentAtClauses(long, 10, 40);
    expect(parts.length).toBeGreaterThan(1);
    // Ensure recombining yields the important content
    expect(parts.join(' ')).toContain('ultimately, he chose the safer path');
  });

  it('optimizeSegmentLengths should merge short and split long segments', () => {
    const segments = [
      'Hi.',
      'This is a moderately long segment that should remain mostly intact.',
      'Another very long segment that is intentionally verbose, and, which should be split into multiple clauses for better audio pacing and delivery.',
    ];

    const optimized = SentenceSegmenter.optimizeSegmentLengths(segments, 20, 80);
    // First two should merge into one (short + next)
    expect(optimized[0]).toContain('Hi. This is a moderately long segment');
    // Last one should be split into at least two entries
    expect(optimized.length).toBeGreaterThan(2);
  });
});
