# Database Schema Documentation

This directory contains the unified, modular database schema for the AI Adventure Scribe application. All schemas are defined using Drizzle ORM for type-safe PostgreSQL database access.

## Directory Structure

```
db/schema/
├── index.ts              # Unified export (SINGLE ENTRY POINT)
├── index.js              # JavaScript compiled version
├── blog.ts/.js           # Blog CMS system
├── combat.ts             # D&D 5E combat system
├── game.ts/.js           # Core game tables
├── reference.ts/.js      # D&D reference data
├── world.ts/.js          # World-building tables
├── rest.ts               # D&D 5E rest system
├── inventory.ts          # Inventory & items
├── progression.ts        # Experience & leveling
├── class-features.ts     # Class features system
└── README.md             # This file
```

## Import Pattern

**ALWAYS import from the unified schema:**

```typescript
// ✅ CORRECT - Import from unified schema
import { gameSessions, characters, combatEncounters } from '../../../db/schema/index.js';

// ❌ WRONG - Do not import from individual modules
import { gameSessions } from '../../../db/schema/game.js';

// ❌ WRONG - Old standalone files (DELETED)
import { combatEncounters } from '../../../db/combat-schema.js';
import { gameSessions } from '../../../db/session-schema.js';
```

## Schema Modules

### 1. Core Game System (`game.ts`)

**Tables:**
- `campaigns` - Campaign management
- `characters` - Player characters
- `character_stats` - Character attributes and stats
- `game_sessions` - Active game sessions
- `dialogue_history` - Session message history

**Key Relations:**
- characters → campaigns (many-to-one)
- character_stats → characters (one-to-one)
- game_sessions → campaigns (many-to-one)
- game_sessions → characters (many-to-one)
- dialogue_history → game_sessions (many-to-one)

### 2. Combat System (`combat.ts`)

**Tables:**
- `combat_encounters` - Combat encounters
- `combat_participants` - Participants in combat
- `combat_participant_status` - HP, temp HP, death saves
- `combat_participant_conditions` - Active conditions
- `combat_damage_log` - Damage history
- `combat_attack_rolls` - Attack roll history

**Key Relations:**
- combat_encounters → game_sessions (many-to-one)
- combat_participants → combat_encounters (many-to-one)
- combat_participant_status → combat_participants (one-to-one)
- combat_participant_conditions → combat_participants (many-to-one)
- combat_damage_log → combat_encounters (many-to-one)
- combat_attack_rolls → combat_encounters (many-to-one)

**Design Notes:**
- HP tracking is in separate `combat_participant_status` table
- Conditions use dedicated `combat_participant_conditions` table (not JSONB)
- Turn order uses index-based system (`current_turn_order`)
- Supports simultaneous combat encounters

### 3. Rest System (`rest.ts`)

**Tables:**
- `character_hit_dice` - Available hit dice by class
- `rest_events` - Short and long rest history

**Key Relations:**
- character_hit_dice → characters (many-to-one)
- rest_events → characters (many-to-one)
- rest_events → game_sessions (many-to-one, optional)

**Design Notes:**
- Implements PHB rest rules (short/long rest)
- Hit dice tracked per character per class
- Supports multi-classing

### 4. Inventory System (`inventory.ts`)

**Tables:**
- `inventory_items` - Character inventory
- `consumable_usage_log` - Item usage history

**Key Relations:**
- inventory_items → characters (many-to-one)
- consumable_usage_log → inventory_items (many-to-one)
- consumable_usage_log → characters (many-to-one)
- consumable_usage_log → game_sessions (many-to-one, optional)

**Design Notes:**
- Supports weapons, armor, consumables, ammunition
- Tracks weight and encumbrance
- Attunement system (max 3 items)
- JSONB properties for flexible item data

### 5. Progression System (`progression.ts`)

**Tables:**
- `level_progression` - Character level progression records
- `experience_events` - XP award history

