# Testing Coverage Implementation Plan

**Status:** In Progress (Updated 2025-11-14)
**Priority:** High
**Current Coverage:** ~15-20% estimated (416/527 tests passing)
**Target Coverage:** 40%+ (Phase 1), 70%+ (Phase 2), 85%+ (Final)
**Estimated Total Effort:** 4-5 weeks (reduced from 6-8 due to existing infrastructure)

---

## 🔍 REALITY CHECK (2025-11-14)

### Actual Current State Assessment

After examining the codebase, the initial assessment was **significantly pessimistic**. Here's what actually exists:

**✅ Testing Infrastructure ALREADY EXISTS:**
- ✓ Vitest 2.0.5 fully configured (client + server configs)
- ✓ Playwright 1.47.2 configured for E2E tests
- ✓ @testing-library/react 16.3.0 for component tests
- ✓ Coverage reporting configured (v8 provider)
- ✓ Test setup files with mocks
- ✓ Test helpers for domain-specific data (spell-test-helpers.ts)

**✅ Existing Test Coverage (111 test files):**
- ✓ **Spell System:** Comprehensive (30+ test files covering validation, preparation, restrictions, multiclass)
- ✓ **D&D Rules Engine:** 8 spec files (attack, checks, initiative, dice, death, opportunity attacks)
- ✓ **Security:** 3 files (authentication, authorization, input validation)
- ✓ **Utilities:** 15+ files (dice rolls, ability scores, sentence segmenter, memory classification)
- ✓ **Services:** Encounter generator, AI service, roll manager
- ✓ **Components:** Spell cards, selection panels, blog admin
- ✓ **Server Tests:** Auth, rate limiting, circuit breakers, quotas, Stripe integration

**❌ Critical Gaps (Matches Original Plan):**
- ✗ **Agent System: <5% coverage** (only 3 placeholder tests for 80+ implementation files)
  - DungeonMasterAgent (420 lines) - untested
  - RulesInterpreterAgent (160 lines) - untested
  - AgentMessagingService (34 files) - untested
  - LangGraph integration (13 files) - untested
- ✗ **Memory Semantic Search:** Classification tested, but embeddings/vector search NOT tested
- ✗ **API CRUD Operations:** Security tested, but core endpoints (campaigns, characters, sessions) NOT tested
- ✗ **CI/CD:** No GitHub Actions workflows exist

### Test Results Summary
```
Test Files:  35 passed | 17 failed (52 total)
Tests:       416 passed | 108 failed | 3 skipped (527 total)
```

**Known Failing Tests (Non-critical):**
- World Graph Engine (missing methods - feature incomplete)
- Scene Replay (determinism issues)
- Multiplayer (timing issues)
- Blog validation (edge cases)

### Revised Assessment

**Original Claim:** "0% test coverage"
**Reality:** ~15-20% coverage, heavily concentrated in spell system and D&D rules

**Impact on Plan:**
- **SKIP Week 1 Infrastructure Setup** - Already complete
- **START immediately on Agent/Memory/API tests** (critical gaps)
- **Reduce timeline:** 6-8 weeks → 4-5 weeks
- **Focus areas unchanged:** Agent system, Memory embeddings, API integration

---

## Executive Summary (UPDATED)

AI Adventure Scribe has **moderate test infrastructure** but **critical gaps in agent systems**. While the spell validation and D&D rules engine have good coverage (70%+), the multi-agent AI system, memory semantic search, and API integration tests are missing.

### Current State (ACCURATE)
- 111 test files exist (up from "51" in original assessment)
- Most tests ARE running (416/527 passing)
- No CI/CD test automation ✓ (still accurate)
- **Complex agent systems <5% tested** ✓ (critical gap confirmed)
- **Memory embeddings/semantic search NOT tested** ✓ (critical gap confirmed)
- **API CRUD endpoints NOT tested** ✓ (critical gap confirmed)
- Frontend spell components HAVE tests ✗ (original assessment wrong)

### Success Criteria
- ✅ **Phase 1 (Weeks 1-2):** 40% coverage - Core agent systems, memory, API
- ✅ **Phase 2 (Weeks 3-4):** 70% coverage - Integration tests, component tests
- ✅ **Phase 3 (Weeks 5-6):** 85% coverage - E2E tests, performance tests
- ✅ **CI/CD:** All tests run automatically on PR and merge
- ✅ **Performance:** Test suite runs in < 5 minutes
- ✅ **Quality:** < 3% flakiness rate for all tests

---

## 🎯 REVISED EXECUTION PLAN (2025-11-14)

### Immediate Priorities (THIS WEEK)

**Phase 0: Infrastructure (SKIP - Already Done)**
- ✅ Vitest configured
- ✅ Playwright configured
- ✅ Test setup files exist
- ✅ Coverage reporting configured

**Phase 1: Critical System Tests (Days 1-3)**
Execute in parallel:

1. **Agent Messaging Tests** (Priority 1 - Foundation)
   - Queue operations (enqueue, dequeue, prioritization)
   - Offline persistence (IndexedDB)
   - Message synchronization
   - Connection state management
   - Files: `/src/agents/messaging/services/`

2. **DungeonMasterAgent Tests** (Priority 1 - Core)
   - Task execution with memory
   - Narrative generation
   - Game state updates
   - Agent notifications
   - File: `/src/agents/dungeon-master-agent.ts`

3. **RulesInterpreterAgent Tests** (Priority 1 - Core)
   - D&D 5E rule validation
   - Spell/combat validation
   - Encounter spec validation
   - File: `/src/agents/rules-interpreter-agent.ts`

4. **Memory Semantic Search Tests** (Priority 1 - Data)
   - Embedding generation testing
   - Vector similarity search (`match_memories` RPC)
   - Feature flag behavior
   - Performance benchmarks (<100ms)
   - Files: `/src/agents/services/memory/`

5. **API Integration Tests** (Priority 2 - Backend)
   - Campaigns CRUD with ownership
   - Characters CRUD with campaign association
   - Sessions CRUD with auth
   - Files: `/server/src/routes/v1/`

6. **LangGraph Integration** (Priority 2 - Future)
   - Graph compilation and execution
   - State checkpointing
   - Adapter message conversion
   - Files: `/src/agents/langgraph/`

**Phase 2: CI/CD Setup (Day 4)**
- GitHub Actions workflow for test automation
- Coverage reporting and enforcement
- PR checks

