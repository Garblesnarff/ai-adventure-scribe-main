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

  /**
   * Parse text into dialogue segments
   */
  const parseText = React.useCallback((text: string): AudioSegment[] => {
    const dialogueSegments = DialogueParser.parseText(text);
    const optimizedSegments = DialogueParser.optimizeSegments(dialogueSegments);
    
    return optimizedSegments.map(segment => {
      const voiceConfig = segment.type === 'narration' 
        ? VoiceMapper.getNarratorVoice()
        : VoiceMapper.getVoiceForCharacter(segment.character || 'unknown');

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
   * Play all segments sequentially with gapless transitions
   */
  const playAllSegments = React.useCallback(async (segments: AudioSegment[]): Promise<void> => {
    console.log(`🎪 Starting playback of ${segments.length} segments`);
    
    const playbackId = Date.now().toString();
    currentPlaybackId.current = playbackId;
    setState(prev => ({ 
      ...prev, 
      isPlaying: true
    }));

    try {
      // Pre-create all audio elements to maintain user interaction context
      const audioElements = new Map<number, HTMLAudioElement>();
      
      // Create audio elements for all segments upfront
      for (let i = 0; i < segments.length; i++) {
        const segment = segments[i];
        if (segment.audioUrl && !segment.error) {
          const audio = new Audio(segment.audioUrl);
          audio.volume = state.isMuted ? 0 : state.volume;
          audio.preload = 'auto';
          audioElements.set(i, audio);
        }
      }

      // Now play each segment sequentially
      for (let i = 0; i < segments.length; i++) {
        const segment = segments[i];
        
        // Check if this playback session is still active
        if (currentPlaybackId.current !== playbackId) {
          console.log('Playback session cancelled');
          break;
        }
        
        if (!segment.audioUrl || segment.error) {
          console.warn(`Skipping segment ${i}: no audio URL or error`);
          continue;
        }

        const currentAudio = audioElements.get(i);
        if (!currentAudio) {
          console.warn(`No audio element for segment ${i}`);
          continue;
        }

        console.log(`🎧 Playing segment ${i + 1}/${segments.length}: "${segment.text.substring(0, 30)}..." (${segment.character || 'Narrator'})`);

        try {
          // Update state to show current segment
          setState(prev => ({
            ...prev,
            currentAudio,
            currentSegmentIndex: i,
            segments: prev.segments.map((s, idx) => ({
              ...s,
              isPlaying: idx === i
            }))
          }));

          // Store audio reference
          audioRefs.current.set(i, currentAudio);

          // Play current segment and wait for completion
          await new Promise<void>((resolve, reject) => {
            currentAudio.onended = () => {
              // Clear playing state for current segment
              setState(prev => ({
                ...prev,
                segments: prev.segments.map(s => ({
                  ...s,
                  isPlaying: false
                }))
              }));
              
              // Cleanup audio URL and reference
              URL.revokeObjectURL(segment.audioUrl!);
              audioRefs.current.delete(i);
              
              // Small delay to ensure smooth transition
              setTimeout(resolve, 50);
            };
            
            currentAudio.onerror = (event) => {
              console.error(`Audio playback failed for segment ${i}:`, event);
              setState(prev => ({
                ...prev,
                isPlaying: false,
                segments: prev.segments.map(s => ({
                  ...s,
                  isPlaying: false
                }))
              }));
              reject(new Error(`Audio playback failed for segment ${i}`));
            };

            // Attempt to play - this should work since we're in user interaction context
            currentAudio.play()
              .then(() => {
                console.log(`✅ Successfully started playing segment ${i + 1}`);
              })
              .catch((playError) => {
                console.error(`Failed to start playing segment ${i + 1}:`, playError);
                reject(playError);
              });
          });

        } catch (segmentError) {
          console.warn(`Failed to play segment ${i}:`, segmentError);
          // Continue to next segment instead of stopping
          continue;
        }
      }

      console.log('🎉 Finished playing all segments');

    } catch (error) {
      // Only log non-abort errors
      if (!(error instanceof Error) || error.name !== 'AbortError') {
        console.error('Error playing segments:', error);
        toast({
          title: "Playback Error",
          description: error instanceof Error ? error.message : 'Failed to play audio',
          variant: "destructive",
        });
      }
    } finally {
      setState(prev => ({ 
        ...prev, 
        isPlaying: false, 
        currentSegmentIndex: -1,
        currentAudio: null,
        nextAudio: null
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
   * Main function to process and play text
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

  // Cleanup on unmount - but only if we're actually unmounting, not just re-rendering
  React.useEffect(() => {
    return () => {
      // Only stop if we're not in the middle of generating audio
      if (!state.isLoading) {
        stopPlayback();
      }
    };
  }, [stopPlayback, state.isLoading]);

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
    speakText,
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