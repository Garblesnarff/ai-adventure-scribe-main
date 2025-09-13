# BFF (Backend-for-Frontend) Implementation

## Overview

This document describes the comprehensive Backend-for-Frontend (BFF) pattern implementation optimized specifically for the React frontend. The BFF eliminates the impedance mismatch between generic backend APIs and React component requirements, providing optimized data aggregation, real-time features, and React-specific optimizations.

## Architecture

### Core Principles

1. **React-First Design**: All endpoints are optimized for React component prop structures
2. **Real-Time Integration**: WebSocket and Server-Sent Events for live updates
3. **Performance Optimization**: Request coalescing, caching, and prefetching
4. **Error Boundary Compatible**: React error boundary integration with retry logic
5. **Suspense Ready**: React Suspense and concurrent rendering support

### Directory Structure

```
server/src/bff/
├── types/
│   └── index.ts          # BFF-specific TypeScript types
├── middleware/
│   └── bff-middleware.ts # React-optimized middleware
├── websocket/
│   └── websocket-manager.ts # Real-time WebSocket manager
└── services/             # BFF business logic services

server/src/routes/bff/
├── index.ts              # Main BFF router
├── game-session.ts       # Game session aggregation
├── character-dashboard.ts # Character data dashboard
└── streaming-chat.ts     # AI streaming chat interface

src/hooks/bff/
├── index.ts                      # Hook exports and utilities
├── use-bff-game-session.ts       # Game session hooks
├── use-bff-character-dashboard.ts # Character dashboard hooks
└── use-bff-streaming-chat.ts     # Streaming chat hooks
```

## Key Features

### 1. Game Session Aggregation (`/bff/game-session`)

**Purpose**: Provides complete game session state optimized for React components

**Features**:
- Aggregated session data from multiple tables
- Real-time WebSocket integration
- Combat status and NPC information
- Recent message history
- Audio settings and preferences

**Endpoints**:
- `GET /bff/game-session/:sessionId` - Get complete session data
- `POST /bff/game-session` - Create or join session
- `PUT /bff/game-session/:sessionId` - Update session with real-time broadcast

**React Hook**: `useBFFGameSession(sessionId, options)`

```typescript
const { data: session, connectionStatus } = useBFFGameSession(sessionId, {
  campaignId,
  characterId,
  enableRealtime: true,
  suspense: true
});
```

### 2. Character Dashboard (`/bff/character-dashboard`)

**Purpose**: Comprehensive character data with combat readiness and progress metrics

**Features**:
- Complete character stats and abilities
- Inventory and spell management
- Combat readiness calculations
- Progress tracking and metrics
- Optimistic updates for character changes

**Endpoints**:
- `GET /bff/character-dashboard/:characterId` - Full character dashboard
- `GET /bff/character-dashboard/:characterId/quick-stats` - Essential stats for Suspense
- `PUT /bff/character-dashboard/:characterId` - Update character data

**React Hooks**: 
- `useBFFCharacterDashboard(characterId, options)`
- `useBFFCharacterQuickStats(characterId)` (Suspense-enabled)
- `useBFFCharacterHitPoints(characterId)` (Optimistic updates)

```typescript
// Full dashboard
const { data: dashboard } = useBFFCharacterDashboard(characterId, {
  campaignId,
  suspense: false
});

// Hit points with optimistic updates
const { takeDamage, heal, setHitPoints } = useBFFCharacterHitPoints(characterId);
takeDamage(15); // Applied immediately, then synced
```

### 3. Streaming Chat Interface (`/bff/streaming-chat`)

**Purpose**: Real-time AI response streaming with Server-Sent Events

**Features**:
- Progressive AI response streaming
- Server-Sent Events for real-time updates
- Typing indicators and presence
- Message acknowledgment system
- Audio synthesis integration

**Endpoints**:
- `POST /bff/streaming-chat/send` - Send message and initiate stream
- `GET /bff/streaming-chat/stream/:streamId` - SSE endpoint for streaming
- `GET /bff/streaming-chat/session/:sessionId/messages` - Message history
- `POST /bff/streaming-chat/typing` - Typing indicators

**React Hook**: `useBFFStreamingChat(sessionId)`

```typescript
const { 
  sendMessage, 
  streamingState, 
  isTyping, 
  startTyping, 
  stopTyping 
} = useBFFStreamingChat(sessionId);

// Send message with audio synthesis
sendMessage("Hello world!", { 
  includeAudio: true, 
  voiceId: 'narrator' 
});
```

### 4. WebSocket Real-Time Features

**Purpose**: Session-based real-time communication optimized for React

**Features**:
- Session rooms for multiplayer support
- Event broadcasting with acknowledgments
- Automatic reconnection with exponential backoff
- Presence management and typing indicators
- Rate limiting and connection management

**WebSocket Events**:
- `session_update` - Session state changes
- `message_sent` - New messages in session
- `combat_update` - Combat status changes
- `user_joined` / `user_left` - Presence updates
- `typing_start` / `typing_stop` - Typing indicators
- `dice_roll` - Dice roll events

