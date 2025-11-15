# Service Compatibility Notes - Unified Combat System

## Overview

This document details the compatibility issues between existing combat services and the new unified combat schema. It provides specific code changes required to make services work with the new schema.

**Date:** 2025-11-14
**Schema Version:** Unified Migration `20251112_01_add_combat_system_unified.sql`

## Affected Services

### 1. ✅ `combat-hp-service.ts` - FULLY COMPATIBLE

**Path:** `/home/user/ai-adventure-scribe-main/server/src/services/combat-hp-service.ts`

**Status:** ✅ No changes required

**Reason:** This service was already designed to use the separate `combat_participant_status` table approach, which is exactly what the unified migration implements.

**Verified Methods:**
- `applyDamage()` - Uses `combat_participant_status` ✅
- `healDamage()` - Uses `combat_participant_status` ✅
- `setTempHP()` - Uses `combat_participant_status` ✅
- `rollDeathSave()` - Uses `combat_participant_status` ✅
- `getParticipantStatus()` - Uses `combat_participant_status` ✅
- `initializeParticipantStatus()` - Uses `combat_participant_status` ✅

### 2. ⚠️ `combat-initiative-service.ts` - BREAKING CHANGES REQUIRED

**Path:** `/home/user/ai-adventure-scribe-main/server/src/services/combat-initiative-service.ts`

**Status:** ⚠️ Requires updates

**Breaking Changes:**

#### Issue 1: `addParticipant()` method uses removed fields

**Current Code (Lines 83-105):**
```typescript
static async addParticipant(
  encounterId: string,
  input: CreateParticipantInput
): Promise<CombatParticipant> {
  const roll = rollD20();
  const initiative = roll + input.initiativeModifier;

  const [participant] = await db
    .insert(combatParticipants)
    .values({
      encounterId,
      characterId: input.characterId || null,
      npcId: input.npcId || null,
      name: input.name,
      initiative,
      initiativeModifier: input.initiativeModifier,
      turnOrder: 0,
      hpCurrent: input.hpCurrent || null,  // ❌ Field removed
      hpMax: input.hpMax || null,           // ❌ Field removed
      conditions: [],                        // ❌ Field removed
    })
    .returning();

  return participant;
}
```

**Required Fix:**
```typescript
static async addParticipant(
  encounterId: string,
  input: CreateParticipantInput
): Promise<CombatParticipant> {
  const roll = rollD20();
  const initiative = roll + input.initiativeModifier;

  // Create participant
  const [participant] = await db
    .insert(combatParticipants)
    .values({
      encounterId,
      characterId: input.characterId || null,
      npcId: input.npcId || null,
      name: input.name,
      participantType: input.participantType || 'monster', // ✅ Required field
      initiative,
      initiativeModifier: input.initiativeModifier,
      turnOrder: 0,
      armorClass: input.armorClass || 10,           // ✅ Added
      maxHp: input.maxHp || 10,                     // ✅ Added (stored here AND in status)
      speed: input.speed || 30,                     // ✅ Added
      damageResistances: input.damageResistances || [],     // ✅ Added
      damageImmunities: input.damageImmunities || [],       // ✅ Added
      damageVulnerabilities: input.damageVulnerabilities || [], // ✅ Added
    })
    .returning();

  if (!participant) {
    throw new Error('Failed to add combat participant');
  }

  // Create status record for HP tracking
  await db
    .insert(combatParticipantStatus)
    .values({
      participantId: participant.id,
      currentHp: input.currentHp !== undefined ? input.currentHp : input.maxHp || 10,
      maxHp: input.maxHp || 10,
      tempHp: 0,
      isConscious: true,
      deathSavesSuccesses: 0,
      deathSavesFailures: 0,
    });

  return participant;
}
```

#### Issue 2: `updateParticipantHP()` method accesses removed field

**Current Code (Lines 408-426):**
```typescript
static async updateParticipantHP(
  participantId: string,
  hpCurrent: number
): Promise<CombatParticipant> {
  const [updated] = await db
    .update(combatParticipants)
    .set({ hpCurrent })  // ❌ Field removed
    .where(eq(combatParticipants.id, participantId))
    .returning();

  if (!updated) {
    throw new Error('Failed to update participant HP');
  }

  return updated;
}
```

**Required Fix:**
```typescript
/**
 * Update participant HP
 * @deprecated Use CombatHPService.applyDamage() or CombatHPService.healDamage() instead
 * This method is kept for backward compatibility but should be avoided
 */
static async updateParticipantHP(
  participantId: string,
  hpCurrent: number
): Promise<void> {
  // Update status table instead
  await db
    .update(combatParticipantStatus)
    .set({
      currentHp: hpCurrent,
      isConscious: hpCurrent > 0,
      updatedAt: new Date(),
    })
    .where(eq(combatParticipantStatus.participantId, participantId));
}

// Or better yet, remove this method entirely and direct users to CombatHPService
```

