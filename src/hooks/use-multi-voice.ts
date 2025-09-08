/**
 * useMultiVoice Hook
 * 
 * Manages multi-voice text-to-speech state and playback queue.
 * Handles dialogue parsing, voice mapping, and sequential audio playback.
 * 
 * Dependencies:
 * - React
 * - Dialogue Parser Service
 * - Voice Mapper Service
 * - Toast hook
 * 
 * @author AI Dungeon Master Team
 */

import React from 'react';
import { DialogueParser, DialogueSegment } from '@/services/dialogue-parser';
import { VoiceMapper, VoiceConfig } from '@/services/voice-mapper';
import { SentenceSegmenter } from '@/utils/sentence-segmenter';
import { NarrationSegment } from '@/hooks/use-ai-response';
import { useToast } from './use-toast';
import { supabase } from '@/integrations/supabase/client';

export interface AudioSegment extends DialogueSegment {
  voiceConfig: VoiceConfig;
  audioBlob?: Blob;
  audioUrl?: string;
  isPlaying?: boolean;
  isLoading?: boolean;
  error?: string;
}

export interface MultiVoiceState {
  segments: AudioSegment[];
  currentSegmentIndex: number;
  isPlaying: boolean;
  isLoading: boolean;
  isProcessing: boolean;
  volume: number;
  isMuted: boolean;
  isVoiceEnabled: boolean;
  playbackQueue: AudioSegment[];
  currentAudio: HTMLAudioElement | null;
  nextAudio: HTMLAudioElement | null;
}

/**
 * React hook for managing multi-voice text-to-speech
 */
