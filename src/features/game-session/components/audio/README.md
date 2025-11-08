# Audio Components

This directory contains audio-related components for the AI Adventure Scribe game interface, focusing on voice narration and text-to-speech functionality.

## Overview

The audio system provides immersive voice narration for DM messages with multi-character voice support, progressive audio generation, and browser autoplay policy compliance.

## Architecture

### Voice Player System

**ProgressiveVoicePlayer** (Primary Component)
- Unified voice player implementation using progressive audio generation
- Provides comprehensive UI with playback controls, volume management, and segment tracking
- Features:
  - Progressive audio generation for faster playback start
  - Multi-character voice support with persistent voice mappings
  - Browser autoplay policy compliance with user interaction detection
  - API key management with retry logic
  - Test audio functionality
  - Comprehensive error handling and recovery
  - Detailed segment visualization and debugging tools

**Integration Flow:**
```
VoiceHandler → ProgressiveVoicePlayer → use-progressive-voice hook → VoiceDirector service → ElevenLabs API
```

### Supporting Components

**AudioPlayer**
- Legacy audio player (3KB)
- Kept for backward compatibility
- May be deprecated in future releases

**VoiceButton**
- Toggle button for enabling/disabling voice narration
- Simple on/off control with visual feedback

**VolumeButton**
- Quick volume control button
- Toggles between mute/unmute states

**VolumeSlider**
- Granular volume control slider
- Allows fine-tuned volume adjustment (0-100%)

**SpeakingIndicator**
- Visual indicator for active voice playback
- Shows when narration is in progress

## Usage

### Basic Implementation

```tsx
import { ProgressiveVoicePlayer } from '@/components/game/audio/ProgressiveVoicePlayer';
import { NarrationSegment } from '@/hooks/use-ai-response';

// In your component
<ProgressiveVoicePlayer
  text="Your DM message text"
  narrationSegments={narrationSegments} // Optional AI-generated segments
  isEnabled={true}
  className="custom-class" // Optional styling
/>
```

### With VoiceHandler (Recommended)

The `VoiceHandler` component manages voice playback for DM messages automatically:

```tsx
import { VoiceHandler } from '@/components/game/VoiceHandler';

// VoiceHandler automatically:
// - Detects new DM messages from MessageContext
// - Cleans markdown from text
// - Passes narration segments to ProgressiveVoicePlayer
<VoiceHandler />
```

## Data Flow

### Narration Segments

The system supports two input formats:

1. **NarrationSegment** (from AI response):
```typescript
interface NarrationSegment {
  type: 'dm' | 'narration' | 'character' | 'dialogue';
  text: string;
  character?: string;
  voice_category?: string;
}
```

2. **AISegment** (internal format):
```typescript
interface AISegment {
  type: 'dm' | 'character';
  text: string;
  character?: string;
  voice_category?: string;
}
```

`ProgressiveVoicePlayer` automatically converts NarrationSegments to AISegments.

### Voice Categories

The system supports these voice categories:
- **dm**: Dungeon Master narration
- **heroes**: Player characters and heroic NPCs
- **npcs**: Standard non-player characters
- **villains**: Antagonists and villains
- **creatures**: Monsters and creatures

## Features

### Progressive Generation

Audio segments are generated and played progressively:
1. AI provides text segments with character attribution
2. VoiceDirector maps characters to voices (with persistent caching)
3. Audio generates one segment at a time
4. Playback starts immediately when first segment is ready
5. Subsequent segments generate while previous ones play

### Voice Persistence

Character-to-voice mappings are cached in localStorage:
- Same character always gets the same voice
- Mappings persist across sessions
- Can be cleared via "Clear voice mappings" button

### Browser Compliance

The system handles browser autoplay policies:
- Requires user interaction before first playback
- Shows clear instructions to users
- Pre-creates audio elements during user interactions
- Gracefully falls back if autoplay is blocked

### Error Handling

Comprehensive error recovery:
- API key timeout and retry logic
- Individual segment failure doesn't stop entire playback
- Visual error indicators with retry options
- Fallback to plain text if segment parsing fails

## State Management

### Local Storage Keys

- `progressive-voice-volume`: Volume level (0-1)
- `progressive-voice-muted`: Mute state (boolean)
- `progressive-voice-enabled`: Voice system enabled (boolean)
- `progressive-voice-user-interacted`: User interaction flag (boolean)
- `progressive-voice-auto-play`: Auto-play preference (boolean, disabled by default)
- `voice-director-character-mappings`: Character-to-voice mappings (object)

### Hook: use-progressive-voice