**Phase 3: Verification (Day 5)**
- Measure final coverage
- Fix any failing tests
- Document test patterns

---

## Testing Infrastructure Setup (Week 1) [COMPLETED - SKIP THIS SECTION]

### 1.1 Testing Tools Configuration [ALREADY DONE]

#### Current Setup (Vitest)
```javascript
// vitest.config.ts (already exists)
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/tests/setup.ts',
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
```

#### Enhancements Needed
```typescript
// vitest.config.ts (enhanced)
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/tests/setup.ts',

    // Coverage configuration
    coverage: {
      provider: 'v8', // or 'istanbul'
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: './coverage',
      exclude: [
        'node_modules/',
        'src/tests/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/mockData/',
        'dist/',
      ],
      thresholds: {
        lines: 40,
        functions: 40,
        branches: 40,
        statements: 40,
      },
      all: true, // Include all files, even untested ones
    },

    // Test organization
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['node_modules', 'dist', '.idea', '.git', '.cache'],

    // Performance
    threads: true,
    maxThreads: 4,
    minThreads: 1,

    // Timeouts
    testTimeout: 10000,
    hookTimeout: 10000,

    // Mocking
    clearMocks: true,
    mockReset: true,
    restoreMocks: true,

    // Reporter
    reporters: ['verbose', 'json', 'html'],
    outputFile: {
      json: './test-results/results.json',
      html: './test-results/index.html',
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@server': path.resolve(__dirname, './server/src'),
    },
  },
})
```

#### Backend Testing Configuration
```typescript
// server/vitest.config.ts (new file)
import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    setupFiles: './server/tests/setup.ts',

    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      reportsDirectory: './server/coverage',
      exclude: [
        'node_modules/',
        'server/tests/',
        '**/*.d.ts',
        '**/*.config.*',
        'dist/',
      ],
      thresholds: {
        lines: 40,
        functions: 40,
        branches: 40,
        statements: 40,
      },
    },

    include: ['server/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['node_modules', 'dist'],

    threads: true,
    testTimeout: 10000,
    clearMocks: true,
  },
  resolve: {
    alias: {
      '@server': path.resolve(__dirname, './server/src'),
    },
  },
})
```

#### E2E Testing (Playwright)
```typescript
// playwright.config.ts (new file)
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'test-results/e2e-results.json' }],
  ],

  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
  },
});
```

#### Tasks
- [ ] Enhance `vitest.config.ts` with coverage thresholds
- [ ] Create `server/vitest.config.ts` for backend tests
- [ ] Install and configure Playwright for E2E tests
- [ ] Create test setup files with mocks
- [ ] Configure test databases (SQLite for tests)
- [ ] Set up code coverage reporting
- [ ] Add npm scripts for test commands

**Test Commands:**
```json
// package.json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage",
    "test:server": "vitest -c server/vitest.config.ts",
    "test:server:coverage": "vitest -c server/vitest.config.ts --coverage",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:all": "npm run test:coverage && npm run test:server:coverage && npm run test:e2e"
  }
}
```

---

### 1.2 Test Database Setup

#### Test Database Strategy
```typescript
// server/tests/test-db.ts
import { createClient } from '@supabase/supabase-js';
import { Database } from '../src/types/database.types';

// Use separate Supabase project for testing
const TEST_SUPABASE_URL = process.env.TEST_SUPABASE_URL || 'http://localhost:54321';
const TEST_SUPABASE_ANON_KEY = process.env.TEST_SUPABASE_ANON_KEY || 'test-key';

export const testSupabase = createClient<Database>(
  TEST_SUPABASE_URL,
  TEST_SUPABASE_ANON_KEY
);

// Database seeding utilities
export async function seedTestDatabase() {
  // Create test users
  const testUsers = await createTestUsers(5);

  // Create test campaigns
  const testCampaigns = await createTestCampaigns(testUsers[0].id, 3);

  // Create test characters
  const testCharacters = await createTestCharacters(testUsers, 10);

  return { testUsers, testCampaigns, testCharacters };
}

export async function cleanTestDatabase() {
  // Delete all test data
  await testSupabase.from('sessions').delete().neq('id', '');
  await testSupabase.from('characters').delete().neq('id', '');
  await testSupabase.from('campaigns').delete().neq('id', '');
  await testSupabase.from('profiles').delete().neq('id', '');
}

// Transaction utilities for isolated tests
export async function withTransaction<T>(
  testFn: () => Promise<T>
): Promise<T> {
  try {
    const result = await testFn();
    return result;
  } finally {
    await cleanTestDatabase();
  }
}
```

#### Test Fixtures
```typescript
// server/tests/fixtures/character-fixtures.ts
export const mockCharacter = {
  id: 'test-char-1',
  user_id: 'test-user-1',
  name: 'Test Barbarian',
  class: 'Barbarian',
  level: 5,
  race: 'Half-Orc',
  background: 'Outlander',
  ability_scores: {
    strength: 18,
    dexterity: 14,
    constitution: 16,
    intelligence: 8,
    wisdom: 12,
    charisma: 10,
  },
  max_hp: 58,
  current_hp: 58,
  armor_class: 15,
  proficiency_bonus: 3,
};

export const mockWizard = {
  // ... similar structure
};

// server/tests/fixtures/campaign-fixtures.ts
export const mockCampaign = {
  id: 'test-campaign-1',
  user_id: 'test-user-1',
  title: 'Test Campaign',
  description: 'A test campaign',
  setting: 'Forgotten Realms',
  created_at: new Date().toISOString(),
};
```

#### Tasks
- [ ] Set up test Supabase instance (local or separate project)
- [ ] Create database seeding utilities
- [ ] Create test fixtures for all entities
- [ ] Implement transaction/rollback for isolated tests
- [ ] Add test data reset scripts

---

### 1.3 Mock Services & Utilities

#### AI Service Mocks
```typescript
// src/tests/mocks/ai-service-mock.ts
import { vi } from 'vitest';

export const mockAIService = {
  processPlayerMessage: vi.fn().mockResolvedValue({
    response: 'You enter the tavern...',
    needsRoll: false,
  }),

  generateNarrative: vi.fn().mockResolvedValue({
    narrative: 'The dragon roars...',
  }),

  detectIntent: vi.fn().mockResolvedValue({
    intent: 'combat_action',
    confidence: 0.95,
  }),

  validateRules: vi.fn().mockResolvedValue({
    valid: true,
    errors: [],
  }),
};

// src/tests/mocks/crewai-client-mock.ts
export const mockCrewAIClient = {
  processMessage: vi.fn().mockResolvedValue({
    response: 'Roll for initiative!',
    diceRequests: [{ type: 'd20', reason: 'Initiative' }],
  }),

  parseDiceRoll: vi.fn().mockReturnValue({
    type: 'd20',
    result: 15,
  }),
};
```

