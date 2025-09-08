/**
 * Dialogue Parser Service
 * 
 * ⚠️ DEPRECATED: This complex parsing system has been replaced by VoiceDirector.
 * The AI now generates pre-segmented dialogue, eliminating the need for text parsing.
 * This file remains for legacy compatibility only.
 * 
 * New approach: AI segments → VoiceDirector → Progressive Voice System
 * 
 * @author AI Dungeon Master Team
 * @deprecated Use VoiceDirector.processAISegments() instead
 */

import { SentenceSegmenter } from '@/utils/sentence-segmenter';

export interface VoiceSettings {
  stability: number;
  similarity_boost: number;
  style?: number;
  use_speaker_boost?: boolean;
}

export interface DialogueSegment {
  type: 'narration' | 'dialogue' | 'action' | 'thought';
  text: string;
  character?: string;
  originalText: string;
  startIndex: number;
  endIndex: number;
  voiceId?: string;
  voiceSettings?: VoiceSettings;
}

export class DialogueParser {
  private static readonly DIALOGUE_PATTERNS = [
    // Direct quotes with attribution
    /(?:^|[.!?]\s+)([A-Za-z'\s]+)\s+(says?|said|whispers?|whispered|shouts?|shouted|yells?|yelled|mutters?|muttered|growls?|growled|hisses?|hissed|roars?|roared),?\s*["']([^"']+)["']/gi,
    
    // Quotes followed by attribution
    /["']([^"']+)["'],?\s+(says?|said|whispers?|whispered|shouts?|shouted|yells?|yelled|mutters?|muttered|growls?|growled|hisses?|hissed|roars?|roared)\s+([A-Za-z'\s]+)/gi,
    
    // Simple quoted dialogue without clear attribution
    /["']([^"']{5,})["']/g,
    
    // Character name followed by colon (chat-style dialogue)
    /^([A-Za-z'\s]+):\s*(.+)$/gm,
  ];

  private static readonly ACTION_PATTERNS = [
    // Text in asterisks or parentheses for actions/sound effects
    /\*([^*]+)\*/g,
    /\(([^)]+)\)/g,
  ];

  private static readonly THOUGHT_PATTERNS = [
    // Text in italics or special markers for thoughts
    /_([^_]+)_/g,
    /\[thinks?\]\s*([^[]+)/gi,
  ];

  private static readonly SPEECH_VERBS = [
    'says', 'said', 'whispers', 'whispered', 'shouts', 'shouted', 
    'yells', 'yelled', 'mutters', 'muttered', 'growls', 'growled',
    'hisses', 'hissed', 'roars', 'roared', 'declares', 'declared',
    'announces', 'announced', 'exclaims', 'exclaimed', 'asks', 'asked',
    'replies', 'replied', 'responds', 'responded', 'calls', 'called'
  ];

  /**
   * Parse DM text into dialogue segments
   */
  static parseText(text: string): DialogueSegment[] {
    const segments: DialogueSegment[] = [];
    const processedRanges: Array<{start: number, end: number}> = [];

    // Clean the input text
    const cleanText = text.trim();
    
    // First pass: Find dialogue with clear attribution
    this.findAttributedDialogue(cleanText, segments, processedRanges);
    
    // Second pass: Find actions and sound effects
    this.findActions(cleanText, segments, processedRanges);
    
    // Third pass: Find thoughts
    this.findThoughts(cleanText, segments, processedRanges);
    
    // Fourth pass: Find unattributed dialogue
    this.findUnattributedDialogue(cleanText, segments, processedRanges);
    
    // Fill in narration segments
    this.fillNarrationSegments(cleanText, segments, processedRanges);
    
    // Sort segments by start index and clean up
    return this.finalizeSegments(segments, cleanText);
  }

  private static findAttributedDialogue(text: string, segments: DialogueSegment[], processedRanges: Array<{start: number, end: number}>) {
    // Pattern: "Character says, 'dialogue'"
    const pattern1 = /(?:^|[.!?]\s+)([A-Za-z'\s]+)\s+(says?|said|whispers?|whispered|shouts?|shouted|yells?|yelled|mutters?|muttered|growls?|growled|hisses?|hissed|roars?|roared),?\s*["']([^"']+)["']/gi;
    
    let match;
    while ((match = pattern1.exec(text)) !== null) {
      const character = this.cleanCharacterName(match[1]);
      const dialogue = match[3].trim();
      const startIndex = match.index;
      const endIndex = match.index + match[0].length;
      
      segments.push({
        type: 'dialogue',
        text: dialogue,
        character,
        originalText: match[0],
        startIndex,
        endIndex
      });
      
      processedRanges.push({ start: startIndex, end: endIndex });
    }

    // Pattern: "'dialogue', says Character"
    const pattern2 = /["']([^"']+)["'],?\s+(says?|said|whispers?|whispered|shouts?|shouted|yells?|yelled|mutters?|muttered|growls?|growled|hisses?|hissed|roars?|roared)\s+([A-Za-z'\s]+)/gi;
    
    while ((match = pattern2.exec(text)) !== null) {
      const dialogue = match[1].trim();
      const character = this.cleanCharacterName(match[3]);
      const startIndex = match.index;
      const endIndex = match.index + match[0].length;
      
      // Check for overlap
      if (!this.hasOverlap(startIndex, endIndex, processedRanges)) {
        segments.push({
          type: 'dialogue',
          text: dialogue,
          character,
          originalText: match[0],
          startIndex,
          endIndex
        });
        
        processedRanges.push({ start: startIndex, end: endIndex });
      }
    }

    // Pattern: "Character: dialogue" (chat style)
    const pattern3 = /^([A-Za-z'\s]+):\s*(.+)$/gm;
    
    while ((match = pattern3.exec(text)) !== null) {
      const character = this.cleanCharacterName(match[1]);
      const dialogue = match[2].trim();
      const startIndex = match.index;
      const endIndex = match.index + match[0].length;
      
      if (!this.hasOverlap(startIndex, endIndex, processedRanges)) {
        segments.push({
          type: 'dialogue',
          text: dialogue,
          character,
          originalText: match[0],
          startIndex,
          endIndex
        });
        
        processedRanges.push({ start: startIndex, end: endIndex });
      }
    }
  }

  private static findActions(text: string, segments: DialogueSegment[], processedRanges: Array<{start: number, end: number}>) {
    // Actions in asterisks
    const asteriskPattern = /\*([^*]+)\*/g;
    let match;
    
    while ((match = asteriskPattern.exec(text)) !== null) {
      const action = match[1].trim();
      const startIndex = match.index;
      const endIndex = match.index + match[0].length;
      
      if (!this.hasOverlap(startIndex, endIndex, processedRanges)) {
        segments.push({
          type: 'action',
          text: action,
          originalText: match[0],
          startIndex,
          endIndex
        });
        
        processedRanges.push({ start: startIndex, end: endIndex });
      }
    }
  }

  private static findThoughts(text: string, segments: DialogueSegment[], processedRanges: Array<{start: number, end: number}>) {
    // Thoughts in underscores
    const thoughtPattern = /_([^_]+)_/g;
    let match;
    
    while ((match = thoughtPattern.exec(text)) !== null) {
      const thought = match[1].trim();
      const startIndex = match.index;
      const endIndex = match.index + match[0].length;
      
      if (!this.hasOverlap(startIndex, endIndex, processedRanges)) {
        segments.push({
          type: 'thought',
          text: thought,
          originalText: match[0],
          startIndex,
          endIndex
        });
        
        processedRanges.push({ start: startIndex, end: endIndex });
      }
    }
  }

  private static findUnattributedDialogue(text: string, segments: DialogueSegment[], processedRanges: Array<{start: number, end: number}>) {
    // Find quoted text that wasn't already captured
    const quotePattern = /["']([^"']{10,})["']/g;
    let match;
    
    while ((match = quotePattern.exec(text)) !== null) {
      const dialogue = match[1].trim();
      const startIndex = match.index;
      const endIndex = match.index + match[0].length;
      
      if (!this.hasOverlap(startIndex, endIndex, processedRanges)) {
        // Try to find character context nearby
        const character = this.findNearbyCharacter(text, startIndex, endIndex);
        
        segments.push({
          type: 'dialogue',
          text: dialogue,
          character: character || 'unknown',
          originalText: match[0],
          startIndex,
          endIndex
        });
        
        processedRanges.push({ start: startIndex, end: endIndex });
      }
    }
  }

  private static fillNarrationSegments(text: string, segments: DialogueSegment[], processedRanges: Array<{start: number, end: number}>) {
    // Sort processed ranges by start index
    processedRanges.sort((a, b) => a.start - b.start);
    
    let currentIndex = 0;
    
    for (const range of processedRanges) {
      if (currentIndex < range.start) {
        const narrationText = text.slice(currentIndex, range.start).trim();
        if (narrationText.length > 0) {
          segments.push({
            type: 'narration',
            text: narrationText,
            originalText: narrationText,
            startIndex: currentIndex,
            endIndex: range.start
          });
        }
      }
      currentIndex = Math.max(currentIndex, range.end);
    }
    
    // Handle remaining text
    if (currentIndex < text.length) {
      const narrationText = text.slice(currentIndex).trim();
      if (narrationText.length > 0) {
        segments.push({
          type: 'narration',
          text: narrationText,
          originalText: narrationText,
          startIndex: currentIndex,
          endIndex: text.length
        });
      }
    }
  }

  private static finalizeSegments(segments: DialogueSegment[], originalText: string): DialogueSegment[] {
    // Sort by start index
    segments.sort((a, b) => a.startIndex - b.startIndex);
    
    // Clean up text and remove markdown
    return segments.map(segment => ({
      ...segment,
      text: this.cleanText(segment.text),
      character: segment.character ? this.cleanCharacterName(segment.character) : undefined
    })).filter(segment => segment.text.length > 0);
  }

  private static cleanCharacterName(name: string): string {
    return name
      .trim()
      .replace(/^(the|a|an)\s+/i, '') // Remove articles
      .replace(/[^\w\s'-]/g, '') // Remove special characters except apostrophes and hyphens
      .toLowerCase()
      .replace(/\s+/g, ' ') // Normalize spaces
      .trim();
  }

  private static cleanText(text: string): string {
    return text
      .replace(/[*_`#]/g, '') // Remove markdown
      .replace(/\s+/g, ' ') // Normalize spaces
      .trim();
  }

  private static hasOverlap(start: number, end: number, ranges: Array<{start: number, end: number}>): boolean {
    return ranges.some(range => 
      (start >= range.start && start < range.end) || 
      (end > range.start && end <= range.end) ||
      (start <= range.start && end >= range.end)
    );
  }

  private static findNearbyCharacter(text: string, start: number, end: number): string | null {
    // Look for character names in the surrounding 100 characters
    const contextStart = Math.max(0, start - 100);
    const contextEnd = Math.min(text.length, end + 100);
    const context = text.slice(contextStart, contextEnd);
    
    // Try to find speech verbs that might indicate character
    for (const verb of this.SPEECH_VERBS) {
      const pattern = new RegExp(`([A-Za-z'\\s]+)\\s+${verb}`, 'i');
      const match = context.match(pattern);
      if (match) {
        return this.cleanCharacterName(match[1]);
      }
    }
    
    return null;
  }

  /**
   * Extract all unique character names from parsed segments
   */
  static extractCharacters(segments: DialogueSegment[]): string[] {
    const characters = new Set<string>();
    
    segments.forEach(segment => {
      if (segment.character && segment.character !== 'unknown') {
        characters.add(segment.character);
      }
    });
    
    return Array.from(characters);
  }

  /**
   * Merge adjacent segments of the same type and character, with intelligent splitting for better audio generation
   */
  static optimizeSegments(segments: DialogueSegment[]): DialogueSegment[] {
    if (segments.length === 0) return segments;
    
    // First pass: merge adjacent segments
    const merged = this.mergeAdjacentSegments(segments);
    
    // Second pass: split long segments at sentence boundaries
    const split = this.splitLongSegments(merged);
    
    // Third pass: ensure reasonable segment lengths for audio generation
    const optimized = this.optimizeSegmentLengths(split);
    
    return optimized;
  }

  private static mergeAdjacentSegments(segments: DialogueSegment[]): DialogueSegment[] {
    const merged: DialogueSegment[] = [];
    let current = { ...segments[0] };
    
    for (let i = 1; i < segments.length; i++) {
      const next = segments[i];
      
      // Merge if same type and character, but don't merge actions to keep them distinct
      if (current.type === next.type && 
          current.character === next.character &&
          current.type !== 'action') {
        current.text += ' ' + next.text;
        current.originalText += ' ' + next.originalText;
        current.endIndex = next.endIndex;
      } else {
        merged.push(current);
        current = { ...next };
      }
    }
    
    merged.push(current);
    return merged;
  }

  private static splitLongSegments(segments: DialogueSegment[]): DialogueSegment[] {
    const split: DialogueSegment[] = [];
    
    for (const segment of segments) {
      // Split segments longer than 200 characters at sentence boundaries
      if (segment.text.length > 200) {
        const subSegments = this.splitAtSentenceBoundaries(segment);
        split.push(...subSegments);
      } else {
        split.push(segment);
      }
    }
    
    return split;
  }

  private static splitAtSentenceBoundaries(segment: DialogueSegment): DialogueSegment[] {
    const sentences = this.splitIntoSentences(segment.text);
    const subSegments: DialogueSegment[] = [];
    
    let currentText = '';
    
    for (let i = 0; i < sentences.length; i++) {
      const sentence = sentences[i];
      const potentialText = currentText + (currentText ? ' ' : '') + sentence;
      
      // If adding this sentence would make the segment too long, save current and start new
      if (potentialText.length > 200 && currentText.length > 0) {
        subSegments.push({
          ...segment,
          text: currentText.trim(),
          originalText: currentText.trim()
        });
        currentText = sentence;
      } else {
        currentText = potentialText;
      }
    }
    
    // Add remaining text
    if (currentText.trim()) {
      subSegments.push({
        ...segment,
        text: currentText.trim(),
        originalText: currentText.trim()
      });
    }
    
    return subSegments.length > 0 ? subSegments : [segment];
  }

  private static splitIntoSentences(text: string): string[] {
    // Use the enhanced sentence segmentation utility
    return SentenceSegmenter.splitIntoSentences(text);
  }

  private static optimizeSegmentLengths(segments: DialogueSegment[]): DialogueSegment[] {
    const optimized: DialogueSegment[] = [];
    
    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      
      // If segment is very short (< 10 chars) and next segment is same type/character, merge them
      if (segment.text.length < 10 && 
          i < segments.length - 1 && 
          segments[i + 1].type === segment.type && 
          segments[i + 1].character === segment.character) {
        const nextSegment = segments[i + 1];
        optimized.push({
          ...segment,
          text: segment.text + ' ' + nextSegment.text,
          originalText: segment.originalText + ' ' + nextSegment.originalText,
          endIndex: nextSegment.endIndex
        });
        i++; // Skip the next segment as we merged it
      } else {
        optimized.push(segment);
      }
    }
    
    // Final validation to ensure no mid-word splits using enhanced segmenter
    return this.validateSegmentWordBoundaries(optimized);
  }

  private static validateSegmentWordBoundaries(segments: DialogueSegment[]): DialogueSegment[] {
    // Extract just the text for validation
    const texts = segments.map(segment => segment.text);
    const validatedTexts = SentenceSegmenter.validateSegmentBoundaries(texts);
    
    // Map back to segments, handling potential length changes
    const validatedSegments: DialogueSegment[] = [];
    let segmentIndex = 0;
    
    for (const validatedText of validatedTexts) {
      if (segmentIndex < segments.length) {
        const originalSegment = segments[segmentIndex];
        validatedSegments.push({
          ...originalSegment,
          text: validatedText.trim(),
          originalText: validatedText.trim()
        });
        segmentIndex++;
      }
    }
    
    return validatedSegments.filter(segment => segment.text.length > 0);
  }
}