#### Issue 3: Type definition `CreateParticipantInput` needs update

**Current Type (assumed from usage):**
```typescript
interface CreateParticipantInput {
  characterId?: string;
  npcId?: string;
  name: string;
  initiativeModifier: number;
  hpCurrent?: number;  // ❌ Not stored in participants anymore
  hpMax?: number;      // ⚠️ Stored in participants AND status
}
```

**Required Update:**
```typescript
interface CreateParticipantInput {
  // Entity references
  characterId?: string;
  npcId?: string;

  // Basic info
  name: string;
  participantType: 'player' | 'npc' | 'enemy' | 'monster'; // ✅ Required

  // Initiative
  initiativeModifier: number;

  // Combat stats
  armorClass?: number;                    // ✅ Added (default: 10)
  maxHp?: number;                         // ✅ Stored in participants and status
  currentHp?: number;                     // ✅ Stored in status only
  speed?: number;                         // ✅ Added (default: 30)

  // Damage modifiers
  damageResistances?: string[];           // ✅ Added
  damageImmunities?: string[];            // ✅ Added
  damageVulnerabilities?: string[];       // ✅ Added
}
```

## Required Type Definition Changes

### Update: `server/src/types/combat.ts` (if it exists)

**Location:** Check for combat type definitions file

**Changes Needed:**
1. Add `participantType` to all participant-related types
2. Remove `hpCurrent`, `hpMax`, `conditions` from `CombatParticipant` type
3. Add new fields: `armorClass`, `maxHp`, `speed`, damage modifier arrays
4. Update `CreateParticipantInput` as shown above

## Import Changes Required

### combat-initiative-service.ts

**Current imports:**
```typescript
import {
  combatEncounters,
  combatParticipants,
  // ...
} from '../../../db/combat-schema.js';
```

**Add to imports:**
```typescript
import {
  combatEncounters,
  combatParticipants,
  combatParticipantStatus,  // ✅ Add this
  // ...
} from '../../../db/schema.js';  // ✅ Update path to main schema
```

## Database Query Changes

### Querying participants with HP data

**Old Approach (broken):**
```typescript
const participant = await db.query.combatParticipants.findFirst({
  where: eq(combatParticipants.id, participantId),
});
// participant.hpCurrent - ❌ Field doesn't exist
```

**New Approach (required):**
```typescript
const participant = await db.query.combatParticipants.findFirst({
  where: eq(combatParticipants.id, participantId),
  with: {
    status: true,  // ✅ Include status via relation
  },
});
// participant.status.currentHp - ✅ Correct
```

### Querying participants with conditions

**Old Approach (broken):**
```typescript
const participant = await db.query.combatParticipants.findFirst({
  where: eq(combatParticipants.id, participantId),
});
// participant.conditions - ❌ Field doesn't exist (was JSONB)
```

**New Approach (required):**
```typescript
const participant = await db.query.combatParticipants.findFirst({
  where: eq(combatParticipants.id, participantId),
  with: {
    conditions: true,  // ✅ Include conditions via relation
  },
});
// participant.conditions - ✅ Array of condition records
```

## Testing Requirements

After making changes, test the following scenarios:

### Test Case 1: Start Combat with Participants
```typescript
// Should create participants AND their status records
const combat = await CombatInitiativeService.startCombat(
  sessionId,
  [
    {
      name: 'Fighter',
      participantType: 'player',
      initiativeModifier: 2,
      maxHp: 25,
      armorClass: 16,
    },
    {
      name: 'Goblin',
      participantType: 'monster',
      initiativeModifier: 2,
      maxHp: 7,
      armorClass: 15,
    },
  ]
);

// Verify participant created
assert(combat.participants.length === 2);

// Verify status created for each participant
for (const participant of combat.participants) {
  const status = await db.query.combatParticipantStatus.findFirst({
    where: eq(combatParticipantStatus.participantId, participant.id),
  });
  assert(status !== null);
  assert(status.maxHp === participant.maxHp);
  assert(status.currentHp === participant.maxHp);
}
```

### Test Case 2: Apply Damage (Use HP Service)
```typescript
// Should update status table, not participants table
const participantId = 'some-uuid';
const result = await CombatHPService.applyDamage(participantId, {
  damageAmount: 10,
  damageType: 'slashing',
});

assert(result.hpLost === 10);
assert(result.newCurrentHp === 15); // If started with 25
```

