# Game Session Feature

## Purpose
Game session feature module providing all UI components, hooks, and types for active D&D gameplay. This is the core play experience where players interact with the AI Dungeon Master, roll dice, manage combat, and progress through the campaign narrative.

## Key Files
- `index.ts` - Main exports for the game session feature

## Directory Structure
- `components/` - React components for gameplay UI
  - `chat/` - Chat interface for player-DM interaction
  - `dice/` - Dice rolling interface and visualization
  - `game/` - Core game components (message display, session state, memory)
  - `voice/` - Voice chat integration
  - `audio/` - Audio playback and sound effects
- `hooks/` - Custom React hooks for game session operations
- `types/` - TypeScript type definitions for game sessions

## How It Works
The game session feature orchestrates real-time D&D gameplay:

**Chat Interface**: Players send messages to the AI Dungeon Master through a chat interface. Messages are processed by the AI service, which detects intent (combat, skill checks, roleplay), generates contextual responses, and maintains conversation history. The chat supports rich formatting, dice roll embeds, and NPC dialogue.

**Dice Rolling**: Integrated dice rolling system supports standard D&D dice (d4, d6, d8, d10, d12, d20, d100) with modifiers. Rolls can be triggered manually or automatically by the AI when skill checks or combat actions are needed. Results are displayed with animations and integrated into the narrative.

**Memory & State**: The session maintains conversation context, active combat state, character status, and quest progress. Memory is managed through the AI service and persisted to the database. The UI displays memory summaries and allows players to review session history.

**Real-time Updates**: WebSocket integration provides real-time updates for multiplayer sessions, keeping all players synchronized on game state, dice rolls, and narrative progression.

## Usage Examples
```typescript
// Launching a game session
import { GameSession } from '@/features/game-session';

<GameSession
  campaignId={campaignId}
  characterId={characterId}
  sessionId={sessionId}
/>

// Using game session hooks
import { useGameSession } from '@/features/game-session/hooks';

const {
  messages,
  sendMessage,
  rollDice,
  isLoading
} = useGameSession(sessionId);

// Send a message to the DM
await sendMessage("I search for traps");

// Roll dice
await rollDice({ formula: '1d20+5', purpose: 'Perception check' });
```

## Dependencies
- **AI Service** - Dungeon Master AI and response generation
- **WebSocket Client** - Real-time multiplayer synchronization
- **React Query** - Message and state management
- **Supabase Client** - Database persistence
- **Dice Service** - Dice rolling mechanics and validation

## Related Documentation
- [Game Session Components](./components/README.md)
- [AI Service](../../services/README.md)
- [Agents](../../agents/README.md)
- [Campaign Feature](../campaign/README.md)
- [Character Feature](../character/README.md)

## Maintenance Notes
- Session state must be carefully synchronized in multiplayer scenarios
- AI response streaming requires proper error handling and timeout management
- Dice rolls are validated server-side to prevent cheating
- Memory context has size limits to prevent token overflow
- Combat state transitions require atomic updates to prevent race conditions