**Key Relations:**
- level_progression → characters (many-to-one)
- experience_events → characters (many-to-one)
- experience_events → game_sessions (many-to-one, optional)

**Design Notes:**
- Implements D&D 5E XP table (PHB pg. 15)
- Tracks proficiency bonus by level
- Records level-up events and ability score improvements

### 6. Class Features System (`class-features.ts`)

**Tables:**
- `class_features_library` - Reference data for class features
- `character_features` - Character-specific feature instances
- `character_subclasses` - Subclass selections
- `feature_usage_log` - Feature usage tracking

**Key Relations:**
- character_features → characters (many-to-one)
- character_features → class_features_library (many-to-one)
- character_subclasses → characters (one-to-one per class)
- feature_usage_log → character_features (many-to-one)

**Design Notes:**
- Supports multi-classing
- Tracks limited-use features (daily, per short rest, etc.)
- Stores feature usage counts and reset timing

### 7. Reference Data (`reference.ts`)

**Tables:**
- `classes` - D&D class definitions
- `races` - D&D race definitions
- `spells` - D&D spell library
- `conditions` - Status condition definitions

**Design Notes:**
- Read-only reference data
- Seeded from D&D 5E SRD
- Used for validation and lookups

### 8. World-Building (`world.ts`)

**Tables:**
- `npcs` - Non-player characters
- `locations` - World locations
- `quests` - Quest tracking
- `memories` - NPC/location memory system

**Key Relations:**
- npcs → campaigns (many-to-one)
- locations → campaigns (many-to-one)
- quests → campaigns (many-to-one)
- memories → npcs/locations (polymorphic)

### 9. Blog System (`blog.ts`)

**Tables:**
- `blog_authors` - Blog author profiles
- `blog_posts` - Blog posts
- `blog_categories` - Post categories
- `blog_tags` - Post tags
- `blog_post_categories` - Post-category relations (many-to-many)
- `blog_post_tags` - Post-tag relations (many-to-many)

**Key Relations:**
- blog_posts → blog_authors (many-to-one)
- blog_post_categories → blog_posts (many-to-many junction)
- blog_post_categories → blog_categories (many-to-many junction)
- blog_post_tags → blog_posts (many-to-many junction)
- blog_post_tags → blog_tags (many-to-many junction)

## Table Relationships (ERD)

### Combat System Flow
```
game_sessions (1) ─→ (many) combat_encounters
combat_encounters (1) ─→ (many) combat_participants
combat_participants (1) ─→ (1) combat_participant_status
combat_participants (1) ─→ (many) combat_participant_conditions
combat_encounters (1) ─→ (many) combat_damage_log
combat_encounters (1) ─→ (many) combat_attack_rolls
```

### Character Progression Flow
```
characters (1) ─→ (1) character_stats
characters (1) ─→ (many) level_progression
characters (1) ─→ (many) experience_events
characters (1) ─→ (many) character_features
characters (1) ─→ (many) character_subclasses
characters (1) ─→ (many) character_hit_dice
```

### Inventory & Items Flow
```
characters (1) ─→ (many) inventory_items
inventory_items (1) ─→ (many) consumable_usage_log
characters (1) ─→ (many) consumable_usage_log
```

### Session & Gameplay Flow
```
campaigns (1) ─→ (many) characters
campaigns (1) ─→ (many) game_sessions
game_sessions (1) ─→ (many) dialogue_history
game_sessions (1) ─→ (many) combat_encounters
game_sessions (1) ─→ (many) rest_events (optional)
```

## Key Indexes

All tables include strategic indexes for performance:

- **Foreign keys**: Indexed for join performance
- **Status fields**: Indexed for filtering active records
- **Timestamps**: Indexed for chronological queries
- **Composite indexes**: For common query patterns

