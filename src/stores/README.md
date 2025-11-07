# Zustand Stores

This directory contains Zustand-based state management stores for the application. Zustand was chosen over React Context API for improved performance and simpler code.

## Why Zustand?

### Performance Benefits
- **Granular Subscriptions**: Components only re-render when the specific data they subscribe to changes
- **No Provider Wrapper**: Direct hook access without context providers
- **Redux DevTools**: Built-in debugging support
- **Smaller Bundle**: Lighter than Redux or MobX

### Code Quality Benefits
- **Type Safety**: Full TypeScript support
- **Simple API**: Less boilerplate than Redux
- **Direct Access**: No prop drilling
- **Middleware Support**: Easy to extend functionality

## Stores

### Combat Store (`useCombatStore.ts`)

Manages all combat-related state for D&D 5e combat encounters.

#### Key Features
- Initiative tracking
- Turn management
- Participant HP and conditions
- Reaction opportunities
- Combat actions logging

#### Usage Example

```typescript
import {
  useCombatStore,
  useParticipants,
  useCurrentTurnParticipantId,
  useIsInCombat
} from '@/stores/useCombatStore';

function MyComponent() {
  // Granular subscription - only re-renders when participants change
  const participants = useParticipants();

  // Get action from store
  const nextTurn = useCombatStore((state) => state.nextTurn);

  return (
    <div>
      {participants.map(p => (
        <div key={p.id}>{p.name}</div>
      ))}
      <button onClick={nextTurn}>Next Turn</button>
    </div>
  );
}
```

#### Selector Hooks

The store provides pre-built selector hooks for common access patterns:

- `useParticipants()` - Get all combat participants
- `useCurrentTurnParticipantId()` - Get current turn participant ID
- `useCurrentRound()` - Get current round number
- `useIsInCombat()` - Get combat status
- `useActiveEncounter()` - Get full encounter object
- `useParticipant(id)` - Get specific participant by ID

#### Actions

All actions are available through the main store hook:

```typescript
const {
  nextTurn,
  startCombat,
  endCombat,
  addParticipant,
  updateParticipant,
  dealDamage,
  // ... and more
} = useCombatStore();
```

## Migration from Context API

Components are being incrementally migrated from Context API to Zustand:

### Before (Context API)
```typescript
const { state, nextTurn } = useCombat();
// Component re-renders on ANY combat state change
```

### After (Zustand)
```typescript
const participants = useParticipants();
const nextTurn = useCombatStore((state) => state.nextTurn);
// Component only re-renders when participants change
```

### Migration Checklist

When migrating a component:

1. ✅ Replace `useCombat()` with granular selectors
2. ✅ Use `useCombatStore()` for actions
3. ✅ Add `useMemo` for expensive calculations
4. ✅ Update tests to mock Zustand store
5. ✅ Document migration in component header
6. ✅ Verify no unnecessary re-renders

## Testing Zustand Stores

### Component Tests

```typescript
import { vi } from 'vitest';
import { useCombatStore } from '@/stores/useCombatStore';

// Mock the store
vi.mock('@/stores/useCombatStore', () => ({
  useCombatStore: vi.fn(),
  useParticipants: vi.fn(),
}));

// In your test
const mockNextTurn = vi.fn();
(useCombatStore as any).mockImplementation((selector: any) => {
  if (selector.toString().includes('nextTurn')) return mockNextTurn;
  return undefined;
});
```

### Store Tests

```typescript
import { renderHook, act } from '@testing-library/react';
import { useCombatStore } from '@/stores/useCombatStore';

test('nextTurn advances to next participant', () => {
  const { result } = renderHook(() => useCombatStore());

  act(() => {
    result.current.startCombat();
    result.current.addParticipant(mockParticipant);
  });

  expect(result.current.isInCombat).toBe(true);
});
```

## DevTools

The combat store includes Redux DevTools integration for debugging:

1. Install [Redux DevTools Extension](https://github.com/reduxjs/redux-devtools)
2. Open DevTools in browser
3. Navigate to "Redux" tab
4. View all state changes with action names

## Performance Monitoring

To measure re-render reduction:

```typescript
import { useEffect, useRef } from 'react';

function useRenderCount(componentName: string) {
  const renderCount = useRef(0);
  useEffect(() => {
    renderCount.current += 1;
    console.log(`${componentName} rendered ${renderCount.current} times`);
  });
}

// In component
useRenderCount('InitiativeTracker');
```

## Best Practices

### 1. Use Granular Selectors

```typescript
// ❌ Bad - subscribes to entire state
const state = useCombatStore();

// ✅ Good - subscribes to specific slice
const participants = useParticipants();
```

### 2. Memoize Expensive Calculations

```typescript
// ✅ Good
const sortedParticipants = useMemo(() => {
  return participants.sort((a, b) => b.initiative - a.initiative);
}, [participants]);
```

### 3. Use Shallow Equality for Objects

```typescript
import { shallow } from 'zustand/shallow';

const { participant1, participant2 } = useCombatStore(
  (state) => ({
    participant1: state.participants[0],
    participant2: state.participants[1],
  }),
  shallow
);
```

### 4. Document Performance Characteristics

Always add JSDoc comments explaining:
- What data the component subscribes to
- When the component will re-render
- Performance improvements over previous implementation

## Future Enhancements

### Middleware Ideas
- **Persistence**: Save combat state to localStorage
- **Time Travel**: Implement undo/redo for combat actions
- **Logging**: Comprehensive action logging for debugging
- **Sync**: Multi-player state synchronization

### Additional Stores
- Character Store (for player character state)
- Campaign Store (for campaign-level data)
- UI Store (for global UI state)

## Resources

- [Zustand Documentation](https://github.com/pmndrs/zustand)
- [Redux DevTools](https://github.com/reduxjs/redux-devtools)
- [React Re-render Guide](https://react.dev/learn/render-and-commit)