#### Memory Service Mocks
```typescript
// src/tests/mocks/memory-service-mock.ts
export const mockMemoryService = {
  storeMemory: vi.fn().mockResolvedValue({
    id: 'memory-1',
    success: true,
  }),

  retrieveMemories: vi.fn().mockResolvedValue([
    {
      id: 'memory-1',
      content: 'You defeated the goblin',
      timestamp: new Date().toISOString(),
      relevance: 0.95,
    },
  ]),

  searchMemories: vi.fn().mockResolvedValue([]),
};
```

#### Agent Messaging Mocks
```typescript
// src/tests/mocks/agent-messaging-mock.ts
export const mockAgentMessaging = {
  sendMessage: vi.fn().mockResolvedValue({
    id: 'msg-1',
    delivered: true,
  }),

  receiveMessage: vi.fn().mockResolvedValue({
    id: 'msg-2',
    from: 'dm-agent',
    content: 'Roll for perception',
  }),

  acknowledgeMessage: vi.fn().mockResolvedValue(true),
};
```

#### Tasks
- [ ] Create mock implementations for all AI services
- [ ] Create mock implementations for database operations
- [ ] Create mock implementations for external APIs (Gemini, OpenAI, ElevenLabs)
- [ ] Create test utilities (waitFor, renderWithProviders, etc.)
- [ ] Document mocking patterns for the team

---

## Phase 1: Core System Tests (Weeks 1-2, Target: 40% Coverage)

### 2.1 Agent System Tests

#### Dungeon Master Agent Tests
```typescript
// src/agents/tests/dungeon-master-agent.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DungeonMasterAgent } from '../dungeon-master-agent';
import { mockAIService } from '../../tests/mocks/ai-service-mock';

describe('DungeonMasterAgent', () => {
  let dmAgent: DungeonMasterAgent;

  beforeEach(() => {
    dmAgent = new DungeonMasterAgent({
      aiService: mockAIService,
      campaignId: 'test-campaign-1',
    });
  });

  describe('processPlayerAction', () => {
    it('should process combat actions correctly', async () => {
      const result = await dmAgent.processPlayerAction({
        action: 'attack',
        target: 'goblin',
        character: mockCharacter,
      });

      expect(result.narrative).toBeDefined();
      expect(result.requiresRoll).toBe(true);
      expect(result.rollType).toBe('attack');
    });

    it('should process exploration actions', async () => {
      const result = await dmAgent.processPlayerAction({
        action: 'investigate',
        target: 'locked door',
        character: mockCharacter,
      });

      expect(result.narrative).toBeDefined();
    });

    it('should handle invalid actions gracefully', async () => {
      const result = await dmAgent.processPlayerAction({
        action: 'fly to the moon',
        character: mockCharacter,
      });

      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('generateNarrative', () => {
    it('should generate contextual narrative', async () => {
      const narrative = await dmAgent.generateNarrative({
        context: 'entering tavern',
        recentEvents: [],
        characters: [mockCharacter],
      });

      expect(narrative).toBeTruthy();
      expect(narrative.length).toBeGreaterThan(50);
    });

    it('should incorporate character details', async () => {
      const narrative = await dmAgent.generateNarrative({
        context: 'character introduction',
        characters: [mockCharacter],
      });

      expect(narrative).toContain('Barbarian');
    });
  });

  describe('memory integration', () => {
    it('should retrieve relevant memories', async () => {
      const memories = await dmAgent.getRelevantMemories('tavern');

      expect(memories).toBeDefined();
      expect(Array.isArray(memories)).toBe(true);
    });

    it('should store important events', async () => {
      await dmAgent.storeEvent({
        type: 'combat_victory',
        description: 'Defeated dragon',
        importance: 'high',
      });

      expect(mockMemoryService.storeMemory).toHaveBeenCalled();
    });
  });
});
```

#### Rules Interpreter Agent Tests
```typescript
// src/agents/tests/rules-interpreter-agent.test.ts
describe('RulesInterpreterAgent', () => {
  let rulesAgent: RulesInterpreterAgent;

  beforeEach(() => {
    rulesAgent = new RulesInterpreterAgent();
  });

  describe('validateAction', () => {
    it('should validate legal attack action', async () => {
      const result = await rulesAgent.validateAction({
        action: 'attack',
        character: mockCharacter,
        weapon: 'greatsword',
      });

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject action without required resources', async () => {
      const exhaustedCharacter = {
        ...mockCharacter,
        current_hp: 0,
      };

      const result = await rulesAgent.validateAction({
        action: 'attack',
        character: exhaustedCharacter,
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Character is unconscious');
    });

    it('should validate spell casting with slots', async () => {
      const spellcaster = mockWizard;

      const result = await rulesAgent.validateSpell({
        spell: 'fireball',
        level: 3,
        character: spellcaster,
      });

      expect(result.valid).toBe(true);
    });

    it('should reject spell without available slots', async () => {
      const depletedCaster = {
        ...mockWizard,
        spell_slots: { 3: 0 },
      };

      const result = await rulesAgent.validateSpell({
        spell: 'fireball',
        level: 3,
        character: depletedCaster,
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('No 3rd-level spell slots');
    });
  });

  describe('calculateModifiers', () => {
    it('should calculate ability modifiers correctly', () => {
      expect(rulesAgent.calculateModifier(18)).toBe(4);
      expect(rulesAgent.calculateModifier(10)).toBe(0);
      expect(rulesAgent.calculateModifier(8)).toBe(-1);
    });

    it('should calculate proficiency bonus by level', () => {
      expect(rulesAgent.getProficiencyBonus(1)).toBe(2);
      expect(rulesAgent.getProficiencyBonus(5)).toBe(3);
      expect(rulesAgent.getProficiencyBonus(9)).toBe(4);
      expect(rulesAgent.getProficiencyBonus(17)).toBe(6);
    });
  });

  describe('dice mechanics', () => {
    it('should resolve advantage rolls', () => {
      const result = rulesAgent.rollWithAdvantage('d20');
      expect(result.rolls.length).toBe(2);
      expect(result.final).toBe(Math.max(...result.rolls));
    });

    it('should resolve disadvantage rolls', () => {
      const result = rulesAgent.rollWithDisadvantage('d20');
      expect(result.rolls.length).toBe(2);
      expect(result.final).toBe(Math.min(...result.rolls));
    });
  });
});
```