Example indexes:
```typescript
// game_sessions
index('idx_game_sessions_campaign_id').on(table.campaignId)
index('idx_game_sessions_status').on(table.status)

// combat_participants
index('idx_combat_participants_turn_order').on(table.encounterId, table.turnOrder)
index('idx_combat_participants_character').on(table.characterId)
```

## How to Add New Tables

1. **Choose the appropriate module** based on functionality:
   - Combat-related → `combat.ts`
   - Character progression → `progression.ts`
   - Game sessions → `game.ts`
   - New category → create new module

2. **Define the table:**
   ```typescript
   export const myNewTable = pgTable('my_new_table', {
     id: uuid('id').primaryKey().defaultRandom(),
     // ... other columns
     createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
   });
   ```

3. **Add relations:**
   ```typescript
   export const myNewTableRelations = relations(myNewTable, ({ one, many }) => ({
     character: one(characters, {
       fields: [myNewTable.characterId],
       references: [characters.id],
     }),
   }));
   ```

4. **Export types:**
   ```typescript
   export type MyNewTable = InferSelectModel<typeof myNewTable>;
   export type NewMyNewTable = InferInsertModel<typeof myNewTable>;
   ```

5. **Add to unified export** in `index.ts`:
   ```typescript
   export * from './my-module.js';
   ```

## Type Exports

All tables export two types:
- `TableName` - Type for SELECT queries (includes defaults)
- `NewTableName` - Type for INSERT operations (excludes auto-generated fields)

Example:
```typescript
import type { Character, NewCharacter } from '../../../db/schema/index.js';

// For inserts
const newChar: NewCharacter = {
  userId: 'user-123',
  name: 'Aragorn',
  // id, createdAt, updatedAt are auto-generated
};

// For selects
const char: Character = await db.query.characters.findFirst(...);
```

## Migration Strategy

When making schema changes:

1. **Create migration file:**
   ```bash
   npx drizzle-kit generate:pg
   ```

2. **Review generated SQL** in `drizzle/` directory

3. **Apply migration:**
   ```bash
   npx drizzle-kit push:pg
   ```

4. **Update TypeScript types** (automatic with Drizzle)

## Best Practices

### DO ✅
- Always import from `db/schema/index.js`
- Use relations for type-safe joins
- Add indexes for foreign keys and frequently queried fields
- Use JSONB for flexible, semi-structured data
- Document complex relations in code comments
- Use cascade deletes for dependent data

### DON'T ❌
- Don't import from individual module files
- Don't use the old standalone schema files (deleted)
- Don't create circular dependencies between modules
- Don't store large binary data in database (use file storage)
- Don't forget to add foreign key constraints
- Don't skip migrations (always generate and review)

## Troubleshooting

### Import Errors
If you get import errors:
1. Ensure you're importing from `db/schema/index.js`
2. Check that TypeScript compilation is up to date
3. Verify the table/type exists in the unified export

### Circular Dependencies
If you encounter circular dependencies:
1. Check that module A doesn't import from module B while B imports from A
2. Use forward references for complex relations
3. Consider splitting tables into separate modules

### Type Inference Issues
If TypeScript can't infer types:
1. Explicitly type your variables: `const char: Character = ...`
2. Ensure drizzle-orm version is up to date
3. Check that `InferSelectModel` and `InferInsertModel` are used correctly

## Related Files

- `/db/client.js` - Database connection configuration
- `/db/migrations/` - Migration history
- `/src/infrastructure/database/` - Database infrastructure layer
- `/server/src/services/` - Business logic services using schemas

## Version History

- **v2.0** (2025-11-14) - Consolidated to unified modular schema
  - Deleted standalone files: `combat-schema.ts`, `session-schema.js`, `schema.js`
  - All imports now use `db/schema/index.ts`
  - Added comprehensive documentation

- **v1.x** - Initial modular schema structure
  - Split tables into logical modules
  - Maintained backward compatibility files

---

**For questions or issues, please refer to the main project documentation or open an issue.**
