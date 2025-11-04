# Logger Utility

Centralized logging utility for the AI Adventure Scribe application with support for structured metadata, environment-aware behavior, and backward compatibility.

## Location

**File:** `/src/lib/logger.ts`

## Features

- **Multiple log levels**: `debug`, `info`, `warn`, `error`
- **Structured logging**: Attach metadata objects to log entries
- **Environment-aware**: Verbose in development, minimal in production
- **Debug filtering**: Debug logs automatically disabled in production
- **Error handling**: Automatic serialization of Error objects in metadata
- **TypeScript types**: Full type safety with TypeScript
- **Backward compatible**: Works with existing log calls across the codebase
- **Timestamps**: Automatic timestamps in development mode

## Installation

The logger is already available throughout the application. Simply import it:

```typescript
import { logger } from '@/lib/logger';
```

## Basic Usage

### Simple Logging

```typescript
// Debug (disabled in production)
logger.debug('Component mounted');

// Info
logger.info('User logged in');

// Warning
logger.warn('API rate limit approaching');

// Error
logger.error('Database connection failed');
```

## Structured Logging with Metadata

### Adding Context

The logger supports structured metadata for better debugging and monitoring:

```typescript
logger.info('User action', {
  userId: '123',
  action: 'purchase',
  itemId: 'item-456',
  amount: 99.99,
});
```

### Component Logging

```typescript
logger.debug('Component rendering', {
  component: 'GameChat',
  props: { sessionId: 'abc123', characterId: 'def456' },
  state: { isLoading: false, messageCount: 42 },
});
```

### API Call Logging

```typescript
logger.info('API call completed', {
  endpoint: '/api/v1/campaigns',
  method: 'POST',
  status: 201,
  duration: 145,
  cached: false,
});
```

## Error Logging

Error objects in metadata are automatically processed and formatted:

```typescript
try {
  await riskyOperation();
} catch (error) {
  logger.error('Operation failed', {
    operation: 'riskyOperation',
    userId: '123',
    error, // Error object automatically serialized
  });
}
```

In development, this includes full stack traces. In production, stack traces are omitted for cleaner logs.

## API Reference

### Methods

#### `logger.debug(message: unknown, ...rest: unknown[])`

Debug level logging (disabled in production). Use for detailed diagnostic information.

**Parameters:**
- `message` - The log message (string) or any value for backward compatibility
- `metadata` - Optional structured data object

**Example:**
```typescript
logger.debug('Cache hit', { key: 'user:123', ttl: 300 });
```

#### `logger.info(message: unknown, ...rest: unknown[])`

Info level logging. Use for general informational messages.

**Parameters:**
- `message` - The log message (string) or any value for backward compatibility
- `metadata` - Optional structured data object

**Example:**
```typescript
logger.info('User logged in', { userId: '123', method: 'oauth' });
```

#### `logger.warn(message: unknown, ...rest: unknown[])`

Warning level logging. Use for potentially harmful situations.

**Parameters:**
- `message` - The log message (string) or any value for backward compatibility
- `metadata` - Optional structured data object

**Example:**
```typescript
logger.warn('API rate limit approaching', { remaining: 5, limit: 100 });
```

#### `logger.error(message: unknown, ...rest: unknown[])`

Error level logging. Use for error events that might still allow the application to continue.

**Parameters:**
- `message` - The log message (string) or any value for backward compatibility
- `metadata` - Optional structured data object (can include Error objects)

**Example:**
```typescript
logger.error('Database query failed', { query: 'SELECT ...', error });
```

### Types

#### `LogMetadata`

```typescript
type LogMetadata = Record<string, unknown>;
```

A record of key-value pairs to attach structured data to log entries.

## Usage Patterns

### Service Layer Pattern

```typescript
class MyService {
  async fetchData(userId: string) {
    logger.debug('Service method called', {
      service: 'MyService',
      method: 'fetchData',
      userId,
    });

    try {
      const startTime = Date.now();
      const data = await this.performFetch(userId);
      const duration = Date.now() - startTime;

      logger.info('Data fetched successfully', {
        service: 'MyService',
        method: 'fetchData',
        userId,
        recordCount: data.length,
        durationMs: duration,
      });

      return data;
    } catch (error) {
      logger.error('Data fetch failed', {
        service: 'MyService',
        method: 'fetchData',
        userId,
        error,
      });
      throw error;
    }
  }
}
```

### React Component Pattern

```typescript
function MyComponent({ campaignId }) {
  useEffect(() => {
    logger.debug('Component mounted', {
      component: 'MyComponent',
      props: { campaignId },
    });

    return () => {
      logger.debug('Component unmounted', {
        component: 'MyComponent',
      });
    };
  }, []);

  const handleClick = () => {
    logger.info('User interaction', {
      component: 'MyComponent',
      action: 'buttonClick',
      campaignId,
    });
  };
}
```

