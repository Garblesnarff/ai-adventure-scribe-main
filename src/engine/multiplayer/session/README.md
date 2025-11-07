# Session Management Module

Modular session management system for multiplayer D&D gameplay.

## Architecture

The session management system has been refactored from a monolithic 833-line `SessionManager.ts` into focused, maintainable modules:

### Core Components

#### SessionManager.ts (448 lines)
**Main facade orchestrating session lifecycle**
- Session creation and lifecycle management
- Join/leave operations
- Turn submission and completion
- Statistics and synchronization state
- Delegates to specialized managers

**Key Methods:**
- `createSession()` - Create new multiplayer session
- `joinSession()` - Add participant to session
- `submitTurn()` - Submit player action
- `completeTurn()` - Finalize turn
- `getSynchronizationState()` - Get sync status
- `getSessionStats()` - Get session metrics

#### ConnectionManager.ts (218 lines)
**WebSocket connection management**
- Add/remove connections
- Connection state tracking
- Heartbeat monitoring (30s interval)
- Broadcast messaging
- Event listener management

**Key Methods:**
- `addConnection()` - Register WebSocket connection
- `removeConnection()` - Clean up connection
- `broadcastToAll()` - Send to all participants
- `sendToParticipant()` - Send to single participant
- `getOnlineCount()` - Count active connections

**Concurrency Handling:**
- Heartbeat intervals prevent connection timeout
- Connection state checked before sending
- Event listeners for async communication

#### ParticipantTracker.ts (255 lines)
**Participant lifecycle and permissions**
- Track participants per session and user
- Manage participant status and presence
- Handle permissions by role
- Track readiness and synchronization

**Key Methods:**
- `addParticipant()` - Add to session
- `removeParticipant()` - Remove from session
- `updatePresence()` - Update online/offline status
- `getActiveParticipants()` - Filter active participants
- `getDefaultPermissions()` - Get role-based permissions

**Role Permissions:**
- **DM**: Full control (world building, moderation, conflict resolution)
- **Player**: Entity control, invite players
- **Spectator**: Read-only access

#### SessionPersistence.ts (212 lines)
**Save/load and snapshot management**
- Session save/load operations
- Snapshot creation and restoration
- Snapshot lifecycle management
- World state updates

**Key Methods:**
- `saveSession()` - Persist session to storage
- `loadSession()` - Restore session from storage
- `createSnapshot()` - Create state snapshot
- `restoreFromSnapshot()` - Rollback to snapshot
- `updateWorldSnapshot()` - Update world state

**Snapshot Types:**
- `auto` - Automatic periodic snapshots
- `manual` - User-triggered snapshots
- `turn_end` - End of turn snapshots
- `crash` - Emergency recovery snapshots
- `conflict` - Conflict resolution snapshots

#### StateSync.ts (254 lines)
**Real-time state synchronization**
- Conflict detection and resolution
- Operational transform for concurrent edits
- Sync version tracking
- Pending change management

**Key Methods:**
- `syncState()` - Synchronize state changes
- `detectConflicts()` - Find conflicting changes
- `resolveConflict()` - Apply conflict resolution
- `applyOperationalTransform()` - Handle concurrent edits
- `getSyncHealth()` - Check sync status

**Conflict Types:**
- `character_action` - Multiple participants control same character
- `world_state` - Conflicting world changes
- `narrative` - Conflicting story descriptions
- `rules` - Rules interpretation conflicts

## Usage

### Creating a Session

```typescript
import { SessionManager } from './session';

const manager = new SessionManager();

const result = await manager.createSession({
  name: 'Epic Quest',
  description: 'A dangerous journey',
  settings: {
    maxPlayers: 4,
    turnTimeLimit: 300,
    allowSpectators: true
  }
}, creatorUserId);

if (result.success) {
  const session = result.data;
  console.log(`Session code: ${session.sessionCode}`);
}
```

### Joining a Session

```typescript
const result = await manager.joinSession({
  sessionCode: 'ABC123',
  displayName: 'Thorin',
  role: 'player',
  characterId: 'char-123'
}, userId);

if (result.success) {
  const participant = result.data;
  console.log(`Joined as: ${participant.displayName}`);
}
```

### Submitting a Turn

```typescript
const action: PlayerIntent = {
  id: 'action-1',
  type: 'action',
  content: 'I attack the dragon',
  participantId: participant.id,
  timestamp: new Date(),
  metadata: {}
};

const result = await manager.submitTurn(
  sessionId,
  participantId,
  action
);

if (result.success) {
  console.log(`Turn ${result.data.turnNumber} started`);
}
```

### WebSocket Integration

```typescript
import { ConnectionManager } from './session';

const connectionMgr = new ConnectionManager();

// Add connection
connectionMgr.addConnection(sessionId, participantId, websocket);

// Broadcast to all
connectionMgr.broadcastToAll(sessionId, {
  type: 'game_update',
  data: { turnNumber: 5 }
});

// Listen for events
connectionMgr.addEventListener(sessionId, (event) => {
  console.log('Session event:', event);
});
```

## Concurrency Patterns

### Connection Management
- **Heartbeat monitoring**: 30-second intervals prevent stale connections
- **Event-driven**: WebSocket events trigger state updates
- **Non-blocking**: Connection operations don't block game logic

### State Synchronization
- **Optimistic updates**: Apply changes immediately, resolve conflicts later
- **Conflict detection**: Compare entity/relationship IDs across participants
- **Operational transform**: Transform concurrent edits to maintain consistency

### Turn Management
- **Sequential turns**: One active turn at a time per session
- **Timeout handling**: Automatic skip after time limit
- **Version tracking**: Sync versions ensure consistency

## Performance Considerations

- **Connection pooling**: Reuse WebSocket connections
- **Snapshot limits**: Max 50 snapshots per session
- **Event batching**: Batch broadcasts reduce network overhead
- **Lazy loading**: Load sessions on demand

## Error Handling

All public methods return `SessionResult<T>`:

```typescript
interface SessionResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  warnings?: string[];
}
```

## Testing

Run tests:
```bash
npm run server:test -- multiplayer.test.ts
```

## Migration from Legacy

Old imports still work via backward compatibility:

```typescript
// Old (still works)
import { SessionManager } from './SessionManager';

// New (preferred)
import { SessionManager } from './session';
```

## Future Enhancements

- [ ] Database persistence integration
- [ ] Advanced conflict resolution (ML-based)
- [ ] Real-time metrics dashboard
- [ ] Session recording/replay
- [ ] Distributed session management (Redis)