**React Hooks**:
- `useBFFWebSocketSend()` - Send WebSocket messages
- `useBFFWebSocketSubscribe(eventType, callback)` - Subscribe to events

```typescript
const sendWSMessage = useBFFWebSocketSend();

useBFFWebSocketSubscribe('dice_roll', (data) => {
  console.log('Dice rolled:', data.payload.result);
});
```

## Middleware and Optimizations

### 1. Request Coalescing Middleware

Merges identical concurrent requests to prevent redundant processing.

```typescript
router.use(requestCoalescingMiddleware);
```

### 2. React Response Shaping Middleware

Formats responses to match React component prop expectations, adding React-specific metadata.

```typescript
router.use(reactResponseShapingMiddleware);
```

### 3. Frontend-Aware Caching Middleware

Implements caching strategies optimized for React patterns with TTL and invalidation triggers.

```typescript
router.use(bffCachingMiddleware({
  ttl: 60, // 1 minute
  strategy: 'memory',
  invalidationTriggers: ['session_update', 'character_update']
}));
```

### 4. Performance Monitoring Middleware

Tracks BFF-specific metrics and optimization opportunities.

```typescript
router.use(bffPerformanceMiddleware);
```

### 5. Error Handling Middleware

React error boundary compatible error handling with retry logic.

```typescript
router.use(bffErrorHandlingMiddleware);
```

## React Integration

### Query Client Configuration

```typescript
import { BFF_QUERY_DEFAULTS } from '@/hooks/bff';

const queryClient = new QueryClient({
  defaultOptions: BFF_QUERY_DEFAULTS
});
```

### Error Boundary Integration

```typescript
import { BFFError, getBFFErrorMessage, isBFFErrorRetryable } from '@/hooks/bff';

function GameErrorBoundary({ children }) {
  return (
    <ErrorBoundary
      onError={(error) => {
        if (isBFFError(error)) {
          // Handle BFF-specific errors
          console.error('BFF Error:', getBFFErrorMessage(error));
        }
      }}
    >
      {children}
    </ErrorBoundary>
  );
}
```

### Suspense Integration

```typescript
function CharacterQuickStats({ characterId }) {
  const { data } = useBFFCharacterQuickStats(characterId); // Suspense-enabled
  
  return (
    <div>
      <h2>{data.name}</h2>
      <p>Level {data.level} {data.class}</p>
      <p>HP: {data.hitPoints.current}/{data.hitPoints.maximum}</p>
    </div>
  );
}

// Usage with Suspense
<Suspense fallback={<CharacterStatsSkeleton />}>
  <CharacterQuickStats characterId={characterId} />
</Suspense>
```

## Performance Optimizations

### 1. Request Batching

Multiple requests can be batched into a single HTTP call:

```typescript
POST /bff/batch
{
  "requests": [
    { "endpoint": "/game-session/123", "method": "GET" },
    { "endpoint": "/character-dashboard/456", "method": "GET" }
  ]
}
```

### 2. Prefetching

Intelligent data preloading based on user patterns:

```typescript
POST /bff/prefetch
{
  "resources": [
    { "type": "character_dashboard", "characterId": "456" },
    { "type": "game_session", "sessionId": "123" }
  ]
}
```

### 3. Aggregated Dashboard

Single endpoint for complete dashboard data:

```typescript
GET /bff/dashboard/:campaignId/:characterId
```

## Caching Strategy

### Memory Cache (Default)
- TTL-based expiration
- Invalidation triggers
- LRU eviction policy

### Cache Keys
- User-specific: `bff:${userId}:${endpoint}`
- Session-specific: `bff:session:${sessionId}:${endpoint}`
- Character-specific: `bff:character:${characterId}:${endpoint}`

### Invalidation Triggers
- `session_update` - Invalidates session-related caches
- `character_update` - Invalidates character-related caches
- `message_sent` - Invalidates message history caches
- `combat_update` - Invalidates combat-related caches

## Real-Time Architecture

### WebSocket Connection Management

1. **Authentication**: JWT-based WebSocket authentication
2. **Session Rooms**: Users join session-specific rooms
3. **Event Broadcasting**: Real-time updates to all session participants
4. **Presence Management**: Online/offline status and typing indicators
5. **Reconnection**: Automatic reconnection with exponential backoff

### Server-Sent Events (SSE)

Used for streaming AI responses:

1. **Stream Initialization**: Create stream via REST API
2. **Progressive Updates**: Receive content chunks via SSE
3. **Completion Handling**: Stream completion and cleanup
4. **Error Recovery**: Automatic reconnection and error handling

## Monitoring and Metrics

### Performance Metrics

Available at `/bff/metrics`:

- Request count and response times
- Cache hit/miss ratios
- WebSocket connection statistics
- Streaming chat performance
- Error rates and types

### Health Check

Available at `/bff/health`:

```json
{
  "status": "healthy",
  "features": [
    "real_time_sessions",
    "streaming_chat", 
    "character_dashboard",
    "websocket_support",
    "sse_streaming"
  ],
  "metrics": { /* performance data */ }
}
```

