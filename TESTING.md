# Testing Guide

> Last Updated: 2025-11-14

## Table of Contents

1. [Testing Philosophy](#testing-philosophy)
2. [Test Types](#test-types)
3. [Testing Stack](#testing-stack)
4. [Running Tests](#running-tests)
5. [Writing Tests](#writing-tests)
6. [Test Organization](#test-organization)
7. [Fixtures and Test Data](#fixtures-and-test-data)
8. [Coverage Requirements](#coverage-requirements)
9. [CI/CD Testing](#cicd-testing)
10. [Best Practices](#best-practices)
11. [Debugging Tests](#debugging-tests)

---

## Testing Philosophy

InfiniteRealms follows a comprehensive testing strategy that balances coverage, maintainability, and developer experience:

### Core Principles

1. **Test behavior, not implementation** - Focus on what the code does, not how it does it
2. **Write tests first** - TDD when possible, especially for bugs
3. **Keep tests simple** - Tests should be easier to understand than the code they test
4. **Fast feedback** - Unit tests run in milliseconds, integration tests in seconds
5. **Maintainable** - Tests should be easy to update when requirements change
6. **Reliable** - No flaky tests; tests should be deterministic

### Testing Pyramid

```
        E2E Tests (5%)           ← Few, test critical user journeys
       /            \
      /   Integration  \         ← Moderate, test system boundaries
     /    Tests (25%)   \
    /                    \
   /   Unit Tests (70%)   \      ← Many, test individual functions/classes
  /__________________________\
```

**Unit Tests (70%):**
- Test individual functions, classes, and components
- Fast execution (< 1 second for entire suite)
- No external dependencies (mocked)

**Integration Tests (25%):**
- Test interactions between modules
- Database queries and transactions
- API endpoint responses
- State management integration

**E2E Tests (5%):**
- Test complete user workflows
- Authentication flows
- Character creation
- Game session interactions

---

## Test Types

### 1. Unit Tests

Test individual units of code in isolation.

**Example - Testing a utility function:**
```typescript
// src/utils/dice.test.ts
import { describe, it, expect } from 'vitest';
import { rollDice, parseRollNotation } from './dice';

describe('rollDice', () => {
  it('should roll within valid range', () => {
    const result = rollDice(1, 20);
    expect(result).toBeGreaterThanOrEqual(1);
    expect(result).toBeLessThanOrEqual(20);
  });

  it('should handle multiple dice', () => {
    const result = rollDice(3, 6);
    expect(result).toBeGreaterThanOrEqual(3);
    expect(result).toBeLessThanOrEqual(18);
  });
});

describe('parseRollNotation', () => {
  it('should parse simple notation', () => {
    expect(parseRollNotation('1d20')).toEqual({ count: 1, sides: 20, modifier: 0 });
  });

  it('should parse notation with modifier', () => {
    expect(parseRollNotation('2d6+3')).toEqual({ count: 2, sides: 6, modifier: 3 });
  });
});
```

**Example - Testing a React component:**
```typescript
// src/components/CharacterCard.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CharacterCard } from './CharacterCard';

describe('CharacterCard', () => {
  const mockCharacter = {
    id: '1',
    name: 'Thorin',
    race: 'Dwarf',
    class: 'Fighter',
    level: 5,
  };

  it('should render character name', () => {
    render(<CharacterCard character={mockCharacter} />);
    expect(screen.getByText('Thorin')).toBeInTheDocument();
  });

  it('should render race and class', () => {
    render(<CharacterCard character={mockCharacter} />);
    expect(screen.getByText(/Dwarf Fighter/i)).toBeInTheDocument();
  });

  it('should render level', () => {
    render(<CharacterCard character={mockCharacter} />);
    expect(screen.getByText(/Level 5/i)).toBeInTheDocument();
  });
});
```

### 2. Integration Tests

Test interactions between components, services, and database.

**Example - Testing API endpoint:**
```typescript
// server/tests/characters.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';
import { supabaseService } from '../src/lib/supabase';

describe('Character API', () => {
  let authToken: string;
  let testUserId: string;

  beforeEach(async () => {
    // Create test user and get auth token
    const { data, error } = await supabaseService.auth.signUp({
      email: 'test@example.com',
      password: 'testpass123',
    });
    testUserId = data.user!.id;
    authToken = data.session!.access_token;
  });

  afterEach(async () => {
    // Clean up test data
    await supabaseService
      .from('characters')
      .delete()
      .eq('player_id', testUserId);

    await supabaseService.auth.admin.deleteUser(testUserId);
  });

  describe('POST /api/v1/characters', () => {
    it('should create a new character', async () => {
      const response = await request(app)
        .post('/api/v1/characters')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Thorin',
          race: 'dwarf',
          class: 'fighter',
          level: 1,
        });

      expect(response.status).toBe(201);
      expect(response.body.name).toBe('Thorin');
      expect(response.body.id).toBeDefined();
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/v1/characters')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Thorin' });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('race');
    });

    it('should reject unauthenticated requests', async () => {
      const response = await request(app)
        .post('/api/v1/characters')
        .send({ name: 'Thorin', race: 'dwarf', class: 'fighter' });

      expect(response.status).toBe(401);
    });
  });
});
```

**Example - Testing database queries:**
```typescript
// server/tests/character-service.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { CharacterService } from '../src/services/character';
import { createTestUser, createTestCharacter } from './helpers';

describe('CharacterService', () => {
  let userId: string;
  let characterService: CharacterService;

  beforeEach(async () => {
    characterService = new CharacterService();
    userId = await createTestUser();
  });

  afterEach(async () => {
    await cleanupTestData(userId);
  });

  describe('create', () => {
    it('should create character with abilities', async () => {
      const character = await characterService.create({
        name: 'Gandalf',
        race: 'human',
        class: 'wizard',
        level: 1,
        abilities: {
          strength: 10,
          dexterity: 14,
          constitution: 12,
          intelligence: 18,
          wisdom: 16,
          charisma: 14,
        },
      }, userId);

      expect(character.id).toBeDefined();
      expect(character.abilities.intelligence).toBe(18);
    });

    it('should enforce unique name per user', async () => {
      await characterService.create({
        name: 'Gandalf',
        race: 'human',
        class: 'wizard',
        level: 1,
      }, userId);

      await expect(
        characterService.create({
          name: 'Gandalf',
          race: 'elf',
          class: 'ranger',
          level: 1,
        }, userId)
      ).rejects.toThrow('already exists');
    });
  });

  describe('getWithSpells', () => {
    it('should include prepared spells', async () => {
      const character = await createTestCharacter(userId, {
        class: 'wizard',
        level: 3,
      });

      // Prepare some spells
      await characterService.prepareSpells(character.id, [
        'magic-missile',
        'shield',
        'fireball',
      ]);

      const result = await characterService.getWithSpells(character.id, userId);
      expect(result.spells).toHaveLength(3);
      expect(result.spells[0].name).toBe('Magic Missile');
    });
  });
});
```

### 3. E2E Tests

Test complete user workflows using Playwright.

**Example - Testing authentication:**
```typescript
// tests/e2e/auth.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('should allow user to sign up', async ({ page }) => {
    await page.goto('/auth');

    // Fill signup form
    await page.fill('[name="email"]', 'newuser@example.com');
    await page.fill('[name="password"]', 'SecurePass123!');
    await page.fill('[name="confirmPassword"]', 'SecurePass123!');
    await page.click('button:has-text("Sign Up")');

    // Should redirect to campaigns
    await expect(page).toHaveURL('/campaigns');
    await expect(page.locator('text=Welcome')).toBeVisible();
  });

  test('should allow user to login', async ({ page }) => {
    await page.goto('/auth');

    // Fill login form
    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'testpass123');
    await page.click('button:has-text("Sign In")');

    // Should redirect to campaigns
    await expect(page).toHaveURL('/campaigns');
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/auth');

    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'wrongpassword');
    await page.click('button:has-text("Sign In")');

    // Should show error message
    await expect(page.locator('text=Invalid credentials')).toBeVisible();
  });
});
```

**Example - Testing character creation:**
```typescript
// tests/e2e/character-creation.spec.ts
import { test, expect } from '@playwright/test';
import { login } from './helpers/auth';

test.describe('Character Creation', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'test@example.com', 'testpass123');
  });

  test('should create a new character', async ({ page }) => {
    await page.goto('/characters/new');

    // Step 1: Choose race
    await page.click('button:has-text("Dwarf")');
    await page.click('button:has-text("Next")');

    // Step 2: Choose class
    await page.click('button:has-text("Fighter")');
    await page.click('button:has-text("Next")');

    // Step 3: Set ability scores
    await page.fill('[name="strength"]', '16');
    await page.fill('[name="dexterity"]', '14');
    await page.fill('[name="constitution"]', '15');
    await page.fill('[name="intelligence"]', '10');
    await page.fill('[name="wisdom"]', '12');
    await page.fill('[name="charisma"]', '8');
    await page.click('button:has-text("Next")');

    // Step 4: Character details
    await page.fill('[name="name"]', 'Thorin Oakenshield');
    await page.click('button:has-text("Create Character")');

    // Should redirect to character sheet
    await expect(page).toHaveURL(/\/characters\/[a-f0-9-]+/);
    await expect(page.locator('text=Thorin Oakenshield')).toBeVisible();
  });

  test('should validate ability score total', async ({ page }) => {
    await page.goto('/characters/new');

    // Skip to ability scores
    await page.click('button:has-text("Dwarf")');
    await page.click('button:has-text("Next")');
    await page.click('button:has-text("Fighter")');
    await page.click('button:has-text("Next")');

    // Enter invalid scores (too high)
    await page.fill('[name="strength"]', '18');
    await page.fill('[name="dexterity"]', '18');
    await page.fill('[name="constitution"]', '18');
    await page.fill('[name="intelligence"]', '18');
    await page.fill('[name="wisdom"]', '18');
    await page.fill('[name="charisma"]', '18');

    await page.click('button:has-text("Next")');

    // Should show validation error
    await expect(page.locator('text=Total ability score')).toBeVisible();
  });
});
```

### 4. Rules Engine Tests

Test D&D 5E game mechanics implementation.

**Example - Testing combat rules:**
```typescript
// server/tests/rules/combat.spec.ts
import { describe, it, expect } from 'vitest';
import { calculateAttackRoll, calculateDamage } from '../../src/rules/combat';

describe('Combat Rules', () => {
  describe('calculateAttackRoll', () => {
    it('should apply ability modifier', () => {
      const attacker = {
        abilities: { strength: 16 }, // +3 modifier
        proficiencyBonus: 2,
      };

      const roll = calculateAttackRoll(attacker, {
        weaponType: 'melee',
        isProficient: true,
        baseDie: 15,
      });

      expect(roll.total).toBe(15 + 3 + 2); // d20 + STR + prof
    });

    it('should apply advantage correctly', () => {
      const attacker = {
        abilities: { dexterity: 14 }, // +2 modifier
        proficiencyBonus: 2,
      };

      const roll = calculateAttackRoll(attacker, {
        weaponType: 'ranged',
        isProficient: true,
        hasAdvantage: true,
        rolls: [12, 18], // Should use 18
      });

      expect(roll.total).toBe(18 + 2 + 2); // best roll + DEX + prof
    });

    it('should not add proficiency if not proficient', () => {
      const attacker = {
        abilities: { strength: 14 },
        proficiencyBonus: 2,
      };

      const roll = calculateAttackRoll(attacker, {
        weaponType: 'melee',
        isProficient: false,
        baseDie: 10,
      });

      expect(roll.total).toBe(10 + 2); // d20 + STR only
    });
  });

  describe('calculateDamage', () => {
    it('should calculate melee damage with STR modifier', () => {
      const damage = calculateDamage({
        baseDamage: { dice: '1d8', roll: 6 },
        abilityModifier: 3,
        isCritical: false,
      });

      expect(damage.total).toBe(9); // 6 + 3
    });

    it('should double dice on critical hit', () => {
      const damage = calculateDamage({
        baseDamage: { dice: '2d6', roll: 8 },
        abilityModifier: 3,
        isCritical: true,
        criticalRoll: 7,
      });

      expect(damage.total).toBe(18); // (8 + 7) + 3
    });
  });
});
```

---

## Testing Stack

### Unit & Integration Testing
- **Vitest 2.0** - Fast test runner with Vite integration
- **@testing-library/react** - React component testing
- **@testing-library/jest-dom** - Custom matchers for DOM
- **supertest** - HTTP endpoint testing

### E2E Testing
- **Playwright 1.47** - Browser automation
- **@playwright/test** - E2E test runner

### Test Utilities
- **jsdom** - DOM implementation for Node.js
- **@vitest/coverage-v8** - Code coverage reporting
- **msw** - API mocking (if needed)

---

## Running Tests

### All Tests

```bash
# Run all unit and integration tests
npm test

# Run with coverage
npm run test:coverage

# Run in watch mode
npm run test:watch

# Run specific test file
npm test src/utils/dice.test.ts

# Run tests matching pattern
npm test -- --grep "Character"
```

### Server Tests

```bash
# Run backend tests only
npm run server:test

# Run with coverage
npm run server:test -- --coverage

# Run specific test suite
npm run server:test -- tests/characters.test.ts
```

### E2E Tests

```bash
# Install browsers (first time only)
npx playwright install --with-deps

# Run E2E tests
npm run e2e

# Run in headed mode (see browser)
npm run e2e -- --headed

# Run specific test
npm run e2e -- tests/e2e/auth.spec.ts

# Debug mode
npm run e2e -- --debug
```

### CI/CD Testing

```bash
# Run full test suite (what CI runs)
npm run lint
npm run type-check
npm test -- --coverage
npm run e2e
```

---

## Writing Tests

### Test Structure (AAA Pattern)

Use the **Arrange, Act, Assert** pattern:

```typescript
describe('CharacterService', () => {
  it('should calculate ability modifier correctly', () => {
    // Arrange - Set up test data
    const characterService = new CharacterService();
    const abilityScore = 16;

    // Act - Execute the function
    const modifier = characterService.calculateModifier(abilityScore);

    // Assert - Verify the result
    expect(modifier).toBe(3);
  });
});
```

### Naming Conventions

**Test files:**
- Unit tests: `*.test.ts` or `*.spec.ts`
- Integration tests: `*.test.ts` in `tests/` directory
- E2E tests: `*.spec.ts` in `tests/e2e/` directory

**Test descriptions:**
```typescript
// Good: Describes behavior
it('should create character with valid data')
it('should reject invalid email format')
it('should calculate critical hit damage')

// Bad: Describes implementation
it('should call createCharacter function')
it('should use validateEmail helper')
it('should multiply damage by 2')
```

### Mocking

**Mock external services:**
```typescript
import { vi } from 'vitest';
import * as aiService from '../src/services/ai';

vi.mock('../src/services/ai', () => ({
  generateNarrative: vi.fn().mockResolvedValue({
    text: 'You enter a dark dungeon...',
    suggestions: ['Go north', 'Search for traps'],
  }),
}));

describe('GameService', () => {
  it('should use AI to generate story', async () => {
    const game = new GameService();
    const response = await game.processAction('look around');

    expect(aiService.generateNarrative).toHaveBeenCalledWith({
      context: expect.any(Object),
      action: 'look around',
    });
    expect(response.text).toContain('dark dungeon');
  });
});
```

**Mock database queries:**
```typescript
import { vi } from 'vitest';
import { supabaseService } from '../src/lib/supabase';

vi.mock('../src/lib/supabase', () => ({
  supabaseService: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({
            data: { id: '1', name: 'Test Character' },
            error: null,
          }),
        })),
      })),
    })),
  },
}));
```

**Partial mocks:**
```typescript
// Mock only specific functions
vi.spyOn(diceService, 'rollD20').mockReturnValue(15);

// Restore original implementation after test
afterEach(() => {
  vi.restoreAllMocks();
});
```

---

## Test Organization

### Directory Structure

```
server/
├── tests/
│   ├── unit/
│   │   ├── services/
│   │   ├── utils/
│   │   └── rules/
│   ├── integration/
│   │   ├── api/
│   │   ├── database/
│   │   └── services/
│   └── e2e/
│       ├── auth.spec.ts
│       ├── character-creation.spec.ts
│       └── game-session.spec.ts
├── src/
│   ├── services/
│   │   └── character.test.ts  # Co-located unit tests
│   └── utils/
│       └── dice.test.ts       # Co-located unit tests
```

### Test Organization Principles

1. **Co-locate unit tests** with source files for easier maintenance
2. **Separate integration tests** in `/tests` directory
3. **E2E tests** in dedicated `/tests/e2e` directory
4. **Shared test utilities** in `/tests/helpers` or `/tests/utils`

---

## Fixtures and Test Data

### Creating Test Data

**Simple fixtures:**
```typescript
// tests/fixtures/characters.ts
export const mockCharacter = {
  id: 'char-123',
  name: 'Thorin Oakenshield',
  race: 'dwarf',
  class: 'fighter',
  level: 5,
  abilities: {
    strength: 16,
    dexterity: 12,
    constitution: 15,
    intelligence: 10,
    wisdom: 11,
    charisma: 9,
  },
};

export const mockWizard = {
  id: 'char-456',
  name: 'Gandalf',
  race: 'human',
  class: 'wizard',
  level: 10,
  abilities: {
    strength: 10,
    dexterity: 14,
    constitution: 12,
    intelligence: 18,
    wisdom: 16,
    charisma: 14,
  },
};
```

**Factory functions:**
```typescript
// tests/helpers/factories.ts
export function createTestCharacter(overrides = {}) {
  return {
    id: `char-${Date.now()}`,
    name: 'Test Character',
    race: 'human',
    class: 'fighter',
    level: 1,
    ...overrides,
  };
}

export function createTestCampaign(userId: string, overrides = {}) {
  return {
    id: `campaign-${Date.now()}`,
    name: 'Test Campaign',
    description: 'A test campaign',
    dungeon_master_id: userId,
    ...overrides,
  };
}
```

**Database test data:**
```typescript
// tests/helpers/database.ts
export async function createTestUser() {
  const { data } = await supabaseService.auth.signUp({
    email: `test-${Date.now()}@example.com`,
    password: 'testpass123',
  });
  return data.user!.id;
}

export async function cleanupTestData(userId: string) {
  await supabaseService.from('characters').delete().eq('player_id', userId);
  await supabaseService.from('campaigns').delete().eq('dungeon_master_id', userId);
  await supabaseService.auth.admin.deleteUser(userId);
}

export async function seedTestData(userId: string) {
  const character = await createTestCharacter({ player_id: userId });
  const campaign = await createTestCampaign({ dungeon_master_id: userId });
  return { character, campaign };
}
```

---

## Coverage Requirements

### Coverage Thresholds

InfiniteRealms enforces minimum coverage thresholds in CI:

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      thresholds: {
        statements: 80,
        branches: 80,
        functions: 80,
        lines: 80,
      },
      exclude: [
        '**/*.test.ts',
        '**/*.spec.ts',
        '**/tests/**',
        '**/node_modules/**',
      ],
    },
  },
});
```

### Checking Coverage

```bash
# Generate coverage report
npm run test:coverage

# View HTML report
open coverage/index.html
```

### Coverage Guidelines

**Prioritize coverage for:**
- Business logic (services, rules engine)
- Utility functions
- API endpoints
- Critical user flows

**Lower priority for:**
- UI components (focus on integration tests)
- Configuration files
- Type definitions
- Mock data

---

## CI/CD Testing

### GitHub Actions Workflow

Tests run automatically on every push and pull request:

```yaml
name: CI

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '22'

      - name: Install dependencies
        run: npm ci

      - name: Lint
        run: npm run lint

      - name: Type check
        run: npm run type-check

      - name: Unit tests
        run: npm test -- --coverage

      - name: Upload coverage
        uses: codecov/codecov-action@v3

      - name: E2E tests
        run: npm run e2e

      - name: Security scan
        run: npm audit --audit-level=high
```

### Pre-commit Hooks

Use Husky to run tests before commits:

```json
// .husky/pre-commit
#!/bin/sh
npm run lint-staged
npm test -- --related --passWithNoTests
```

---

## Best Practices

### 1. Test Independence

Each test should be independent and not rely on other tests:

```typescript
// Bad: Tests depend on order
describe('CharacterService', () => {
  let characterId;

  it('should create character', async () => {
    const char = await service.create({ name: 'Test' });
    characterId = char.id; // Stores state
  });

  it('should get character', async () => {
    const char = await service.get(characterId); // Depends on previous test
    expect(char.name).toBe('Test');
  });
});

// Good: Each test is self-contained
describe('CharacterService', () => {
  it('should create character', async () => {
    const char = await service.create({ name: 'Test' });
    expect(char.id).toBeDefined();
  });

  it('should get character by ID', async () => {
    const char = await service.create({ name: 'Test' });
    const fetched = await service.get(char.id);
    expect(fetched.name).toBe('Test');
  });
});
```

### 2. Test One Thing

Each test should verify one behavior:

```typescript
// Bad: Testing multiple things
it('should create and update character', async () => {
  const char = await service.create({ name: 'Test' });
  expect(char.id).toBeDefined();

  const updated = await service.update(char.id, { level: 2 });
  expect(updated.level).toBe(2);
});

// Good: Separate tests
it('should create character', async () => {
  const char = await service.create({ name: 'Test' });
  expect(char.id).toBeDefined();
});

it('should update character level', async () => {
  const char = await createTestCharacter();
  const updated = await service.update(char.id, { level: 2 });
  expect(updated.level).toBe(2);
});
```

### 3. Descriptive Test Names

Test names should clearly describe what they test:

```typescript
// Bad: Vague names
it('should work')
it('should handle error')
it('should return data')

// Good: Specific names
it('should calculate ability modifier from ability score')
it('should throw error when character name is empty')
it('should return all spells for wizard class')
```

### 4. Use Test Utilities

Create helper functions for common test operations:

```typescript
// tests/helpers/setup.ts
export async function setupTestUser() {
  const { data } = await supabaseService.auth.signUp({
    email: `test-${Date.now()}@example.com`,
    password: 'testpass123',
  });
  return {
    userId: data.user!.id,
    token: data.session!.access_token,
  };
}

export async function createAuthenticatedRequest(app, token) {
  return request(app).set('Authorization', `Bearer ${token}`);
}

// Usage in tests
it('should get user characters', async () => {
  const { userId, token } = await setupTestUser();
  const response = await createAuthenticatedRequest(app, token)
    .get('/api/v1/characters');

  expect(response.status).toBe(200);
});
```

### 5. Avoid Test Logic

Tests should be straightforward without complex logic:

```typescript
// Bad: Complex logic in test
it('should calculate modifiers', () => {
  const scores = [8, 10, 12, 14, 16, 18];
  for (let i = 0; i < scores.length; i++) {
    const expected = Math.floor((scores[i] - 10) / 2);
    expect(calculateModifier(scores[i])).toBe(expected);
  }
});

// Good: Explicit test cases
it('should calculate negative modifier for low scores', () => {
  expect(calculateModifier(8)).toBe(-1);
});

it('should calculate zero modifier for average scores', () => {
  expect(calculateModifier(10)).toBe(0);
});

it('should calculate positive modifier for high scores', () => {
  expect(calculateModifier(18)).toBe(4);
});
```

---

## Debugging Tests

### Debug Single Test

```bash
# Run specific test in debug mode
npm test -- --reporter=verbose src/utils/dice.test.ts

# Use debugger statement
# Add `debugger;` in your test code, then:
node --inspect-brk node_modules/.bin/vitest run dice.test.ts
```

### Debug E2E Tests

```bash
# Run in headed mode
npm run e2e -- --headed

# Run in debug mode (step through)
npm run e2e -- --debug

# Generate trace for failed test
npm run e2e -- --trace on
```

### Common Issues

**Issue: Tests pass locally but fail in CI**
- Check for timezone differences
- Verify environment variables
- Look for filesystem path issues (case sensitivity)
- Check for parallel execution conflicts

**Issue: Flaky tests**
- Avoid time-based assertions (`setTimeout`)
- Use `waitFor` for async operations
- Mock external services
- Ensure proper test cleanup

**Issue: Slow tests**
- Use mocks for external services
- Minimize database operations
- Run tests in parallel
- Use `beforeAll` instead of `beforeEach` when possible

---

## Related Documentation

- [DEVELOPMENT.md](/home/user/ai-adventure-scribe-main/DEVELOPMENT.md) - Development workflow
- [CONTRIBUTING.md](/home/user/ai-adventure-scribe-main/CONTRIBUTING.md) - Contribution guidelines
- [CODE_QUALITY.md](/home/user/ai-adventure-scribe-main/docs/CODE_QUALITY.md) - Linting and formatting

---

**Document Version:** 1.0
**Last Updated:** 2025-11-14
**Maintained By:** Development Team
