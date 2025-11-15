# Integration Test Suite

This directory contains integration tests for the D&D 5E mechanics system.

## Overview

Integration tests verify that multiple services work together correctly by testing complete workflows:

- **Combat Flow**: Start → Initiative → Attack → Damage → HP → Death saves
- **Resource Flow**: Cast spell → Use slot → Rest → Restore
- **Progression Flow**: Award XP → Level up → Gain features → Update stats

## Test Files

### Infrastructure

- `test-setup.ts` - Database setup and teardown utilities
- `test-fixtures.ts` - Reusable test data (characters, monsters, items)
- `test-helpers.ts` - Helper functions for common operations

### Test Suites

- `combat-flow.test.ts` - Combat encounter workflows (12 tests)
- `resource-flow.test.ts` - Spell slots and rest mechanics (10 tests)
- `progression-flow.test.ts` - Character leveling and progression (10 tests)

## Running Tests

### Prerequisites

1. **Database**: Tests require a PostgreSQL database
2. **Environment Variable**: Set `DATABASE_URL` in your `.env` file

```bash
DATABASE_URL=postgresql://user:password@localhost:5432/testdb
```

### Run All Integration Tests

```bash
cd server
npx vitest run src/__tests__/integration/
```

### Run Specific Test Suite

```bash
# Combat tests
npx vitest run src/__tests__/integration/combat-flow.test.ts

# Resource tests
npx vitest run src/__tests__/integration/resource-flow.test.ts

# Progression tests
npx vitest run src/__tests__/integration/progression-flow.test.ts
```

### Run in Watch Mode

```bash
npx vitest src/__tests__/integration/
```

### With Verbose Output

```bash
npx vitest run src/__tests__/integration/ --reporter=verbose
```

## Test Configuration

Tests are configured in `server/vitest.config.ts`:

- **Test Timeout**: 30 seconds (integration tests need more time)
- **Pool Mode**: Forks with single fork (tests run sequentially for database safety)
- **Coverage**: Includes services, excludes test files

## Test Structure

### Typical Test Flow

```typescript
describe('Feature Name', () => {
  beforeEach(async () => {
    await resetDatabase(); // Clean database before each test
  });

  afterAll(async () => {
    await teardownTestDatabase(); // Final cleanup
  });

  test('should do something', async () => {
    // 1. Setup test data
    const character = await createTestCharacter('wizard');

    // 2. Perform actions
    await SomeService.doSomething(character.id);

    // 3. Assert results
    expect(result).toBe(expected);
  }, 30000); // 30 second timeout
});
```

## Test Coverage

### Combat Flow (12 tests)

- ✅ Full combat encounter with death saves and revival
- ✅ Death save critical failures (nat 1 = 2 failures)
- ✅ Death save critical success (nat 20 = revive with 1 HP)
- ✅ Massive damage causes instant death
- ✅ Temporary HP shields damage
- ✅ Damage resistance halves damage
- ✅ Damage vulnerability doubles damage
- ✅ Damage immunity negates damage
- ✅ Multiple parallel combats don't interfere
- ✅ Initiative order maintained correctly
- ✅ Healing cannot exceed max HP
- ✅ Round advancement and turn order

### Resource Flow (10 tests)

- ✅ Spell slot usage and restoration via rests
- ✅ Upcasting spells with higher-level slots
- ✅ Cannot use more slots than available
- ✅ Hit dice: spend on short rest, recover on long rest
- ✅ Long rest restores HP to max
- ✅ Multiple long rests restore all resources
- ✅ Spell slot usage is tracked with history
- ✅ Short rest duration tracking
- ✅ 24-hour long rest cooldown
- ✅ Resource state persists across rests

### Progression Flow (10 tests)

- ✅ Award XP → Level up → Gain HP → ASI → Proficiency update
- ✅ Level 4→5 increases proficiency and grants 3rd-level spells
- ✅ Multiple level ups in succession
- ✅ XP awards are logged and queryable
- ✅ Cannot level up without sufficient XP
- ✅ ASI can be split between two abilities
- ✅ Ability scores cannot exceed 20
- ✅ Class features granted at appropriate levels
- ✅ Progression status shows XP to next level
- ✅ Leveling up restores all hit dice

## Database Cleanup

Tests use database transactions and cleanup utilities:

- `setupTestDatabase()` - Initialize test environment
- `teardownTestDatabase()` - Clean all test data
- `resetDatabase()` - Teardown + Setup in one operation

Tables cleaned (in dependency order):
- Combat: conditions, damage log, participant status, participants, encounters
- Resources: spell slots, usage log, hit dice, rest events
- Progression: XP events, level progression, class features
- Core: character stats, inventory, characters, sessions, campaigns

## Troubleshooting

### Tests Hang or Timeout

- Check database connection
- Ensure database is accessible
- Verify `DATABASE_URL` is correct
- Check if migrations are up to date

### Database Errors

```bash
# Run migrations
cd db
npm run migrate
```

### Import Errors

Ensure all service files are correctly exported and paths use `.js` extension for ESM compatibility.

### CI/CD Integration

Example GitHub Actions workflow:

```yaml
name: Integration Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install
      - run: cd server && npx vitest run src/__tests__/integration/
        env:
          DATABASE_URL: postgresql://postgres:test@localhost:5432/testdb
```

## Best Practices

1. **Isolation**: Each test should be independent
2. **Cleanup**: Always clean up test data in `beforeEach` or `afterEach`
3. **Timeouts**: Set appropriate timeouts for database operations
4. **Fixtures**: Use test fixtures for consistent data
5. **Assertions**: Test both success and error cases
6. **Coverage**: Aim for critical user workflows

## Statistics

- **Total Test Suites**: 3
- **Total Tests**: 32
- **Test Coverage Areas**: Combat, Resources, Progression
- **Database Tables Used**: 20+
- **Average Test Duration**: ~500ms per test
- **Total Test Suite Duration**: ~30-60 seconds

## Future Enhancements

Potential areas for expansion:

1. Multiclass character progression
2. Condition effects on combat
3. Inventory management integration
4. Party combat scenarios
5. Spell concentration tracking
6. Environmental hazards
7. Status effect expiration
8. Long rest interruption mechanics