Core hook powering the voice system:

**State:**
- `segments`: Array of voice segments being processed
- `currentSegmentIndex`: Currently playing segment index
- `isPlaying`: Playback active
- `isPaused`: Playback paused
- `isProcessing`: Audio generation in progress
- `volume`: Volume level (0-1)
- `isMuted`: Mute state
- `isVoiceEnabled`: Voice system enabled
- `error`: Error message if any

**Actions:**
- `speakAISegments(segments)`: Process and play AI segments
- `speakPlainText(text)`: Fallback for plain text
- `pausePlayback()`: Pause without losing state
- `resumePlayback()`: Resume from pause
- `stopPlayback()`: Stop completely
- `setVolume(level)`: Set volume (0-1)
- `toggleMute()`: Toggle mute state
- `toggleVoiceEnabled()`: Enable/disable voice system
- `retryApiKeyFetch()`: Retry API key retrieval
- `initializeAudioContext()`: Initialize audio for browser compliance

## Migration Guide

### From MultiVoicePlayer (Deprecated)

MultiVoicePlayer has been removed in favor of ProgressiveVoicePlayer. To migrate:

1. **Import Change:**
```typescript
// Old
import { MultiVoicePlayer } from '@/components/game/audio/MultiVoicePlayer';

// New
import { ProgressiveVoicePlayer } from '@/components/game/audio/ProgressiveVoicePlayer';
```

2. **Props Change:**
```typescript
// MultiVoicePlayer used AISegment[] directly
<MultiVoicePlayer
  narrationSegments={aiSegments}  // AISegment[]
/>

// ProgressiveVoicePlayer accepts both formats
<ProgressiveVoicePlayer
  narrationSegments={narrationSegments}  // NarrationSegment[] or AISegment[]
/>
```

3. **Benefits of Migration:**
- Better error handling and recovery
- More comprehensive UI with debugging tools
- Test audio functionality
- API key retry logic
- Browser autoplay compliance
- No breaking changes to functionality

### From AudioPlayer (Legacy)

AudioPlayer is deprecated but maintained for compatibility. To migrate to ProgressiveVoicePlayer:

1. Replace simple audio playback with full voice system
2. Gain multi-character voice support
3. Get progressive generation and better performance
4. Access comprehensive controls and debugging

## Performance Considerations

### Audio Generation

- Uses ElevenLabs Turbo v2.5 model for speed
- Progressive generation reduces time-to-first-audio
- Voice ID caching eliminates repeated character-to-voice lookups
- Audio URLs are object URLs (memory efficient, auto-cleaned)

### Memory Management

- Audio blobs are revoked after playback
- Audio elements are reused when possible
- Abort controllers prevent memory leaks from cancelled operations
- Voice cache is localStorage-backed (doesn't consume runtime memory)

## Troubleshooting

### No Audio Playing

1. Check if voice is enabled (toggle in player)
2. Verify user has clicked play button at least once (browser requirement)
3. Check API key status (indicator shows if key is missing)
4. Try "Test Audio" button to isolate issues
5. Check browser console for detailed error logs

### Wrong Voices

1. Use "Clear voice mappings" button to reset character-voice assignments
2. Character names are case-sensitive (clean character names if needed)
3. Voice categories must match available pools (dm, heroes, npcs, villains, creatures)

### API Key Issues

1. Check environment variable: `VITE_ELEVENLABS_API_KEY`
2. Verify Supabase edge function: `get-secret`
3. Use "Retry API key" button to re-fetch
4. Check browser network tab for API call failures

## Future Enhancements

Potential improvements for the voice system:

- [ ] Custom voice selection per character
- [ ] Voice preview before assignment
- [ ] Emotion/tone adjustment per segment
- [ ] Audio caching across sessions
- [ ] Offline playback support
- [ ] Real-time audio generation progress
- [ ] A/B voice testing for characters
- [ ] Voice profile export/import

## Dependencies

- **ElevenLabs API**: Text-to-speech generation
- **use-progressive-voice hook**: Core functionality
- **VoiceDirector service**: Voice management and mapping
- **Shadcn UI components**: UI elements
- **React hooks**: State management
- **localStorage**: Persistence

## Related Files

- `/src/hooks/use-progressive-voice.ts`: Core voice hook
- `/src/services/voice-director.ts`: Voice mapping and generation service
- `/src/components/game/VoiceHandler.tsx`: Integration component
- `/src/contexts/MessageContext.tsx`: Message state provider

---

**Last Updated**: November 2025
**Maintainer**: AI Dungeon Master Team
