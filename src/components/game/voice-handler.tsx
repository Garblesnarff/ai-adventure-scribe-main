import React from 'react';
import { useMessageContext } from '@/contexts/message-context';
import { AudioControls } from './audio-controls';
import { AudioPlayer } from './audio/AudioPlayer';
import { useAudioState } from '@/hooks/use-audio-state';

export const VoiceHandler: React.FC = () => {
  const { messages } = useMessageContext();
  const {
    audioRef,
    apiKey,
    volume,
    isMuted,
    isVoiceEnabled,
    isSpeaking,
    setIsSpeaking,
    handleVolumeChange,
    handleToggleMute,
    handleToggleVoice,
  } = useAudioState();

  const lastMessage = messages[messages.length - 1];
  const shouldSpeak = lastMessage?.sender === 'dm' && lastMessage.text && isVoiceEnabled && apiKey;
  const cleanText = shouldSpeak ? lastMessage.text.replace(/[*_`#]/g, '') : '';

  return (
    <>
      <AudioControls
        isSpeaking={isSpeaking}
        volume={volume}
        onVolumeChange={handleVolumeChange}
        onToggleMute={handleToggleMute}
        isMuted={isMuted}
        isVoiceEnabled={isVoiceEnabled}
        onToggleVoice={handleToggleVoice}
      />
      {shouldSpeak && (
        <AudioPlayer
          text={cleanText}
          apiKey={apiKey}
          audioRef={audioRef}
          volume={volume}
          isMuted={isMuted}
          setIsSpeaking={setIsSpeaking}
        />
      )}
    </>
  );
};
