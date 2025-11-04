# IndexedDB Auto-Cleanup Feature

## Overview

The IndexedDB Auto-Cleanup feature automatically removes old agent messages from browser storage to prevent unlimited storage growth and maintain optimal performance. This feature runs automatically in the background without blocking the UI thread.

## Implementation Details

### Architecture

The cleanup system is implemented in three layers:

1. **Storage Layer** (`IndexedDBService.ts`)
   - Core cleanup logic
   - Tracks cleanup statistics
   - Provides manual cleanup trigger

2. **Hook Layer** (`use-indexeddb-cleanup.ts`)
   - React hook for accessing cleanup functionality
   - Manages cleanup state and statistics
   - Provides formatted data for UI display

3. **UI Layer** (`IndexedDBCleanupPanel.tsx`)
   - Debug/settings panel for viewing stats
   - Manual cleanup controls
   - Configuration options

### Configuration

Default cleanup settings (configurable in `StorageConfig.ts`):

```typescript
cleanup: {
  maxMessageAgeMs: 24 * 60 * 60 * 1000, // 24 hours
  checkIntervalMs: 6 * 60 * 60 * 1000,   // 6 hours
}
```

### Automatic Cleanup Trigger

Cleanup is triggered automatically when:

1. **After message storage operations** - Each time a message is stored, the service checks if it's time to run cleanup
2. **Interval-based** - Only runs if `checkIntervalMs` has passed since last cleanup
3. **Non-blocking** - Uses `requestIdleCallback()` when available, falls back to `setTimeout()`

### Protected Messages

The cleanup process **preserves** messages in these states:
- `pending` - Messages waiting to be sent
- `failed` - Messages that failed delivery and may be retried

Only messages with `sent` or `acknowledged` status are eligible for deletion.

### Cleanup Statistics

The service tracks:
- `lastCleanupTime` - Timestamp of most recent cleanup
- `totalMessagesDeleted` - Lifetime count of deleted messages
- `lastDeletedCount` - Count from most recent cleanup

## Usage

### Automatic Operation

No setup required! The cleanup runs automatically once the `IndexedDBService` is instantiated (which happens when the messaging system initializes).

### Manual Cleanup

#### In Code

```typescript
import { IndexedDBService } from '@/agents/messaging/services/storage/IndexedDBService';

const service = IndexedDBService.getInstance();

// Manual cleanup with default age (24 hours)
const deletedCount = await service.manualCleanup();
console.log(`Deleted ${deletedCount} messages`);

// Custom age (e.g., 1 hour)
const count = await service.manualCleanup(1 * 60 * 60 * 1000);
```

#### Using React Hook

```tsx
import { useIndexedDBCleanup } from '@/hooks/use-indexeddb-cleanup';

function MyComponent() {
  const { stats, manualCleanup, isLoading } = useIndexedDBCleanup();

  const handleCleanup = async () => {
    const deleted = await manualCleanup();
    console.log(`Cleaned up ${deleted} messages`);
  };

  return (
    <div>
      <p>Last cleanup: {new Date(stats.lastCleanupTime).toLocaleString()}</p>
      <p>Total deleted: {stats.totalMessagesDeleted}</p>
      <button onClick={handleCleanup} disabled={isLoading}>
        Clean Now
      </button>
    </div>
  );
}
```

#### Using UI Component

```tsx
import { IndexedDBCleanupPanel } from '@/components/debug/IndexedDBCleanupPanel';

// Full panel with all controls
function SettingsPage() {
  return <IndexedDBCleanupPanel />;
}

// Compact version
import { IndexedDBCleanupCompact } from '@/components/debug/IndexedDBCleanupPanel';

function SettingsSection() {
  return <IndexedDBCleanupCompact />;
}
```

## Testing

### Manual Browser Testing

1. Open Chrome DevTools
2. Navigate to: **Application → IndexedDB → agentMessaging → messages**
3. Open browser console and run:

