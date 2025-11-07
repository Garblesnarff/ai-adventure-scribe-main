# Combat Feature - Zustand Store

Modern state management for D&D 5e combat system using Zustand.

## Overview

This directory contains a **modern Zustand-based state management solution** that replaces the 1,199-line `CombatContext.tsx` React Context implementation. The new architecture provides:

- **Slice-based modularity** - Separated concerns for easier maintenance
- **Redux DevTools** - Full debugging and time-travel capabilities
- **LocalStorage persistence** - Automatic session recovery
- **Type-safe selectors** - Optimized component re-renders
- **Smaller footprint** - ~400 lines total vs 1,199 lines

## Directory Structure

```
src/features/combat/
├── components/
│   └── ui/                      # Combat UI components
│       ├── CombatInterface.tsx
│       ├── InitiativeTracker.tsx
│       ├── CombatLog.tsx
│       └── ... (all combat components)
├── stores/
│   ├── combatStore.ts           # Main store with middleware (150 lines)
│   ├── selectors.ts             # Computed state selectors (165 lines)
│   ├── slices/
│   │   ├── encounterSlice.ts    # Encounter lifecycle (72 lines)
│   │   ├── participantsSlice.ts # Participant management (220 lines)
│   │   ├── turnsSlice.ts        # Turn progression (155 lines)
│   │   └── actionsSlice.ts      # Actions & reactions (155 lines)
│   └── index.ts                 # Exports
├── index.ts                     # Feature public API
└── README.md                    # This file
```

## Architecture

### State Slices

The store is divided into four focused slices:

1. **Encounter Slice** - Combat encounter metadata and lifecycle
2. **Participants Slice** - Participant management, HP, conditions
3. **Turns Slice** - Turn progression and initiative order
4. **Actions Slice** - Combat actions, reactions, and UI state

### Middleware Stack

1. **DevTools Middleware** - Redux DevTools integration (development only)
2. **Persist Middleware** - LocalStorage persistence for session recovery
3. **Custom Combat Log** - Logs state changes for audit trail

## Usage

### Basic Example

```tsx
import { useCombatStore } from '@/features/combat/stores';
import { selectCurrentParticipant } from '@/features/combat/stores/selectors';

function CombatComponent() {
  // Access store actions
  const { startCombat, nextTurn, dealDamage } = useCombatStore();

  // Access state with selector (optimized re-renders)
  const currentParticipant = useCombatStore(selectCurrentParticipant);
  const isInCombat = useCombatStore((state) => state.isInCombat);

  const handleStartCombat = () => {
    startCombat('session-123', [
      { name: 'Aragorn', participantType: 'player', maxHitPoints: 50 },
      { name: 'Orc', participantType: 'enemy', maxHitPoints: 15 },
    ]);
  };

  return (
    <div>
      {isInCombat && <button onClick={nextTurn}>Next Turn</button>}
      {currentParticipant && <div>{currentParticipant.name}'s turn</div>}
    </div>
  );
}
```

### Starting Combat

```tsx
const { startCombat } = useCombatStore();

startCombat('session-id', [
  {
    id: 'player-1',
    name: 'Gandalf',
    participantType: 'player',
    maxHitPoints: 60,
    armorClass: 15,
    initiative: 3, // Initiative bonus, not roll
  },
  {
    id: 'enemy-1',
    name: 'Balrog',
    participantType: 'enemy',
    maxHitPoints: 150,
    armorClass: 19,
    initiative: 2,
  },
]);
```

### Managing Participants

```tsx
const { addParticipant, removeParticipant, updateParticipant } = useCombatStore();

// Add a late arrival
addParticipant({
  id: 'npc-1',
  name: 'Gimli',
  participantType: 'npc',
  maxHitPoints: 45,
  initiative: 15, // Already rolled
});

// Remove defeated enemy
removeParticipant('enemy-1');

// Update participant
updateParticipant('player-1', {
  currentHitPoints: 35,
  conditions: [...],
});
```

### Dealing Damage and Healing

```tsx
const { dealDamage, healDamage } = useCombatStore();

// Deal damage (handles temp HP automatically)
dealDamage('enemy-1', 25, 'fire');

// Heal damage
healDamage('player-1', 10);
```

### Managing Conditions

```tsx
const { applyCondition, removeCondition } = useCombatStore();

// Apply condition
applyCondition('enemy-1', {
  name: 'poisoned',
  description: 'Disadvantage on attacks and ability checks',
  duration: 3, // rounds
});

// Remove condition
removeCondition('enemy-1', 'poisoned');
```

### Turn Management

```tsx
const { nextTurn, setCurrentTurn, rerollInitiative } = useCombatStore();

// Advance to next turn (auto-skips defeated participants)
nextTurn();

// Set turn to specific participant
setCurrentTurn('player-1');

// Reroll initiative
rerollInitiative('player-1', 18);
```