## Usage Examples

### Game Session with Real-Time Updates

```typescript
function GameSession({ campaignId, characterId }) {
  const { data: session, connectionStatus } = useBFFGameSession(sessionId, {
    campaignId,
    characterId,
    enableRealtime: true
  });

  const { sendMessage } = useBFFStreamingChat(session?.id);

  return (
    <div>
      <div>Connection: {connectionStatus}</div>
      <div>Turn: {session?.turnCount}</div>
      <div>{session?.currentScene.description}</div>
      
      <MessageList messages={session?.recentMessages} />
      <ChatInput onSend={sendMessage} />
    </div>
  );
}
```

### Character Dashboard with Optimistic Updates

```typescript
function CharacterDashboard({ characterId }) {
  const { data: character } = useBFFCharacterDashboard(characterId);
  const { takeDamage, heal } = useBFFCharacterHitPoints(characterId);

  return (
    <div>
      <h2>{character?.character.name}</h2>
      <div>
        HP: {character?.character.hitPoints.current} / 
            {character?.character.hitPoints.maximum}
      </div>
      
      <button onClick={() => takeDamage(10)}>Take Damage</button>
      <button onClick={() => heal(5)}>Heal</button>
    </div>
  );
}
```

### Streaming Chat with Audio

```typescript
function StreamingChat({ sessionId }) {
  const { sendMessage, streamingState } = useBFFStreamingChat(sessionId);
  const [message, setMessage] = useState('');

  const handleSend = () => {
    sendMessage(message, { 
      includeAudio: true, 
      voiceId: 'narrator' 
    });
    setMessage('');
  };

  return (
    <div>
      {streamingState.isStreaming && (
        <div>AI is responding... {streamingState.currentContent}</div>
      )}
      
      <input 
        value={message}
        onChange={(e) => setMessage(e.target.value)}
      />
      <button onClick={handleSend}>Send</button>
    </div>
  );
}
```

## Integration with Existing Code

### 1. Gradual Migration

The BFF can be adopted incrementally alongside existing API endpoints:

```typescript
// Use BFF for new features
const { data: session } = useBFFGameSession(sessionId);

// Keep existing hooks for legacy features
const { data: campaign } = useCampaign(campaignId);
```

### 2. Feature Flags

Enable BFF features selectively:

```typescript
const USE_BFF_GAME_SESSION = process.env.VITE_USE_BFF_GAME_SESSION === 'true';

const GameSessionProvider = USE_BFF_GAME_SESSION 
  ? BFFGameSessionProvider 
  : LegacyGameSessionProvider;
```

### 3. A/B Testing

Compare BFF performance against existing APIs:

```typescript
const useBFFOrLegacy = (sessionId, useBFF = false) => {
  return useBFF 
    ? useBFFGameSession(sessionId)
    : useLegacyGameSession(sessionId);
};
```

## Future Enhancements

### Planned Features

1. **Campaign Overview Endpoint** (`/bff/campaign-overview`)
2. **Memory Context Endpoint** (`/bff/memory-context`) 
3. **Audio Player Integration** (`/bff/audio-player`)
4. **Rules Assistant** (`/bff/rules-assistant`)
5. **Redis Caching Strategy**
6. **GraphQL Subscription Integration**
7. **Progressive Web App Offline Support**

### Advanced Optimizations

1. **Response Compression**: Gzip/Brotli for large responses
2. **CDN Integration**: Static asset optimization
3. **Database Connection Pooling**: Optimized database connections
4. **Rate Limiting**: Per-user and per-endpoint rate limiting
5. **Request Deduplication**: Advanced caching strategies

## Troubleshooting

### Common Issues

1. **WebSocket Connection Failures**
   - Check authentication tokens
   - Verify network connectivity
   - Review server logs for connection errors

2. **Streaming Chat Not Working**
   - Ensure SSE is supported by the browser
   - Check for ad blockers blocking event streams
   - Verify CORS configuration

3. **Performance Issues**
   - Monitor `/bff/metrics` endpoint
   - Check cache hit ratios
   - Review database query performance

4. **Type Errors in React Hooks**
   - Ensure BFF types are properly imported
   - Verify TypeScript configuration
   - Check for version mismatches

### Debug Mode

Enable debug logging:

```typescript
localStorage.setItem('BFF_DEBUG', 'true');
```

### Health Checks

Monitor BFF health:

- `/bff/health` - Overall system health
- `/bff/metrics` - Performance metrics
- `/bff/game-session/:id/stats` - Session-specific statistics

## Conclusion

The BFF implementation provides a React-optimized API layer that eliminates impedance mismatch, improves performance, and enables real-time features. It's designed to be incrementally adoptable and provides significant benefits for React-based frontend development while maintaining backward compatibility with existing systems.

The implementation includes comprehensive error handling, performance monitoring, and real-time capabilities that make it ideal for building responsive, interactive D&D gaming experiences.