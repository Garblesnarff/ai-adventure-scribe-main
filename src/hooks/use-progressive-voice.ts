/**
 * Progressive Voice Hook
 * 
 * Simplified voice synthesis with progressive audio generation and playback.
 * Replaces the complex useMultiVoice hook with a cleaner, more reliable approach.
 * 
 * Key features:
 * - Progressive generation: Generate and play audio segments one at a time
 * - Single processing path: No complex parsing, just AI segments -> VoiceDirector -> Audio
 * - Robust fallbacks: Every step has error recovery
 * - Fast feedback: Audio starts playing immediately
 * 
 * @author AI Dungeon Master Team
 */

import React from 'react';
import { VoiceDirector, VoiceSegment, AISegment } from '@/services/voice-director';
import { useToast } from './use-toast';
import { supabase } from '@/integrations/supabase/client';

export interface ProgressiveVoiceState {
  segments: VoiceSegment[];
  currentSegmentIndex: number;
  isPlaying: boolean;
  isProcessing: boolean;
  volume: number;
  isMuted: boolean;
  isVoiceEnabled: boolean;
  error?: string;
}

export const useProgressiveVoice = () => {
  const { toast } = useToast();
  
  // State
  const [state, setState] = React.useState<ProgressiveVoiceState>({
    segments: [],
    currentSegmentIndex: -1,
    isPlaying: false,
    isProcessing: false,
    volume: 1,
    isMuted: false,
    isVoiceEnabled: true
  });

  // API key state
  const [apiKey, setApiKey] = React.useState<string | null>(null);
  const apiKeyRef = React.useRef<string | null>(null);
  
  // Update ref when apiKey changes
  React.useEffect(() => {
    apiKeyRef.current = apiKey;
  }, [apiKey]);

  // Audio management
  const currentAudio = React.useRef<HTMLAudioElement | null>(null);
  const preCreatedAudio = React.useRef<HTMLAudioElement | null>(null);
  const processQueue = React.useRef<VoiceSegment[]>([]);
  const isProcessingQueue = React.useRef<boolean>(false);
  const abortController = React.useRef<AbortController | null>(null);
  
  /**
   * Initialize audio context during user interaction for browser autoplay compliance
   */
  const initializeAudioContext = React.useCallback(() => {
    console.log('🎵 Initializing audio context during user interaction');
    
    if (!preCreatedAudio.current) {
      preCreatedAudio.current = new Audio();
      preCreatedAudio.current.volume = state.isMuted ? 0 : state.volume;
      console.log('✅ Pre-created audio element during user interaction');
    }
    
    return preCreatedAudio.current;
  }, [state.isMuted, state.volume]);

  // Load settings from localStorage
  React.useEffect(() => {
    const savedVolume = localStorage.getItem('progressive-voice-volume');
    const savedMuted = localStorage.getItem('progressive-voice-muted');
    const savedEnabled = localStorage.getItem('progressive-voice-enabled');

    setState(prev => ({
      ...prev,
      volume: savedVolume ? parseFloat(savedVolume) : 1,
      isMuted: savedMuted === 'true',
      isVoiceEnabled: savedEnabled !== 'false'
    }));
  }, []);

  // Fetch API key from Supabase secrets or environment
  React.useEffect(() => {
    const fetchApiKey = async () => {
      try {
        console.log('🔑 Attempting to retrieve ElevenLabs API key...');
        
        // Try environment variable first (for development)
        const envApiKey = import.meta.env.VITE_ELEVENLABS_API_KEY;
        console.log('📝 Environment check:', {
          hasEnvKey: !!envApiKey,
          keyLength: envApiKey ? envApiKey.length : 0,
          keyPrefix: envApiKey ? envApiKey.substring(0, 10) + '...' : 'N/A'
        });
        
        if (envApiKey) {
          console.log('✅ Using ElevenLabs API key from environment variable');
          setApiKey(envApiKey);
          apiKeyRef.current = envApiKey; // Set ref immediately
          return;
        }
        
        console.log('🔄 No environment variable found, trying Supabase edge function...');
        
        // Fallback to Supabase edge function (for production)
        const { data, error } = await supabase.functions.invoke('get-secret', {
          body: { secretName: 'ELEVEN_LABS_API_KEY' }
        });

        if (error) {
          console.error('❌ Error calling get-secret function:', error);
          throw new Error(`Failed to call get-secret: ${error.message}`);
        }

        if (data?.secret) {
          console.log('✅ Retrieved ElevenLabs API key from Supabase secrets');
          setApiKey(data.secret);
          apiKeyRef.current = data.secret; // Set ref immediately
        } else {
          console.error('❌ Empty response from get-secret function:', data);
          throw new Error('ElevenLabs API key is empty or not found');
        }
      } catch (error) {
        console.error('❌ Error fetching API key for progressive voice:', error);
        
        // Show detailed error message
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        toast({
          title: "API Key Configuration Error",
          description: `Failed to retrieve ElevenLabs API key: ${errorMessage}. Check console for details.`,
          variant: "destructive",
        });
        
        // Set error state
        setState(prev => ({ ...prev, error: `API Key Error: ${errorMessage}` }));
      }
    };

    fetchApiKey();
  }, [toast]);

  /**
   * Main function: Process and play AI segments
   */
  const speakAISegments = React.useCallback(async (aiSegments: AISegment[]): Promise<void> => {
    console.log('🎭 Progressive Voice: speakAISegments called with:', {
      segmentCount: aiSegments?.length || 0,
      isVoiceEnabled: state.isVoiceEnabled,
      isProcessing: state.isProcessing,
      hasApiKey: !!apiKey,
      hasApiKeyRef: !!apiKeyRef.current,
      apiKeyLength: apiKey?.length || 0,
      apiKeyRefLength: apiKeyRef.current?.length || 0
    });

    if (!state.isVoiceEnabled || !aiSegments?.length || state.isProcessing) {
      console.log('🚫 Voice not enabled, no segments, or already processing');
      return;
    }

    // Wait for API key if it's not available yet (max 3 seconds)
    const currentApiKey = apiKeyRef.current;
    if (!currentApiKey) {
      console.log('⏳ API key not ready, waiting...');
      
      let attempts = 0;
      const maxAttempts = 30; // 3 seconds at 100ms intervals
      
      while (!apiKeyRef.current && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
      }
      
      if (!apiKeyRef.current) {
        console.error('❌ API key is still missing after waiting');
        setState(prev => ({ ...prev, error: 'API key timeout - could not retrieve ElevenLabs API key' }));
        toast({
          title: "API Key Timeout",
          description: "ElevenLabs API key could not be retrieved. Please check your configuration.",
          variant: "destructive",
        });
        return;
      }
      
      console.log('✅ API key is now available after waiting');
    }

    console.log('🎭 Progressive Voice: Starting to process', aiSegments.length, 'AI segments');

    // Abort any ongoing processing
    if (abortController.current) {
      console.log('⚠️ Aborting previous audio processing');
      abortController.current.abort();
    }
    abortController.current = new AbortController();
    console.log('🆕 Created new abort controller for audio processing');

    // Stop current audio only if actually playing or processing
    if (state.isPlaying || currentAudio.current) {
      console.log('🛑 Stopping current audio before starting new segments');
      stopPlayback();
    }
    
    // SIMPLIFIED: Initialize audio context during user interaction to comply with browser autoplay policies
    const initializedAudio = initializeAudioContext();
    if (initializedAudio) {
      console.log('✅ Audio element ready for playback');
    }

    setState(prev => ({ ...prev, isProcessing: true, error: undefined }));

    try {
      // Step 1: Convert AI segments to voice segments using VoiceDirector
      const validatedSegments = VoiceDirector.validateAISegments(aiSegments);
      console.log('📝 Validated segments:', validatedSegments.length);
      
      const voiceSegments = VoiceDirector.processAISegments(validatedSegments);
      console.log('🎵 Voice segments created:', voiceSegments.length);

      if (voiceSegments.length === 0) {
        throw new Error('No valid voice segments created');
      }

      // Step 2: Update state with voice segments
      setState(prev => ({ 
        ...prev, 
        segments: voiceSegments,
        currentSegmentIndex: 0
      }));

      // Step 3: Start progressive generation and playback
      await processSegmentsProgressively(voiceSegments);

    } catch (error) {
      console.error('❌ Error in speakAISegments:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to process voice segments';
      
      setState(prev => ({ 
        ...prev, 
        error: errorMessage,
        isProcessing: false 
      }));
      
      toast({
        title: "Voice Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  }, [state.isVoiceEnabled, state.isProcessing, toast]); // Removed apiKey from dependency array

  /**
   * Fallback: Process plain text when AI segments aren't available
   */
  const speakPlainText = React.useCallback(async (text: string): Promise<void> => {
    if (!state.isVoiceEnabled || !text?.trim() || state.isProcessing) {
      return;
    }

    console.log('📝 Progressive Voice: Processing plain text as fallback');

    const voiceSegments = VoiceDirector.processPlainText(text);
    if (voiceSegments.length === 0) {
      return;
    }

    // Use the AI segments path for consistency
    await speakAISegments([{
      type: 'dm',
      text: text,
      character: undefined,
      voice_category: undefined
    }]);
  }, [state.isVoiceEnabled, state.isProcessing, speakAISegments]);

  /**
   * Progressive generation and playback
   */
  const processSegmentsProgressively = async (segments: VoiceSegment[]): Promise<void> => {
    console.log('🎪 Starting progressive processing of', segments.length, 'segments');

    setState(prev => ({ ...prev, isPlaying: true }));

    for (let i = 0; i < segments.length; i++) {
      // Check if we should abort
      if (abortController.current?.signal.aborted) {
        console.log('🛑 Processing aborted at segment', i + 1, 'due to abort signal');
        break;
      }

      const segment = segments[i];
      
      try {
        console.log(`🎵 Processing segment ${i + 1}/${segments.length}: ${segment.character}`);

        // Update current segment index
        setState(prev => ({
          ...prev,
          currentSegmentIndex: i,
          segments: prev.segments.map((s, idx) => 
            idx === i ? { ...s, isGenerating: true } : s
          )
        }));

        // Generate audio for this segment
        const segmentWithAudio = await VoiceDirector.generateAudio(segment, apiKeyRef.current!);
        
        // Update segment with audio
        setState(prev => ({
          ...prev,
          segments: prev.segments.map((s, idx) => 
            idx === i ? segmentWithAudio : s
          )
        }));

        // If generation failed, log and continue
        if (segmentWithAudio.error) {
          console.warn(`⚠️ Audio generation failed for segment ${i + 1}:`, segmentWithAudio.error);
          continue;
        }

        // Play the audio
        if (segmentWithAudio.audioUrl) {
          await playAudioSegment(segmentWithAudio, i);
        }

      } catch (error) {
        console.error(`❌ Error processing segment ${i + 1}:`, error);
        // Continue with next segment
        continue;
      }
    }

    // Playback complete
    setState(prev => ({ 
      ...prev, 
      isPlaying: false, 
      isProcessing: false,
      currentSegmentIndex: -1
    }));

    console.log('🏁 Progressive processing complete');
  };

  /**
   * Play a single audio segment with proper browser policy compliance
   */
  const playAudioSegment = (segment: VoiceSegment, index: number): Promise<void> => {
    return new Promise((resolve) => {
      if (!segment.audioUrl) {
        console.warn(`⚠️ No audio URL for segment ${index + 1}`);
        resolve();
        return;
      }

      console.log(`▶️ Playing segment ${index + 1}: ${segment.character} - "${segment.text.substring(0, 50)}..."`);

      // Use pre-created audio element if available, otherwise create new one
      const audio = preCreatedAudio.current || new Audio();
      preCreatedAudio.current = null; // Reset for next use
      
      // Set up all event handlers before setting src to avoid race conditions
      const onLoadedData = () => {
        console.log(`📦 Audio loaded for segment ${index + 1}`);
        audio.volume = state.isMuted ? 0 : state.volume;
        currentAudio.current = audio;
        
        // Start playing immediately after load
        audio.play().then(() => {
          console.log(`🎵 Successfully started playing segment ${index + 1}`);
        }).catch((playError) => {
          console.error(`❌ Failed to start playing segment ${index + 1}:`, playError);
          console.error('Audio play error details:', {
            audioUrl: segment.audioUrl,
            userVolume: state.volume,
            isMuted: state.isMuted,
            finalVolume: state.isMuted ? 0 : state.volume,
            audioReadyState: audio.readyState,
            audioNetworkState: audio.networkState,
            audioError: audio.error
          });
          resolve(); // Continue with next segment
        });
      };
      
      const onEnded = () => {
        console.log(`✅ Segment ${index + 1} finished playing`);
        
        // Clean up event listeners
        audio.removeEventListener('loadeddata', onLoadedData);
        audio.removeEventListener('ended', onEnded);
        audio.removeEventListener('error', onError);
        audio.removeEventListener('abort', onAbort);
        
        // Clean up
        URL.revokeObjectURL(segment.audioUrl!);
        currentAudio.current = null;
        
        // Clear playing state
        setState(prev => ({
          ...prev,
          segments: prev.segments.map(s => ({ ...s, isPlaying: false }))
        }));
        
        resolve();
      };

      const onError = (error: Event) => {
        console.error(`❌ Audio error for segment ${index + 1}:`, error);
        // Clean up event listeners
        audio.removeEventListener('loadeddata', onLoadedData);
        audio.removeEventListener('ended', onEnded);
        audio.removeEventListener('error', onError);
        audio.removeEventListener('abort', onAbort);
        resolve(); // Continue with next segment
      };
      
      const onAbort = () => {
        console.log(`🛑 Audio aborted for segment ${index + 1}`);
        // Clean up event listeners
        audio.removeEventListener('loadeddata', onLoadedData);
        audio.removeEventListener('ended', onEnded);
        audio.removeEventListener('error', onError);
        audio.removeEventListener('abort', onAbort);
        resolve();
      };
      
      // Attach event listeners
      audio.addEventListener('loadeddata', onLoadedData);
      audio.addEventListener('ended', onEnded);
      audio.addEventListener('error', onError);
      audio.addEventListener('abort', onAbort);

      // Update segment playing state
      setState(prev => ({
        ...prev,
        segments: prev.segments.map((s, idx) => ({
          ...s,
          isPlaying: idx === index
        }))
      }));
      
      // Set the audio source last to trigger loading
      audio.src = segment.audioUrl;
      audio.load(); // Explicitly load the audio
    });
  };

  /**
   * Stop current playback
   */
  const stopPlayback = React.useCallback(() => {
    console.log('🛑 Stopping progressive voice playback');
    console.trace('🔍 stopPlayback called from:'); // Add stack trace

    // Stop current audio
    if (currentAudio.current) {
      currentAudio.current.pause();
      currentAudio.current.currentTime = 0;
      currentAudio.current = null;
    }

    // Abort any ongoing processing
    if (abortController.current) {
      abortController.current.abort();
    }

    // Clean up audio URLs
    state.segments.forEach(segment => {
      if (segment.audioUrl) {
        URL.revokeObjectURL(segment.audioUrl);
      }
    });

    // Reset state
    setState(prev => ({
      ...prev,
      isPlaying: false,
      isProcessing: false,
      currentSegmentIndex: -1,
      segments: []
    }));
  }, [state.segments]);

  /**
   * Volume control
   */
  const setVolume = React.useCallback((volume: number) => {
    const clampedVolume = Math.max(0, Math.min(1, volume));
    
    setState(prev => ({ ...prev, volume: clampedVolume }));
    localStorage.setItem('progressive-voice-volume', clampedVolume.toString());

    // Update current audio volume
    if (currentAudio.current) {
      currentAudio.current.volume = state.isMuted ? 0 : clampedVolume;
    }
  }, [state.isMuted]);

  /**
   * Mute toggle
   */
  const toggleMute = React.useCallback(() => {
    const newMutedState = !state.isMuted;
    
    setState(prev => ({ ...prev, isMuted: newMutedState }));
    localStorage.setItem('progressive-voice-muted', newMutedState.toString());

    // Update current audio volume
    if (currentAudio.current) {
      currentAudio.current.volume = newMutedState ? 0 : state.volume;
    }
  }, [state.isMuted, state.volume]);

  /**
   * Voice mode toggle
   */
  const toggleVoiceEnabled = React.useCallback(() => {
    const newVoiceState = !state.isVoiceEnabled;
    
    setState(prev => ({ ...prev, isVoiceEnabled: newVoiceState }));
    localStorage.setItem('progressive-voice-enabled', newVoiceState.toString());

    if (!newVoiceState) {
      stopPlayback();
    }

    toast({
      title: newVoiceState ? "Progressive Voice Enabled" : "Progressive Voice Disabled",
      description: newVoiceState 
        ? "Character voices are now active with progressive generation" 
        : "Progressive voice is now disabled",
    });
  }, [state.isVoiceEnabled, stopPlayback, toast]);

  /**
   * Manual API key retry function
   */
  const retryApiKeyFetch = React.useCallback(async () => {
    console.log('🔄 Manually retrying API key fetch...');
    setApiKey(null);
    setState(prev => ({ ...prev, error: undefined }));
    
    try {
      // Try environment variable first (for development)
      const envApiKey = import.meta.env.VITE_ELEVENLABS_API_KEY;
      if (envApiKey) {
        console.log('✅ Using ElevenLabs API key from environment variable');
        setApiKey(envApiKey);
        apiKeyRef.current = envApiKey; // Set ref immediately
        toast({
          title: "API Key Retrieved",
          description: "ElevenLabs API key loaded from environment variable.",
        });
        return;
      }
      
      // Fallback to Supabase edge function (for production)
      const { data, error } = await supabase.functions.invoke('get-secret', {
        body: { secretName: 'ELEVEN_LABS_API_KEY' }
      });

      if (error) {
        throw new Error(`Failed to call get-secret: ${error.message}`);
      }

      if (data?.secret) {
        console.log('✅ Retrieved ElevenLabs API key from Supabase secrets');
        setApiKey(data.secret);
        apiKeyRef.current = data.secret; // Set ref immediately
        toast({
          title: "API Key Retrieved",
          description: "ElevenLabs API key loaded from Supabase secrets.",
        });
      } else {
        throw new Error('ElevenLabs API key is empty or not found');
      }
    } catch (error) {
      console.error('❌ Error in manual API key retry:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setState(prev => ({ ...prev, error: `API Key Error: ${errorMessage}` }));
      toast({
        title: "API Key Error",
        description: `Still unable to retrieve API key: ${errorMessage}`,
        variant: "destructive",
      });
    }
  }, [toast]);

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      if (abortController.current) {
        abortController.current.abort();
      }
      stopPlayback();
    };
  }, []); // Empty dependency array - only run on mount/unmount

  return {
    // State
    segments: state.segments,
    currentSegmentIndex: state.currentSegmentIndex,
    isPlaying: state.isPlaying,
    isProcessing: state.isProcessing,
    volume: state.volume,
    isMuted: state.isMuted,
    isVoiceEnabled: state.isVoiceEnabled,
    error: state.error,
    apiKey, // Expose API key state for debugging
    
    // Actions
    speakAISegments, // Main function for AI-generated segments
    speakPlainText,  // Fallback for plain text
    stopPlayback,
    setVolume,
    toggleMute,
    toggleVoiceEnabled,
    retryApiKeyFetch, // Manual API key retry
    
    // Voice management utilities
    getCharacterVoiceMappings: VoiceDirector.getCharacterVoiceMappings,
    clearCharacterVoiceMappings: VoiceDirector.clearCharacterVoiceMappings,
    getAvailableVoiceCategories: VoiceDirector.getAvailableVoiceCategories,
    initializeAudioContext, // Initialize audio context during user interaction
    
    // Audio cache management
    clearAudioCache: VoiceDirector.clearAudioCache,
    getAudioCacheStats: VoiceDirector.getAudioCacheStats,
  };
};