export const useMultiVoice = () => {
  const { toast } = useToast();
  
  // State
  const [state, setState] = React.useState<MultiVoiceState>({
    segments: [],
    currentSegmentIndex: -1,
    isPlaying: false,
    isLoading: false,
    isProcessing: false,
    volume: 1,
    isMuted: false,
    isVoiceEnabled: true,
    playbackQueue: [],
    currentAudio: null,
    nextAudio: null
  });

  // API key state
  const [apiKey, setApiKey] = React.useState<string | null>(null);

  // Audio refs
  const audioRefs = React.useRef<Map<number, HTMLAudioElement>>(new Map());
  const abortController = React.useRef<AbortController | null>(null);
  const currentPlaybackId = React.useRef<string | null>(null);

  // Generation queue and cache
  const generationQueue = React.useRef<Map<string, Promise<AudioSegment>>>(new Map());
  const audioCache = React.useRef<Map<string, AudioSegment>>(new Map()); // Simple in-memory cache: key = `${voiceId}_${textHash}`
  const maxConcurrentRequests = 3;
  const activeRequests = React.useRef(0);

  // Web Audio API refs for zero-gap playback
  const audioContextRef = React.useRef<AudioContext | null>(null);
  const playbackSourceRef = React.useRef<AudioBufferSourceNode | null>(null);
  const currentGainNodeRef = React.useRef<GainNode | null>(null);
  const nextGainNodeRef = React.useRef<GainNode | null>(null);
  const segmentBuffersRef = React.useRef<Map<number, AudioBuffer>>(new Map());

  // Load settings from localStorage
  React.useEffect(() => {
    const savedVolume = localStorage.getItem('multi-voice-volume');
    const savedMuted = localStorage.getItem('multi-voice-muted');
    const savedEnabled = localStorage.getItem('multi-voice-enabled');

    setState(prev => ({
      ...prev,
      volume: savedVolume ? parseFloat(savedVolume) : 1,
      isMuted: savedMuted === 'true',
      isVoiceEnabled: savedEnabled !== 'false'
    }));
  }, []);

  // Fetch API key from Supabase secrets
  React.useEffect(() => {
    const fetchApiKey = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('get-secret', {
          body: { secretName: 'ELEVEN_LABS_API_KEY' }
        });

        if (error) {
          throw error;
        }

        if (data?.secret) {
          console.log('Successfully retrieved ElevenLabs API key for multi-voice');
          setApiKey(data.secret);
        } else {
          throw new Error('ElevenLabs API key is empty');
        }
      } catch (error) {
        console.error('Error fetching API key for multi-voice:', error);
        toast({
          title: "API Key Error",
          description: "Failed to retrieve ElevenLabs API key. Please check your configuration.",
          variant: "destructive",
        });
      }
    };

    fetchApiKey();
  }, [toast]);

  // Get API key for internal use
  const getApiKey = React.useCallback((): string | null => {
    return apiKey;
  }, [apiKey]);

  // Simple text hash for caching
  const hashText = React.useCallback((text: string): string => {
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString();
  }, []);

  /**
   * Parse text into dialogue segments
   */
  const parseText = React.useCallback((text: string): AudioSegment[] => {
    const dialogueSegments = DialogueParser.parseText(text);
    const optimizedSegments = DialogueParser.optimizeSegments(dialogueSegments);
    
    console.log('🎭 Parsed dialogue segments:', optimizedSegments.map(s => ({
      type: s.type,
      character: s.character,
      text: s.text.substring(0, 50) + '...'
    })));
    
    return optimizedSegments.map(segment => {
      const voiceConfig = segment.type === 'narration' 
        ? VoiceMapper.getNarratorVoice()
        : VoiceMapper.getVoiceForCharacter(segment.character || 'unknown');

      console.log(`🎤 Voice assignment: "${segment.character || 'Narrator'}" -> ${voiceConfig.name} (${voiceConfig.id})`);

      return {
        ...segment,
        voiceConfig,
        isPlaying: false,
        isLoading: false
      };
    });
  }, []);

  /**
   * Generate audio for a single segment with retry logic
   */
  const generateAudioForSegment = React.useCallback(async (
    segment: AudioSegment, 
    signal?: AbortSignal,
    retryCount: number = 0
  ): Promise<AudioSegment> => {
    const apiKey = getApiKey();
    if (!apiKey) {
      throw new Error('ElevenLabs API key not found');
    }

    if (!segment.text.trim()) {
      throw new Error('Empty text segment');
    }

    const maxRetries = 2;
    const baseDelay = 1000; // 1 second

    try {
      const response = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${segment.voiceConfig.id}/stream`,
        {
          method: 'POST',
          headers: {
            'Accept': 'audio/mpeg',
            'Content-Type': 'application/json',
            'xi-api-key': apiKey,
          },
          body: JSON.stringify({
            text: segment.text,
            model_id: segment.voiceConfig.model,
            voice_settings: segment.voiceConfig.settings,
          }),
          signal
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = `API request failed: ${response.status} ${response.statusText}`;
        
        // Handle specific error cases
        if (response.status === 401) {
          errorMessage = 'Invalid API key. Please check your ElevenLabs configuration.';
        } else if (response.status === 429) {
          errorMessage = 'Rate limit exceeded. Retrying...';
        } else if (response.status >= 500) {
          errorMessage = 'Server error. Retrying...';
        }
        
        console.error('ElevenLabs API error:', errorText);
        throw new Error(errorMessage);
      }

      const arrayBuffer = await response.arrayBuffer();
      const audioBlob = new Blob([arrayBuffer], { type: 'audio/mpeg' });
      const audioUrl = URL.createObjectURL(audioBlob);

      return {
        ...segment,
        audioBlob,
        audioUrl,
        isLoading: false
      };
    } catch (error) {
      // Don't retry on abort signals
      if (signal?.aborted || error instanceof Error && error.name === 'AbortError') {
        throw error;
      }

      // Retry on network errors or rate limits
      if (retryCount < maxRetries && 
          (error instanceof Error && 
           (error.message.includes('Rate limit') || 
            error.message.includes('Server error') ||
            error.message.includes('fetch')))) {
        
        const delay = baseDelay * Math.pow(2, retryCount); // Exponential backoff
        console.log(`Retrying audio generation for segment (attempt ${retryCount + 1}/${maxRetries + 1}) after ${delay}ms`);
        
        await new Promise(resolve => setTimeout(resolve, delay));
        return generateAudioForSegment(segment, signal, retryCount + 1);
      }

      throw error;
    }
  }, [getApiKey]);

  /**
   * Generate audio for all segments with improved error handling
   */
  const generateAudio = React.useCallback(async (segments: AudioSegment[]): Promise<AudioSegment[]> => {
    // Abort any ongoing requests
    if (abortController.current) {
      abortController.current.abort();
    }
    abortController.current = new AbortController();

    setState(prev => ({ ...prev, isLoading: true }));

    const generatedSegments: AudioSegment[] = [];
    const errors: string[] = [];
    let successCount = 0;

    try {
      // Generate audio for each segment sequentially to avoid rate limits
      for (let i = 0; i < segments.length; i++) {
        if (abortController.current.signal.aborted) {
          break;
        }

        const segment = segments[i];
        
        try {
          setState(prev => ({
            ...prev,
            segments: prev.segments.map((s, idx) => 
              idx === i ? { ...s, isLoading: true, error: undefined } : s
            )
          }));

          console.log(`🎵 Generating audio for segment ${i + 1}/${segments.length}: "${segment.text.substring(0, 50)}..." (${segment.character || 'Narrator'})`);

          const generatedSegment = await generateAudioForSegment(
            segment, 
            abortController.current.signal
          );
          
          generatedSegments.push(generatedSegment);
          successCount++;
          
          setState(prev => ({
            ...prev,
            segments: prev.segments.map((s, idx) => 
              idx === i ? generatedSegment : s
            )
          }));
          
          // Progress feedback
          if (successCount % 2 === 0 || i === segments.length - 1) {
            toast({
              title: "Generating Audio",
              description: `Generated ${successCount}/${segments.length} audio segments`,
              duration: 2000,
            });
          }
          
          // Small delay to avoid hitting rate limits
          await new Promise(resolve => setTimeout(resolve, 200));
          
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          
          // Don't log abort errors as failures - they're intentional cancellations
          if (error instanceof Error && error.name !== 'AbortError') {
            console.error(`Error generating audio for segment ${i}:`, error);
            errors.push(`Segment ${i + 1}: ${errorMessage}`);
          }
          
          generatedSegments.push({
            ...segment,
            error: errorMessage,
            isLoading: false
          });
          
          setState(prev => ({
            ...prev,
            segments: prev.segments.map((s, idx) => 
              idx === i ? { ...s, error: errorMessage, isLoading: false } : s
            )
          }));
        }
      }

      // Show summary if there were errors
      if (errors.length > 0) {
        const successfulSegments = generatedSegments.filter(s => s.audioUrl && !s.error).length;
        toast({
          title: `Audio Generation ${successfulSegments > 0 ? 'Partially Complete' : 'Failed'}`,
          description: successfulSegments > 0 
            ? `${successfulSegments}/${segments.length} segments generated successfully. Some segments failed: ${errors.slice(0, 2).join(', ')}${errors.length > 2 ? ` and ${errors.length - 2} more...` : ''}`
            : `Failed to generate audio: ${errors[0] || 'Unknown error'}`,
          variant: successfulSegments > 0 ? "default" : "destructive",
          duration: 5000,
        });
      } else if (successCount > 0) {
        toast({
          title: "Audio Generation Complete",
          description: `Successfully generated ${successCount} audio segments`,
          duration: 3000,
        });
      }

      return generatedSegments;
      
    } finally {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, [generateAudioForSegment, toast]);

  /**
   * Simple queue-based sequential audio playback
   */
  const playAllSegments = React.useCallback(async (segments: AudioSegment[]): Promise<void> => {
    console.log(`🎪 Starting playback of ${segments.length} segments`);
    
    const playbackId = Date.now().toString();
    currentPlaybackId.current = playbackId;
    
    setState(prev => ({ 
      ...prev, 
      isPlaying: true,
      currentSegmentIndex: 0
    }));

    const playNextSegment = (index: number): Promise<void> => {
      return new Promise((resolve, reject) => {
        // Check if playback was cancelled
        if (currentPlaybackId.current !== playbackId) {
          console.log('🛑 Playback session cancelled!', {
            currentId: currentPlaybackId.current,
            expectedId: playbackId,
            segmentIndex: index,
            totalSegments: segments.length
          });
          resolve();
          return;
        }

        // Check if we've played all segments
        if (index >= segments.length) {
          console.log('🎉 All segments completed');
          resolve();
          return;
        }

        const segment = segments[index];
        
        if (!segment.audioUrl || segment.error) {
          console.warn(`Skipping segment ${index}: no audio URL or error`);
          // Skip to next segment
          playNextSegment(index + 1).then(resolve).catch(reject);
          return;
        }

        console.log(`🎧 Playing segment ${index + 1}/${segments.length}: "${segment.text.substring(0, 30)}..."`);

        // Create and play audio for this segment
        const audio = new Audio(segment.audioUrl);
        audio.volume = state.isMuted ? 0 : state.volume;
        
        // Update state to show current segment
        setState(prev => ({
          ...prev,
          currentAudio: audio,
          currentSegmentIndex: index,
          segments: prev.segments.map((s, idx) => ({
            ...s,
            isPlaying: idx === index
          }))
        }));
        
        // Store audio reference
        audioRefs.current.set(index, audio);

        // Set up event handlers
        audio.onended = () => {
          console.log(`✅ Segment ${index + 1} completed`);
          
          // Clear playing state for current segment
          setState(prev => ({
            ...prev,
            segments: prev.segments.map(s => ({
              ...s,
              isPlaying: false
            }))
          }));
          
          // Cleanup
          URL.revokeObjectURL(segment.audioUrl!);
          audioRefs.current.delete(index);
          
          // Play next segment
          setTimeout(() => {
            playNextSegment(index + 1).then(resolve).catch(reject);
          }, 100); // Small gap between segments
        };

        audio.onerror = (event) => {
          console.error(`❌ Audio playback failed for segment ${index + 1}:`, event);
          setState(prev => ({
            ...prev,
            segments: prev.segments.map(s => ({
              ...s,
              isPlaying: false
            }))
          }));
          
          // Try to continue with next segment instead of failing completely
          playNextSegment(index + 1).then(resolve).catch(reject);
        };

        // Start playing
        audio.play()
          .then(() => {
            console.log(`▶️ Successfully started segment ${index + 1}`);
          })
          .catch((error) => {
            console.error(`❌ Failed to start segment ${index + 1}:`, error);
            // Try to continue with next segment
            playNextSegment(index + 1).then(resolve).catch(reject);
          });
      });
    };

    try {
      // Start the playback chain
      await playNextSegment(0);
      console.log('🏁 Playback sequence completed');
    } catch (error) {
      console.error('❌ Error in playback sequence:', error);
      toast({
        title: "Playback Error",
        description: error instanceof Error ? error.message : 'Failed to play audio sequence',
        variant: "destructive",
      });
    } finally {
      // Reset state
      setState(prev => ({ 
        ...prev, 
        isPlaying: false, 
        currentSegmentIndex: -1,
        currentAudio: null
      }));
    }
  }, [state.isMuted, state.volume, toast]);

  /**
   * Test audio playback capability
   */
  const testAudioPlayback = React.useCallback(async (): Promise<boolean> => {
    try {
      // Create a simple test audio blob (sine wave)
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const buffer = audioContext.createBuffer(1, audioContext.sampleRate * 0.1, audioContext.sampleRate);
      const data = buffer.getChannelData(0);
      
      // Generate a simple beep
      for (let i = 0; i < data.length; i++) {
        data[i] = Math.sin(2 * Math.PI * 440 * i / audioContext.sampleRate) * 0.1;
      }
      
      // Convert to blob and try to play
      const source = audioContext.createBufferSource();
      source.buffer = buffer;
      source.connect(audioContext.destination);
      
      return new Promise((resolve) => {
        source.onended = () => {
          console.log('✅ Audio test successful - browser can play audio');
          resolve(true);
        };
        
        source.start();
        
        // Timeout after 500ms
        setTimeout(() => {
          console.log('⚠️ Audio test timeout');
          resolve(false);
        }, 500);
      });
    } catch (error) {
      console.error('❌ Audio test failed:', error);
      return false;
    }
  }, []);

  /**
   * Validate and fix segments to ensure proper sentence boundaries
   * Fixes mid-word splits that sometimes occur in AI-generated segments
   */
  const validateAndFixSegments = React.useCallback((segments: NarrationSegment[]): NarrationSegment[] => {
    console.log('🔍 Validating', segments.length, 'narration segments for proper boundaries');
    
    // First, merge any obvious mid-word splits
    const mergedSegments: NarrationSegment[] = [];
    
    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      let text = segment.text.trim();
      
      // Check if this segment starts mid-word
      const startsCleanly = /^[A-Z"'\s\(\[]/.test(text) || text.length === 0;
      
      // Check if previous segment ended mid-word
      const prevSegment = mergedSegments[mergedSegments.length - 1];
      const prevEndsCleanly = !prevSegment || /[.!?"')\]\s\-]$/.test(prevSegment.text.trim());
      
      // If we have a mid-word split, merge with previous segment
      if (!startsCleanly && prevSegment && !prevEndsCleanly) {
        console.log(`🔧 Fixing mid-word split: "${prevSegment.text.slice(-20)}..." + "...${text.slice(0, 20)}"`);
        prevSegment.text = (prevSegment.text + ' ' + text).trim();
        continue;
      }
      
      mergedSegments.push({
        ...segment,
        text
      });
    }
    
    // Now apply sentence segmenter validation to each merged segment
    const finalSegments: NarrationSegment[] = [];
    
    for (const segment of mergedSegments) {
      const text = segment.text.trim();
      if (!text) continue;
      
      // Use SentenceSegmenter to ensure proper sentence boundaries
      const sentences = SentenceSegmenter.splitIntoSentences(text);
      
      if (sentences.length === 1) {
        // Single sentence, keep as is
        finalSegments.push({
          ...segment,
          text: sentences[0]
        });
      } else if (sentences.length > 1) {
        // Multiple sentences - check if they should be split or kept together
        const totalLength = sentences.join(' ').length;
        const isCharacterDialogue = segment.type === 'dialogue' || segment.type === 'character';
        
        if (totalLength <= 250 || isCharacterDialogue) {
          // Keep together if not too long, OR if it's character dialogue (never split dialogue)
          finalSegments.push({
            ...segment,
            text: sentences.join(' ')
          });
        } else {
          // Split into separate segments for better audio pacing (only for narration/DM segments)
          sentences.forEach((sentence, idx) => {
            if (sentence.trim()) {
              finalSegments.push({
                ...segment,
                text: sentence.trim()
              });
            }
          });
        }
      }
    }
    
    const validSegments = finalSegments.filter(segment => segment.text.trim().length > 0);
    
    console.log(`✅ Segment validation complete: ${segments.length} → ${validSegments.length} segments`);
    if (segments.length !== validSegments.length) {
      console.log('📊 Validation changes:', {
        original: segments.map(s => s.text.substring(0, 30) + '...'),
        validated: validSegments.map(s => s.text.substring(0, 30) + '...')
      });
    }
    
    return validSegments;
  }, []);

  /**
   * Process and play pre-segmented narration segments
   */
  const speakSegments = React.useCallback(async (segments: NarrationSegment[]): Promise<void> => {
    if (!state.isVoiceEnabled || segments.length === 0 || state.isProcessing) {
      return;
    }

    // Check if API key is available
    if (!apiKey) {
      toast({
        title: "API Key Missing",
        description: "ElevenLabs API key is not available. Please check your configuration.",
        variant: "destructive",
      });
      return;
    }

    // Set processing flag to prevent concurrent calls
    setState(prev => ({ ...prev, isProcessing: true }));

    try {
      console.log('\n🎭 PROCESSING PRE-SEGMENTED NARRATION:', segments.length, 'segments');
      
      // 🔍 DEBUG: Log original segments before any processing
      console.log('\n📥 ORIGINAL SEGMENTS RECEIVED:');
      segments.forEach((segment, idx) => {
        // ⚠️ VALIDATION: Check for malformed segments
        const validationType = ['narration', 'dialogue', 'action', 'thought', 'dm', 'character'].includes(segment.type);
        const hasText = segment.text && segment.text.trim().length > 0;
        const characterSegmentHasName = segment.type !== 'dialogue' && segment.type !== 'character' || segment.character;
        
        console.log(`  Segment ${idx + 1}:`, {
          type: segment.type,
          character: segment.character,
          voice_category: segment.voice_category,
          text_preview: segment.text.substring(0, 40) + '...',
          text_length: segment.text.length,
          validation: {
            validType: validationType,
            hasText: hasText,
            characterOk: characterSegmentHasName
          }
        });
        
        // Log warnings for malformed segments
        if (!validationType) {
          console.warn(`⚠️ INVALID TYPE: Segment ${idx + 1} has invalid type "${segment.type}"`);
        }
        if (!hasText) {
          console.warn(`⚠️ EMPTY TEXT: Segment ${idx + 1} has empty or missing text`);
        }
        if (!characterSegmentHasName) {
          console.warn(`⚠️ MISSING CHARACTER: Segment ${idx + 1} is character dialogue but missing character name`);
        }
      });
      
      // Validate and fix segments before processing
      const validatedSegments = validateAndFixSegments(segments);
      console.log('\n✅ VALIDATED SEGMENTS:', validatedSegments.length, 'segments after validation');
      
      // 🔍 DEBUG: Log changes from validation
      if (segments.length !== validatedSegments.length) {
        console.log('\n🔧 VALIDATION CHANGES DETECTED:');
        console.log(`  Original count: ${segments.length} → Validated count: ${validatedSegments.length}`);
      }
      
      // Convert NarrationSegments to AudioSegments
      const audioSegments: AudioSegment[] = validatedSegments.map((segment, index): AudioSegment => {
        let voiceConfig: VoiceConfig;
        
        // 🎯 SIMPLIFIED VOICE ASSIGNMENT: Direct logic, no complex type checking
        console.log(`\n🎯 SEGMENT ${index + 1}:`, {
          type: segment.type,
          character: segment.character,
          voice_category: segment.voice_category,
          text: segment.text.substring(0, 60) + '...'
        });
        
        // 🎯 SMART CHARACTER DETECTION WITH FALLBACK
        let effectiveCharacter = segment.character;
        
        // If no character name but segment type suggests dialogue, try to extract from text
        if (!effectiveCharacter && (segment.type === 'dialogue' || segment.type === 'character')) {
          // Look for quoted dialogue patterns that might indicate a character
          const text = segment.text.trim();
          if (text.startsWith('"') && text.includes('"')) {
            // This looks like dialogue - try to infer character from context or use a generic name
            effectiveCharacter = 'speaker'; // Generic fallback for dialogue
            console.log(`🔧 INFERRED CHARACTER: Detected dialogue without character name, using 'speaker' fallback`);
          }
        }
        
        // RULE 1: If segment has a character name (original or inferred), it gets character voice
        if (effectiveCharacter) {
          if (segment.voice_category) {
            // Use specific voice category if provided
            const allVoices = VoiceMapper.getAllVoices();
            voiceConfig = allVoices[segment.voice_category] || VoiceMapper.getVoiceForCharacter(effectiveCharacter);
            console.log(`✅ CHARACTER VOICE: ${voiceConfig.name} via voice_category "${segment.voice_category}" for "${effectiveCharacter}"`);
          } else {
            // Use character name mapping
            voiceConfig = VoiceMapper.getVoiceForCharacter(effectiveCharacter);
            console.log(`✅ CHARACTER VOICE: ${voiceConfig.name} via character name "${effectiveCharacter}"`);
          }
        }
        // RULE 2: No character name = narrator voice
        else {
          voiceConfig = VoiceMapper.getNarratorVoice();
          console.log(`✅ NARRATOR VOICE: ${voiceConfig.name} (no character name)`);
        }
        
        return {
          type: effectiveCharacter ? 'dialogue' : 'narration',
          text: segment.text,
          character: effectiveCharacter || 'Narrator',
          originalText: segment.text,
          startIndex: 0,
          endIndex: segment.text.length,
          voiceConfig,
          isPlaying: false,
          isLoading: false
        };
      });
      
      console.log('🎵 Generated audio segments:', audioSegments.map(seg => 
        `${seg.character}(${seg.voiceConfig.name}): "${seg.text.substring(0, 30)}..."`
      ));
      
      setState(prev => ({ ...prev, segments: audioSegments }));

      if (audioSegments.length === 0) {
        return;
      }

      // Generate audio for all segments
      const generatedSegments = await generateAudio(audioSegments);
      
      // Filter out segments with errors
      const validSegments = generatedSegments.filter(s => s.audioUrl && !s.error);
      
      if (validSegments.length === 0) {
        throw new Error('No valid audio segments generated');
      }

      console.log(`🎵 Generated ${validSegments.length} valid audio segments`);

      // Update state with generated segments containing audioUrls
      setState(prev => ({ 
        ...prev, 
        segments: validSegments 
      }));

      console.log('🎬 Starting segmented playback...');
      // Play all segments
      await playAllSegments(validSegments);
      console.log('🏁 Segmented playback completed');

    } catch (error) {
      console.error('Error in speakSegments:', error);
      toast({
        title: "Voice Error",
        description: error instanceof Error ? error.message : 'Failed to process segmented speech',
        variant: "destructive",
      });
    } finally {
      // Clear processing flag
      setState(prev => ({ ...prev, isProcessing: false }));
    }
  }, [state.isVoiceEnabled, apiKey, generateAudio, playAllSegments, toast]);

  /**
   * Main function to process and play text (legacy support)
   */
  const speakText = React.useCallback(async (text: string): Promise<void> => {
    if (!state.isVoiceEnabled || !text.trim() || state.isProcessing) {
      return;
    }

    // Check if API key is available
    if (!apiKey) {
      toast({
        title: "API Key Missing",
        description: "ElevenLabs API key is not available. Please check your configuration.",
        variant: "destructive",
      });
      return;
    }

    // Set processing flag to prevent concurrent calls
    setState(prev => ({ ...prev, isProcessing: true }));

    try {
      // Parse text into segments
      const segments = parseText(text);
      
      setState(prev => ({ ...prev, segments }));

      if (segments.length === 0) {
        return;
      }

      // Generate audio for all segments
      const generatedSegments = await generateAudio(segments);
      
      // Filter out segments with errors
      const validSegments = generatedSegments.filter(s => s.audioUrl && !s.error);
      
      if (validSegments.length === 0) {
        throw new Error('No valid audio segments generated');
      }

      console.log(`🎵 Generated ${validSegments.length} valid audio segments:`, 
        validSegments.map(s => ({ 
          text: s.text.substring(0, 50), 
          hasAudioUrl: !!s.audioUrl,
          audioUrlLength: s.audioUrl?.length || 0,
          voiceId: s.voiceConfig.id
        })));

      // Update state with generated segments containing audioUrls
      setState(prev => ({ 
        ...prev, 
        segments: validSegments 
      }));

      console.log('🎬 About to start playback...');
      // Play all segments
      await playAllSegments(validSegments);
      console.log('🏁 Playback completed');

    } catch (error) {
      console.error('Error in speakText:', error);
      toast({
        title: "Voice Error",
        description: error instanceof Error ? error.message : 'Failed to process speech',
        variant: "destructive",
      });
    } finally {
      // Clear processing flag
      setState(prev => ({ ...prev, isProcessing: false }));
    }
  }, [state.isVoiceEnabled, apiKey, parseText, generateAudio, playAllSegments, toast]);

  /**
   * Stop current playback
   */
  const stopPlayback = React.useCallback(() => {
    // Invalidate current playback session to prevent interference
    currentPlaybackId.current = null;
    
    // Abort any ongoing requests
    if (abortController.current) {
      abortController.current.abort();
      abortController.current = new AbortController();
    }

    // Stop current audio
    if (state.currentAudio) {
      state.currentAudio.pause();
      state.currentAudio.currentTime = 0;
    }

    // Stop and cleanup next audio if preloaded
    if (state.nextAudio) {
      state.nextAudio.pause();
      state.nextAudio.currentTime = 0;
    }

    // Stop all audio references
    audioRefs.current.forEach(audio => {
      audio.pause();
      audio.currentTime = 0;
    });
    
    // Cleanup audio URLs
    state.segments.forEach(segment => {
      if (segment.audioUrl) {
        URL.revokeObjectURL(segment.audioUrl);
      }
    });

    setState(prev => ({
      ...prev,
      isPlaying: false,
      isProcessing: false,
      currentSegmentIndex: -1,
      currentAudio: null,
      nextAudio: null,
      segments: prev.segments.map(s => ({
        ...s,
        isPlaying: false,
        isLoading: false
      }))
    }));
  }, [state.currentAudio, state.nextAudio, state.segments]);

  /**
   * Volume control
   */
  const setVolume = React.useCallback((volume: number) => {
    const clampedVolume = Math.max(0, Math.min(1, volume));
    
    setState(prev => ({ ...prev, volume: clampedVolume }));
    localStorage.setItem('multi-voice-volume', clampedVolume.toString());

    // Update current audio volume
    if (state.currentAudio) {
      state.currentAudio.volume = state.isMuted ? 0 : clampedVolume;
    }
  }, [state.currentAudio, state.isMuted]);

  /**
   * Mute toggle
   */
  const toggleMute = React.useCallback(() => {
    const newMutedState = !state.isMuted;
    
    setState(prev => ({ ...prev, isMuted: newMutedState }));
    localStorage.setItem('multi-voice-muted', newMutedState.toString());

    // Update current audio volume
    if (state.currentAudio) {
      state.currentAudio.volume = newMutedState ? 0 : state.volume;
    }
  }, [state.isMuted, state.currentAudio, state.volume]);

  /**
   * Voice mode toggle
   */
  const toggleVoiceEnabled = React.useCallback(() => {
    const newVoiceState = !state.isVoiceEnabled;
    
    setState(prev => ({ ...prev, isVoiceEnabled: newVoiceState }));
    localStorage.setItem('multi-voice-enabled', newVoiceState.toString());

    if (!newVoiceState) {
      stopPlayback();
    }

    toast({
      title: newVoiceState ? "Multi-Voice Mode Enabled" : "Multi-Voice Mode Disabled",
      description: newVoiceState 
        ? "Character voices are now active" 
        : "Multi-voice is now disabled",
    });
  }, [state.isVoiceEnabled, stopPlayback, toast]);

  // Cleanup on unmount only - not on re-renders
  React.useEffect(() => {
    return () => {
      // Only cleanup on actual unmount, cancel current playback
      if (currentPlaybackId.current) {
        currentPlaybackId.current = null;
      }
      if (abortController.current) {
        abortController.current.abort();
      }
    };
  }, []); // Empty dependency array - only run on mount/unmount

  return {
    // State
    segments: state.segments,
    currentSegmentIndex: state.currentSegmentIndex,
    isPlaying: state.isPlaying,
    isLoading: state.isLoading,
    isProcessing: state.isProcessing,
    volume: state.volume,
    isMuted: state.isMuted,
    isVoiceEnabled: state.isVoiceEnabled,
    
    // Actions
    speakText, // Legacy text parsing support
    speakSegments, // New pre-segmented narration support
    stopPlayback,
    setVolume,
    toggleMute,
    toggleVoiceEnabled,
    testAudioPlayback, // Debug function
    
    // Utilities
    parseText,
    
    // Voice mapping utilities
    getVoiceForCharacter: VoiceMapper.getVoiceForCharacter,
    getAllVoices: VoiceMapper.getAllVoices,
    getVoiceCategories: VoiceMapper.getVoiceCategories,
  };
};
