# IndexedDB Auto-Cleanup Flow Diagram

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Agent Messaging System                       │
│                                                                   │
│  ┌────────────────┐      ┌─────────────────┐                   │
│  │ Message Queue  │─────▶│ IndexedDBService│                   │
│  │   Service      │      │                  │                   │
│  └────────────────┘      └────────┬─────────┘                   │
│                                    │                              │
│                                    │ storeMessage()              │
│                                    ▼                              │
│                          ┌──────────────────┐                   │
│                          │ checkAndCleanup()│                   │
│                          └────────┬─────────┘                   │
│                                    │                              │
└────────────────────────────────────┼──────────────────────────────┘
                                     │
                                     ▼
                          ┌──────────────────────┐
                          │ Interval Check       │
                          │ (6 hours passed?)    │
                          └──────────┬───────────┘
                                     │
                        ┌────────────┴────────────┐
                        │ YES                NO   │
                        ▼                         ▼
              ┌──────────────────┐        [Skip Cleanup]
              │ requestIdleCallback│              │
              │  or setTimeout()  │              │
              └────────┬──────────┘              │
                       │                          │
                       ▼                          │
              ┌──────────────────┐              │
              │ clearOldMessages()│              │
              └────────┬──────────┘              │
                       │                          │
                       ▼                          │
              ┌──────────────────┐              │
              │ Delete old msgs  │              │
              │ (skip pending/   │              │
              │  failed status)  │              │
              └────────┬──────────┘              │
                       │                          │
                       ▼                          │
              ┌──────────────────┐              │
              │ Update Stats     │              │
              │ & Log Results    │              │
              └────────┬──────────┘              │
                       │                          │
                       └──────────────────────────┘
```

## Detailed Cleanup Process

```
┌───────────────────────────────────────────────────────────────────┐
│                      storeMessage(message)                         │
└──────────────────────────┬─────────────────────────────────────────┘
                           │
                           ▼
          ┌────────────────────────────────┐
          │ Store message in IndexedDB      │
          └────────────────┬───────────────┘
                           │
                           ▼
          ┌────────────────────────────────┐
          │ checkAndCleanup()               │
          └────────────────┬───────────────┘
                           │
                           ▼
          ┌────────────────────────────────┐
          │ Calculate time since last      │
          │ cleanup (now - lastCleanupTime)│
          └────────────────┬───────────────┘
                           │
                           ▼
          ┌────────────────────────────────┐
          │ Is interval >= checkIntervalMs?│
          │      (default: 6 hours)        │
          └────────┬───────────────────────┘
                   │
      ┌────────────┴───────────┐
      │ NO                  YES│
      ▼                         ▼
  [Return]        ┌──────────────────────┐
  [Continue]      │ Update lastCleanupTime│
                  │ (prevent concurrent)  │
                  └──────────┬───────────┘
                             │
                             ▼
              ┌──────────────────────────┐
              │ requestIdleCallback      │
              │ available?               │
              └──────┬───────────────────┘
                     │
        ┌────────────┴────────────┐
        │ YES              NO     │
        ▼                         ▼
  ┌──────────────┐      ┌──────────────┐
  │ Schedule via │      │ Schedule via │
  │ requestIdle  │      │ setTimeout   │
  │ Callback()   │      │ (100ms)      │
  └──────┬───────┘      └──────┬───────┘
         │                     │
         └──────────┬──────────┘
                    │
                    ▼
        ┌──────────────────────┐
        │ clearOldMessages()    │
        │ (maxAgeMs)            │
        └──────────┬───────────┘
                   │
                   ▼
        ┌──────────────────────┐
        │ Open IndexedDB        │
        │ transaction           │
        └──────────┬───────────┘
                   │
                   ▼
        ┌──────────────────────┐
        │ Query messages index  │
        │ by timestamp          │
        └──────────┬───────────┘
                   │
                   ▼
        ┌──────────────────────┐
        │ Iterate cursor        │
        └──────────┬───────────┘
                   │
                   ▼
        ┌──────────────────────┐
        │ For each message:     │
        │                       │
        │ ┌─────────────────┐  │
        │ │ Check timestamp │  │
        │ │ < cutoffTime?   │  │
        │ └────────┬────────┘  │
        │          │            │
        │    ┌─────┴─────┐     │
        │    │ YES    NO │     │
        │    ▼           ▼     │
        │ ┌────────┐ [Skip]   │
        │ │ Check  │   │       │
        │ │ status │   │       │
        │ └───┬────┘   │       │
        │     │        │       │
        │ ┌───┴───┐    │       │
        │ │pending│    │       │
        │ │failed?│    │       │
        │ └───┬───┘    │       │
        │     │        │       │
        │ ┌───┴────┐   │       │
        │ │YES  NO │   │       │
        │ ▼        ▼   │       │
        │[Skip]  [Delete]│      │
        │         │      │      │
        │    deletedCount++│   │
        │         └──────┘│    │
        └─────────────────┼────┘
                         │
                         ▼
              ┌──────────────────┐
              │ Update Stats:     │
              │ - lastCleanupTime │
              │ - lastDeletedCount│
              │ - totalDeleted    │
              └──────────┬────────┘
                         │
                         ▼
              ┌──────────────────┐
              │ Log results       │
              │ Return count      │
              └──────────────────┘
