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

  // Audio management
  const currentAudio = React.useRef<HTMLAudioElement | null>(null);
  const processQueue = React.useRef<VoiceSegment[]>([]);
  const isProcessingQueue = React.useRef<boolean>(false);
  const abortController = React.useRef<AbortController | null>(null);

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
          console.log('✅ Retrieved ElevenLabs API key for progressive voice');
          setApiKey(data.secret);
        } else {
          throw new Error('ElevenLabs API key is empty');
        }
      } catch (error) {
        console.error('❌ Error fetching API key for progressive voice:', error);
        toast({
          title: "API Key Error",
          description: "Failed to retrieve ElevenLabs API key. Please check your configuration.",
          variant: "destructive",
        });
      }
    };

    fetchApiKey();
  }, [toast]);

  /**
   * Main function: Process and play AI segments
   */
  const speakAISegments = React.useCallback(async (aiSegments: AISegment[]): Promise<void> => {
    if (!state.isVoiceEnabled || !aiSegments?.length || state.isProcessing) {
      console.log('🚫 Voice not enabled, no segments, or already processing');
      return;
    }

    if (!apiKey) {
      toast({
        title: "API Key Missing",
        description: "ElevenLabs API key is not available. Please check your configuration.",
        variant: "destructive",
      });
      return;
    }

    console.log('🎭 Progressive Voice: Starting to process', aiSegments.length, 'AI segments');

    // Abort any ongoing processing
    if (abortController.current) {
      abortController.current.abort();
    }
    abortController.current = new AbortController();

    // Stop current audio
    stopPlayback();

    setState(prev => ({ ...prev, isProcessing: true, error: undefined }));

    try {
      // Step 1: Convert AI segments to voice segments using VoiceDirector
      const validatedSegments = VoiceDirector.validateAISegments(aiSegments);
      const voiceSegments = VoiceDirector.processAISegments(validatedSegments);

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
  }, [state.isVoiceEnabled, state.isProcessing, apiKey, toast]);

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
        console.log('🛑 Processing aborted');
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
        const segmentWithAudio = await VoiceDirector.generateAudio(segment, apiKey!);
        
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
   * Play a single audio segment
   */
  const playAudioSegment = (segment: VoiceSegment, index: number): Promise<void> => {
    return new Promise((resolve) => {
      if (!segment.audioUrl) {
        resolve();
        return;
      }

      console.log(`▶️ Playing segment ${index + 1}: ${segment.character}`);

      const audio = new Audio(segment.audioUrl);
      audio.volume = state.isMuted ? 0 : state.volume;
      currentAudio.current = audio;

      // Update segment playing state
      setState(prev => ({
        ...prev,
        segments: prev.segments.map((s, idx) => ({
          ...s,
          isPlaying: idx === index
        }))
      }));

      audio.onended = () => {
        console.log(`✅ Segment ${index + 1} finished playing`);
        
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

      audio.onerror = (error) => {
        console.error(`❌ Audio playback error for segment ${index + 1}:`, error);
        resolve(); // Continue with next segment
      };

      // Start playing
      audio.play().catch((error) => {
        console.error(`❌ Failed to start playing segment ${index + 1}:`, error);
        resolve(); // Continue with next segment
      });
    });
  };

  /**
   * Stop current playback
   */
  const stopPlayback = React.useCallback(() => {
    console.log('🛑 Stopping progressive voice playback');

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
    
    // Actions
    speakAISegments, // Main function for AI-generated segments
    speakPlainText,  // Fallback for plain text
    stopPlayback,
    setVolume,
    toggleMute,
    toggleVoiceEnabled,
    
    // Voice management utilities
    getCharacterVoiceMappings: VoiceDirector.getCharacterVoiceMappings,
    clearCharacterVoiceMappings: VoiceDirector.clearCharacterVoiceMappings,
    getAvailableVoiceCategories: VoiceDirector.getAvailableVoiceCategories,
  };
};