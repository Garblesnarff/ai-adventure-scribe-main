# Equality Utilities

Provides deep and shallow equality comparison functions for preventing unnecessary re-renders and state updates in React components.

## Files

- **`equality.ts`**: Core equality comparison utilities
- **`equality.test.ts`**: Comprehensive test suite (18 passing tests)

## When to Use

### Use These Utilities When:

1. **Comparing complex nested objects** in useEffect dependencies
2. **Implementing shouldComponentUpdate** or React.memo() comparisons
3. **Detecting actual state changes** vs. object reference changes
4. **Preventing infinite loops** from object recreation

### DON'T Use When:

1. **Comparing primitives** (use `===` or `!==`)
2. **Performance is critical** and values are deeply nested (consider extracting primitives)
3. **Object identity matters** (use reference equality instead)

## API Reference

### `deepEqual(a: any, b: any): boolean`

Performs deep equality check on any two values.

**Use Cases**:
- Comparing nested objects or arrays
- Detecting actual value changes in complex state
- Implementing custom equality checks

**Performance**: O(n) where n is total nested properties

**Example**:
```typescript
import { deepEqual } from '@/utils/equality';

const state1 = { user: { name: 'Alice', settings: { theme: 'dark' } } };
const state2 = { user: { name: 'Alice', settings: { theme: 'dark' } } };

deepEqual(state1, state2); // true (same values)

// In useEffect
useEffect(() => {
  if (!deepEqual(prevConfig, currentConfig)) {
    updateConfig(currentConfig);
  }
}, [currentConfig]);
```

### `shallowEqual(a: object, b: object): boolean`

Performs shallow equality check on object properties.

**Use Cases**:
- React.memo() comparison function
- Comparing flat objects
- Performance-sensitive comparisons

**Performance**: O(n) where n is number of top-level properties (much faster than deep equality)

**Example**:
```typescript
import { shallowEqual } from '@/utils/equality';

const props1 = { id: 1, name: 'Alice', onUpdate: fn };
const props2 = { id: 1, name: 'Alice', onUpdate: fn };

shallowEqual(props1, props2); // true

// With React.memo
const MyComponent = React.memo(Component, (prevProps, nextProps) => {
  return shallowEqual(prevProps, nextProps);
});
```

### `arrayEqual<T>(a: T[], b: T[], compareFn?: Function): boolean`

Compares arrays element by element.

**Use Cases**:
- Comparing arrays of primitives
- Comparing arrays of objects with custom comparator
- Detecting array changes in state

**Performance**: O(n) where n is array length (× comparator cost)

**Example**:
```typescript
import { arrayEqual, deepEqual } from '@/utils/equality';

// Primitives (default comparator uses ===)
arrayEqual([1, 2, 3], [1, 2, 3]); // true

// Objects with deep equality
const participants1 = [{ id: '1', name: 'Alice' }];
const participants2 = [{ id: '1', name: 'Alice' }];
arrayEqual(participants1, participants2, deepEqual); // true
```

### `pick<T>(obj: T, keys: K[]): Pick<T, K>`

Extracts specific properties from an object.

**Use Cases**:
- Extracting values to compare from complex state
- Creating lightweight copies for comparison
- Optimizing equality checks

**Performance**: O(k) where k is number of keys

**Example**:
```typescript
import { pick, shallowEqual } from '@/utils/equality';

const combatState = {
  isInCombat: true,
  currentTurnPlayerId: 'player-123',
  activeEncounter: { /* complex nested object */ },
  participants: [/* large array */]
};

// Extract only what you need to compare
const current = pick(combatState, ['isInCombat', 'currentTurnPlayerId']);
const previous = pick(prevCombatState, ['isInCombat', 'currentTurnPlayerId']);

if (!shallowEqual(current, previous)) {
  // Only these two properties changed
}
```

## Performance Comparison

### Primitive Extraction (Recommended)
```typescript
// Extract primitives before comparing - O(1)
const isInCombat = state.isInCombat;
const playerId = state.currentTurnPlayerId;

if (prevIsInCombat !== isInCombat || prevPlayerId !== playerId) {
  // Update
}
```
**Time**: <1ms
**Best for**: When you only need to track specific primitive values

