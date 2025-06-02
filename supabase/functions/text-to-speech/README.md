# Text-to-Speech (TTS) Edge Function

## Purpose

This Supabase Edge Function is responsible for converting text input into audible speech. It likely integrates with a third-party Text-to-Speech (TTS) service (e.g., Google Cloud TTS, Amazon Polly, ElevenLabs) to generate audio data, which can then be played back on the client-side for features like AI DM narration or character dialogue.

## Structure and Important Files

- **`index.ts`**: The main Deno server entry point. It receives text to be synthesized, voice preferences (optional), calls the TTS service, and returns the audio data (or a URL to the audio data).
- **(Potentially) `ttsClient.ts` or similar**: A module to encapsulate the interaction logic with the specific third-party TTS service being used. This would handle API requests, authentication, and response processing for that service.
- **(Potentially) `types.ts`**: Defines TypeScript types for the input (e.g., text, voice ID, language code, speaking rate) and output (e.g., audio content as base64, URL to audio file, error messages).

## How Components Interact

1.  The client-side application (e.g., `VoiceHandler.tsx` or `AudioControls.tsx` in `src/components/game/`) invokes this Edge Function when it needs to convert a piece of text (like a DM's narrative or an NPC's dialogue) into speech.
2.  The payload to the function includes the `text` to synthesize and optionally parameters like `voiceId`, `languageCode`, `speakingRate`, `pitch`, etc.
3.  `index.ts` receives the request.
4.  It (or a `ttsClient.ts`) makes an API call to the chosen third-party TTS service, passing the text and any specified parameters. The API key for the TTS service is retrieved securely (e.g., from Deno environment variables via `get-secret` or directly).
5.  The TTS service processes the text and returns audio data. This could be raw audio bytes, a base64 encoded string, or a URL to a generated audio file (e.g., if the TTS service offers to host it temporarily).
6.  `index.ts` receives this audio data/URL and returns it to the client.
7.  The client-side application then uses this data to play the audio using browser audio APIs (e.g., `AudioContext`, `<audio>` element).

## Usage Example (Client-side invocation)

```typescript
// Conceptual example from a client-side audio handler:
import { supabase } from '@/integrations/supabase/client';

async function synthesizeSpeech(textToSpeak: string, voiceId?: string) {
  const payload: any = { text: textToSpeak };
  if (voiceId) {
    payload.voice = voiceId; // Assuming the TTS service supports voice selection
  }

  const { data, error } = await supabase.functions.invoke('text-to-speech', {
    body: payload
  });

  if (error) {
    console.error("Error synthesizing speech:", error);
    return null;
  }
  // data might be { audioContent: "base64encodedstring...", format: "mp3" }
  // or { audioUrl: "https://path.to/audio.mp3" }
  return data;
}

// // Example usage:
// const dmNarration = "The dragon roars, and fire engulfs the chamber!";
// const audioInfo = await synthesizeSpeech(dmNarration);
// if (audioInfo && audioInfo.audioContent) {
//   // Play audioContent using browser audio API
//   const audio = new Audio(`data:audio/mp3;base64,${audioInfo.audioContent}`);
//   audio.play();
// }
```

## Notes

- Choice of TTS provider will affect voice quality, cost, and available features (e.g., voice cloning, emotional intonation).
- API key management for the TTS service is critical.
- Consider caching strategies for frequently requested phrases to reduce API calls and latency, though this adds complexity.
- The format of the returned audio data (e.g., MP3, WAV, Opus) needs to be handled correctly by the client.
- See the main `/supabase/functions/README.md` for the overall Edge Functions architecture.
