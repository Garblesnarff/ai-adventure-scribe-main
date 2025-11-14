# Test Migration Guide: From Database to Fixtures

This guide shows how to refactor existing unit tests to use fixtures instead of requiring a real database connection.

## Benefits of Using Fixtures

- **No Database Required**: Tests run without `DATABASE_URL`
- **Fast Execution**: <5ms per test vs 50-500ms with real DB
- **No Flaky Tests**: Deterministic data, no shared state
- **Easy Setup**: Pre-configured test data ready to use
- **Parallel Safe**: Each test gets its own mock DB

## Quick Start

### Before (With Real Database)

```typescript
import { db } from '../../../infrastructure/database/index.js';

describe('My Service', () => {
  let testCharacterId: string;

  beforeAll(async () => {
    if (!process.env.DATABASE_URL) {
      console.log('Skipping tests - no database');
      return;
    }
  });

  beforeEach(async () => {
    if (!process.env.DATABASE_URL) return;

    // Create test data
    const [character] = await db.insert(characters).values({
      name: 'Test Character',
      class: 'Fighter',
      level: 5,
    }).returning();

    testCharacterId = character.id;
  });

  it('should do something', async () => {
    if (!process.env.DATABASE_URL) return;

    const result = await myService.doSomething(testCharacterId);
    expect(result).toBeDefined();
  });
});
```

### After (With Fixtures)

```typescript
import { createMockDatabase } from './mocks/database.js';
import { characters } from './fixtures/index.js';

let mockDb: ReturnType<typeof createMockDatabase>;

describe('My Service', () => {
  beforeEach(() => {
    // Create mock DB and populate with fixtures
    mockDb = createMockDatabase();
    mockDb.setData('characters', [characters.fighterLevel5]);

    // Mock the database module
    vi.mock('../../../infrastructure/database/index.js', () => ({
      db: mockDb,
    }));
  });

  it('should do something', async () => {
    const result = await myService.doSomething('fixture-fighter-5');
    expect(result).toBeDefined();
  });
});
```

## Step-by-Step Migration

### Step 1: Import Fixtures and Mock Database

```typescript
import { createMockDatabase } from './mocks/database.js';
import {
  characters,
  combat,
  spellSlots,
  inventory,
  progression,
} from './fixtures/index.js';
```

### Step 2: Replace Database Setup

**Old:**
```typescript
beforeAll(async () => {
  if (!process.env.DATABASE_URL) {
    console.log('Skipping tests - no database');
    return;
  }
});
```

**New:**
```typescript
let mockDb: ReturnType<typeof createMockDatabase>;

beforeEach(() => {
  mockDb = createMockDatabase();
});
```

### Step 3: Replace Test Data Creation with Fixtures

**Old:**
```typescript
beforeEach(async () => {
  if (!process.env.DATABASE_URL) return;

  const [character] = await db.insert(characters).values({
    name: 'Test Fighter',
    class: 'Fighter',
    level: 5,
    str: 16,
    dex: 14,
    con: 15,
  }).returning();

  testCharacterId = character.id;
});
```

**New:**
```typescript
beforeEach(() => {
  mockDb = createMockDatabase();
  mockDb.setData('characters', [characters.fighterLevel5]);
  // Character ID is now: 'fixture-fighter-5'
});
```

### Step 4: Remove DATABASE_URL Checks from Tests

**Old:**
```typescript
it('should do something', async () => {
  if (!process.env.DATABASE_URL) return;

  const result = await service.doSomething(testCharacterId);
  expect(result).toBeDefined();
});
```

**New:**
```typescript
it('should do something', async () => {
  const result = await service.doSomething('fixture-fighter-5');
  expect(result).toBeDefined();
});
```

### Step 5: Use Builders for Custom Test Data

When you need custom data not covered by fixtures:

```typescript
import { CharacterBuilder, CombatEncounterBuilder } from './fixtures/index.js';

it('should handle level 10 character', () => {
  const character = new CharacterBuilder()
    .withName('Custom Hero')
    .withClass('Paladin')
    .withLevel(10)
    .build();

  mockDb.setData('characters', [character]);

  // Use in test...
});
```

## Available Fixtures

### Characters
- `characters.fighterLevel5` - Level 5 Fighter
- `characters.wizardLevel5` - Level 5 Wizard
- `characters.rogueLevel3` - Level 3 Rogue
- `characters.paladinLevel10` - Level 10 Paladin
- `characters.clericLevel1` - Level 1 Cleric

### Combat
- `combat.activeEncounter` - Active combat encounter
- `combat.fighterParticipant` - PC fighter in combat
- `combat.wizardParticipant` - PC wizard in combat
- `combat.goblinParticipant` - Enemy goblin
- `combat.dragonParticipant` - Boss dragon
- `combat.fighterStatus` - Healthy fighter status
- `combat.wizardStatus` - Injured wizard status
- `combat.unconsciousRogueStatus` - Downed character

### Spell Slots
- `spellSlots.wizardLevel5` - Full spell slots
- `spellSlots.wizardLevel5PartiallyUsed` - Partially used slots
- `spellSlots.usageLog` - Usage history