### Using Selectors

Selectors provide computed state and prevent unnecessary re-renders:

```tsx
import {
  selectCurrentParticipant,
  selectActiveParticipants,
  selectCombatStatus,
  selectInitiativeOrder,
} from '@/features/combat/stores/selectors';

function InitiativeTracker() {
  // Only re-renders when initiative order changes
  const initiativeOrder = useCombatStore(selectInitiativeOrder);
  const currentParticipant = useCombatStore(selectCurrentParticipant);

  return (
    <div>
      {initiativeOrder.map((p) => (
        <div key={p.id} className={p.id === currentParticipant?.id ? 'active' : ''}>
          {p.name} - Initiative: {p.initiative}
        </div>
      ))}
    </div>
  );
}

function CombatStatus() {
  const status = useCombatStore(selectCombatStatus);

  return (
    <div>
      Round: {status.round} |
      Active: {status.activeParticipantCount} / {status.participantCount}
    </div>
  );
}
```

### Parameterized Selectors

```tsx
import { selectParticipantById, selectParticipantActionStatus } from '@/features/combat/stores/selectors';

function ParticipantCard({ participantId }: { participantId: string }) {
  // Select specific participant
  const participant = useCombatStore(selectParticipantById(participantId));
  const actionStatus = useCombatStore(selectParticipantActionStatus(participantId));

  if (!participant) return null;

  return (
    <div>
      <h3>{participant.name}</h3>
      <div>HP: {participant.currentHitPoints} / {participant.maxHitPoints}</div>
      <div>
        Action: {actionStatus.actionTaken ? '✓' : '○'} |
        Bonus: {actionStatus.bonusActionTaken ? '✓' : '○'} |
        Reaction: {actionStatus.reactionTaken ? '✓' : '○'}
      </div>
    </div>
  );
}
```

### Ending Combat

```tsx
const { endCombat } = useCombatStore();

// End combat and clean up
endCombat();
```

## State Structure Comparison

### Before (React Context)

```typescript
// CombatContext: 1,199 lines
const [state, dispatch] = useReducer(combatReducer, initialState);

// 25+ reducer action types
type ReducerAction =
  | { type: 'SET_ENCOUNTER'; encounter: CombatEncounter }
  | { type: 'START_COMBAT' }
  | { type: 'END_COMBAT' }
  | { type: 'UPDATE_PARTICIPANT'; participantId: string; updates: Partial<CombatParticipant> }
  // ... 21 more action types

// 325 lines of reducer logic
function combatReducer(state: CombatState, action: ReducerAction): CombatState {
  switch (action.type) {
    case 'SET_ENCOUNTER':
      return { ...state, activeEncounter: action.encounter };
    // ... 24 more cases
  }
}
```

### After (Zustand)

```typescript
// combatStore.ts: 150 lines (main store)
// 4 slice files: ~150 lines each = 600 lines
// selectors.ts: 165 lines
// Total: ~765 lines vs 1,199 lines (36% reduction)

// Clean, direct actions
const { startCombat, nextTurn, dealDamage } = useCombatStore();

// No dispatch, no action types
startCombat('session-123', participants);
nextTurn();
dealDamage('enemy-1', 25, 'fire');
```

## Actions Reference

### Encounter Actions

- `setEncounter(encounter)` - Set active encounter
- `updateEncounter(updates)` - Update encounter properties
- `setPhase(phase)` - Change combat phase
- `clearEncounter()` - Clear encounter state
- `startCombat(sessionId, participants)` - Start new combat
- `endCombat()` - End combat and cleanup

### Participant Actions

- `addParticipant(participant)` - Add participant to combat
- `removeParticipant(participantId)` - Remove participant
- `updateParticipant(participantId, updates)` - Update participant data
- `dealDamage(participantId, damage, damageType?)` - Deal damage
- `healDamage(participantId, healing)` - Heal damage
- `applyCondition(participantId, condition)` - Apply condition
- `removeCondition(participantId, conditionName)` - Remove condition
- `updateDeathSaves(participantId, successes, failures)` - Update death saves

### Turn Actions

- `nextTurn()` - Advance to next turn
- `startNewRound()` - Start new round
- `setCurrentTurn(participantId)` - Set current turn
- `rerollInitiative(participantId, newInitiative)` - Reroll initiative
- `updateInitiativeOrder(newOrder)` - Manually reorder initiative

### Action & UI Actions

- `addAction(action)` - Add combat action to log
- `setPendingAction(action?)` - Set pending action
- `setSelectedParticipant(participantId?)` - Select participant
- `setSelectedTarget(targetId?)` - Select target
- `toggleInitiativeTracker()` - Toggle tracker visibility
- `toggleCombatLog()` - Toggle log visibility
- `addReactionOpportunity(opportunity)` - Add reaction opportunity
- `removeReactionOpportunity(opportunityId)` - Remove reaction opportunity
- `clearReactionOpportunities()` - Clear all reaction opportunities
- `setPendingReaction(opportunityId, reaction)` - Set pending reaction