```

## Message Lifecycle with Cleanup

```
┌──────────────────────────────────────────────────────────────────┐
│                        Message Lifecycle                          │
└──────────────────────────────────────────────────────────────────┘

  Message Created
       │
       ▼
  ┌─────────────┐
  │  Status:    │
  │  pending    │◀────────┐
  └──────┬──────┘         │
         │                │
         │ Send attempt   │ Retry
         │                │
         ▼                │
  ┌─────────────┐         │
  │  Status:    │         │
  │  sent       │         │
  └──────┬──────┘         │
         │                │
         │ Acknowledged   │
         │ or             │
         │ Timeout        │
         │                │
         ▼                │
  ┌──────────────┐        │
  │  Status:     │        │
  │  acknowledged│        │
  │  OR          │        │
  │  failed      │────────┘
  └──────┬───────┘
         │
         │ Age > maxMessageAgeMs
         │ (default: 24 hours)
         │
         ▼
  ┌─────────────────┐
  │ Cleanup Check   │
  └──────┬──────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
[pending] [sent/acknowledged]
[failed]      │
    │         │
    │         ▼
    │   ┌──────────┐
    │   │ DELETED  │
    │   └──────────┘
    │
    └──▶ PRESERVED
        (for retry)
```

## Component Integration

```
┌─────────────────────────────────────────────────────────────────┐
│                        React Application                         │
└─────────────────────────────────────────────────────────────────┘
                           │
           ┌───────────────┼───────────────┐
           │               │               │
           ▼               ▼               ▼
    ┌──────────┐   ┌──────────┐   ┌──────────┐
    │ Game UI  │   │ Settings │   │ Debug    │
    │          │   │ Page     │   │ Panel    │
    └─────┬────┘   └─────┬────┘   └─────┬────┘
          │              │               │
          │              ▼               │
          │    ┌─────────────────────┐  │
          │    │ useIndexedDBCleanup │  │
          │    │      (Hook)          │  │
          │    └─────────┬───────────┘  │
          │              │               │
          │              ▼               │
          │    ┌─────────────────────┐  │
          │    │ IndexedDBCleanup    │  │
          │    │  Panel Component    │  │
          │    └─────────┬───────────┘  │
          │              │               │
          └──────────────┼───────────────┘
                         │
                         ▼
              ┌──────────────────┐
              │ IndexedDBService │
              │   (Singleton)    │
              └──────────────────┘
                         │
                         ▼
              ┌──────────────────┐
              │   Browser         │
              │   IndexedDB       │
              └──────────────────┘