### Inventory
- `inventory.longsword` - Equipped weapon
- `inventory.plateArmor` - Equipped armor
- `inventory.healingPotions` - Consumables
- `inventory.ringOfProtection` - Attuned magic item

### Progression
- `progression.fighterLevel5` - Level 5 progression
- `progression.fighterXpEvents` - XP gain history

## Available Builders

- `CharacterBuilder` - Build custom characters
- `CharacterStatsBuilder` - Build custom ability scores
- `CombatEncounterBuilder` - Build custom encounters
- `CombatParticipantBuilder` - Build custom participants
- `CombatParticipantStatusBuilder` - Build custom HP/status
- `InventoryItemBuilder` - Build custom items
- `LevelProgressionBuilder` - Build custom progression
- `ExperienceEventBuilder` - Build custom XP events

## Mock Database API

### Query Data
```typescript
// Find first match
const character = await mockDb.query.characters.findFirst({
  where: { id: 'fixture-fighter-5' }
});

// Find all matches
const participants = await mockDb.query.combat_participants.findMany({
  where: { encounterId: 'fixture-encounter-1' }
});
```

### Insert Data
```typescript
const [inserted] = await mockDb
  .insert({ name: 'characters' })
  .values(newCharacter)
  .returning();
```

### Update Data
```typescript
const [updated] = await mockDb
  .update({ name: 'combat_participant_status' })
  .set({ currentHp: 30 })
  .where({ participantId: 'fixture-participant-fighter' })
  .returning();
```

### Delete Data
```typescript
await mockDb
  .delete({ name: 'characters' })
  .where({ id: 'test-char-1' })
  .execute();
```

### Helper Methods
```typescript
// Set entire table data
mockDb.setData('characters', [char1, char2]);

// Get table data
const chars = mockDb.getData('characters');

// Clear specific table
mockDb.clear('characters');

// Clear all tables
mockDb.clearAll();
```

## Test Files to Migrate

### Priority 1 (Core Combat)
- [ ] `combat-initiative-service.test.ts` - 23 tests
- [ ] `combat-hp-service.test.ts` - 15 tests
- [ ] `combat-attack-service.test.ts` - 18 tests
- [ ] `conditions-service.test.ts` - 12 tests

### Priority 2 (Character Systems)
- [ ] `spell-slots-service.test.ts` - 35 tests
- [ ] `rest-service.test.ts` - 14 tests
- [ ] `inventory-service.test.ts` - 16 tests
- [ ] `progression-service.test.ts` - 12 tests
- [ ] `class-features-service.test.ts` - 20 tests

## Common Patterns

### Pattern: Testing Service Methods

```typescript
import { MyService } from '../my-service.js';
import { createMockDatabase } from './mocks/database.js';
import { characters } from './fixtures/index.js';

describe('MyService', () => {
  let mockDb: ReturnType<typeof createMockDatabase>;

  beforeEach(() => {
    mockDb = createMockDatabase();
    mockDb.setData('characters', [characters.fighterLevel5]);

    // If service uses db directly, mock it
    vi.mock('../../../infrastructure/database/index.js', () => ({
      db: mockDb,
    }));
  });

  it('should process character data', async () => {
    const result = await MyService.processCharacter('fixture-fighter-5');
    expect(result).toBeDefined();
  });
});
```

### Pattern: Testing Error Cases

```typescript
it('should throw error for invalid ID', async () => {
  await expect(
    MyService.getCharacter('non-existent-id')
  ).rejects.toThrow('Character not found');
});
```

### Pattern: Testing State Changes

```typescript
it('should update character level', async () => {
  const result = await MyService.levelUp('fixture-fighter-5');

  // Verify returned value
  expect(result.newLevel).toBe(6);

  // Verify database was updated
  const updated = await mockDb.query.characters.findFirst({
    where: { id: 'fixture-fighter-5' }
  });
  expect(updated.level).toBe(6);
});
```

## Tips

1. **Use Existing Fixtures First**: Check if a fixture already exists before creating custom data
2. **Use Builders for Variations**: When you need slight variations, use builders
3. **Keep Tests Isolated**: Each test should have its own data via `beforeEach`
4. **No Async Setup**: Fixture loading is synchronous, no need for async in `beforeEach`
5. **Consistent IDs**: Fixtures use predictable IDs like `fixture-fighter-5`

## Testing the Migration

Run your tests without DATABASE_URL:

```bash
# Unset DATABASE_URL
unset DATABASE_URL

# Run tests
npm test

# Should see:
# ✓ All tests pass
# ✓ No "Skipping tests - no database" messages
# ✓ Fast execution (<5 seconds total)
```

## Example: Complete Migration

See `EXAMPLE_combat-with-fixtures.test.ts` for a complete working example.

## Questions?

- Check the fixtures in `server/src/__tests__/fixtures/`
- Check the mock database in `server/src/__tests__/mocks/database.ts`
- Check test helpers in `server/src/__tests__/utils/test-helpers.ts`