## Selectors Reference

### Participant Selectors

- `selectCurrentParticipant` - Current turn participant
- `selectActiveParticipants` - All participants with HP > 0
- `selectDefeatedParticipants` - Dead participants
- `selectUnconsciousParticipants` - Unconscious participants
- `selectParticipantById(id)` - Specific participant
- `selectPlayerParticipants` - All players
- `selectEnemyParticipants` - All enemies
- `selectNpcParticipants` - All NPCs

### Combat Selectors

- `selectCombatStatus` - Overall combat status
- `selectInitiativeOrder` - Sorted initiative order
- `selectCombatLog` - All combat actions
- `selectCurrentRoundActions` - Actions in current round

### Action Selectors

- `selectParticipantActionStatus(id)` - Action economy status
- `selectReactionOpportunities` - Available reactions
- `selectPendingReaction` - Pending reaction response

### UI Selectors

- `selectUIState` - UI state (selections, visibility)

## Middleware Configuration

### Redux DevTools

Enabled in development mode only:

```typescript
devtools(
  // ... store config
  {
    name: 'Combat Store',
    enabled: import.meta.env.DEV,
  }
)
```

Access via Redux DevTools browser extension for:
- Time-travel debugging
- Action history
- State inspection

### LocalStorage Persistence

Persists essential combat state:

```typescript
persist(
  // ... store config
  {
    name: 'combat-storage',
    partialize: (state) => ({
      activeEncounter: state.activeEncounter,
      isInCombat: state.isInCombat,
      currentTurnId: state.currentTurnId,
      round: state.round,
    }),
  }
)
```

Combat state survives:
- Page refreshes
- Browser restarts
- Tab closures

## Performance Benefits

### Context vs Zustand

| Metric | Context | Zustand | Improvement |
|--------|---------|---------|-------------|
| Lines of Code | 1,199 | 765 | 36% smaller |
| Re-renders | All consumers | Selector-based | Significantly fewer |
| DevTools | None | Redux DevTools | Full debugging |
| Persistence | Manual | Automatic | Built-in |
| Testing | Complex | Simple | Easier mocking |

### Selector Benefits

```tsx
// Context: Component re-renders on ANY state change
const { state } = useCombat();
const currentParticipant = state.activeEncounter?.participants.find(...);

// Zustand: Component only re-renders when selector result changes
const currentParticipant = useCombatStore(selectCurrentParticipant);
```

## Migration Guide

### From Context to Store

```tsx
// Before (Context)
import { useCombat } from '@/contexts/CombatContext';

function Component() {
  const { state, startCombat, nextTurn, dealDamage } = useCombat();
  const isInCombat = state.isInCombat;
  const currentParticipant = state.activeEncounter?.participants.find(
    p => p.id === state.activeEncounter?.currentTurnParticipantId
  );
  // ...
}

// After (Zustand)
import { useCombatStore } from '@/features/combat/stores';
import { selectCurrentParticipant } from '@/features/combat/stores/selectors';

function Component() {
  const { startCombat, nextTurn, dealDamage } = useCombatStore();
  const isInCombat = useCombatStore((state) => state.isInCombat);
  const currentParticipant = useCombatStore(selectCurrentParticipant);
  // Exact same API, better performance
}
```

## Testing

Zustand stores are easy to test:

```typescript
import { useCombatStore } from '@/features/combat/stores';

describe('Combat Store', () => {
  beforeEach(() => {
    // Reset store between tests
    useCombatStore.setState({
      activeEncounter: null,
      isInCombat: false,
      // ... reset all state
    });
  });

  it('should start combat', () => {
    const { startCombat } = useCombatStore.getState();

    startCombat('session-123', [
      { name: 'Hero', participantType: 'player', maxHitPoints: 50 },
    ]);

    const state = useCombatStore.getState();
    expect(state.isInCombat).toBe(true);
    expect(state.activeEncounter?.participants).toHaveLength(1);
  });

  it('should deal damage', () => {
    // ... test damage logic
  });
});
```

## Future Enhancements

Potential improvements for this store:

1. **Immer middleware** - For easier nested state updates
2. **Subscriptions** - React to specific state changes
3. **Async actions** - API calls for database persistence
4. **Undo/Redo** - Combat action history with rollback
5. **Multi-encounter support** - Run multiple combats simultaneously

## Related Documentation

- [Zustand Documentation](https://docs.pmnd.rs/zustand/getting-started/introduction)
- [Redux DevTools](https://github.com/reduxjs/redux-devtools)
- [D&D 5e Combat Rules](https://www.dndbeyond.com/sources/basic-rules/combat)
