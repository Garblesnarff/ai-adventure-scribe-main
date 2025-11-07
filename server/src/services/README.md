# Server Services

This directory contains business logic services that abstract database operations and provide reusable functionality across API routes.

## Session Service

`session-service.ts` - Game session management using Drizzle ORM

### Features

- Type-safe session CRUD operations
- Message history management with pagination
- Session state (JSONB) updates
- Combat log tracking
- Active session queries

### Usage

```typescript
import { SessionService } from './services/session-service.js';

// Create session
const session = await SessionService.createSession({
  campaignId: '...',
  characterId: '...',
  sessionNumber: 1,
  status: 'active',
});

// Get session with messages (paginated)
const { session, messages, total } = await SessionService.getSessionWithMessages(
  sessionId,
  { limit: 50, offset: 0 }
);

// Add message
const message = await SessionService.addMessage({
  sessionId,
  speakerType: 'player',
  message: 'I attack the goblin!',
  context: { location: 'cave', emotion: 'determined' },
});

// Update session state
await SessionService.updateSessionState(sessionId, {
  currentScene: 'combat',
  activeEnemies: ['goblin_1', 'goblin_2'],
});

// Complete session
await SessionService.completeSession(sessionId, 'Epic battle with goblins');
```

### Performance

- Composite indexes on (session_id, timestamp) and (session_id, sequence_number)
- Efficient pagination for large message histories (1000+ messages)
- JSONB state updates without full row locks
- Expected query time: <50ms for message history retrieval

### Migration from Supabase Client

Before:
```typescript
const { data } = await supabase
  .from('game_sessions')
  .select('*')
  .eq('id', sessionId)
  .single();
```

After:
```typescript
const session = await SessionService.getSessionById(sessionId);
```

Benefits:
- Full TypeScript type safety
- No string-based column names
- Centralized error handling
- Easier testing and mocking
- Better performance monitoring
