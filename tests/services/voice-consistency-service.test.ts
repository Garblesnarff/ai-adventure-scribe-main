import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import type { VoiceProfile } from '@/services/voice-consistency-service';

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => {
  let mockData: any = null;
  let mockError: any = null;

  const chain = {
    select: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    single: vi.fn(async () => ({ data: mockData, error: mockError })),
    upsert: vi.fn(() => chain),
    insert: vi.fn(() => chain),
    update: vi.fn(() => chain),
  } as any;

  const supabase = {
    from: vi.fn((_table: string) => chain),
  } as any;

  return {
    supabase,
    __mock: {
      setData: (d: any) => (mockData = d),
      setError: (e: any) => (mockError = e),
      chain,
    },
  };
});

// Mock Gemini service
vi.mock('@/services/gemini-service', () => ({
  geminiService: {
    generateText: vi.fn(async () => {
      return JSON.stringify({
        voice_style: 'gruff',
        speech_patterns: ['uses contractions', 'speaks directly'],
        vocabulary_level: 'average',
        tone: 'serious',
        quirks: ['clears throat before speaking'],
        example_phrases: ['Yeah, I reckon', "Ain't no problem"],
        consistency_score: 0.85,
      });
    }),
  },
}));

// Mock logger
vi.mock('@/lib/logger', () => ({
  default: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

let VoiceConsistencyService: any;
let voiceConsistencyService: any;
let supabaseMock: any;
let geminiService: any;

describe('VoiceConsistencyService', () => {
  beforeEach(async () => {
    // Reset mocks
    vi.clearAllMocks();

    // Import fresh modules
    const supabaseModule = await import('@/integrations/supabase/client');
    supabaseMock = (supabaseModule as any).__mock;
    supabaseMock.setData(null);
    supabaseMock.setError(null);

    const geminiModule = await import('@/services/gemini-service');
    geminiService = geminiModule.geminiService;

    const voiceModule = await import('@/services/voice-consistency-service');
    VoiceConsistencyService = voiceModule.VoiceConsistencyService;
    voiceConsistencyService = voiceModule.voiceConsistencyService;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('getVoiceProfile', () => {
    it('should retrieve voice profile for a character', async () => {
      const mockProfile: VoiceProfile = {
        id: 'profile-1',
        character_id: 'char-1',
        voice_style: 'eloquent',
        speech_patterns: ['formal', 'uses complex sentences'],
        vocabulary_level: 'advanced',
        tone: 'serious',
        quirks: ['says "indeed" frequently'],
        example_phrases: ['Indeed, that is most intriguing'],
        consistency_score: 0.90,
        created_at: new Date(),
        updated_at: new Date(),
      };

      supabaseMock.setData(mockProfile);

      const result = await voiceConsistencyService.getVoiceProfile('char-1');

      expect(result).toEqual(mockProfile);
      expect(supabaseMock.chain.select).toHaveBeenCalledWith('*');
      expect(supabaseMock.chain.eq).toHaveBeenCalledWith('character_id', 'char-1');
    });

    it('should return null if no voice profile exists', async () => {
      supabaseMock.setError({ code: 'PGRST116' }); // Not found error

      const result = await voiceConsistencyService.getVoiceProfile('char-2');

      expect(result).toBeNull();
    });

    it('should handle database errors gracefully', async () => {
      supabaseMock.setError({ code: 'SOME_ERROR', message: 'Database error' });

      const result = await voiceConsistencyService.getVoiceProfile('char-3');

      expect(result).toBeNull();
    });
  });

  describe('upsertVoiceProfile', () => {
    it('should create a new voice profile', async () => {
      const newProfile: Partial<VoiceProfile> = {
        voice_style: 'timid',
        speech_patterns: ['speaks softly', 'hesitant'],
        vocabulary_level: 'simple',
        tone: 'nervous',
        quirks: ['stammers when nervous'],
        example_phrases: ['Um... I think...', 'Maybe we could...'],
        consistency_score: 0.70,
      };

      const savedProfile: VoiceProfile = {
        id: 'profile-2',
        character_id: 'char-4',
        ...newProfile,
        voice_style: newProfile.voice_style!,
        speech_patterns: newProfile.speech_patterns!,
        vocabulary_level: newProfile.vocabulary_level!,
        tone: newProfile.tone!,
        quirks: newProfile.quirks!,
        example_phrases: newProfile.example_phrases!,
        consistency_score: newProfile.consistency_score!,
        created_at: new Date(),
        updated_at: new Date(),
      };

      supabaseMock.setData(savedProfile);

      const result = await voiceConsistencyService.upsertVoiceProfile('char-4', newProfile);

      expect(result).toEqual(savedProfile);
      expect(supabaseMock.chain.upsert).toHaveBeenCalled();
    });

    it('should update an existing voice profile', async () => {
      const updatedProfile: Partial<VoiceProfile> = {
        voice_style: 'confident',
        consistency_score: 0.95,
      };

      const savedProfile: VoiceProfile = {
        id: 'profile-1',
        character_id: 'char-1',
        voice_style: 'confident',
        speech_patterns: ['formal'],
        vocabulary_level: 'advanced',
        tone: 'serious',
        quirks: [],
        example_phrases: [],
        consistency_score: 0.95,
        created_at: new Date(),
        updated_at: new Date(),
      };

      supabaseMock.setData(savedProfile);

      const result = await voiceConsistencyService.upsertVoiceProfile('char-1', updatedProfile);

      expect(result).toEqual(savedProfile);
    });

    it('should handle database errors during upsert', async () => {
      supabaseMock.setError({ message: 'Constraint violation' });

      const result = await voiceConsistencyService.upsertVoiceProfile('char-5', {
        voice_style: 'test',
      });

      expect(result).toBeNull();
    });
  });

  describe('analyzeDialogue', () => {
    it('should analyze dialogue and extract voice characteristics', async () => {
      const dialogue = [
        "Yeah, I reckon that's the way to go.",
        "Ain't no problem, we'll get it done.",
        "I've seen worse in my time.",
      ];

      const result = await voiceConsistencyService.analyzeDialogue(dialogue);

      expect(result).toBeDefined();
      expect(result.voice_style).toBe('gruff');
      expect(result.speech_patterns).toContain('uses contractions');
      expect(result.vocabulary_level).toBe('average');
      expect(result.tone).toBe('serious');
      expect(result.quirks).toContain('clears throat before speaking');
      expect(result.consistency_score).toBe(0.85);

      expect(geminiService.generateText).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'gemini-1.5-flash',
          temperature: 0.3,
          maxTokens: 1000,
        })
      );
    });

    it('should return default profile for empty dialogue', async () => {
      const result = await voiceConsistencyService.analyzeDialogue([]);

      expect(result).toEqual({
        voice_style: 'neutral',
        speech_patterns: [],
        vocabulary_level: 'average',
        tone: 'neutral',
        quirks: [],
        example_phrases: [],
        consistency_score: 0.0,
      });

      expect(geminiService.generateText).not.toHaveBeenCalled();
    });

    it('should handle AI service errors gracefully', async () => {
      geminiService.generateText.mockRejectedValueOnce(new Error('AI service unavailable'));

      const dialogue = ['Test dialogue'];
      const result = await voiceConsistencyService.analyzeDialogue(dialogue);

      expect(result).toBeDefined();
      expect(result.voice_style).toBe('neutral');
      expect(result.vocabulary_level).toBe('average');
      expect(result.consistency_score).toBe(0.5);
    });

    it('should validate and normalize AI response', async () => {
      geminiService.generateText.mockResolvedValueOnce(
        JSON.stringify({
          voice_style: 'test',
          speech_patterns: 'not-an-array', // Invalid
          vocabulary_level: 'invalid', // Invalid
          tone: 'test',
          quirks: null, // Invalid
          example_phrases: ['phrase 1'],
          consistency_score: 2.5, // Out of range
        })
      );

      const dialogue = ['Test'];
      const result = await voiceConsistencyService.analyzeDialogue(dialogue);

      expect(result.speech_patterns).toEqual([]);
      expect(result.vocabulary_level).toBe('average');
      expect(result.quirks).toEqual([]);
      expect(result.consistency_score).toBe(1.0); // Clamped to max
    });

    it('should handle malformed JSON responses', async () => {
      geminiService.generateText.mockResolvedValueOnce('This is not JSON');

      const dialogue = ['Test dialogue'];
      const result = await voiceConsistencyService.analyzeDialogue(dialogue);

      expect(result).toBeDefined();
      expect(result.voice_style).toBe('neutral');
      expect(result.consistency_score).toBe(0.5);
    });
  });

  describe('Integration: Voice Profile Workflow', () => {
    it('should create and retrieve voice profile from analyzed dialogue', async () => {
      // Step 1: Analyze dialogue
      const dialogue = [
        'Greetings, noble adventurers!',
        'Indeed, I have heard tales of your valor.',
        'Pray tell, what brings you to my humble establishment?',
      ];

      geminiService.generateText.mockResolvedValueOnce(
        JSON.stringify({
          voice_style: 'eloquent',
          speech_patterns: ['formal', 'archaic phrasing'],
          vocabulary_level: 'archaic',
          tone: 'welcoming',
          quirks: ['uses "pray tell"'],
          example_phrases: dialogue,
          consistency_score: 0.88,
        })
      );

      const analysis = await voiceConsistencyService.analyzeDialogue(dialogue);

      expect(analysis.voice_style).toBe('eloquent');
      expect(analysis.vocabulary_level).toBe('archaic');

      // Step 2: Save voice profile
      const characterId = 'char-merchant-1';
      const savedProfile: VoiceProfile = {
        id: 'profile-3',
        character_id: characterId,
        ...analysis,
        voice_style: analysis.voice_style!,
        speech_patterns: analysis.speech_patterns!,
        vocabulary_level: analysis.vocabulary_level!,
        tone: analysis.tone!,
        quirks: analysis.quirks!,
        example_phrases: analysis.example_phrases!,
        consistency_score: analysis.consistency_score!,
        created_at: new Date(),
        updated_at: new Date(),
      };

      supabaseMock.setData(savedProfile);

      const upserted = await voiceConsistencyService.upsertVoiceProfile(
        characterId,
        analysis
      );

      expect(upserted).toEqual(savedProfile);

      // Step 3: Retrieve voice profile
      const retrieved = await voiceConsistencyService.getVoiceProfile(characterId);

      expect(retrieved).toEqual(savedProfile);
      expect(retrieved?.voice_style).toBe('eloquent');
      expect(retrieved?.vocabulary_level).toBe('archaic');
    });
  });
});
