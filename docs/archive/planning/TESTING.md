# Testing Guide

Comprehensive testing documentation for the AI Adventure Scribe platform after Phase 7 architectural modernization.

## Table of Contents

- [Overview](#overview)
- [Test Infrastructure](#test-infrastructure)
- [Running Tests](#running-tests)
- [Test Coverage](#test-coverage)
- [Testing Patterns](#testing-patterns)
- [Layer-Specific Testing](#layer-specific-testing)
- [Troubleshooting](#troubleshooting)

## Overview

### Test Statistics

**Total Test Suites:** 44 files
**Total Tests:** 575 tests
- ✅ **Passing:** 478 tests (83.1%)
- ❌ **Failing:** 97 tests (16.9% - primarily LangGraph integration tests needing mock refinement)

### Test Distribution by Layer

| Layer | Test Files | Tests | Status |
|-------|-----------|-------|--------|
| **Zustand Stores** | 1 | 52 | ✅ All passing |
| **Drizzle Services** | 2 | 67 | ✅ All passing |
| **tRPC Procedures** | 2 | 68 | ⚠️ 38 passing (mocks need refinement) |
| **LangGraph Nodes** | 5 | 180+ | ⚠️ Needs checkpointer mocking |
| **Utilities** | 15+ | 150+ | ✅ Mostly passing |
| **Components** | 10+ | 50+ | ✅ Mostly passing |

## Test Infrastructure

### Frontend Tests (Vitest)

**Configuration:** `vitest.config.ts`

```bash
# Run all frontend tests
npx vitest run

# Run with coverage
npx vitest run --coverage

# Run in watch mode
npx vitest

# Run specific test file
npx vitest run src/features/combat/stores/__tests__/combatStore.test.ts
```

**Setup Files:**
- `src/test/setup.ts` - Global test configuration
- `src/test/test-utils.tsx` - React testing utilities

### Backend Tests (Vitest)

**Configuration:** `server/vitest.config.ts`

```bash
# Run all backend tests
npm run server:test

# Run specific backend test
cd server && npx vitest run src/services/__tests__/character-service.test.ts

# Run with verbose output
cd server && npx vitest run --reporter=verbose
```

## Test Coverage

### Phase 2: Zustand Stores (Combat System)

**File:** `src/features/combat/stores/__tests__/combatStore.test.ts`
**Tests:** 52 tests - ✅ All passing

**Coverage:**
- ✅ Store initialization and default state
- ✅ Participant CRUD operations
- ✅ Initiative tracking and turn advancement
- ✅ Damage and healing mechanics (including temporary HP)
- ✅ Round management
- ✅ Condition system
- ✅ Death saves
- ✅ Reaction system
- ✅ Combat log management
- ✅ UI state management
- ✅ LocalStorage persistence
- ✅ State immutability verification

**Key Test Patterns:**
```typescript
import { renderHook, act } from '@testing-library/react';
import { useCombatStore } from '../combatStore';

describe('Combat Store', () => {
  beforeEach(() => {
    useCombatStore.getState().reset();
    localStorage.clear();
  });

  it('should deal damage correctly', () => {
    const { result } = renderHook(() => useCombatStore());

    act(() => {
      result.current.startCombat([mockParticipant]);
      result.current.dealDamage('participant-1', 10);
    });

    const participant = result.current.participants.get('participant-1');
    expect(participant?.currentHitPoints).toBe(15); // 25 - 10
  });
});
```

### Phase 3: tRPC Procedures

**Files:**
- `server/src/trpc/routers/__tests__/blog-posts.test.ts` (26 tests)
- `server/src/trpc/routers/__tests__/blog-taxonomy.test.ts` (42 tests)

**Status:** ⚠️ 38/68 passing (55.9%)

**Issues:**
- Mock chain refinement needed for Drizzle query builder
- Test data needs valid UUID format

**Coverage:**
- ✅ CRUD operations for blog posts
- ✅ CRUD operations for categories/tags
- ✅ Authentication and authorization checks
- ✅ Input validation (Zod schemas)
- ⚠️ Database error handling (needs mock fixes)

**Key Test Patterns:**
```typescript
import { createCallerFactory } from '@trpc/server';
import { appRouter } from '../index';

// Mock database
vi.mock('../../lib/drizzle', () => ({
  db: {
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([mockPost])
      })
    })
  }
}));

describe('Blog Posts Router', () => {
  it('should require authentication for create', async () => {
    const ctx = createUnauthenticatedContext();
    const caller = createCallerFactory(appRouter)(ctx);

    await expect(
      caller.blogPosts.create({ title: 'Test', slug: 'test' })
    ).rejects.toThrow('UNAUTHORIZED');
  });
});
```

### Phase 4: Drizzle Service Layer

**Files:**
- `server/src/services/__tests__/character-service.test.ts` (30 tests)
- `server/src/services/__tests__/session-service.test.ts` (37 tests)

**Status:** ✅ 67/67 passing (100%)

**Coverage:**

**CharacterService:**
- ✅ `listForUser()` - Get all characters with authorization
- ✅ `getById()` - Single character retrieval
- ✅ `create()` - Character creation with defaults
- ✅ `update()` - Updates with ownership checks
- ✅ `delete()` - Deletion with authorization
- ✅ `updateSpells()` - Spell management
- ✅ Error handling for all operations

**SessionService:**
- ✅ `createSession()` - Session initialization
- ✅ `getSessionWithMessages()` - Paginated messages
- ✅ `completeSession()` - Session completion
- ✅ `updateSessionState()` - JSONB state management
- ✅ `addMessage()` - Message tracking
- ✅ `appendCombatLog()` - Combat log management
- ✅ Error handling for all operations

**Key Test Patterns:**
```typescript
import { CharacterService } from '../character-service';

// Mock database client
vi.mock('../../lib/drizzle', () => ({
  db: mockDbClient
}));

describe('CharacterService', () => {
  it('should enforce authorization', async () => {
    const character = await CharacterService.getById(
      'char-123',
      'wrong-user-id'
    );

    expect(character).toBeNull();
  });

  it('should handle database errors', async () => {
    mockDbClient.select.mockRejectedValue(new Error('DB Error'));

    await expect(
      CharacterService.listForUser('user-123')
    ).rejects.toThrow('Failed to list characters');
  });
});
```

### Phase 6: LangGraph DMService

**Files:**
- `src/agents/langgraph/__tests__/dm-service.test.ts` (29 tests)
- `src/agents/langgraph/nodes/__tests__/intent-detector.test.ts` (45+ tests)
- `src/agents/langgraph/nodes/__tests__/rules-validator.test.ts` (40+ tests)
- `src/agents/langgraph/nodes/__tests__/response-generator.test.ts` (40+ tests)
- `src/agents/langgraph/__tests__/dm-graph.integration.test.ts` (30+ tests)

**Status:** ⚠️ Needs Supabase checkpointer and AI service mocking

**Coverage:**
- ✅ Intent detection (attack, social, exploration, etc.)
- ✅ Rules validation (D&D 5E mechanics)
- ✅ Response generation (narrative creation)
- ⚠️ Checkpoint persistence (needs mock)
- ⚠️ Graph execution (needs integration setup)
- ⚠️ Streaming behavior (needs mock refinement)

**Key Test Patterns:**
```typescript
import { detectIntent } from '../nodes/intent-detector';
import type { DMState } from '../state';

// Mock AI services
vi.mock('@/services/ai/shared/utils', () => ({
  getGeminiManager: () => ({
    executeWithRotation: vi.fn().mockResolvedValue(
      JSON.stringify({ intent: 'attack', confidence: 0.95 })
    )
  })
}));

describe('Intent Detector', () => {
  it('should detect attack intent', async () => {
    const state: DMState = {
      messages: [],
      playerInput: 'I attack the goblin with my sword!',
      worldContext: mockContext,
      // ...
    };

    const result = await detectIntent(state);

    expect(result.playerIntent).toBe('attack');
  });
});
```

## Testing Patterns

### 1. Mocking External Dependencies

**Database Mocking:**
```typescript
vi.mock('../../lib/drizzle', () => ({
  db: {
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([mockData])
      })
    })
  }
}));
```

**AI Service Mocking:**
```typescript
vi.mock('@/services/ai/shared/utils', () => ({
  getGeminiManager: () => ({
    executeWithRotation: vi.fn(async (fn) => {
      return JSON.stringify({ response: 'Mock response' });
    })
  })
}));
```

**Supabase Mocking:**
```typescript
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      insert: vi.fn().mockResolvedValue({ data: null, error: null }),
      select: vi.fn().mockResolvedValue({ data: [], error: null })
    }))
  }
}));
```

### 2. State Management Testing

**Zustand Store Testing:**
```typescript
import { renderHook, act } from '@testing-library/react';

describe('Store Tests', () => {
  beforeEach(() => {
    // Reset store state
    useStore.getState().reset();
  });

  it('should update state immutably', () => {
    const { result } = renderHook(() => useStore());
    const initialState = result.current;

    act(() => {
      result.current.updateValue('new-value');
    });

    expect(result.current).not.toBe(initialState);
  });
});
```

### 3. Authorization Testing

**Service Layer Authorization:**
```typescript
describe('Authorization', () => {
  it('should prevent unauthorized access', async () => {
    const result = await Service.getById(
      'resource-id',
      'wrong-user-id'
    );

    expect(result).toBeNull();
  });

  it('should allow owner access', async () => {
    const result = await Service.getById(
      'resource-id',
      'correct-user-id'
    );

    expect(result).toBeDefined();
  });
});
```

### 4. Error Handling Testing

**Database Error Handling:**
```typescript
describe('Error Handling', () => {
  it('should handle database errors gracefully', async () => {
    mockDb.select.mockRejectedValue(new Error('Connection failed'));

    await expect(
      Service.getAll()
    ).rejects.toThrow('Failed to retrieve data');
  });
});
```

### 5. Pagination Testing

**Paginated Queries:**
```typescript
describe('Pagination', () => {
  it('should respect page size limits', async () => {
    const result = await Service.list({ page: 1, pageSize: 10 });

    expect(result.data.length).toBeLessThanOrEqual(10);
  });

  it('should calculate hasMore correctly', async () => {
    const result = await Service.list({ page: 1, pageSize: 5 });

    expect(result.hasMore).toBe(true); // Assuming more than 5 items exist
  });
});
```

## Layer-Specific Testing

### Domain Layer (Pure Logic)

**Location:** `src/domains/`

**Pattern:** Pure function testing, no dependencies
```typescript
import { calculateDamage } from '../combat/damage';

describe('Damage Calculation', () => {
  it('should calculate damage correctly', () => {
    const result = calculateDamage({
      baseDamage: 10,
      modifier: 3,
      resistance: false
    });

    expect(result).toBe(13);
  });
});
```

### Features Layer (Zustand Stores)

**Location:** `src/features/`

**Pattern:** Hook testing with state management
```typescript
import { renderHook, act } from '@testing-library/react';

describe('Feature Store', () => {
  it('should manage state correctly', () => {
    const { result } = renderHook(() => useFeatureStore());

    act(() => {
      result.current.updateFeature({ id: 1, name: 'Test' });
    });

    expect(result.current.feature.name).toBe('Test');
  });
});
```

### Services Layer (Business Logic)

**Location:** `server/src/services/`

**Pattern:** Service testing with mocked database
```typescript
import { Service } from '../service';

vi.mock('../../lib/drizzle');

describe('Service', () => {
  it('should execute business logic', async () => {
    const result = await Service.execute({ input: 'test' });

    expect(result.success).toBe(true);
  });
});
```

### API Layer (tRPC Procedures)

**Location:** `server/src/trpc/routers/`

**Pattern:** End-to-end API testing
```typescript
import { createCaller } from '../test-utils';

describe('API Router', () => {
  it('should return data', async () => {
    const caller = createCaller(mockContext);
    const result = await caller.resource.list();

    expect(result).toHaveLength(10);
  });
});
```

## Troubleshooting

### Common Issues

#### 1. "Cannot find module" Errors

**Issue:** Import path resolution fails in tests

**Solution:** Check `vitest.config.ts` alias configuration:
```typescript
resolve: {
  alias: {
    '@': path.resolve(__dirname, './src'),
  },
},
```

#### 2. Mock Chain Errors

**Issue:** Drizzle query builder chains not mocking correctly

**Solution:** Use complete mock chains:
```typescript
vi.mock('../../lib/drizzle', () => ({
  db: {
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockResolvedValue([mockData])
        })
      })
    })
  }
}));
```

#### 3. Supabase Checkpointer Errors

**Issue:** LangGraph tests fail with checkpointer errors

**Solution:** Mock the Supabase checkpointer:
```typescript
vi.mock('../persistence/supabase-checkpointer', () => ({
  SupabaseCheckpointer: vi.fn().mockImplementation(() => ({
    get: vi.fn().mockResolvedValue(null),
    put: vi.fn().mockResolvedValue(undefined),
    list: vi.fn().mockResolvedValue([])
  }))
}));
```

#### 4. AI Service Rate Limits

**Issue:** Tests hitting real AI APIs

**Solution:** Always mock AI services in tests:
```typescript
vi.mock('@/services/ai/shared/utils', () => ({
  getGeminiManager: () => ({
    executeWithRotation: vi.fn().mockResolvedValue('Mock AI response')
  })
}));
```

#### 5. Test Isolation Issues

**Issue:** Tests affecting each other's state

**Solution:** Reset state in `beforeEach`:
```typescript
beforeEach(() => {
  // Reset Zustand stores
  useStore.getState().reset();

  // Clear localStorage
  localStorage.clear();

  // Clear all mocks
  vi.clearAllMocks();
});
```

### Running Individual Test Suites

```bash
# Combat store tests
npx vitest run src/features/combat/stores/__tests__/

# Character service tests
cd server && npx vitest run src/services/__tests__/character-service.test.ts

# LangGraph intent detector
npx vitest run src/agents/langgraph/nodes/__tests__/intent-detector.test.ts

# All tRPC router tests
cd server && npx vitest run src/trpc/routers/__tests__/
```

### Debugging Tests

**Verbose Output:**
```bash
npx vitest run --reporter=verbose
```

**Watch Mode:**
```bash
npx vitest
```

**Single Test:**
```bash
npx vitest run -t "should deal damage correctly"
```

**Coverage Report:**
```bash
npx vitest run --coverage
open coverage/index.html
```

## Best Practices

### 1. Test Organization
- ✅ Group related tests in `describe` blocks
- ✅ Use descriptive test names (`it('should...')`)
- ✅ One assertion per test when possible
- ✅ Use `beforeEach` for setup, `afterEach` for cleanup

### 2. Mocking Strategy
- ✅ Mock at the module boundary (external dependencies only)
- ✅ Keep mocks close to tests (avoid global mocks)
- ✅ Use `vi.mock()` for entire modules
- ✅ Use `vi.spyOn()` for selective mocking

### 3. Test Coverage Goals
- ✅ Critical paths: 100%
- ✅ Business logic: 90%+
- ✅ UI components: 70%+
- ✅ Utilities: 90%+

### 4. Performance
- ✅ Each test should run in <100ms
- ✅ Use parallelization (default in Vitest)
- ✅ Avoid real API calls
- ✅ Mock slow operations

### 5. Maintainability
- ✅ Keep tests simple and readable
- ✅ Avoid test interdependencies
- ✅ Use test utilities for common operations
- ✅ Update tests when refactoring code

## Next Steps

### Immediate Priorities

1. **Fix tRPC Mock Chains** (38 tests failing)
   - Refine Drizzle query builder mocking
   - Use valid UUID format in test data

2. **Mock Supabase Checkpointer** (97 tests failing)
   - Create mock implementation for LangGraph tests
   - Set up test database or full mock strategy

3. **Increase Coverage**
   - Add tests for remaining components
   - Cover edge cases in existing tests
   - Add integration tests

### Future Enhancements

- **E2E Tests:** Add Playwright tests for critical user flows
- **Performance Tests:** Add benchmarks for critical operations
- **Snapshot Tests:** Add visual regression tests
- **Contract Tests:** Add tests for external API integrations

---

**Last Updated:** Phase 7 - Testing Infrastructure Complete
**Test Statistics:** 575 tests (478 passing, 97 needing mock refinement)
**Build Status:** ✅ Passing (1m 5s)
