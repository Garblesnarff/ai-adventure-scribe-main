# Message List Components

This directory contains the refactored MessageList component split into focused sub-components, each under 200 lines per CODE_STANDARDS.md.

## Architecture

The MessageList functionality is split into these components:

### Core Components

- **MessageListContainer.tsx** (~100 lines) - Main orchestrator
  - Manages scroll behavior and auto-scroll logic
  - Handles dynamic options fetching with DYNAMIC_OPTIONS_FETCH_DELAY_MS
  - Groups consecutive messages from same sender
  - Provides global dice roll popup from GameContext queue
  - Integrates AbortController cleanup for memory leak prevention

- **MessageRenderer.tsx** (~80 lines) - Individual message rendering
  - Renders grouped messages with avatars
  - Handles message expansion/truncation for long messages
  - Delegates to DMMessage or PlayerMessage components
  - Manages special message types (dice rolls, combat)

### Message Type Components

- **DMMessage.tsx** (~80 lines) - DM-specific message display
  - Displays DM message bubbles with purple gradient styling
  - Integrates voice controls (DMMessageVoiceControls)
  - Shows action options (ActionOptions component)
  - Handles roll requests parsing
  - Integrates image generation section

- **PlayerMessage.tsx** (~60 lines) - Player-specific message display
  - Displays player message bubbles with card styling
  - Shows character avatars
  - Renders metadata (emotion, location)
  - Simpler styling than DM messages

### Feature Components

- **MessageVoicePlayer.tsx** (~60 lines) - Voice player integration
  - Wraps DMMessageVoiceControls with hover effects
  - Positioned absolutely on DM message bubbles
  - Handles narration segments

- **MessageImageSection.tsx** (~80 lines) - Image generation and display
  - Generate/Regenerate scene image buttons
  - ChatImage display (mobile inline, desktop floating)
  - Integrates with scene-image-generator service
  - Persists images to dialogue_history via llmApiClient
  - Manages generation state and errors per message

- **DynamicOptionsSection.tsx** (~70 lines) - Dynamic action options
  - Displays AI-generated action suggestions
  - Fetches from /dm/options endpoint after DYNAMIC_OPTIONS_FETCH_DELAY_MS
  - Handles last roll metadata enrichment
  - Filters generic fallback options during combat

- **MessageMetadata.tsx** (~40 lines) - Timestamps and status indicators
  - Displays message timestamps
  - Shows context metadata (emotion, location)
  - Renders first-in-group vs last-in-group appropriately

## Data Flow

```
MessageList.tsx (entry point, <200 lines)
  └─> MessageListContainer.tsx
      ├─> Scroll management & auto-scroll
      ├─> Dynamic options fetching
      ├─> Message grouping logic
      └─> MessageRenderer.tsx (for each group)
          ├─> DMMessage.tsx (if sender === 'dm')
          │   ├─> MessageVoicePlayer.tsx
          │   ├─> MessageImageSection.tsx
          │   └─> ActionOptions (inline)
          ├─> PlayerMessage.tsx (if sender === 'player')
          └─> MessageMetadata.tsx
```

## State Management

### Local State
- **expandedMessages**: Set<string> - Tracks which long messages are expanded
- **dynamicOptions**: { key: string; lines: string[] } | null - AI-generated options
- **generatingFor**: Set<string> - Messages currently generating images
- **imageByMessage**: Record<string, { url: string; prompt: string }> - Ephemeral images
- **genErrorByMessage**: Record<string, string> - Image generation errors
- **isUserScrolledUp**: boolean - Auto-scroll suppression flag
- **scrollProgress**: number - Timeline rail integration

### Context Dependencies
- **MessageContext**: messages, sendMessage
- **GameContext**: getCurrentDiceRoll, completeDiceRoll, cancelDiceRoll
- **CombatContext**: state.isInCombat
- **CharacterContext**: state.character
- **CampaignContext**: state.campaign

## Special Features

### Memory Leak Prevention
- AbortController in dynamic options fetch (useEffect cleanup)
- Mounted flags in async operations
- Timer cleanup in optionsTimerRef

### Image Generation
- Auto-generation on VITE_DM_AUTO_IMAGE=true
- Per-session caps (VITE_DM_IMAGE_MAX_PER_SESSION)
- localStorage caching with capKey/trigKey helpers
- Visual prompt marker support (VISUAL PROMPT: ...)

### Dynamic Options
- 10-second delay (DYNAMIC_OPTIONS_FETCH_DELAY_MS) after last DM message
- Suppressed during active roll requests
- Enriched with last roll metadata (DC, AC, success/fail)
- Generic fallback filtering

### Roll Request Handling
- Global queue managed by GameContext
- Prevents duplicate popups
- Captures last roll metadata for context-aware options
- Skill/weapon extraction from roll descriptions

## Environment Variables
- `VITE_DYNAMIC_OPTIONS` - Enable/disable dynamic options (default: true)
- `VITE_DM_AUTO_IMAGE` - Auto-generate images (default: false)
- `VITE_DM_IMAGE_MAX_PER_SESSION` - Image generation cap (default: 3)
- `VITE_DM_IMAGE_QUALITY` - Image quality (default: 'low')
- `VITE_DM_IMAGE_MODEL` - Image generation model
- `VITE_CREWAI_BASE_URL` - CrewAI service URL (default: http://127.0.0.1:8000)

## Component Props

### MessageList (Entry Point)
```typescript
interface MessageListProps {
  onSendFullMessage?: (message: string) => Promise<void>;
  sessionId?: string;
  containerRef?: React.RefObject<HTMLDivElement>;
}
```

## Key Constants
- `DYNAMIC_OPTIONS_FETCH_DELAY_MS = 10000` - Delay before fetching dynamic options
- `Z_INDEX.POPOVER` - Z-index for dice roll popup

## Testing Considerations
- Scroll behavior with isUserScrolledUp flag
- Dynamic options fetch with AbortController
- Image generation with error handling
- Message grouping logic
- Roll request queue integration