### Shallow Equality
```typescript
// Compare top-level properties - O(n)
if (!shallowEqual(prevProps, nextProps)) {
  // Update
}
```
**Time**: 1-5ms (depending on property count)
**Best for**: Flat objects with many properties

### Deep Equality
```typescript
// Compare all nested properties - O(n × depth)
if (!deepEqual(prevState, nextState)) {
  // Update
}
```
**Time**: 5-50ms (depending on nesting and size)
**Best for**: When you need to detect any change in complex nested state

## Best Practices

### 1. Prefer Primitive Extraction

**Good**:
```typescript
// GameContext.tsx pattern (optimal)
const isInCombat = combatState.isInCombat;
const playerId = combatState.activeEncounter?.currentTurnParticipantId;

if (prevIsInCombat !== isInCombat || prevPlayerId !== playerId) {
  dispatch({ type: 'UPDATE', payload: { isInCombat, playerId } });
}
```

**Avoid**:
```typescript
// Unnecessary deep equality for primitives
if (!deepEqual({ isInCombat }, { isInCombat: prevIsInCombat })) {
  dispatch(...);
}
```

### 2. Use Shallow Equality for Props

**Good**:
```typescript
const MyComponent = React.memo(Component, (prev, next) => {
  return shallowEqual(prev, next);
});
```

**Avoid**:
```typescript
// Unnecessarily expensive
const MyComponent = React.memo(Component, (prev, next) => {
  return deepEqual(prev, next); // Only if needed!
});
```

### 3. Use Deep Equality Sparingly

**Good Use Cases**:
- Comparing user-provided configuration objects
- Detecting changes in form state
- Comparing API response objects

**Avoid**:
- Comparing large arrays (use length + sample elements instead)
- Hot code paths (renders, animations)
- When primitive extraction would work

### 4. Optimize with Pick

**Good**:
```typescript
// Only compare what matters
const relevantProps = pick(state, ['userId', 'isActive', 'permissions']);
if (!shallowEqual(prevRelevant, relevantProps)) {
  // Update
}
```

**Avoid**:
```typescript
// Comparing entire large state object
if (!deepEqual(prevState, state)) {
  // Slow if state is large
}
```

## Common Patterns

### Pattern 1: Preventing Infinite Loops in useEffect

```typescript
const prevStateRef = useRef(initialState);

useEffect(() => {
  const currentValues = pick(externalState, ['key1', 'key2']);
  const previousValues = prevStateRef.current;

  if (!shallowEqual(currentValues, previousValues)) {
    prevStateRef.current = currentValues;
    dispatch({ type: 'SYNC', payload: currentValues });
  }
}, [externalState.key1, externalState.key2]);
```

### Pattern 2: Optimizing React.memo

```typescript
const ExpensiveComponent = React.memo(
  ({ config, data }) => {
    // Component implementation
  },
  (prevProps, nextProps) => {
    // Only re-render if these specific fields change
    return (
      prevProps.config.id === nextProps.config.id &&
      shallowEqual(prevProps.data, nextProps.data)
    );
  }
);
```

### Pattern 3: Detecting Array Changes

```typescript
useEffect(() => {
  if (!arrayEqual(prevParticipants, participants,
      (a, b) => a.id === b.id && a.initiative === b.initiative)) {
    // Only re-sort if participants or initiative changed
    const sorted = sortByInitiative(participants);
    setInitiativeOrder(sorted);
  }
}, [participants]);
```

## Testing

Run tests:
```bash
npx vitest run src/utils/equality.test.ts
```

All 18 tests should pass:
- ✅ Primitive comparisons
- ✅ Simple object comparisons
- ✅ Nested object comparisons
- ✅ Array comparisons
- ✅ Date and RegExp comparisons
- ✅ Combat state scenario
- ✅ Edge cases (null, undefined, empty)

## Related Files

- `/src/contexts/GameContext.tsx` - Example of optimal primitive extraction pattern
- `/src/types/combat.ts` - Complex state types that might need deep equality

## References

- [React memo optimization](https://react.dev/reference/react/memo)
- [useEffect dependencies](https://react.dev/reference/react/useEffect)
- [React re-render optimization](https://react.dev/learn/render-and-commit)