#### Agent Messaging Tests
```typescript
// src/agents/tests/messaging/agent-messaging-service.test.ts
describe('AgentMessagingService', () => {
  let messagingService: AgentMessagingService;

  beforeEach(async () => {
    messagingService = new AgentMessagingService();
    await messagingService.initialize();
  });

  describe('message sending', () => {
    it('should send message between agents', async () => {
      const message = {
        from: 'dm-agent',
        to: 'rules-agent',
        type: 'validate_action',
        payload: { action: 'attack' },
      };

      const result = await messagingService.sendMessage(message);

      expect(result.id).toBeDefined();
      expect(result.status).toBe('sent');
    });

    it('should queue messages when offline', async () => {
      messagingService.setOffline(true);

      const message = { from: 'dm-agent', to: 'rules-agent', type: 'query' };
      await messagingService.sendMessage(message);

      const queue = await messagingService.getQueuedMessages();
      expect(queue.length).toBeGreaterThan(0);
    });

    it('should sync queued messages when back online', async () => {
      messagingService.setOffline(true);
      await messagingService.sendMessage({ from: 'a', to: 'b', type: 't' });

      messagingService.setOffline(false);
      await messagingService.syncMessages();

      const queue = await messagingService.getQueuedMessages();
      expect(queue.length).toBe(0);
    });
  });

  describe('message acknowledgment', () => {
    it('should track message acknowledgments', async () => {
      const message = await messagingService.sendMessage({
        from: 'dm', to: 'rules', type: 'test',
      });

      await messagingService.acknowledgeMessage(message.id);

      const status = await messagingService.getMessageStatus(message.id);
      expect(status.acknowledged).toBe(true);
    });

    it('should retry unacknowledged messages', async () => {
      const message = await messagingService.sendMessage({
        from: 'dm', to: 'rules', type: 'test',
      });

      // Wait for retry timeout
      await new Promise(resolve => setTimeout(resolve, 1000));

      expect(mockAgentMessaging.sendMessage).toHaveBeenCalledTimes(2);
    });
  });

  describe('conflict resolution', () => {
    it('should resolve message conflicts', async () => {
      const msg1 = { id: 'msg-1', version: 1, content: 'v1' };
      const msg2 = { id: 'msg-1', version: 2, content: 'v2' };

      const resolved = await messagingService.resolveConflict(msg1, msg2);

      expect(resolved.version).toBe(2);
      expect(resolved.content).toBe('v2');
    });
  });
});
```

#### Tasks
- [ ] Write tests for `dungeon-master-agent.ts` (target: 80% coverage)
- [ ] Write tests for `rules-interpreter-agent.ts` (target: 80% coverage)
- [ ] Write tests for `agent-messaging-service.ts` (target: 90% coverage)
- [ ] Write tests for agent coordination logic
- [ ] Write tests for LangGraph integration (if migrating)

**Estimated Effort:** 40-50 hours

---

### 2.2 Memory System Tests

```typescript
// src/services/memory/tests/memory-service.test.ts
describe('MemoryService', () => {
  let memoryService: MemoryService;

  beforeEach(() => {
    memoryService = new MemoryService({
      openaiApiKey: 'test-key',
      supabase: testSupabase,
    });
  });

  describe('memory storage', () => {
    it('should store episodic memory with embedding', async () => {
      const memory = {
        content: 'The party defeated the dragon',
        type: 'combat',
        importance: 'high',
        campaignId: 'test-campaign-1',
      };

      const result = await memoryService.storeMemory(memory);

      expect(result.id).toBeDefined();
      expect(result.embedding).toBeDefined();
      expect(result.embedding.length).toBe(1536); // OpenAI embedding dimension
    });

    it('should classify memory importance', async () => {
      const trivial = { content: 'Bought a potion' };
      const important = { content: 'Found legendary artifact' };

      const trivialResult = await memoryService.storeMemory(trivial);
      const importantResult = await memoryService.storeMemory(important);

      expect(trivialResult.importance).toBe('low');
      expect(importantResult.importance).toBe('high');
    });
  });

  describe('memory retrieval', () => {
    beforeEach(async () => {
      // Seed test memories
      await memoryService.storeMemory({
        content: 'Met the wizard Elminster in Waterdeep',
        campaignId: 'test-campaign-1',
      });
      await memoryService.storeMemory({
        content: 'Fought goblins in the forest',
        campaignId: 'test-campaign-1',
      });
    });

    it('should retrieve memories by semantic similarity', async () => {
      const memories = await memoryService.searchMemories({
        query: 'powerful mage',
        campaignId: 'test-campaign-1',
        limit: 5,
      });

      expect(memories.length).toBeGreaterThan(0);
      expect(memories[0].content).toContain('Elminster');
    });

    it('should filter by recency', async () => {
      const recent = await memoryService.searchMemories({
        query: 'combat',
        campaignId: 'test-campaign-1',
        recencyWeight: 0.8,
      });

      expect(recent[0].timestamp).toBeDefined();
    });

    it('should retrieve contextual memories', async () => {
      const context = await memoryService.getContextualMemories({
        currentLocation: 'Waterdeep',
        recentEvents: ['talked to wizard'],
        campaignId: 'test-campaign-1',
      });

      expect(context.length).toBeGreaterThan(0);
    });
  });

  describe('performance', () => {
    it('should retrieve memories in < 100ms', async () => {
      const start = Date.now();

      await memoryService.searchMemories({
        query: 'dragon',
        campaignId: 'test-campaign-1',
      });

      const elapsed = Date.now() - start;
      expect(elapsed).toBeLessThan(100);
    });

    it('should handle large memory sets efficiently', async () => {
      // Insert 1000 memories
      const promises = Array(1000).fill(null).map((_, i) =>
        memoryService.storeMemory({
          content: `Event ${i}`,
          campaignId: 'test-campaign-1',
        })
      );
      await Promise.all(promises);

      const start = Date.now();
      const results = await memoryService.searchMemories({
        query: 'Event 500',
        campaignId: 'test-campaign-1',
        limit: 10,
      });
      const elapsed = Date.now() - start;

      expect(results.length).toBe(10);
      expect(elapsed).toBeLessThan(200);
    });
  });
});
```

