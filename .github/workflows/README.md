# GitHub Actions Workflows

This directory contains CI/CD workflows for the AI Adventure Scribe project.

## Workflows

### 🔄 ci.yml (Main CI Pipeline)
Runs on all pushes and pull requests.

**Jobs:**
1. **lint-and-tests** - Linting and unit/integration tests
   - Runs ESLint
   - Runs server tests (`npm run server:test`)
   - Runs frontend tests with coverage
   - Uploads coverage artifacts

2. **e2e-auth** - End-to-end authentication tests
   - Runs Playwright E2E tests for user/admin roles
   - Requires lint-and-tests to pass first

3. **security** - Security scanning
   - Gitleaks (secrets scanning)
   - Trivy (vulnerability scanning)
   - npm audit (dependency vulnerabilities)

### 📊 test-coverage.yml (Coverage Reporting)
Runs on pull requests and main branch pushes.

**Features:**
- Generates coverage reports for frontend and server
- Checks coverage against 40% threshold (Phase 1 target)
- Comments on PRs with coverage summary
- Uploads coverage artifacts for 30 days

**Coverage Targets:**
- Phase 1: 40% minimum
- Phase 2: 70% target
- Phase 3: 85% goal

### 🤖 claude-code-review.yml
Automated code review using Claude AI.

### 🔒 dast-nightly.yml
Nightly Dynamic Application Security Testing (DAST).

## Running Tests Locally

### Frontend Tests
```bash
# Run all frontend tests
npx vitest run

# Run with coverage
npx vitest run --coverage

# Run specific test file
npx vitest run src/agents/__tests__/dungeon-master-agent.test.ts

# Watch mode
npx vitest
```

### Server Tests
```bash
# Run all server tests
npm run server:test

# Run with coverage
npx vitest run -c server/vitest.config.ts --coverage

# Run specific test suite
npm run security-test
```

### E2E Tests
```bash
# Run all E2E tests
npm run e2e

# Run with UI
npx playwright test --ui

# Run specific browser
npx playwright test --project=chromium
```

## Test Coverage Structure

### Frontend Tests (src/)
- **Agent System:** DungeonMasterAgent, RulesInterpreterAgent, AgentMessaging
- **Memory System:** Semantic search, embeddings, classification
- **LangGraph:** Graph execution, checkpointing, state management
- **Spell System:** Validation, preparation, restrictions
- **D&D Rules:** Ability scores, dice rolls, mechanics
- **Components:** React components with Testing Library
- **Services:** AI service, encounter generation, roll manager
- **Utils:** Helper functions and utilities

### Server Tests (server/tests/)
- **API Routes:** Campaigns, Characters, Sessions CRUD
- **Security:** Authentication, authorization, input validation
- **Integration:** Complex workflows and data flows
- **Rules:** D&D 5E rules engine
- **Services:** Rate limiting, circuit breakers, quotas

### E2E Tests (e2e/)
- **Auth:** User and admin role authentication flows

## Coverage Reports

After running tests with `--coverage`, reports are generated:

**Frontend:**
- HTML report: `coverage/index.html`
- JSON summary: `coverage/coverage-summary.json`

**Server:**
- HTML report: `server/coverage/index.html`
- JSON summary: `server/coverage/coverage-summary.json`

## CI/CD Best Practices

1. **Always run tests locally** before pushing
2. **Check coverage** with `--coverage` flag
3. **Fix failing tests** immediately - don't ignore
4. **Write tests for new features** as you develop
5. **Update tests** when changing functionality
6. **Review coverage reports** to identify gaps

## Troubleshooting

### Tests timing out
- Increase timeout in test file: `{ timeout: 30000 }`
- Check for unresolved promises
- Ensure proper cleanup in `afterEach`

### Coverage not generating
- Ensure `@vitest/coverage-v8` is installed
- Check `vitest.config.ts` coverage configuration
- Verify test files are in `include` list

### E2E tests failing in CI
- Check if server is starting correctly
- Verify environment variables are set
- Review Playwright configuration

### Mock errors
- Ensure mocks are defined before imports
- Use `vi.mock()` at top of test file
- Clear mocks in `afterEach` with `vi.clearAllMocks()`

## Adding New Tests

### 1. Create test file
```typescript
// src/services/__tests__/my-service.test.ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MyService } from '../my-service';

describe('MyService', () => {
  let service: MyService;

  beforeEach(() => {
    service = new MyService();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should do something', () => {
    // Arrange
    const input = 'test';

    // Act
    const result = service.doSomething(input);

    // Assert
    expect(result).toBe('expected');
  });
});
```

### 2. Add to vitest.config.ts
```typescript
include: [
  // ... existing tests
  'src/services/__tests__/my-service.test.ts',
],
```

### 3. Run test
```bash
npx vitest run src/services/__tests__/my-service.test.ts
```

## Test Metrics

Current test statistics:
- **Total Test Files:** 111+
- **Total Tests:** 527+ (416 passing)
- **Pass Rate:** ~79%
- **Coverage:** ~15-20% (baseline) → 40%+ (Phase 1 target)

## Support

For issues with CI/CD workflows:
1. Check workflow run logs in GitHub Actions
2. Review test output locally
3. Check this README for troubleshooting tips
4. Review test documentation in individual test files
