import React from 'react';

import { useToast } from '@/hooks/use-toast';
import logger from '@/lib/logger';
import { handleAsyncError } from '@/utils/error-handler';

interface VoiceSettings {
  stability: number;
  similarity_boost: number;
}

interface AudioPlayerProps {
  text: string;
  apiKey: string;
  audioRef: React.MutableRefObject<HTMLAudioElement | null>;
  volume: number;
  isMuted: boolean;
  setIsSpeaking: (speaking: boolean) => void;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({
  text,
  apiKey,
  audioRef,
  volume,
  isMuted,
  setIsSpeaking,
}) => {
  const { toast } = useToast();

  const playAudio = async () => {
    try {
      setIsSpeaking(true);

      const VOICE_ID = 'T0GKiSwCb51L7pv1sshd';
      const API_URL = 'https://api.elevenlabs.io/v1/text-to-speech';

      const voiceSettings: VoiceSettings = {
        stability: 0.5,
        similarity_boost: 0.75,
      };

      const response = await fetch(`${API_URL}/${VOICE_ID}/stream`, {
        method: 'POST',
        headers: {
          Accept: 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': apiKey,
        },
        body: JSON.stringify({
          text,
          voice_settings: voiceSettings,
          model_id: 'eleven_turbo_v2_5',
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error('ElevenLabs API error:', errorText);
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const blob = new Blob([arrayBuffer], { type: 'audio/mpeg' });
      const url = URL.createObjectURL(blob);

      const audio = new Audio();
      audio.src = url;
      audio.volume = volume;
      audio.muted = isMuted;

      try {
        await audio.play();
        if (audioRef) {
          audioRef.current = audio;
        }
      } catch (playError) {
        handleAsyncError(playError, {
          userMessage: 'Failed to play audio',
          logLevel: 'warn',
          showToast: false,
          context: { location: 'AudioPlayer.playAudio.play' },
        });
        throw new Error('Failed to play audio');
      }

      audio.onended = () => {
        URL.revokeObjectURL(url);
        setIsSpeaking(false);
        if (audioRef && audioRef.current === audio) {
          audioRef.current = null;
        }
      };
    } catch (error) {
      setIsSpeaking(false);
      handleAsyncError(error, {
        userMessage: 'Voice Error',
        context: { location: 'AudioPlayer.playAudio', textLength: text.length },
        onError: () => {
          // Use the legacy toast for consistency with existing UI
          toast({
            title: 'Voice Error',
            description: error instanceof Error ? error.message : 'Failed to process voice',
            variant: 'destructive',
          });
        },
      });
    }
  };

  React.useEffect(() => {
    if (text) {
      playAudio();
    }
  }, [text]);

  return null;
};