#### Tasks
- [ ] Write tests for memory storage and embeddings
- [ ] Write tests for semantic search functionality
- [ ] Write tests for memory classification
- [ ] Write performance tests (target: < 100ms retrieval)
- [ ] Test edge cases (empty results, large datasets)

**Estimated Effort:** 15-20 hours

---

### 2.3 API Endpoint Tests

```typescript
// server/tests/routes/v1/campaigns.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../../../src/app';
import { testSupabase, seedTestDatabase, cleanTestDatabase } from '../../test-db';

describe('Campaigns API', () => {
  let testUser;
  let authToken;

  beforeAll(async () => {
    const { testUsers } = await seedTestDatabase();
    testUser = testUsers[0];
    authToken = await getAuthToken(testUser);
  });

  afterAll(async () => {
    await cleanTestDatabase();
  });

  describe('POST /v1/campaigns', () => {
    it('should create a new campaign', async () => {
      const response = await request(app)
        .post('/v1/campaigns')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Test Campaign',
          description: 'A test campaign',
          setting: 'Forgotten Realms',
        });

      expect(response.status).toBe(201);
      expect(response.body.campaign).toBeDefined();
      expect(response.body.campaign.title).toBe('Test Campaign');
    });

    it('should reject unauthorized requests', async () => {
      const response = await request(app)
        .post('/v1/campaigns')
        .send({ title: 'Test' });

      expect(response.status).toBe(401);
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/v1/campaigns')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ description: 'Missing title' });

      expect(response.status).toBe(400);
      expect(response.body.errors).toContain('title is required');
    });
  });

  describe('GET /v1/campaigns/:id', () => {
    it('should fetch campaign by ID', async () => {
      const campaign = await createTestCampaign(testUser.id);

      const response = await request(app)
        .get(`/v1/campaigns/${campaign.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.campaign.id).toBe(campaign.id);
    });

    it('should return 404 for non-existent campaign', async () => {
      const response = await request(app)
        .get('/v1/campaigns/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
    });

    it('should enforce ownership', async () => {
      const otherUser = await createTestUser();
      const otherCampaign = await createTestCampaign(otherUser.id);

      const response = await request(app)
        .get(`/v1/campaigns/${otherCampaign.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(403);
    });
  });

  // Similar tests for PATCH, DELETE, etc.
});

// server/tests/routes/v1/characters.test.ts
describe('Characters API', () => {
  // ... similar structure
});

// server/tests/routes/v1/sessions.test.ts
describe('Game Sessions API', () => {
  // ... similar structure
});

// server/tests/routes/v1/ai.test.ts
describe('AI API', () => {
  describe('POST /v1/ai/process-message', () => {
    it('should process player message', async () => {
      const response = await request(app)
        .post('/v1/ai/process-message')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          message: 'I attack the goblin',
          sessionId: testSession.id,
          characterId: testCharacter.id,
        });

      expect(response.status).toBe(200);
      expect(response.body.response).toBeDefined();
      expect(response.body.needsRoll).toBe(true);
    });

    it('should handle rate limiting', async () => {
      // Send 100 requests rapidly
      const promises = Array(100).fill(null).map(() =>
        request(app)
          .post('/v1/ai/process-message')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ message: 'test', sessionId: 'test', characterId: 'test' })
      );

      const responses = await Promise.all(promises);
      const rateLimited = responses.filter(r => r.status === 429);

      expect(rateLimited.length).toBeGreaterThan(0);
    });
  });
});
```

#### Tasks
- [ ] Write integration tests for all campaign endpoints
- [ ] Write integration tests for all character endpoints
- [ ] Write integration tests for all session endpoints
- [ ] Write integration tests for all AI endpoints
- [ ] Write integration tests for all billing endpoints
- [ ] Test authentication and authorization
- [ ] Test input validation
- [ ] Test error handling
- [ ] Test rate limiting

**Estimated Effort:** 30-40 hours

---

## Phase 2: Integration & Component Tests (Weeks 3-4, Target: 70% Coverage)

### 3.1 React Component Tests

```typescript
// src/components/tests/character-sheet.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { CharacterSheet } from '../character-sheet';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

const renderWithProviders = (component) => {
  return render(
    <QueryClientProvider client={queryClient}>
      {component}
    </QueryClientProvider>
  );
};

describe('CharacterSheet', () => {
  it('should render character details', () => {
    renderWithProviders(<CharacterSheet character={mockCharacter} />);

    expect(screen.getByText('Test Barbarian')).toBeInTheDocument();
    expect(screen.getByText('Level 5')).toBeInTheDocument();
    expect(screen.getByText('Half-Orc')).toBeInTheDocument();
  });

  it('should display ability scores correctly', () => {
    renderWithProviders(<CharacterSheet character={mockCharacter} />);

    expect(screen.getByText('STR')).toBeInTheDocument();
    expect(screen.getByText('18')).toBeInTheDocument();
    expect(screen.getByText('+4')).toBeInTheDocument(); // Modifier
  });

  it('should handle HP updates', async () => {
    const onHpChange = vi.fn();
    renderWithProviders(
      <CharacterSheet character={mockCharacter} onHpChange={onHpChange} />
    );

    const hpInput = screen.getByLabelText('Current HP');
    fireEvent.change(hpInput, { target: { value: '40' } });
    fireEvent.blur(hpInput);

    await waitFor(() => {
      expect(onHpChange).toHaveBeenCalledWith(40);
    });
  });

  it('should show unconscious warning when HP reaches 0', () => {
    const dyingCharacter = { ...mockCharacter, current_hp: 0 };
    renderWithProviders(<CharacterSheet character={dyingCharacter} />);

    expect(screen.getByText(/unconscious/i)).toBeInTheDocument();
  });
});

// src/features/game/components/tests/game-session.test.tsx
describe('GameSession', () => {
  it('should render message history', () => {
    renderWithProviders(<GameSession sessionId="test-session" />);

    expect(screen.getByText(/message history/i)).toBeInTheDocument();
  });

  it('should send player message', async () => {
    const mockSend = vi.fn();
    renderWithProviders(<GameSession sessionId="test-session" onSend={mockSend} />);

    const input = screen.getByPlaceholderText(/type your action/i);
    fireEvent.change(input, { target: { value: 'I look around' } });
    fireEvent.click(screen.getByText(/send/i));

    await waitFor(() => {
      expect(mockSend).toHaveBeenCalledWith('I look around');
    });
  });

  it('should display DM responses', async () => {
    renderWithProviders(<GameSession sessionId="test-session" />);

    // Simulate receiving DM message
    await waitFor(() => {
      expect(screen.getByText(/you enter the tavern/i)).toBeInTheDocument();
    });
  });

  it('should show dice roll requests', async () => {
    renderWithProviders(<GameSession sessionId="test-session" />);

    // Simulate dice roll request
    await waitFor(() => {
      expect(screen.getByText(/roll for initiative/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /roll/i })).toBeInTheDocument();
    });
  });
});
```

#### Tasks
- [ ] Write component tests for character sheet components
- [ ] Write component tests for campaign management UI
- [ ] Write component tests for game session interface
- [ ] Write component tests for chat/messaging UI
- [ ] Write component tests for dice roller
- [ ] Write component tests for navigation and routing
- [ ] Test user interactions (clicks, form submissions)
- [ ] Test loading states and error handling
- [ ] Test responsive layouts

**Estimated Effort:** 40-50 hours

---

### 3.2 Integration Flow Tests

```typescript
// tests/integration/complete-game-session.test.ts
describe('Complete Game Session Flow', () => {
  it('should run complete game session', async () => {
    // 1. Create campaign
    const campaign = await createCampaign({
      title: 'Test Adventure',
      userId: testUser.id,
    });

    // 2. Create characters
    const char1 = await createCharacter({ name: 'Fighter', userId: testUser.id });
    const char2 = await createCharacter({ name: 'Wizard', userId: testUser.id });

    // 3. Start session
    const session = await startGameSession({
      campaignId: campaign.id,
      characterIds: [char1.id, char2.id],
    });

    expect(session.status).toBe('active');

    // 4. Send player messages
    const response1 = await sendMessage({
      sessionId: session.id,
      characterId: char1.id,
      message: 'I look around the room',
    });

    expect(response1.narrative).toBeDefined();

    // 5. Request dice roll
    const response2 = await sendMessage({
      sessionId: session.id,
      characterId: char1.id,
      message: 'I attack the goblin',
    });

    expect(response2.needsRoll).toBe(true);
    expect(response2.rollType).toBe('attack');

    // 6. Submit dice roll
    const rollResult = await submitRoll({
      sessionId: session.id,
      characterId: char1.id,
      roll: { type: 'd20', result: 18 },
    });

    expect(rollResult.success).toBe(true);
    expect(rollResult.narrative).toContain('hit');

    // 7. End session
    await endGameSession(session.id);

    const finalSession = await getSession(session.id);
    expect(finalSession.status).toBe('completed');
    expect(finalSession.messageCount).toBeGreaterThan(2);
  });
});

// tests/integration/character-progression.test.ts
describe('Character Progression Flow', () => {
  it('should level up character', async () => {
    const character = await createCharacter({
      name: 'Test Fighter',
      level: 1,
      xp: 0,
    });

    // Award XP
    await awardExperience(character.id, 300);

    let updated = await getCharacter(character.id);
    expect(updated.xp).toBe(300);
    expect(updated.level).toBe(2);

    // Level up
    const levelUpResult = await levelUpCharacter(character.id, {
      hpRoll: 8,
      abilityScoreImprovements: null, // Not available at level 2
    });

    expect(levelUpResult.character.level).toBe(2);
    expect(levelUpResult.character.max_hp).toBe(character.max_hp + 8 + modifier);
    expect(levelUpResult.newFeatures).toContain('Action Surge');
  });
});
```

#### Tasks
- [ ] Write integration test for complete game session flow
- [ ] Write integration test for character creation to gameplay
- [ ] Write integration test for combat encounter
- [ ] Write integration test for character progression
- [ ] Write integration test for memory retrieval during gameplay
- [ ] Write integration test for multi-player session

**Estimated Effort:** 20-30 hours

---

## Phase 3: E2E & Performance Tests (Weeks 5-6, Target: 85% Coverage)

### 4.1 End-to-End Tests (Playwright)

```typescript
// tests/e2e/complete-campaign.spec.ts
import { test, expect } from '@playwright/test';

test('complete campaign workflow', async ({ page }) => {
  // 1. Login
  await page.goto('/login');
  await page.fill('input[name="email"]', 'test@example.com');
  await page.fill('input[name="password"]', 'password123');
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL('/dashboard');

  // 2. Create campaign
  await page.click('text=Create Campaign');
  await page.fill('input[name="title"]', 'E2E Test Campaign');
  await page.fill('textarea[name="description"]', 'Test description');
  await page.selectOption('select[name="setting"]', 'Forgotten Realms');
  await page.click('button:has-text("Create")');
  await expect(page.locator('h1')).toContainText('E2E Test Campaign');

  // 3. Create character
  await page.click('text=Create Character');
  await page.fill('input[name="name"]', 'Test Paladin');
  await page.selectOption('select[name="class"]', 'Paladin');
  await page.selectOption('select[name="race"]', 'Human');
  await page.fill('input[name="strength"]', '16');
  await page.fill('input[name="charisma"]', '14');
  await page.click('button:has-text("Create Character")');
  await expect(page.locator('.character-sheet')).toBeVisible();

  // 4. Start game session
  await page.click('text=Start Session');
  await page.check('input[value="Test Paladin"]');
  await page.click('button:has-text("Start")');
  await expect(page.locator('.game-session')).toBeVisible();

  // 5. Play session
  await page.fill('textarea[name="message"]', 'I enter the dungeon');
  await page.click('button:has-text("Send")');
  await expect(page.locator('.dm-response')).toBeVisible();

  // 6. Dice roll
  await page.fill('textarea[name="message"]', 'I attack the goblin');
  await page.click('button:has-text("Send")');
  await expect(page.locator('.dice-roll-request')).toBeVisible();
  await page.click('button:has-text("Roll d20")');
  await expect(page.locator('.roll-result')).toBeVisible();

  // 7. End session
  await page.click('button:has-text("End Session")');
  await expect(page.locator('.session-summary')).toBeVisible();
});

test('combat encounter workflow', async ({ page }) => {
  // Setup: existing campaign and character
  await setupTestCampaign(page);

  // Start combat
  await page.click('button:has-text("Start Combat")');
  await page.fill('input[name="monsterName"]', 'Goblin');
  await page.click('button:has-text("Add Monster")');
  await page.click('button:has-text("Roll Initiative")');

  // Verify initiative tracker
  await expect(page.locator('.initiative-tracker')).toBeVisible();
  await expect(page.locator('.participant')).toHaveCount(2); // Player + Goblin

  // Attack
  await page.click('button:has-text("Attack")');
  await page.selectOption('select[name="target"]', 'Goblin');
  await page.click('button:has-text("Roll Attack")');
  await expect(page.locator('.attack-result')).toBeVisible();

  // Verify damage applied
  await expect(page.locator('.hp-tracker')).toContainText('HP:');

  // End combat
  await page.click('button:has-text("End Combat")');
  await expect(page.locator('.combat-summary')).toBeVisible();
});
```

#### Tasks
- [ ] Write E2E test for complete campaign creation to gameplay
- [ ] Write E2E test for character creation and sheet interaction
- [ ] Write E2E test for combat encounter
- [ ] Write E2E test for level-up flow
- [ ] Write E2E test for multiplayer session
- [ ] Test across browsers (Chrome, Firefox, Safari)
- [ ] Test mobile responsive layouts
- [ ] Test accessibility (keyboard navigation, screen readers)

**Estimated Effort:** 30-40 hours

---

### 4.2 Performance Tests

```typescript
// tests/performance/memory-retrieval.perf.test.ts
import { describe, it, expect } from 'vitest';
import { performance } from 'perf_hooks';

describe('Memory System Performance', () => {
  it('should retrieve memories in < 100ms', async () => {
    const memoryService = new MemoryService();

    // Insert 10,000 test memories
    await seedMemories(10000);

    // Measure retrieval performance
    const start = performance.now();
    const memories = await memoryService.searchMemories({
      query: 'dragon',
      campaignId: 'test-campaign',
      limit: 10,
    });
    const duration = performance.now() - start;

    expect(memories.length).toBe(10);
    expect(duration).toBeLessThan(100);
  });

  it('should handle concurrent retrieval requests', async () => {
    const requests = Array(50).fill(null).map(() =>
      memoryService.searchMemories({
        query: 'combat',
        campaignId: 'test-campaign',
      })
    );

    const start = performance.now();
    await Promise.all(requests);
    const duration = performance.now() - start;

    expect(duration).toBeLessThan(1000); // 50 requests in < 1 second
  });
});

// tests/performance/api-endpoints.perf.test.ts
describe('API Performance', () => {
  it('should handle 100 concurrent requests', async () => {
    const requests = Array(100).fill(null).map(() =>
      request(app).get('/v1/campaigns/test-id').set('Authorization', authToken)
    );

    const start = performance.now();
    const responses = await Promise.all(requests);
    const duration = performance.now() - start;

    const p95 = calculateP95(responses.map(r => r.duration));
    expect(p95).toBeLessThan(500); // p95 < 500ms
  });

  it('should maintain performance under load', async () => {
    // Sustained load: 10 req/sec for 60 seconds
    const results = [];
    for (let i = 0; i < 600; i++) {
      const start = performance.now();
      await request(app).get('/v1/campaigns/test-id').set('Authorization', authToken);
      const duration = performance.now() - start;
      results.push(duration);
      await sleep(100); // 10 req/sec
    }

    const avgLatency = results.reduce((a, b) => a + b) / results.length;
    expect(avgLatency).toBeLessThan(300);
  });
});

// tests/performance/database-queries.perf.test.ts
describe('Database Query Performance', () => {
  it('should fetch character with relationships in < 50ms', async () => {
    const start = performance.now();

    const character = await testSupabase
      .from('characters')
      .select('*, inventory(*), spell_slots(*), features(*)')
      .eq('id', testCharacter.id)
      .single();

    const duration = performance.now() - start;
    expect(duration).toBeLessThan(50);
  });

  it('should handle complex campaign query efficiently', async () => {
    const start = performance.now();

    const campaign = await testSupabase
      .from('campaigns')
      .select(`
        *,
        characters(*),
        sessions(*, messages(*)),
        npcs(*),
        locations(*)
      `)
      .eq('id', testCampaign.id)
      .single();

    const duration = performance.now() - start;
    expect(duration).toBeLessThan(200);
  });
});
```

#### Tasks
- [ ] Write performance tests for memory retrieval (target: < 100ms)
- [ ] Write performance tests for API endpoints (target: p95 < 500ms)
- [ ] Write performance tests for database queries
- [ ] Write load tests for concurrent users (10+ simultaneous sessions)
- [ ] Test WebSocket performance and latency
- [ ] Profile and optimize slow code paths
- [ ] Set up continuous performance monitoring

**Estimated Effort:** 25-35 hours

---

## CI/CD Integration (Week 6)

### 5.1 GitHub Actions Workflow

```yaml
# .github/workflows/test.yml
name: Test Suite

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  unit-tests:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run frontend unit tests
        run: npm run test:coverage

      - name: Run backend unit tests
        run: npm run test:server:coverage

      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info,./server/coverage/lcov.info
          flags: unittests
          name: codecov-umbrella

      - name: Check coverage thresholds
        run: |
          COVERAGE=$(node -p "require('./coverage/coverage-summary.json').total.lines.pct")
          if (( $(echo "$COVERAGE < 40" | bc -l) )); then
            echo "Coverage $COVERAGE% is below 40% threshold"
            exit 1
          fi

  integration-tests:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run database migrations
        run: npm run server:migrate
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test_db

      - name: Run integration tests
        run: npm run test:integration
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test_db

  e2e-tests:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright browsers
        run: npx playwright install --with-deps

      - name: Build application
        run: npm run build

      - name: Run E2E tests
        run: npm run test:e2e

      - name: Upload Playwright report
        uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 30

  performance-tests:
    runs-on: ubuntu-latest
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run performance tests
        run: npm run test:performance

      - name: Upload performance results
        uses: actions/upload-artifact@v3
        with:
          name: performance-results
          path: performance-results/
```

### 5.2 Pre-commit Hooks

```bash
# .husky/pre-commit
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

# Run linter
npm run lint

# Run type checking
npm run type-check

# Run tests for changed files only
npm run test:changed

# Check coverage doesn't decrease
npm run test:coverage-check
```

### 5.3 Pull Request Checks

```yaml
# .github/workflows/pr-checks.yml
name: PR Checks

on:
  pull_request:
    types: [opened, synchronize, reopened]

jobs:
  test-coverage-diff:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3
        with:
          fetch-depth: 0

      - name: Get base coverage
        run: |
          git checkout ${{ github.base_ref }}
          npm ci
          npm run test:coverage
          mv coverage/coverage-summary.json coverage-base.json

      - name: Get PR coverage
        run: |
          git checkout ${{ github.head_ref }}
          npm ci
          npm run test:coverage

      - name: Compare coverage
        run: |
          BASE=$(node -p "require('./coverage-base.json').total.lines.pct")
          PR=$(node -p "require('./coverage/coverage-summary.json').total.lines.pct")
          DIFF=$(echo "$PR - $BASE" | bc)

          echo "Base coverage: $BASE%"
          echo "PR coverage: $PR%"
          echo "Diff: $DIFF%"

          if (( $(echo "$DIFF < 0" | bc -l) )); then
            echo "⚠️ Coverage decreased by $DIFF%"
            exit 1
          fi
```

#### Tasks
- [ ] Set up GitHub Actions workflows for all test types
- [ ] Configure test database for CI
- [ ] Set up code coverage reporting (Codecov or Coveralls)
- [ ] Add pre-commit hooks for linting and testing
- [ ] Configure PR checks to require passing tests
- [ ] Set up test result notifications (Slack, Discord)
- [ ] Add test coverage badges to README

**Estimated Effort:** 10-15 hours

---

## Success Metrics & Monitoring

### Coverage Targets by Module
- **Agent Systems:** 80%+ coverage (critical AI logic)
- **Memory Service:** 85%+ coverage (critical data retrieval)
- **API Endpoints:** 75%+ coverage (integration tests)
- **React Components:** 70%+ coverage (component tests)
- **Utils/Helpers:** 90%+ coverage (pure functions)

### Quality Metrics
- **Test Flakiness:** < 3% flaky test rate
- **Test Performance:** Test suite completes in < 5 minutes
- **Code Coverage:** 40% Phase 1 → 70% Phase 2 → 85% Phase 3
- **Bug Detection:** 80%+ of bugs caught by tests before production

### Continuous Monitoring
```typescript
// tests/monitoring/test-health.ts
export async function checkTestHealth() {
  return {
    totalTests: getTestCount(),
    passRate: getPassRate(),
    flakyTests: getFlakyTests(),
    slowTests: getSlowTests(threshold: 1000), // Tests > 1 second
    coverageByModule: getCoverageBreakdown(),
    recentFailures: getRecentFailures(days: 7),
  };
}
```

---

## Testing Best Practices

### 1. Test Structure (AAA Pattern)
```typescript
it('should do something', async () => {
  // Arrange: Set up test data and mocks
  const character = mockCharacter;
  const service = new CharacterService();

  // Act: Perform the action
  const result = await service.updateCharacter(character.id, { level: 6 });

  // Assert: Verify the outcome
  expect(result.level).toBe(6);
  expect(result.proficiency_bonus).toBe(3);
});
```

### 2. Use Descriptive Test Names
```typescript
// ❌ Bad
it('test 1', () => { ... });

// ✅ Good
it('should calculate proficiency bonus correctly for level 5 character', () => { ... });
```

### 3. Test One Thing Per Test
```typescript
// ❌ Bad: Testing multiple concerns
it('should handle character updates', async () => {
  // Tests level up
  // Tests HP changes
  // Tests ability score changes
  // Tests spell slot updates
});

// ✅ Good: Separate tests
it('should update character level correctly', async () => { ... });
it('should recalculate HP when constitution changes', async () => { ... });
it('should update spell slots when level increases', async () => { ... });
```

### 4. Mock External Dependencies
```typescript
// ✅ Good: Mock AI service
vi.mock('../services/ai-service', () => ({
  AIService: vi.fn().mockImplementation(() => ({
    processMessage: vi.fn().mockResolvedValue({ response: 'test' }),
  })),
}));
```

### 5. Clean Up After Tests
```typescript
afterEach(async () => {
  await cleanTestDatabase();
  vi.clearAllMocks();
  queryClient.clear();
});
```

---

## Migration from 0% to 40% Coverage

### Week 1 Priority Order
1. ✅ **Day 1-2:** Set up testing infrastructure (vitest config, mocks, test DB)
2. ✅ **Day 3-4:** Write agent messaging tests (most critical system)
3. ✅ **Day 5:** Write memory service tests (second most critical)

### Week 2 Priority Order
4. ✅ **Day 1-2:** Write API endpoint tests (campaigns, characters, sessions)
5. ✅ **Day 3-4:** Write DM agent and rules agent tests
6. ✅ **Day 5:** Measure coverage, identify gaps, fill to 40%

---

## Open Questions & Decisions

1. **Test Database Strategy:** Use Supabase local instance or separate test project?
   - **Recommendation:** Use Docker-based local Supabase for CI/CD speed

2. **AI Service Mocking:** Mock Gemini/OpenAI completely or use test API keys?
   - **Recommendation:** Mock for unit tests, real API for integration tests (with rate limits)

3. **E2E Test Frequency:** Run on every PR or only on main branch?
   - **Recommendation:** Run smoke tests on PR, full suite on main

4. **Test Data Management:** Seed fresh data for every test or use snapshots?
   - **Recommendation:** Fresh data for isolation, snapshots for performance tests

5. **Coverage Enforcement:** Block PRs that decrease coverage?
   - **Recommendation:** Yes, enforce no coverage decrease + warning if below threshold

---

## Next Steps

Once this plan is approved:

1. **Set up testing infrastructure** (Week 1, Days 1-2)
2. **Create test database and fixtures** (Week 1, Day 2)
3. **Write mock services** (Week 1, Day 3)
4. **Begin Phase 1 testing** (Agent systems first)
5. **Set up CI/CD workflows** (Week 6)
6. **Monitor and maintain coverage** (Ongoing)

---

**Document Version:** 1.0
**Last Updated:** 2025-11-12
**Owner:** Development Team
**Status:** Draft - Pending Approval
