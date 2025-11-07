# Combat Domain

Framework-agnostic D&D 5e combat logic extracted from React contexts.

## Overview

The Combat Domain provides pure TypeScript functions for managing D&D 5e combat mechanics. All logic is framework-agnostic with **ZERO React dependencies**, making it easily testable and reusable across different UI frameworks.

## Architecture

```
src/domains/combat/
├── types.ts                 # TypeScript type definitions
├── InitiativeTracker.ts     # Initiative rolling and ordering
├── TurnManager.ts           # Turn progression and round management
├── ParticipantManager.ts    # Participant CRUD and HP management
├── CombatEngine.ts          # Core combat mechanics (attacks, saves, death)
├── index.ts                 # Public API exports
└── __tests__/               # Comprehensive unit tests
    ├── InitiativeTracker.test.ts
    ├── TurnManager.test.ts
    ├── ParticipantManager.test.ts
    └── CombatEngine.test.ts
```

## Modules

### InitiativeTracker

Manages initiative rolling, sorting, and order management.

**Key Functions:**
- `rollInitiativeForParticipant(participant, modifier?)` - Roll initiative for one participant
- `rollInitiativeForAll(participants)` - Roll initiative for all participants
- `sortByInitiative(participants)` - Sort participants by initiative (highest first)
- `updateInitiative(participants, participantId, newInitiative)` - Update and re-sort
- `reorderParticipants(participants, newOrder)` - Manual reordering (drag-drop)
- `getInitiativeOrder(participants)` - Get sorted participant IDs
- `getFirstInInitiative(participants)` - Get participant with highest initiative
- `groupByInitiative(participants)` - Group participants by initiative value

### TurnManager

Handles turn progression, round advancement, and turn state management.

**Key Functions:**
- `canTakeTurn(participant)` - Check if participant can take their turn
- `findNextValidParticipant(participants, currentIndex)` - Find next conscious participant
- `advanceTurn(participants, currentId, currentRound)` - Advance to next turn
- `resetTurnState(participant)` - Reset action economy for new turn
- `resetAllTurnStates(participants)` - Reset all participants (new round)
- `getCurrentParticipant(participants, currentId)` - Get current turn participant
- `isParticipantsTurn(currentId, participantId)` - Check if it's someone's turn
- `getTurnOrderNumber(participants, participantId)` - Get 1-indexed turn order
- `processEndOfTurnEffects(participants, currentId)` - Handle end-of-turn effects
- `processStartOfTurnEffects(participant)` - Handle start-of-turn effects

### ParticipantManager

Manages participant CRUD operations, HP management, and conditions.

**Key Functions:**
- `createParticipant(partial, options?)` - Create new participant with defaults
- `addParticipant(participants, newParticipant)` - Add and maintain initiative order
- `removeParticipant(participants, participantId)` - Remove from combat
- `updateParticipant(participants, participantId, updates)` - Update properties
- `findParticipant(participants, participantId)` - Find by ID
- `calculateDamageWithResistances(participant, options)` - Calculate final damage
- `applyDamage(participant, options)` - Apply damage with resistances
- `applyHealing(participant, options)` - Apply healing
- `applyTemporaryHP(participant, tempHP)` - Apply temp HP (take higher)
- `addCondition(participant, condition)` - Add/refresh condition
- `removeCondition(participant, conditionName)` - Remove condition
- `hasCondition(participant, conditionName)` - Check for condition
- `getParticipantsByType(participants, type)` - Filter by type
- `getAliveParticipants(participants)` - Get all alive participants
- `getUnconsciousParticipants(participants)` - Get all unconscious participants
- `getDeadParticipants(participants)` - Get all dead participants
- `shouldCombatEnd(participants)` - Check if combat should end

### CombatEngine

Core D&D 5e combat mechanics: attacks, saves, death saves, concentration.

**Key Functions:**
- `rollDeathSave(participant)` - Roll death saving throw
- `isDead(participant)` - Check if participant is dead (3 failures)
- `isUnconscious(participant)` - Check if participant is unconscious
- `isStable(participant)` - Check if participant is stable
- `stabilize(participant)` - Stabilize a dying participant
- `rollAttack(attackBonus, options?)` - Roll attack with advantage/disadvantage
- `doesAttackHit(attackRoll, targetAC)` - Check if attack hits
- `rollDamage(diceExpression, isCritical)` - Roll damage dice (doubles on crit)
- `rollSavingThrow(saveBonus, dc, options?)` - Roll saving throw
- `checkConcentration(participant, damage, conSaveBonus)` - Check concentration
- `breakConcentration(participant)` - Break concentration
- `checkMassiveDamage(participant, damageAmount)` - Check for instant death
- `getCriticalMultiplier(participant)` - Get critical hit multiplier