```javascript
// Create test messages with old timestamps
const service = window.IndexedDBService ||
  (await import('/src/agents/messaging/services/storage/IndexedDBService.ts')).IndexedDBService.getInstance();

// Add old message (48 hours ago)
await service.storeMessage({
  id: 'test-old-' + Date.now(),
  content: { text: 'old message' },
  type: 'request',
  priority: 'medium',
  timestamp: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
  status: 'sent',
  retryCount: 0,
});

// Add recent message (1 hour ago)
await service.storeMessage({
  id: 'test-recent-' + Date.now(),
  content: { text: 'recent message' },
  type: 'request',
  priority: 'medium',
  timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
  status: 'sent',
  retryCount: 0,
});

// Check stats before cleanup
console.log('Before:', service.getCleanupStats());

// Run manual cleanup (24 hour default)
const deleted = await service.manualCleanup();
console.log('Deleted:', deleted);

// Check stats after cleanup
console.log('After:', service.getCleanupStats());

// Verify in IndexedDB - old message should be gone, recent should remain
```

### Automated Testing

Run the test suite:

```bash
npm test -- src/agents/messaging/services/storage/__tests__/indexeddb-cleanup.test.ts
```

## Performance Considerations

### Non-Blocking Design

The cleanup uses `requestIdleCallback()` to run during browser idle time:

```typescript
if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
  window.requestIdleCallback(() => runCleanup());
} else {
  setTimeout(() => runCleanup(), 100);
}
```

This ensures:
- No UI jank during cleanup
- Cleanup happens during idle browser time
- Fallback for older browsers

### Cleanup Interval

The 6-hour check interval prevents:
- Excessive cleanup operations
- Performance impact from frequent scans
- Unnecessary disk I/O

### Storage Impact

For typical usage:
- Average message size: ~1-5 KB
- Messages per session: 50-200
- Daily storage: 250 KB - 1 MB
- With 24h cleanup: Storage stays under 1 MB

## Configuration Options

### Adjusting Cleanup Settings

Modify `src/agents/messaging/services/storage/config/StorageConfig.ts`:

```typescript
export const DEFAULT_STORAGE_CONFIG: StorageConfig = {
  // ... other config
  cleanup: {
    maxMessageAgeMs: 48 * 60 * 60 * 1000, // 48 hours instead of 24
    checkIntervalMs: 12 * 60 * 60 * 1000, // Check every 12 hours
  },
};
```

### User Preferences (Future Enhancement)

To allow users to configure cleanup preferences:

```typescript
// Store in localStorage
localStorage.setItem('indexeddb-cleanup-age', '48'); // hours

// Read in IndexedDBService
const userMaxAge = parseInt(localStorage.getItem('indexeddb-cleanup-age') || '24') * 60 * 60 * 1000;
```

## Troubleshooting

### Cleanup Not Running

Check:
1. Is IndexedDBService initialized? (Check browser console for init logs)
2. Has enough time passed? (Check `checkIntervalMs` setting)
3. Are there any errors? (Check console for `[IndexedDB]` logs)

### Messages Not Being Deleted

Verify:
1. Message status - Only `sent` and `acknowledged` messages are deleted
2. Message age - Must be older than `maxMessageAgeMs`
3. Timestamp format - Should be ISO string format

### Performance Issues

If cleanup causes performance problems:
1. Increase `checkIntervalMs` (e.g., from 6 hours to 12 hours)
2. Reduce `maxMessageAgeMs` (e.g., from 24 hours to 6 hours)
3. Check total message count in IndexedDB

## Future Enhancements

Potential improvements:
- [ ] User-configurable cleanup preferences in settings UI
- [ ] Cleanup based on storage size (e.g., keep under 5 MB)
- [ ] Export old messages before deletion
- [ ] Compression of old messages instead of deletion
- [ ] Web Worker for cleanup to fully isolate from main thread
- [ ] Cleanup metrics dashboard
- [ ] Smart cleanup based on message importance

## Related Files

- `/src/agents/messaging/services/storage/IndexedDBService.ts` - Core implementation
- `/src/agents/messaging/services/storage/config/StorageConfig.ts` - Configuration
- `/src/agents/messaging/services/storage/types.ts` - Type definitions
- `/src/hooks/use-indexeddb-cleanup.ts` - React hook
- `/src/components/debug/IndexedDBCleanupPanel.tsx` - UI components
- `/src/agents/messaging/services/storage/__tests__/indexeddb-cleanup.test.ts` - Tests

## References

- [IndexedDB API](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)
- [requestIdleCallback](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestIdleCallback)
- [Browser Storage Quotas](https://web.dev/storage-for-the-web/)
