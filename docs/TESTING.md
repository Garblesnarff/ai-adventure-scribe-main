# Testing Guide

This guide explains the testing philosophy and practices for the AI Adventure Scribe project.

## Table of Contents

- [Testing Philosophy](#testing-philosophy)
- [Test Types](#test-types)
- [Fixture-Based Unit Testing](#fixture-based-unit-testing)
- [Integration Testing](#integration-testing)
- [Running Tests](#running-tests)
- [Writing New Tests](#writing-new-tests)
- [Migration Progress](#migration-progress)

## Testing Philosophy

Our testing strategy follows the testing pyramid:

1. **Unit Tests** (fast, isolated) - Majority of tests
2. **Integration Tests** (slower, real dependencies) - Moderate number
3. **E2E Tests** (slowest, full stack) - Fewer tests

### Key Principles

- **Unit tests should NOT require DATABASE_URL**
- **Unit tests should run in <5ms per test**
- **Tests should be isolated** (no shared state between tests)
- **Fixtures over factories** (pre-configured test data)
- **Mock external dependencies** (OpenAI, Supabase, etc.)

## Test Types

### Unit Tests

**Purpose**: Test individual functions, methods, or components in isolation

**Characteristics**:
- Fast (<5ms per test)
- No database connection required
- Use fixtures and mocks
- Test business logic, calculations, and pure functions

**Location**: `server/src/services/__tests__/*.test.ts`

**Example**:
```typescript
import { createMockDatabase } from '../../__tests__/mocks/database.js';
import { wizardLevel5 } from '../../__tests__/fixtures/characters.js';

describe('SpellSlotsService', () => {
  it('should calculate wizard spell slots correctly', () => {
    const result = SpellSlotsService.calculateSpellSlots('Wizard', 5);
    expect(result.slots).toEqual({ 1: 4, 2: 3, 3: 2 });
  });
});
```

### Integration Tests

**Purpose**: Test multiple components working together with real dependencies

**Characteristics**:
- Slower (100-500ms per test)
- Requires DATABASE_URL
- Uses real database transactions
- Tests workflows and interactions

**Location**: `server/src/__tests__/integration/*.test.ts`

**Example**:
```typescript
describe('Combat Flow Integration', () => {
  it('should complete full combat encounter', async () => {
    // Uses real database
    const encounter = await startCombat(...);
    const result = await resolveTurn(...);
    expect(result.isComplete).toBe(true);
  });
});
```

### E2E Tests

**Purpose**: Test complete user journeys through the application

**Characteristics**:
- Slowest (1-5s per test)
- Full stack testing
- Uses Playwright or similar
- Tests authentication, API endpoints, UI flows

**Location**: `e2e/*.spec.ts`

## Fixture-Based Unit Testing

### Why Fixtures?

Fixtures are pre-configured test data that:
- Load instantly (no database queries)
- Are deterministic (same data every time)
- Are type-safe (use actual TypeScript types)
- Are reusable across tests

### Using Fixtures

#### Available Fixtures

All fixtures are in `server/src/__tests__/fixtures/`:

- **characters.ts** - Pre-configured characters at different levels
- **combat.ts** - Combat encounters, participants, and status
- **spells.ts** - Spell slot data
- **inventory.ts** - Inventory items and equipment
- **progression.ts** - Level progression and XP data
- **builders.ts** - Builder pattern for custom test data

#### Example: Using Character Fixtures

```typescript
import { fighterLevel5, fighterLevel5Stats } from '../../__tests__/fixtures/characters.js';

// Use pre-configured fighter
expect(fighterLevel5.name).toBe('Test Fighter');
expect(fighterLevel5.level).toBe(5);
expect(fighterLevel5Stats.strength).toBe(16);
```

#### Example: Using Mock Database

```typescript
import { createMockDatabase } from '../../__tests__/mocks/database.js';
import { fighterLevel5 } from '../../__tests__/fixtures/characters.js';

let mockDb: ReturnType<typeof createMockDatabase>;

beforeEach(() => {
  mockDb = createMockDatabase();
  mockDb.setData('characters', [fighterLevel5]);
});

it('should retrieve character', async () => {
  const char = await mockDb.query.characters.findFirst({
    where: { id: fighterLevel5.id }
  });

  expect(char).toBeDefined();
  expect(char.name).toBe('Test Fighter');
});
```

#### Example: Using Builders

For custom scenarios, use builders:

```typescript
import { CombatParticipantBuilder } from '../../__tests__/fixtures/builders.js';

const orc = new CombatParticipantBuilder()
  .withName('Orc Warchief')
  .withType('enemy')
  .withInitiative(14, 2)
  .withAC(16)
  .withHp(93)
  .withResistances(['cold'])
  .build();
```

### Mock Database API

The mock database (`createMockDatabase()`) provides a Drizzle-like API:

```typescript
// Query API
await mockDb.query.tableName.findFirst({ where: {...} });
await mockDb.query.tableName.findMany({ where: {...} });

// Insert
await mockDb.insert({ name: 'tableName' }).values(data).returning();

// Update
await mockDb.update({ name: 'tableName' }).set(data).where({...}).returning();

// Delete
await mockDb.delete({ name: 'tableName' }).where({...}).returning();

// Helper methods
mockDb.setData('tableName', [...]); // Set initial data
mockDb.getData('tableName'); // Get current data
mockDb.clear('tableName'); // Clear table
mockDb.clearAll(); // Clear all tables
```

## Integration Testing

Integration tests use the real database and should:

1. **Run in transactions** (rollback after each test)
2. **Use test-specific data** (avoid conflicts)
3. **Clean up after themselves**
4. **Be isolated** (each test is independent)

### Example Integration Test

```typescript
describe('Progression Flow Integration', () => {
  let testCharacterId: string;

  beforeEach(async () => {
    // Create test data in real database
    const [character] = await db.insert(characters)
      .values({ name: 'Test Character', ... })
      .returning();
    testCharacterId = character.id;
  });

  afterEach(async () => {
    // Clean up
    await db.delete(characters).where(eq(characters.id, testCharacterId));
  });

  it('should award XP and level up', async () => {
    const result = await ProgressionService.awardXP(testCharacterId, 1000, 'combat');
    expect(result.leveledUp).toBe(true);
  });
});
```

## Running Tests

### Run All Tests

```bash
npm run server:test
```

### Run Specific Test File

```bash
npm run server:test spell-slots-service.test
```

### Run Tests in Watch Mode

```bash
npm run server:test -- --watch
```

### Run Only Unit Tests (No Database)

Unit tests using fixtures will run even without DATABASE_URL:

```bash
# These work without database
npm run server:test spell-slots-service.test
npm run server:test combat-attack-service.test
```

### Run Only Integration Tests

```bash
npm run server:test --dir server/src/__tests__/integration
```

## Writing New Tests

### When to Write Unit Tests

Write unit tests for:
- Pure functions (calculations, validation)
- Business logic
- Data transformations
- Service methods that don't need database

### When to Write Integration Tests

Write integration tests for:
- Database operations
- Multiple services interacting
- Transaction handling
- Complex workflows

### Test Structure

```typescript
describe('ServiceName', () => {
  // Setup
  beforeEach(() => {
    // Fresh state for each test
  });

  describe('Feature Group', () => {
    it('should do specific thing', () => {
      // Arrange
      const input = ...;

      // Act
      const result = service.method(input);

      // Assert
      expect(result).toEqual(expected);
    });
  });
});
```

### Best Practices

1. **One assertion per test** (when possible)
2. **Clear test names** (describe what, not how)
3. **Arrange-Act-Assert pattern**
4. **Independent tests** (no shared state)
5. **Fast feedback** (<1s for unit tests)

## Migration Progress

### Status Overview

**Total Service Test Files**: 9

**Migrated to Fixtures**:
- ✅ `spell-slots-service.test.ts` (pure calculation tests)
- ✅ `combat-attack-service.test.ts` (already mocked)

**Pending Migration**:
- ⏳ `conditions-service.test.ts` (30 tests)
- ⏳ `combat-initiative-service.test.ts` (28 tests)
- ⏳ `class-features-service.test.ts` (26 tests)
- ⏳ `progression-service.test.ts` (24 tests)
- ⏳ `rest-service.test.ts` (22 tests)
- ⏳ `inventory-service.test.ts` (32 tests)
- ⏳ `combat-hp-service.test.ts` (25 tests)

**Integration Tests** (Keep as-is):
- ✅ `combat-flow.test.ts`
- ✅ `resource-flow.test.ts`
- ✅ `progression-flow.test.ts`

### Migration Strategy

For services that need database operations, we have two options:

#### Option 1: Refactor Service for Dependency Injection

```typescript
// Before
class MyService {
  static async getData(id: string) {
    return await db.query.table.findFirst({ where: { id } });
  }
}

// After
class MyService {
  constructor(private db: Database) {}

  async getData(id: string) {
    return await this.db.query.table.findFirst({ where: { id } });
  }
}

// In tests
const mockDb = createMockDatabase();
const service = new MyService(mockDb);
```

#### Option 2: Keep Database Tests as Integration Tests

Move tests requiring real database to `__tests__/integration/` folder.

### Next Steps

1. **Complete service refactoring** for dependency injection
2. **Migrate remaining unit tests** to use fixtures
3. **Move database-dependent tests** to integration folder
4. **Add performance benchmarks** to track improvements
5. **Document fixture coverage** for common scenarios

## Performance Targets

- **Unit Test**: <5ms per test
- **Integration Test**: <500ms per test
- **E2E Test**: <5s per test
- **Full Test Suite**: <30s

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Drizzle ORM Testing](https://orm.drizzle.team/docs/guides/testing)
- [Testing Best Practices](https://testingjavascript.com/)
- [Fixture Pattern](https://martinfowler.com/bliki/ObjectMother.html)

## Troubleshooting

### Tests Failing with "DATABASE_URL not found"

This means the test needs to be migrated to use fixtures. See migration examples above.

### Mock Database Not Working

Ensure you're importing the mock correctly:

```typescript
import { createMockDatabase } from '../../__tests__/mocks/database.js';

// Create instance
const mockDb = createMockDatabase();

// Set initial data
mockDb.setData('tableName', [fixture1, fixture2]);
```

### Fixtures Not Found

Check the import path:

```typescript
import { fighterLevel5 } from '../../__tests__/fixtures/characters.js';
```

All fixtures are re-exported from `server/src/__tests__/fixtures/index.ts`.

---

For questions or issues, please create a GitHub issue or reach out to the team.