## Usage Examples

### Rolling Initiative

```typescript
import { rollInitiativeForParticipant, sortByInitiative } from '@/domains/combat';

// Roll initiative for a participant
const result = rollInitiativeForParticipant(participant, 3); // +3 modifier
console.log(`Rolled ${result.initiative}`);

// Sort all participants by initiative
const sorted = sortByInitiative(participants);
```

### Managing Turns

```typescript
import { advanceTurn, resetTurnState } from '@/domains/combat';

// Advance to next turn
const { nextParticipantId, newRound, participantsToUpdate } = advanceTurn(
  participants,
  currentParticipantId,
  currentRound
);

// Apply updates to next participant
for (const [id, updates] of participantsToUpdate) {
  // Update participant with new action economy
}
```

### Applying Damage

```typescript
import { applyDamage, applyHealing } from '@/domains/combat';

// Apply damage with resistances
const { participant: damaged, result } = applyDamage(participant, {
  damage: 20,
  damageType: 'fire',
});

console.log(`Took ${result.finalDamage} damage (${result.wasResisted ? 'resisted' : 'full'})`);

// Heal participant
const { participant: healed, result: healResult } = applyHealing(participant, {
  healing: 10,
});
```

### Rolling Attacks and Damage

```typescript
import { rollAttack, doesAttackHit, rollDamage } from '@/domains/combat';

// Roll attack with advantage
const { roll: attackRoll } = rollAttack(5, { advantage: true });

// Check if it hits
const hits = doesAttackHit(attackRoll, targetAC);

if (hits) {
  // Roll damage (double dice on crit)
  const damageRoll = rollDamage('1d8+3', attackRoll.critical);
  console.log(`Dealt ${damageRoll.total} damage`);
}
```

### Death Saves

```typescript
import { rollDeathSave, isDead, isStable } from '@/domains/combat';

if (participant.currentHitPoints <= 0 && !isDead(participant)) {
  const { result, updatedParticipant } = rollDeathSave(participant);

  if (result === 'critical') {
    console.log('Natural 20! Regained 1 HP');
  } else if (isDead(updatedParticipant)) {
    console.log('Participant has died');
  } else if (isStable(updatedParticipant)) {
    console.log('Participant is stable');
  }
}
```

## Integration with React

While the domain logic is framework-agnostic, it integrates with React contexts like this:

```typescript
// In CombatContext.tsx
import { advanceTurn, applyDamage } from '@/domains/combat';

const nextTurn = useCallback(async () => {
  if (!state.activeEncounter) return;

  // Use pure domain logic
  const result = advanceTurn(
    state.activeEncounter.participants,
    state.activeEncounter.currentTurnParticipantId,
    state.activeEncounter.currentRound
  );

  // Apply updates via React state management
  dispatch({ type: 'ADVANCE_TURN', payload: result });
}, [state.activeEncounter]);
```

## Testing

All modules have comprehensive unit tests with 100% coverage of core logic:

```bash
npm run server:test -- src/domains/combat
```

Tests are located in `__tests__/` and use Vitest with mocked dice rolls for deterministic testing.

## Design Principles

1. **Pure Functions** - No side effects, easy to test
2. **Immutability** - All functions return new objects, never mutate
3. **Framework-Agnostic** - Zero React dependencies
4. **Type-Safe** - Full TypeScript coverage
5. **Testable** - Comprehensive unit test coverage
6. **Single Responsibility** - Each module handles one concern
7. **Composable** - Functions can be combined for complex behaviors

## What Remains in CombatContext?

After extraction, `CombatContext.tsx` should only contain:

- React-specific code (`useState`, `useReducer`, `useContext`, etc.)
- State management and dispatching
- Database operations (Supabase)
- Side effects (logging, API calls)
- Context provider wrapper
- Integration with other React contexts (CharacterContext)
- UI state management (selected participants, modal visibility)

## File Size

All files are under 200 lines as per code standards:

- `types.ts`: 92 lines
- `InitiativeTracker.ts`: 148 lines
- `TurnManager.ts`: 193 lines
- `ParticipantManager.ts`: 199 lines (just under limit!)
- `CombatEngine.ts`: 194 lines
- `index.ts`: 97 lines

## Future Enhancements

Potential additions to the combat domain:

- [ ] Spell slot management
- [ ] Resource tracking (ki points, rage, etc.)
- [ ] Movement and positioning logic
- [ ] Area of effect calculations
- [ ] Cover and visibility checks
- [ ] Reaction trigger detection
- [ ] Legendary actions
- [ ] Lair actions
