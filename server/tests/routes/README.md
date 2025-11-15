# API Integration Tests

Comprehensive integration tests for the core API CRUD endpoints covering campaigns, characters, sessions, and complex integration flows.

## Test Files

### 1. `/v1/campaigns.test.ts` - Campaigns CRUD
Tests all campaign operations:
- **Create** (POST /v1/campaigns): Valid data, minimal data, validation
- **List** (GET /v1/campaigns): User-specific filtering, empty results
- **Get** (GET /v1/campaigns/:id): Detailed retrieval, 404 handling
- **Update** (PUT /v1/campaigns/:id): Full updates, partial updates
- **Delete** (DELETE /v1/campaigns/:id): Successful deletion, 404 handling
- **Authorization**: User isolation, cross-user access prevention
- **Authentication**: Token validation, 401 handling

**Test Count**: 20 tests

### 2. `/v1/characters.test.ts` - Characters CRUD
Tests all character operations:
- **Create** (POST /v1/characters): With/without campaign, minimal data
- **List** (GET /v1/characters): User-specific, campaign associations
- **Get** (GET /v1/characters/:id): Full details, 404 handling
- **Update** (PUT /v1/characters/:id): Level progression, XP updates
- **Delete** (DELETE /v1/characters/:id): Successful deletion
- **Authorization**: User ownership verification
- **Validation**: D&D rules (classes, races, levels 1-20)

**Test Count**: 25+ tests

### 3. `/v1/sessions.test.ts` - Sessions CRUD
Tests all session operations:
- **Create** (POST /v1/sessions): Valid campaign+character combinations
- **Authorization**: Reject unowned campaigns (403), reject unowned characters (403)
- **Get** (GET /v1/sessions/:id): Detailed retrieval, ownership verification
- **Complete** (POST /v1/sessions/:id/complete): Status updates, summaries
- **Edge Cases**: Campaign-only sessions, character-only sessions

**Test Count**: 20+ tests

### 4. `/v1/integration-flows.test.ts` - Complex Workflows
Tests multi-resource interactions:
- **Full Workflow**: Campaign → Character → Session → Complete
- **Cascade Deletes**: Campaign deletion cascades to sessions
- **Character Deletion**: Sessions updated (character_id set to null)
- **Cross-Resource Validation**: Prevent mismatched resource ownership
- **Character Progression**: Track leveling across sessions
- **User Isolation**: Complete separation between users

**Test Count**: 15+ tests

## Running the Tests

### Prerequisites

1. **Database Setup**: Tests require a live PostgreSQL/Supabase database
2. **Environment Variables**: Configure in `/server/.env` or pass inline

Required environment variables:
```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_JWT_SECRET=your-jwt-secret
DATABASE_URL=postgresql://user:password@host:port/database
```

### Running All Route Tests

```bash
# From project root
npm run server:test -- server/tests/routes

# From server directory
cd server
npx vitest run tests/routes
```

### Running Specific Test Files

```bash
# Campaigns tests
npx vitest run tests/routes/v1/campaigns.test.ts

# Characters tests
npx vitest run tests/routes/v1/characters.test.ts

# Sessions tests
npx vitest run tests/routes/v1/sessions.test.ts

# Integration flows
npx vitest run tests/routes/v1/integration-flows.test.ts
```

### Test Mode (Skip Without Database)

Tests automatically skip when `DATABASE_URL` is not configured:

```bash
# Tests will skip gracefully
unset DATABASE_URL
npx vitest run tests/routes
```

### Coverage Report

```bash
# Generate coverage report
npx vitest run tests/routes --coverage

# Coverage reports saved to: server/coverage/
```

## Test Patterns and Best Practices

### 1. Test Structure
- `beforeAll`: Create test users and app instance
- `beforeEach`: Clean up data between tests
- `afterAll`: Clean up all test data

### 2. Authentication
Tests use JWT tokens generated via `generateTestToken()`:
```typescript
const userId = generateTestUserId();
const token = generateTestToken(userId, 'user@example.com');

await app
  .get('/v1/campaigns')
  .set('Authorization', `Bearer ${token}`);
```

