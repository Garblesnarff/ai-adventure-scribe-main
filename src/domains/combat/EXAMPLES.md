# Combat Domain Usage Examples

## Before: Mixed React and Logic

```typescript
// In CombatContext.tsx (BEFORE)
const rollInitiative = useCallback(async (participantId: string): Promise<number> => {
  const participant = state.activeEncounter?.participants.find(p => p.id === participantId);
  if (!participant) return 0;

  const initiative = rollDie(20) + (participant.initiative || 0);

  dispatch({
    type: 'UPDATE_PARTICIPANT',
    participantId,
    updates: { initiative }
  });

  return initiative;
}, [state.activeEncounter]);

// React-specific code mixed with game logic
// Hard to test, tightly coupled
```

## After: Separated Concerns

```typescript
// In InitiativeTracker.ts (Pure Logic)
export function rollInitiativeForParticipant(
  participant: CombatParticipant,
  initiativeModifier?: number
): InitiativeRollResult {
  const modifier = initiativeModifier ?? participant.initiative ?? 0;
  const roll = rollDie(20);
  const total = roll + modifier;

  return {
    participantId: participant.id,
    initiative: total,
    roll: { /* DiceRoll object */ },
  };
}

// In CombatContext.tsx (React Integration)
const rollInitiative = useCallback(async (participantId: string): Promise<number> => {
  const participant = state.activeEncounter?.participants.find(p => p.id === participantId);
  if (!participant) return 0;

  // Use pure domain logic
  const result = rollInitiativeForParticipant(participant);

  // React state management
  dispatch({
    type: 'UPDATE_PARTICIPANT',
    participantId,
    updates: { initiative: result.initiative }
  });

  return result.initiative;
}, [state.activeEncounter]);
```

## Example Use Cases

### 1. Rolling Initiative for All Participants

```typescript
import { rollInitiativeForAll, sortByInitiative } from '@/domains/combat';

// Roll for everyone
const results = rollInitiativeForAll(participants);

// Get sorted order
const sorted = sortByInitiative(
  participants.map(p => ({
    ...p,
    initiative: results.get(p.id)!.initiative
  }))
);

console.log('Initiative order:', sorted.map(p => p.name));
```

### 2. Advancing Through Turns

```typescript
import { advanceTurn, getCurrentParticipant } from '@/domains/combat';

// Get current participant
const current = getCurrentParticipant(participants, currentParticipantId);
console.log(`${current?.name}'s turn`);

// Advance to next turn
const { nextParticipantId, newRound, participantsToUpdate } = advanceTurn(
  participants,
  currentParticipantId,
  currentRound
);

if (newRound > currentRound) {
  console.log(`Starting round ${newRound}`);
}

// Apply action economy resets
for (const [id, updates] of participantsToUpdate) {
  participants = updateParticipant(participants, id, updates);
}
```

### 3. Combat Resolution Flow

```typescript
import {
  rollAttack,
  doesAttackHit,
  rollDamage,
  applyDamage,
  rollDeathSave,
  isDead
} from '@/domains/combat';

// Attacker rolls
const { roll: attackRoll } = rollAttack(attackBonus, { advantage: true });

// Check if it hits
const hits = doesAttackHit(attackRoll, targetAC);

if (hits) {
  // Roll damage (double on crit)
  const damageRoll = rollDamage('1d8+3', attackRoll.critical);

  // Apply to target
  const { participant: damagedTarget, result } = applyDamage(target, {
    damage: damageRoll.total,
    damageType: 'piercing'
  });

  console.log(`Hit for ${result.finalDamage} damage${result.wasResisted ? ' (resisted)' : ''}`);

  // Check if they need to roll death saves
  if (damagedTarget.currentHitPoints <= 0 && !isDead(damagedTarget)) {
    const { result: saveResult, updatedParticipant } = rollDeathSave(damagedTarget);

    if (saveResult === 'critical') {
      console.log('Natural 20! Regained 1 HP');
    } else if (isDead(updatedParticipant)) {
      console.log('Participant has died');
    }
  }
}
```

### 4. Condition Management

```typescript
import { addCondition, hasCondition, removeCondition } from '@/domains/combat';