### Test Case 3: Query Participant with HP
```typescript
// Should use relation to get status
const participant = await db.query.combatParticipants.findFirst({
  where: eq(combatParticipants.id, participantId),
  with: { status: true },
});

assert(participant.status !== null);
assert(participant.status.currentHp >= 0);
```

## Migration Path for Existing Data

If there's existing data in the old schema format:

```sql
-- Step 1: Migrate HP data from participants to status (if old schema was deployed)
INSERT INTO combat_participant_status (participant_id, current_hp, max_hp, temp_hp, is_conscious)
SELECT
  id,
  COALESCE(hp_current, max_hp, 10),
  COALESCE(max_hp, 10),
  0,
  COALESCE(hp_current, max_hp, 10) > 0
FROM combat_participants
WHERE NOT EXISTS (
  SELECT 1 FROM combat_participant_status
  WHERE participant_id = combat_participants.id
);

-- Step 2: Drop old columns (after verification)
-- ALTER TABLE combat_participants DROP COLUMN IF EXISTS hp_current;
-- ALTER TABLE combat_participants DROP COLUMN IF EXISTS hp_max;
-- ALTER TABLE combat_participants DROP COLUMN IF EXISTS conditions;
```

## Recommended Refactoring Steps

1. **Phase 1: Update Type Definitions**
   - Update `CreateParticipantInput` interface
   - Update any other combat-related types
   - Add TSDoc comments explaining the change

2. **Phase 2: Update combat-initiative-service.ts**
   - Fix `addParticipant()` method
   - Deprecate or remove `updateParticipantHP()` method
   - Update all queries to include `status` relation
   - Add proper error handling

3. **Phase 3: Add Integration Helper**
   - Create a helper function to get participant with all related data:
   ```typescript
   async function getFullParticipant(participantId: string) {
     return await db.query.combatParticipants.findFirst({
       where: eq(combatParticipants.id, participantId),
       with: {
         status: true,
         conditions: {
           with: {
             condition: true,  // Include condition details
           },
         },
       },
     });
   }
   ```

4. **Phase 4: Update Tests**
   - Update all unit tests for initiative service
   - Add integration tests for cross-service operations
   - Test edge cases (0 HP, death saves, etc.)

5. **Phase 5: Update Documentation**
   - Update API documentation
   - Update service documentation
   - Add migration guide for other developers

## API Contract Changes

If these services are exposed via API endpoints, update:

### POST /api/combat/encounters/:id/participants

**Old Request Body:**
```json
{
  "name": "Fighter",
  "initiativeModifier": 2,
  "hpCurrent": 25,
  "hpMax": 25
}
```

**New Request Body:**
```json
{
  "name": "Fighter",
  "participantType": "player",
  "initiativeModifier": 2,
  "maxHp": 25,
  "currentHp": 25,
  "armorClass": 16,
  "speed": 30
}
```

**Breaking Change:** `participantType` is now required

## Backward Compatibility Strategy

If you need to maintain backward compatibility temporarily:

```typescript
// Add compatibility layer in service
static async addParticipant(
  encounterId: string,
  input: CreateParticipantInput | LegacyCreateParticipantInput
): Promise<CombatParticipant> {
  // Detect legacy input format
  const isLegacy = 'hpCurrent' in input && !('participantType' in input);

  if (isLegacy) {
    console.warn('Using legacy CreateParticipantInput format. Please update to new format.');
    // Convert legacy format to new format
    const newInput: CreateParticipantInput = {
      ...input,
      participantType: 'monster', // Default assumption
      currentHp: (input as any).hpCurrent,
      maxHp: (input as any).hpMax,
    };
    return this.addParticipantInternal(encounterId, newInput);
  }

  return this.addParticipantInternal(encounterId, input);
}
```

## Summary of Required Changes

| File | Change Type | Priority | Estimated Effort |
|------|-------------|----------|------------------|
| `combat-initiative-service.ts` | Breaking changes | HIGH | 2-3 hours |
| `server/src/types/combat.ts` | Type updates | HIGH | 30 minutes |
| API endpoints (if any) | Request/response updates | MEDIUM | 1-2 hours |
| Unit tests | Test updates | HIGH | 2-3 hours |
| Integration tests | New tests | MEDIUM | 2-3 hours |
| Documentation | Updates | LOW | 1 hour |

**Total Estimated Effort:** 8-12 hours

## Questions and Concerns

If you encounter issues not covered in this document:

1. Check the unified migration for the exact schema structure
2. Review the `db/schema/combat.ts` file for type definitions
3. Look at `combat-hp-service.ts` for examples of using the status table
4. Create a new issue documenting the problem

---

**Last Updated:** 2025-11-14
**Document Owner:** Development Team
**Next Review:** After service updates are complete