### 3. Test Data Management
Helper functions in `test-helpers.ts`:
- `createTestCampaign()`: Create campaign for testing
- `createTestCharacter()`: Create character for testing
- `createTestSession()`: Create session for testing
- `cleanupTestUser()`: Remove all user test data

### 4. Assertions
Standard assertion helpers:
- `assertCampaignStructure()`: Verify campaign response shape
- `assertCharacterStructure()`: Verify character response shape
- `assertSessionStructure()`: Verify session response shape

## Test Coverage

### Endpoints Tested

#### Campaigns API (`/v1/campaigns`)
- ✓ GET / - List campaigns
- ✓ POST / - Create campaign
- ✓ GET /:id - Get campaign
- ✓ PUT /:id - Update campaign
- ✓ DELETE /:id - Delete campaign

#### Characters API (`/v1/characters`)
- ✓ GET / - List characters
- ✓ POST / - Create character
- ✓ GET /:id - Get character
- ✓ PUT /:id - Update character
- ✓ DELETE /:id - Delete character

#### Sessions API (`/v1/sessions`)
- ✓ POST / - Create session
- ✓ GET /:id - Get session
- ✓ POST /:id/complete - Complete session

### Test Categories

#### 1. CRUD Operations (60+ tests)
- Create with valid/minimal/invalid data
- Read single and list endpoints
- Update full and partial
- Delete with verification

#### 2. Authorization & Security (25+ tests)
- User ownership verification
- Cross-user access prevention
- Token validation
- 401 Unauthorized handling
- 403 Forbidden handling
- 404 Not Found handling

#### 3. Validation (15+ tests)
- Required field validation
- D&D rule constraints (classes, races, levels)
- Foreign key validation
- Data type validation

#### 4. Integration Scenarios (15+ tests)
- Multi-resource workflows
- Cascade deletes
- Character progression tracking
- User isolation
- Error recovery

#### 5. Edge Cases (10+ tests)
- Empty results
- Non-existent resources
- Partial failures
- Null/undefined handling

## API Response Standards

All tests validate:
- **Status Codes**: 200, 201, 204, 400, 401, 403, 404, 500
- **Response Structure**: Consistent JSON shapes
- **Error Messages**: Descriptive error objects
- **Timestamps**: ISO 8601 format
- **IDs**: UUID format
- **Relationships**: Foreign key integrity

## Known Limitations

1. **Database Required**: Tests cannot run without a live database
2. **No Mocking**: Tests use real Supabase/PostgreSQL connections
3. **Sequential**: Tests run sequentially to avoid race conditions
4. **Cleanup**: Requires manual cleanup if tests fail mid-execution

## Troubleshooting

### Tests Skip Unexpectedly
```bash
# Verify DATABASE_URL is set
echo $DATABASE_URL

# Check Supabase credentials
echo $SUPABASE_URL
```

### Authentication Errors
```bash
# Verify JWT secret is set
echo $SUPABASE_JWT_SECRET

# Check token generation in test-helpers.ts
```

### Database Connection Errors
```bash
# Test database connection
psql $DATABASE_URL -c "SELECT 1"

# Verify Supabase is accessible
curl $SUPABASE_URL/rest/v1/
```

### Cleanup Issues
```bash
# Manually clean test data
npm run cleanup:test-data
```

## Contributing

When adding new tests:
1. Follow existing patterns in test files
2. Use helper functions from `test-helpers.ts`
3. Clean up test data in `afterEach`/`afterAll`
4. Test both success and error paths
5. Verify authorization checks
6. Add documentation to this README

## Test Results Summary

**Total Test Files**: 4
**Total Tests**: 80+
**Coverage Target**: 75%+ of route handlers
**Status**: All tests pass with valid database configuration

### Test Distribution
- Campaigns CRUD: 20 tests
- Characters CRUD: 25 tests
- Sessions CRUD: 20 tests
- Integration Flows: 15 tests

### Coverage by Category
- CRUD Operations: 60 tests (75%)
- Authorization: 25 tests (31%)
- Validation: 15 tests (19%)
- Integration: 15 tests (19%)
- Edge Cases: 10 tests (12%)

*Note: Percentages represent focus areas, tests often cover multiple categories*