// Apply poisoned condition
const poisonCondition: Condition = {
  name: 'poisoned',
  description: 'Poisoned by trap',
  duration: 3, // 3 rounds
  saveDC: 15,
  saveAbility: 'con',
  saveEndsType: 'end',
};

let participant = addCondition(currentParticipant, poisonCondition);

// Check if poisoned
if (hasCondition(participant, 'poisoned')) {
  console.log('Participant is poisoned');
}

// Remove condition
participant = removeCondition(participant, 'poisoned');
```

### 5. Healing and Temporary HP

```typescript
import { applyHealing, applyTemporaryHP } from '@/domains/combat';

// Apply healing
const { participant: healed, result } = applyHealing(damagedParticipant, {
  healing: 15,
});

console.log(`Healed ${result.healingApplied} HP`);

// Apply temporary HP (takes higher value)
const withTempHP = applyTemporaryHP(healed, 10);
console.log(`Gained ${withTempHP.temporaryHitPoints} temp HP`);
```

### 6. Saving Throws and Concentration

```typescript
import { rollSavingThrow, checkConcentration } from '@/domains/combat';

// Roll a saving throw
const { roll, success } = rollSavingThrow(
  constitutionSaveBonus,
  spellDC,
  { advantage: true }
);

if (success) {
  console.log('Saved!');
} else {
  // Apply spell effect
}

// Check concentration after taking damage
if (participant.activeConcentration) {
  const { maintained, roll } = checkConcentration(participant, damageTaken, conSaveBonus);

  if (!maintained) {
    console.log(`Lost concentration on ${participant.activeConcentration}`);
  }
}
```

### 7. Combat End Conditions

```typescript
import { shouldCombatEnd, getAliveParticipants } from '@/domains/combat';

// Check if combat should end
const { shouldEnd, reason } = shouldCombatEnd(participants);

if (shouldEnd) {
  if (reason === 'all_enemies_defeated') {
    console.log('Victory!');
  } else if (reason === 'all_players_defeated') {
    console.log('Total party kill');
  }
}

// Get survivors
const survivors = getAliveParticipants(participants);
console.log(`${survivors.length} participants survived`);
```

## Testing Examples

### Unit Test Example

```typescript
import { describe, it, expect, vi } from 'vitest';
import { rollAttack } from '@/domains/combat';
import * as diceRolls from '@/utils/diceRolls';

vi.mock('@/utils/diceRolls', () => ({
  rollDie: vi.fn(),
}));

describe('rollAttack', () => {
  it('should handle advantage correctly', () => {
    // Mock dice rolls
    vi.mocked(diceRolls.rollDie)
      .mockReturnValueOnce(10)  // First roll
      .mockReturnValueOnce(15); // Second roll (kept)

    const { roll } = rollAttack(5, { advantage: true });

    expect(roll.advantage).toBe(true);
    expect(roll.results).toEqual([10, 15]);
    expect(roll.keptResults).toEqual([15]); // Kept higher
    expect(roll.total).toBe(20); // 15 + 5
  });
});
```

## Benefits

### Testability
```typescript
// Before: Hard to test (requires React context)
// Can't easily test without mounting components

// After: Easy to test (pure functions)
const result = rollInitiativeForParticipant(mockParticipant);
expect(result.initiative).toBe(expectedValue);
```

### Reusability
```typescript
// Use in React
const result = rollAttack(bonus);

// Use in Node.js CLI tool
const result = rollAttack(bonus);

// Use in server-side combat simulator
const result = rollAttack(bonus);

// Same code, different contexts!
```

### Composability
```typescript
// Combine functions for complex behaviors
function resolveMeleeAttack(attacker, target) {
  const attackResult = rollAttack(attacker.attackBonus);

  if (doesAttackHit(attackResult.roll, target.armorClass)) {
    const damageResult = rollDamage('1d8+3', attackResult.roll.critical);
    const { participant } = applyDamage(target, {
      damage: damageResult.total,
      damageType: 'slashing'
    });

    if (participant.activeConcentration) {
      const { maintained } = checkConcentration(
        participant,
        damageResult.total,
        participant.constitutionSaveBonus
      );

      if (!maintained) {
        return { ...participant, activeConcentration: null };
      }
    }

    return participant;
  }

  return target;
}
```
