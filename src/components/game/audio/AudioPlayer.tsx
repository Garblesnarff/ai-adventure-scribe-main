import React from 'react';
import { useToast } from '@/hooks/use-toast';

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

      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000';

      const response = await fetch(
        `${apiUrl}/v1/ai/text-to-speech`,
        {
          method: 'POST',
          headers: {
            'Accept': 'audio/mpeg',
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
          },
          body: JSON.stringify({
            text,
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('ElevenLabs API error:', errorText);
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
        console.error('Error playing audio:', playError);
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
      console.error('Voice error:', error);
      setIsSpeaking(false);
      toast({
        title: "Voice Error",
        description: error instanceof Error ? error.message : 'Failed to process voice',
        variant: "destructive",
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