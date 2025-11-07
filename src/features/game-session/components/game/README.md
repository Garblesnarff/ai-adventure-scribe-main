# Game Interface Components

## Purpose

This directory holds all React components that constitute the core gameplay interface. These components enable users to interact with the game world, send messages, view responses from the AI Dungeon Master, manage audio, and see relevant game context like memories or session notes.

## Structure and Important Files

- **`GameContent.tsx`**: The central layout component for the main game screen. It orchestrates the arrangement of `MessageList`, `ChatInput`, `MemoryPanel`, and other game-related UI elements. It also initializes the game session and data loading.
- **`MessageList.tsx`**: Displays the history of messages exchanged between the player and the AI DM.
- **`ChatInput.tsx`**: Provides the text input field for players to type their actions and dialogue.
- **`MemoryPanel.tsx`**: A side panel used to display game memories, session notes, and potentially other contextual information.
- **`AudioControls.tsx`**: (If present, or represented by `VoiceHandler`) A component or group of components for managing game audio, such as background music, sound effects, or voice input/output.
- **`VoiceHandler.tsx`**: Manages voice input (speech-to-text) and output (text-to-speech) functionalities.
- **`audio/`**: Sub-directory for more granular audio components.
    - **`AudioPlayer.tsx`**: Handles playback of audio.
    - **`SpeakingIndicator.tsx`**: Visual feedback for when voice input/output is active.
    - **`VoiceButton.tsx`**: Button to toggle voice input.
    - **`VolumeButton.tsx` / `VolumeSlider.tsx`**: Controls for audio volume.
- **`memory/`**: Sub-directory for components related to displaying memories.
    - **`MemoryCard.tsx`**: Renders a single memory item.
    - **`MemoryFilter.tsx`**: UI for filtering memories.
    - **`MemoryTester.tsx`**: (Development tool) For testing memory functionalities.
    - **`memoryConstants.tsx`, `types.ts`, `useMemoryFiltering.ts`**: Supporting files for memory display.
- **`message/`**: Sub-directory for message handling logic.
    - **`MessageHandler.tsx`**: Core logic for processing player input, sending it to the AI, receiving AI responses, and updating relevant contexts (messages, memories, game state).
- **`session/`**: Sub-directory for session validation components.
    - **`SessionValidator.tsx`**: Component or hook to ensure the game session, campaign, and character IDs are valid before allowing interaction.

## How Components Interact

- `GameContent.tsx` serves as the primary container.
- It initializes `useGameSession` (from hooks) to manage the game session state (ID, turn count, scene description).
- It sets up `MessageProvider` and `MemoryProvider` (from contexts) which are then used by child components.
- `MessageHandler.tsx` (used within `GameContent.tsx`) takes player input from `ChatInput.tsx`.
- `MessageHandler.tsx` then coordinates with:
    - `useAIResponse` (hook) to send data to the `dm-agent-execute` backend function.
    - `MessageContext` to add player and AI messages to the `MessageList.tsx`.
    - `MemoryContext` to extract and save memories from messages.
    - `useGameSession` (via props passed from `GameContent.tsx`) to update `turnCount` and `currentSceneDescription`.
- `MessageList.tsx` displays messages from `MessageContext`.
- `MemoryPanel.tsx` displays memories from `MemoryContext` and session notes from `useGameSession`'s state.
- `VoiceHandler.tsx` and components in `audio/` manage audio interactions, potentially integrating with `ChatInput.tsx` or `MessageHandler.tsx`.

## Usage Example

The main game interface is typically rendered via a route that includes campaign and character identifiers, which `GameContent.tsx` uses to load the session.

```typescript
// Usually part of a component like src/components/game-interface.tsx
// or directly routed in App.tsx
// <GameContent />
// (GameContent internally uses useParams and useSearchParams to get IDs)
```

## Notes

- This directory is the heart of the interactive gameplay experience.
- State management (via contexts and hooks) is crucial for coordinating the various components.
- The flow of information: Player Input (`ChatInput`) -> `MessageHandler` -> AI Backend -> `MessageHandler` -> UI Update (`MessageList`, `MemoryPanel`, game state display in `GameContent`).
- See the main `/src/components/README.md` for the overall component architecture.
