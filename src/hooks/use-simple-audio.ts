/**
 * Simple Single-Voice Audio Hook
 * 
 * A simplified version that uses just one narrator voice for all content.
 * This is more reliable and cost-effective than the multi-voice system.
 */

import React from 'react';
import { useToast } from './use-toast';
import { supabase } from '@/integrations/supabase/client';

interface SimpleAudioState {
  isPlaying: boolean;
  isLoading: boolean;
  volume: number;
  isMuted: boolean;
  isEnabled: boolean;
  currentAudio: HTMLAudioElement | null;
}

export const useSimpleAudio = () => {
  const { toast } = useToast();
  
  const [state, setState] = React.useState<SimpleAudioState>({
    isPlaying: false,
    isLoading: false,
    volume: 1,
    isMuted: false,
    isEnabled: true,
    currentAudio: null
  });

  const [apiKey, setApiKey] = React.useState<string | null>(null);
  const abortController = React.useRef<AbortController | null>(null);

  // Load settings from localStorage
  React.useEffect(() => {
    const savedVolume = localStorage.getItem('simple-audio-volume');
    const savedMuted = localStorage.getItem('simple-audio-muted');
    const savedEnabled = localStorage.getItem('simple-audio-enabled');

    setState(prev => ({
      ...prev,
      volume: savedVolume ? parseFloat(savedVolume) : 1,
      isMuted: savedMuted === 'true',
      isEnabled: savedEnabled !== 'false'
    }));
  }, []);

  // Fetch API key
  React.useEffect(() => {
    const fetchApiKey = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('get-secret', {
          body: { secretName: 'ELEVEN_LABS_API_KEY' }
        });

        if (error) throw error;
        if (data?.secret) {
          setApiKey(data.secret);
        }
      } catch (error) {
        console.error('Error fetching API key:', error);
        toast({
          title: "API Key Error",
          description: "Failed to retrieve ElevenLabs API key.",
          variant: "destructive",
        });
      }
    };

    fetchApiKey();
  }, [toast]);

  /**
   * Generate and play audio for text
   */
  const speakText = React.useCallback(async (text: string): Promise<void> => {
    if (!state.isEnabled || !text.trim() || !apiKey) {
      return;
    }

    // Stop any current playback
    if (state.currentAudio) {
      state.currentAudio.pause();
      state.currentAudio.currentTime = 0;
    }

    // Abort any ongoing requests
    if (abortController.current) {
      abortController.current.abort();
    }
    abortController.current = new AbortController();

    setState(prev => ({ ...prev, isLoading: true }));

    try {
      console.log('🎵 Generating simple audio for:', text.substring(0, 50) + '...');

      // Use the narrator voice directly
      const VOICE_ID = 'bIHbv24MWmeRgasZH58o'; // Will - narrator voice
      
      const response = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}/stream`,
        {
          method: 'POST',
          headers: {
            'Accept': 'audio/mpeg',
            'Content-Type': 'application/json',
            'xi-api-key': apiKey,
          },
          body: JSON.stringify({
            text: text.replace(/[*_`#]/g, ''), // Clean markdown
            model_id: 'eleven_flash_v2_5', // Cheapest model
            voice_settings: {
              stability: 0.5,
              similarity_boost: 0.75,
              style: 0.1,
              use_speaker_boost: true
            },
          }),
          signal: abortController.current.signal
        }
      );

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const audioBlob = new Blob([arrayBuffer], { type: 'audio/mpeg' });
      const audioUrl = URL.createObjectURL(audioBlob);

      // Create and play audio
      const audio = new Audio(audioUrl);
      audio.volume = state.isMuted ? 0 : state.volume;

      setState(prev => ({ 
        ...prev, 
        currentAudio: audio, 
        isPlaying: true,
        isLoading: false 
      }));

      audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
        setState(prev => ({ 
          ...prev, 
          isPlaying: false, 
          currentAudio: null 
        }));
      };

      audio.onerror = () => {
        URL.revokeObjectURL(audioUrl);
        setState(prev => ({ 
          ...prev, 
          isPlaying: false, 
          currentAudio: null 
        }));
        toast({
          title: "Playback Error",
          description: "Failed to play audio",
          variant: "destructive",
        });
      };

      await audio.play();
      console.log('✅ Simple audio playback started');

    } catch (error) {
      if (error instanceof Error && error.name !== 'AbortError') {
        console.error('Error in simple audio:', error);
        toast({
          title: "Audio Error",
          description: error.message || 'Failed to generate audio',
          variant: "destructive",
        });
      }
    } finally {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, [state.isEnabled, state.currentAudio, state.isMuted, state.volume, apiKey, toast]);

  /**
   * Stop playback
   */
  const stopPlayback = React.useCallback(() => {
    if (abortController.current) {
      abortController.current.abort();
    }

    if (state.currentAudio) {
      state.currentAudio.pause();
      state.currentAudio.currentTime = 0;
    }

    setState(prev => ({
      ...prev,
      isPlaying: false,
      isLoading: false,
      currentAudio: null
    }));
  }, [state.currentAudio]);

  /**
   * Volume control
   */
  const setVolume = React.useCallback((volume: number) => {
    const clampedVolume = Math.max(0, Math.min(1, volume));
    setState(prev => ({ ...prev, volume: clampedVolume }));
    localStorage.setItem('simple-audio-volume', clampedVolume.toString());

    if (state.currentAudio) {
      state.currentAudio.volume = state.isMuted ? 0 : clampedVolume;
    }
  }, [state.currentAudio, state.isMuted]);

  /**
   * Toggle mute
   */
  const toggleMute = React.useCallback(() => {
    const newMutedState = !state.isMuted;
    setState(prev => ({ ...prev, isMuted: newMutedState }));
    localStorage.setItem('simple-audio-muted', newMutedState.toString());

    if (state.currentAudio) {
      state.currentAudio.volume = newMutedState ? 0 : state.volume;
    }
  }, [state.isMuted, state.currentAudio, state.volume]);

  /**
   * Toggle enabled
   */
  const toggleEnabled = React.useCallback(() => {
    const newEnabledState = !state.isEnabled;
    setState(prev => ({ ...prev, isEnabled: newEnabledState }));
    localStorage.setItem('simple-audio-enabled', newEnabledState.toString());

    if (!newEnabledState) {
      stopPlayback();
    }
  }, [state.isEnabled, stopPlayback]);

  return {
    // State
    isPlaying: state.isPlaying,
    isLoading: state.isLoading,
    volume: state.volume,
    isMuted: state.isMuted,
    isEnabled: state.isEnabled,
    
    // Actions
    speakText,
    stopPlayback,
    setVolume,
    toggleMute,
    toggleEnabled,
  };
};