### AI Agent Pattern

```typescript
logger.info('Agent task started', {
  agent: 'DungeonMasterAgent',
  taskId: 'task-123',
  taskType: 'generateResponse',
  context: { sessionId: 'abc', campaignId: 'def' },
});

logger.debug('Agent reasoning', {
  agent: 'RulesInterpreterAgent',
  rule: 'combatAdvantage',
  conditions: ['attacker_hidden', 'target_prone'],
  result: 'advantage_granted',
});
```

### Performance Monitoring Pattern

```typescript
logger.warn('Slow operation detected', {
  operation: 'memoryRetrieval',
  durationMs: 850,
  threshold: 500,
  recommendations: ['add_caching', 'optimize_query'],
});

logger.debug('Cache statistics', {
  component: 'MemoryService',
  hits: 142,
  misses: 8,
  hitRate: 94.67,
});
```

## Backward Compatibility

The logger maintains backward compatibility with existing logging patterns:

```typescript
// Old style (still works)
logger.info('User logged in', 'user123', 'oauth');
logger.error(error);
logger.error('Error:', error);

// New style (recommended)
logger.info('User logged in', { userId: 'user123', method: 'oauth' });
logger.error('Operation failed', { error });
```

## Environment Behavior

### Development Mode
- All log levels enabled
- Timestamps included
- Pretty-printed metadata (JSON with indentation)
- Full error stack traces
- Verbose output

### Production Mode
- Debug logs disabled
- No timestamps
- Compact metadata (single-line JSON)
- Error messages without stack traces
- Minimal output

## Best Practices

### 1. Use Appropriate Log Levels

- **Debug**: Detailed diagnostic info (component lifecycle, cache hits, internal state)
- **Info**: Significant events (user actions, API calls, task completions)
- **Warn**: Potentially harmful situations (rate limits, slow operations, retries)
- **Error**: Actual errors (exceptions, failures, connection issues)

### 2. Include Relevant Context

Always include context that helps debug the issue:

```typescript
// Good
logger.error('Database query failed', {
  service: 'DatabaseService',
  query: 'SELECT * FROM users WHERE id = ?',
  userId: '123',
  error,
});

// Less helpful
logger.error('Query failed');
```

### 3. Use Consistent Metadata Keys

Standardize metadata keys across your service/component:

```typescript
// Consistent service logging
logger.info('Operation completed', {
  service: 'MyService',      // Always 'service'
  method: 'methodName',      // Always 'method'
  durationMs: 123,          // Always 'durationMs'
});
```

### 4. Log Performance Metrics

Track performance for optimization:

```typescript
const startTime = Date.now();
await operation();
const duration = Date.now() - startTime;

logger.info('Operation completed', {
  operation: 'semanticSearch',
  durationMs: duration,
  resultCount: results.length,
});
```

### 5. Include Error Objects in Metadata

When logging errors, include the error object in metadata:

```typescript
// Good
logger.error('Operation failed', { operation: 'fetch', error });

// Less useful
logger.error(`Operation failed: ${error.message}`);
```

## Testing

Tests are available at `/src/lib/logger.test.ts` demonstrating all usage patterns and verifying backward compatibility.

Run tests:
```bash
npx vitest run src/lib/logger.test.ts
```

## Examples

Comprehensive usage examples are available at `/src/lib/logger.examples.ts`, including:

1. Basic logging
2. Structured logging with metadata
3. Error logging with error objects
4. Service layer logging
5. Component logging
6. AI agent logging
7. Performance monitoring
8. Backward compatible usage
9. Database operation logging
10. Real-time/WebSocket logging

## Migration Guide

If you're updating existing logger calls:

### Before (Old Style)
```typescript
logger.info('User action:', userId, action, timestamp);
logger.error('Failed to load:', error);
```

### After (New Style - Recommended)
```typescript
logger.info('User action', { userId, action, timestamp });
logger.error('Failed to load', { operation: 'loadData', error });
```

Both styles work, but the new style provides better structure for debugging and monitoring.

## Technical Details

### Metadata Processing

- Error objects are automatically serialized to include `name`, `message`, and `stack` (dev only)
- All other objects are JSON-stringified
- In development: Pretty-printed with 2-space indentation
- In production: Compact single-line format

### Format

Development output format:
```
[timestamp] [LEVEL] message
{
  "key": "value",
  "nested": {
    "data": "here"
  }
}
```

Production output format:
```
[LEVEL] message {"key":"value","nested":{"data":"here"}}
```

## Current Usage

The logger is used in 200+ files across the codebase including:

- Services: AI service, Gemini, OpenRouter, Voice, Gallery
- Hooks: Game session, character data, combat AI
- Components: Game chat, character creation, campaign management
- Agents: Dungeon Master, Rules Interpreter, messaging system
- Utils: Spell validation, context building, memory management

All existing logger calls are backward compatible and continue to work with the enhanced implementation.
