# Combat System Migration Cleanup Plan

## Overview

This document outlines the migration cleanup plan for the unified D&D 5E combat system. The unified migration `20251112_01_add_combat_system_unified.sql` consolidates and resolves conflicts between multiple combat-related migrations.

**Status:** ⚠️ **DO NOT DELETE OLD MIGRATIONS YET**

## Conflicting Migrations to Remove

After the unified migration is verified and tested, the following migrations should be removed:

### 1. **20251112_add_combat_initiative.sql**
- **Path:** `/home/user/ai-adventure-scribe-main/supabase/migrations/20251112_add_combat_initiative.sql`
- **Reason:** Consolidated into unified migration
- **Conflicts:**
  - Defines `combat_participants` with `hp_current`, `hp_max`, `conditions` (JSONB) columns
  - These fields are now handled by separate tables in the unified approach
  - Uses `current_turn_order` (kept in unified migration)

### 2. **20251112_add_hp_tracking.sql**
- **Path:** `/home/user/ai-adventure-scribe-main/supabase/migrations/20251112_add_hp_tracking.sql`
- **Reason:** Consolidated into unified migration
- **Conflicts:**
  - Redefines `combat_encounters` table with different structure
  - Uses `current_turn_participant_id` (UUID) instead of `current_turn_order` (index)
  - Creates `combat_participant_status` table (kept in unified migration)
  - Creates `combat_damage_log` table (kept in unified migration)
  - Has different status values ('active', 'concluded' vs 'active', 'paused', 'completed')

### 3. **20251112_add_conditions_system.sql**
- **Path:** `/home/user/ai-adventure-scribe-main/supabase/migrations/20251112_add_conditions_system.sql`
- **Reason:** Consolidated into unified migration
- **Conflicts:**
  - Redefines `combat_participants` with `current_hp`, `max_hp`, `temp_hp` directly in table
  - These fields are now in separate `combat_participant_status` table
  - Creates `conditions_library` table (kept in unified migration)
  - Creates `combat_participant_conditions` table (kept in unified migration)
  - Includes extensive RLS policies (kept in unified migration, may need verification)

### 4. **20251112_add_attack_resolution.sql**
- **Path:** `/home/user/ai-adventure-scribe-main/supabase/migrations/20251112_add_attack_resolution.sql`
- **Reason:** Consolidated into unified migration
- **What it adds:**
  - Creates `creature_stats` table (kept in unified migration)
  - Creates `weapon_attacks` table (kept in unified migration)
- **Note:** This migration doesn't conflict with others; it's additive

## Unified Migration Details

### File: `20251112_01_add_combat_system_unified.sql`

**Tables Created:**
1. `combat_encounters` - Combat encounter tracking
2. `combat_participants` - Participants with static data (no HP/conditions here)
3. `combat_participant_status` - HP tracking, temp HP, death saves
4. `combat_damage_log` - Damage history and analytics
5. `conditions_library` - D&D 5E conditions reference data
6. `combat_participant_conditions` - Active conditions on participants
7. `creature_stats` - AC, resistances, vulnerabilities, immunities
8. `weapon_attacks` - Weapon attack data for characters

**Key Design Decisions:**
- **Separate status table:** HP data in `combat_participant_status` (cleaner separation)
- **Separate conditions table:** Granular condition tracking in `combat_participant_conditions`
- **Turn order:** Uses index-based `current_turn_order` instead of UUID reference
- **Status values:** 'active', 'paused', 'completed' (more granular control)
- **Participant type:** Explicit `participant_type` field ('player', 'npc', 'enemy', 'monster')

## Schema Conflicts Resolved

### combat_encounters Table

| Field | Initiative Migration | HP Tracking Migration | Conditions Migration | Unified Migration | Resolution |
|-------|---------------------|----------------------|---------------------|------------------|------------|
| current_turn_order | ✓ (integer) | - | ✓ (integer) | ✓ (integer) | **Kept index-based** |
| current_turn_participant_id | - | ✓ (UUID) | - | - | **Removed** (index-based is simpler) |
| status values | active, paused, completed | active, concluded | active, paused, completed | active, paused, completed | **Kept more granular** |
| location | - | ✓ | - | ✓ | **Added** (useful metadata) |
| difficulty | - | ✓ | - | ✓ | **Added** (useful metadata) |
| experience_awarded | - | ✓ | - | ✓ | **Added** (useful metadata) |

### combat_participants Table

| Field | Initiative Migration | HP Tracking Migration | Conditions Migration | Unified Migration | Resolution |
|-------|---------------------|----------------------|---------------------|------------------|------------|
| hp_current | ✓ | - | ✓ (current_hp) | - | **Moved to combat_participant_status** |
| hp_max | ✓ | - | ✓ (max_hp) | - | **Moved to combat_participant_status** |
| temp_hp | - | - | ✓ | - | **Moved to combat_participant_status** |
| conditions | ✓ (JSONB) | - | - | - | **Moved to combat_participant_conditions** |
| participant_type | - | ✓ | - | ✓ | **Added** (explicit type field) |
| armor_class | - | ✓ | - | ✓ | **Added** (combat stat) |
| speed | - | ✓ | - | ✓ | **Added** (combat stat) |
| damage_resistances | - | ✓ | - | ✓ | **Added** (combat modifier) |
| damage_immunities | - | ✓ | - | ✓ | **Added** (combat modifier) |
| damage_vulnerabilities | - | ✓ | - | ✓ | **Added** (combat modifier) |
| multiclass_info | - | ✓ | ✓ | ✓ | **Added** (character data) |

## Rollback Plan

If issues are discovered with the unified migration, follow these steps:

### Option 1: Revert to Individual Migrations (Not Recommended)

```sql
-- Step 1: Drop unified migration tables
DROP TABLE IF EXISTS weapon_attacks CASCADE;
DROP TABLE IF EXISTS creature_stats CASCADE;
DROP TABLE IF EXISTS combat_participant_conditions CASCADE;
DROP TABLE IF EXISTS conditions_library CASCADE;
DROP TABLE IF EXISTS combat_damage_log CASCADE;
DROP TABLE IF EXISTS combat_participant_status CASCADE;
DROP TABLE IF EXISTS combat_participants CASCADE;
DROP TABLE IF EXISTS combat_encounters CASCADE;

-- Step 2: Run individual migrations in order
-- Note: This will recreate conflicts and is NOT recommended
-- Use this only if absolutely necessary
```

### Option 2: Fix Forward (Recommended)

Instead of rolling back, create a new migration to fix any issues:

```sql
-- Example: supabase/migrations/20251112_02_fix_combat_system.sql
-- Add any missing columns, fix constraints, etc.
```

### Option 3: Emergency Rollback (Production Only)

If in production and critical issues arise:

1. **Backup database first:**
   ```bash
   pg_dump -h [host] -U [user] -d [database] > backup_before_rollback.sql
   ```

2. **Create rollback migration:**
   ```sql
   -- supabase/migrations/20251112_99_rollback_unified_combat.sql
   -- Drop all combat system tables
   -- Restore from backup or reapply old migrations
   ```

3. **Document the rollback and issues encountered**

## Verification Checklist

Before removing old migrations, verify:

- [ ] Unified migration runs successfully on clean database
- [ ] All tables created with correct schema
- [ ] All indexes created
- [ ] All foreign keys working correctly
- [ ] All CHECK constraints enforced
- [ ] Seed data (13 D&D 5E conditions) inserted
- [ ] RLS policies applied (if applicable)
- [ ] Services can connect and query successfully
- [ ] No breaking changes to existing services
- [ ] All unit tests pass
- [ ] Integration tests pass

## Service Compatibility

### Services Affected:

1. **combat-initiative-service.ts** - ⚠️ **BREAKING CHANGES**
   - Expects `hpCurrent`, `hpMax`, `conditions` in `combat_participants`
   - These fields are now in separate tables
   - **Action Required:** Update service to use `combat_participant_status` for HP

2. **combat-hp-service.ts** - ✅ **COMPATIBLE**
   - Already uses separate `combat_participant_status` table
   - No changes required

### Breaking Changes:

**combat-initiative-service.ts:**

```typescript
// OLD (broken):
const participant = await db.insert(combatParticipants).values({
  encounterId,
  name: input.name,
  initiative,
  hpCurrent: input.hpCurrent, // ❌ Field doesn't exist
  hpMax: input.hpMax,         // ❌ Field doesn't exist
  conditions: [],              // ❌ Field doesn't exist
});

// NEW (required):
const participant = await db.insert(combatParticipants).values({
  encounterId,
  name: input.name,
  initiative,
  participantType: input.participantType,
  armorClass: input.armorClass || 10,
  maxHp: input.maxHp || 10,
  speed: input.speed || 30,
});

// Then create status separately:
await db.insert(combatParticipantStatus).values({
  participantId: participant.id,
  currentHp: input.currentHp || input.maxHp,
  maxHp: input.maxHp || 10,
  tempHp: 0,
});
```

## Cleanup Steps (Execute After Verification)

**⚠️ DO NOT execute these steps until all verification checks pass:**

1. **Backup current database:**
   ```bash
   # Create backup before cleanup
   pg_dump -h [host] -U [user] -d [database] > backup_before_cleanup.sql
   ```

2. **Remove conflicting migrations:**
   ```bash
   rm supabase/migrations/20251112_add_combat_initiative.sql
   rm supabase/migrations/20251112_add_hp_tracking.sql
   rm supabase/migrations/20251112_add_conditions_system.sql
   rm supabase/migrations/20251112_add_attack_resolution.sql
   ```

3. **Update service imports:**
   - Update `combat-initiative-service.ts` to use new schema
   - Test all service methods
   - Update any integration tests

4. **Commit changes:**
   ```bash
   git add .
   git commit -m "chore: remove conflicting combat migrations, use unified migration"
   ```

5. **Deploy and monitor:**
   - Deploy to staging first
   - Run full test suite
   - Monitor for errors
   - Deploy to production after verification

## Timeline

- **Day 1:** Verify unified migration works correctly
- **Day 2:** Update combat-initiative-service.ts
- **Day 3:** Run full test suite, fix any issues
- **Day 4:** Deploy to staging, monitor
- **Day 5:** Deploy to production (if staging is stable)
- **Day 6:** Remove old migrations after production verification

## Notes

- Keep this document updated as cleanup progresses
- Document any issues encountered during verification
- If rolling back, document why and what went wrong
- Update service documentation to reflect new schema

## Status Log

| Date | Action | Status | Notes |
|------|--------|--------|-------|
| 2025-11-14 | Created unified migration | ✅ Complete | All tables defined |
| 2025-11-14 | Updated schema files | ✅ Complete | db/schema/combat.ts and db/combat-schema.ts |
| TBD | Verify migration | ⏳ Pending | Run on clean database |
| TBD | Update services | ⏳ Pending | Fix combat-initiative-service.ts |
| TBD | Run tests | ⏳ Pending | All tests must pass |
| TBD | Remove old migrations | ⏳ Pending | After verification |

---

**Last Updated:** 2025-11-14
**Document Owner:** Development Team
**Review Required Before:** Removing any migration files