```

## Statistics Tracking

```
┌────────────────────────────────────────────────────────────┐
│                    Cleanup Statistics                       │
└────────────────────────────────────────────────────────────┘

              cleanupStats Object
              ┌─────────────────────────┐
              │                         │
              │  lastCleanupTime        │────▶ Timestamp of last cleanup
              │  (number)               │      Used to check interval
              │                         │
              │  totalMessagesDeleted   │────▶ Lifetime count
              │  (number)               │      Increments on each cleanup
              │                         │
              │  lastDeletedCount       │────▶ Most recent cleanup
              │  (number)               │      Updated each cleanup
              │                         │
              └─────────────────────────┘
                         │
                         │ Accessed by
                         │
              ┌──────────┴──────────┐
              │                     │
              ▼                     ▼
    ┌──────────────────┐  ┌──────────────────┐
    │ React Components │  │ Manual Queries   │
    │ (via hook)       │  │ (DevTools)       │
    └──────────────────┘  └──────────────────┘
```

## Configuration Flow

```
┌────────────────────────────────────────────────────────────┐
│               Configuration Hierarchy                       │
└────────────────────────────────────────────────────────────┘

  StorageConfig.ts
  ┌──────────────────────┐
  │ DEFAULT_STORAGE_     │
  │ CONFIG               │
  │                      │
  │ cleanup: {           │
  │   maxMessageAgeMs    │───▶ 24 hours (default)
  │   checkIntervalMs    │───▶ 6 hours (default)
  │ }                    │
  └──────────┬───────────┘
             │
             │ Used by
             │
             ▼
  ┌──────────────────────┐
  │ IndexedDBService     │
  │                      │
  │ checkAndCleanup()    │
  │ ├─ Uses intervalMs   │
  │ │                    │
  │ clearOldMessages()   │
  │ └─ Uses maxAgeMs     │
  └──────────────────────┘
             │
             │ Can be overridden by
             │
             ▼
  ┌──────────────────────┐
  │ manualCleanup()      │
  │ (maxAgeMs?: number)  │───▶ Custom age parameter
  └──────────────────────┘
             │
             │ Called from
             │
             ▼
  ┌──────────────────────┐
  │ UI / User Action     │
  └──────────────────────┘
```

## Performance Timeline

```
Time:  0s         6h        12h       18h       24h       30h
       │          │          │          │          │          │
       │          │          │          │          │          │
Store: ▲──────────▲──────────▲──────────▲──────────▲──────────▲
       │          │          │          │          │          │
       │          │          │          │          │          │
Check: ●          ●          ●          ●          ●          ●
       │          │          │          │          │          │
       ├─ Skip    ├─ Run     ├─ Skip    ├─ Run     ├─ Skip    ├─ Run
       │          │          │          │          │          │
Clean: │          ◉          │          ◉          │          ◉
       │          │          │          │          │          │
       │          ▼          │          ▼          │          ▼
       │     Delete msgs     │     Delete msgs     │     Delete msgs
       │     older than      │     older than      │     older than
       │     24h from 0s     │     24h from 6h     │     24h from 12h

Legend:
  ▲ = Message storage operation
  ● = Cleanup interval check
  ◉ = Actual cleanup execution
```

## Error Handling Flow

```
┌─────────────────────────────────────────────────────────────┐
│                  Error Handling Strategy                     │
└─────────────────────────────────────────────────────────────┘

  Any Cleanup Operation
         │
         ▼
  ┌─────────────┐
  │ try {       │
  │   cleanup() │
  │ }           │
  └──────┬──────┘
         │
         ├─ Success ─────────▶ Log info, update stats
         │
         └─ Error
            │
            ▼
     ┌──────────────┐
     │ catch (err)  │
     └──────┬───────┘
            │
            ├─▶ Log error to console
            │
            ├─▶ Don't update lastCleanupTime
            │   (will retry next interval)
            │
            ├─▶ Don't throw error
            │   (don't crash app)
            │
            └─▶ Continue normal operation

Result: Graceful degradation
        - App continues working
        - User is unaffected
        - Cleanup retries naturally
        - Errors are logged for debugging
```

This visual documentation helps understand the complete flow and architecture of the IndexedDB auto-cleanup system.
