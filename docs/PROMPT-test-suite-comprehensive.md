# Jules Prompt: Comprehensive Test Suite for D&D SaaS Character App

**Status:** Production-Ready | **Last Updated:** 2025-10-23 | **Reusable:** Yes

---

## CORE TASK

Create comprehensive test suite for D&D character creation SaaS application. This is a monetized product where bugs = lost revenue and churned users. Tests are critical infrastructure.

## CRITICAL CONTEXT

- **Current Coverage:** ~5% (27 tests for 2,300+ lines of code)
- **Target Coverage:** 70% minimum, 85% for critical paths
- **Revenue Risk:** Payment/auth bugs = direct revenue loss
- **User Impact:** Character creation bugs = customer churn
- **Architecture:** React frontend + Node/Express backend + Supabase database + Stripe payments

## SUCCESS CRITERIA (MUST ACHIEVE ALL)

- [ ] All test files created and passing (100% pass rate)
- [ ] No linting errors in test files
- [ ] Total line coverage ≥ 70%
- [ ] Critical path coverage ≥ 85% (payment, auth, character save)
- [ ] All work units completed
- [ ] No tests marked "skip" or "todo"
- [ ] Test suite runs in <30 seconds total
- [ ] Each test has clear describe/it blocks explaining what it tests

---

## WORK UNIT 1: Character Creation Flow Tests

**File Location:** `src/__tests__/integration/character-creation-complete-flow.test.tsx`  
**Framework:** Vitest + React Testing Library  
**Mocking:** Mock Supabase, NOT real database calls

### Tests Required (Minimum 8)

1. **Complete wizard flow** - User goes through all steps and character saves
   - Steps: Basic Info → Race → Class → Abilities → Finalization → Save
   - Assert: Character saved to database with all fields populated

2. **Partial character cannot save** - Cannot skip steps and save
   - Attempt to save with missing race/class
   - Assert: Save button disabled or error shown

3. **Character name required** - Empty name validation
   - Attempt save with empty name
   - Assert: Error message shown, save prevented

4. **Character name length validation** - Max 50 chars
   - Input: 51 character name
   - Assert: Validation error or auto-truncate

5. **Campaign context** - Creating character for specific campaign
   - When creating in campaign context, campaign_id should be set
   - Assert: Saved character has campaign_id matching context

6. **Physical attributes persist** - New PhysicalStep data saves
   - Set gender, age, height, weight, eye/skin/hair colors
   - Assert: All physical data in database

7. **Character retrieval** - Saved character can be loaded
   - Save character → Retrieve by ID
   - Assert: All data intact, no loss

8. **Back button doesn't lose data** - Step navigation preserves form state
   - Fill step 1 → Go to step 2 → Back to step 1
   - Assert: Step 1 data still there, not cleared

### Edge Cases (Minimum 3)

- Very long character backstory (5000+ chars)
- Special characters in name (é, ñ, 中文)
- Rapid clicking "next" button (debounce test)

---

## WORK UNIT 2: Payment & Subscription Tests

**File Location:** `server/tests/payment-and-subscription.test.ts`  
**Framework:** Vitest  
**⚠️ CRITICAL:** Payment bugs = YOU LOSE MONEY. Tests must be bulletproof.

### Tests Required (Minimum 10)

1. **Free tier character limit** - Free users max 5 characters
   - Create 5 characters as free user → Works
   - Create 6th character → Rejected with 402 status
   - Assert: Error message clear about upgrade needed

2. **Pro tier unlimited** - Pro users no character limit
   - User upgraded to Pro
   - Create 50 characters
   - Assert: All succeed

3. **Quota check on save** - Character save endpoint enforces limits
   - Call POST /v1/characters as free user with 5 existing
   - Assert: Returns 402 Payment Required with Retry-After header

4. **Quota reset timing** - Monthly quota resets on correct date
   - User has 100 character edits (tracked separately)
   - Move time forward past reset date
   - Assert: Edits remaining reset to 100

5. **Rate limiting enforcement** - Free tier gets X requests/minute, Pro gets 5X
   - Make 20 rapid requests as free user (limit 10/min)
   - Assert: Requests 11-20 get 429 Too Many Requests

6. **Error response format** - Quota error returns correct headers
   - Hit quota limit
   - Assert: Response includes:
     - 402 status code
     - Retry-After: seconds until reset
     - X-RateLimit-Remaining: 0
     - Clear JSON error message

7. **Subscription webhook** - Stripe webhook updates user tier
   - Simulate webhook: charge.succeeded
   - Assert: User subscription updated, tier changed

8. **Downgrade protection** - Pro → Free downgrade handled
   - Pro user with 10 characters downgrades to Free (max 5)
   - Assert: Existing 5 chars still accessible, new creates blocked

9. **Trial period** - New users get 7-day trial of Pro
   - New user registration
   - Assert: Trial credits set, tier shows "trial"
   - After 7 days, Assert: Trial expired, downgraded to free

10. **Usage tracking accuracy** - API tracks usage correctly
    - Pro user: 5 character saves, 3 character deletes, 2 edits
    - Query usage stats
    - Assert: Each counted correctly for audit

### Security Tests (Minimum 2)

- Cannot bypass quota by deleting characters (quota tracks total ever made)
- Cannot fake payment by modifying user tier field directly (must come from webhook)

---

## WORK UNIT 3: Authentication & Authorization Tests

**File Location:** `server/tests/auth-and-authorization.test.ts`  
**Framework:** Vitest  
**⚠️ CRITICAL:** Auth bugs = data breach. User data isolation is non-negotiable.

### Tests Required (Minimum 10)

1. **Login success** - Correct email + password
   - POST /auth/login with valid credentials
   - Assert: Returns JWT token, not expired

2. **Login fail - wrong password** - Reject invalid password
   - POST /auth/login with wrong password
   - Assert: 401 Unauthorized, no token returned

3. **Login fail - nonexistent user** - Reject non-existent email
   - POST /auth/login with email that doesn't exist
   - Assert: 401 (don't reveal if account exists)

4. **JWT validation** - Token format and signature checked
   - Use invalid JWT token in Authorization header
   - Assert: 401 Unauthorized

5. **Token expiration** - Expired token rejected
   - Create JWT with exp = now - 1 hour
   - Assert: 401 and "token expired" message

6. **Data isolation - user only sees own characters** - User cannot view other users' characters
   - User A logged in, tries GET /v1/characters/[User B's character ID]
   - Assert: 403 Forbidden OR returns only user A's characters

7. **Data isolation - campaign access** - User cannot access other campaigns
   - User not in campaign, tries GET /campaigns/[other campaign ID]
   - Assert: 403 Forbidden

8. **Admin bypass in dev mode** - LAUNCH BLOCKER check
   - Verify BLOG_ADMIN_DEV_OVERRIDE only works in dev (NODE_ENV !== 'production')
   - In production, Assert: Bypass does NOT work
   - **TODO:** Remove this bypass before launch

9. **Session invalidation** - Logout invalidates token
   - User logs in, receives token
   - User logs out
   - Attempt to use old token
   - Assert: 401 Unauthorized

10. **Blog admin authorization** - Only admins access blog endpoints
    - Non-admin user tries POST /blog/posts
    - Assert: 403 Forbidden
    - Admin user tries same
    - Assert: 200 Success

### Security Tests (Minimum 3)

- **SQL injection attempt:** POST character name with `'; DROP TABLE characters; --`
  - Assert: Treated as literal string, not executed
  
- **JWT tampering:** Modify token payload, resign with wrong key
  - Assert: 401 signature validation fails

- **Cross-user access:** User A token used to delete User B's character
  - Assert: 403 Forbidden, character not deleted

---

## WORK UNIT 4: Physical Attributes & Character Sheet Tests

**File Location:** `src/__tests__/integration/physical-attributes-feature.test.tsx`  
**Framework:** Vitest + React Testing Library  
**Focus:** New feature stability (added Oct 23)

### Tests Required (Minimum 8)

1. **Gender selection** - Can set and retrieve gender
   - Select male
   - Assert: Character.gender = 'male'
   - Select female
   - Assert: Character.gender = 'female'

2. **Gender persistence** - Gender saved to database
   - Set gender → Save character → Reload
   - Assert: Gender still set correctly

3. **Age validation** - Only positive integers
   - Input age 25
   - Assert: Saved as 25
   - Input age -5
   - Assert: Validation error or auto-corrected to 0
   - Input age 999
   - Assert: Accepted (no upper limit for fantasy)

4. **Height/weight sliders** - Respect race-based ranges
   - Human: height range 60-76 inches
   - Attempt height 50
   - Assert: Slider clamps to 60 (min)
   - Attempt height 100
   - Assert: Slider clamps to 76 (max)

5. **Height/weight ranges vary by race**
   - Human: 60-76 inches
   - Dwarf: 48-60 inches
   - Half-Orc: 66-80 inches
   - Assert: Each race respects its own range

6. **Imperial/Metric toggle accuracy**
   - Set height 60 inches (5'0")
   - Toggle to metric
   - Assert: Shows ~152 cm (within 1cm rounding)
   - Toggle back to imperial
   - Assert: Shows 60 inches

7. **Color inputs** - Eye/skin/hair accept any string
   - Input: "blue", "medium brown", "black with silver streaks"
   - Assert: All saved without validation error
   - Input: Empty string
   - Assert: Allowed (optional field)

8. **Physical data saves with character**
   - Set all physical attributes
   - Save character
   - Query database
   - Assert: All fields persisted correctly

### Edge Cases (Minimum 2)

- Age = 0 (newborn character)
- Very tall character (7'0"+) for Half-Orc
- Hair color with emoji "😍 purple"

---

## WORK UNIT 5: Database & Schema Tests

**File Location:** `server/tests/database-schema.test.ts`  
**Framework:** Vitest  
**Focus:** Data integrity, no corruption

### Tests Required (Minimum 8)

1. **Campaign members table** - Tracks membership correctly
   - Add User A, B, C to Campaign 1
   - Query campaign_members
   - Assert: 3 rows, correct user_ids, correct campaign_id

2. **RLS prevents unauthorized read** - User cannot read other user's characters via RLS
   - Query characters WHERE user_id != authenticated_user_id
   - Assert: Supabase RLS returns 0 rows (not 403, just no data)

3. **Character campaign scope** - Character scoped to campaign
   - Create character in Campaign 1
   - Query characters for Campaign 2
   - Assert: Character not returned

4. **Migrations run without errors** - All pending migrations succeed
   - Run all migrations
   - Assert: No errors, schema matches expected state

5. **Campaign deletion cascades** - Delete campaign → deletes related members
   - Create campaign with 3 members
   - Delete campaign
   - Query campaign_members for that campaign
   - Assert: 0 rows (cascaded)

6. **User deletion cascades** - Delete user → orphans or deletes their characters
   - Create user with 5 characters
   - Delete user
   - Query characters by user_id (if not actually deleted)
   - Assert: Characters marked deleted OR no longer queryable

7. **Physical attributes fields exist** - New columns present
   - Query character schema
   - Assert: gender, age, height, weight, eyes, skin, hair columns exist

8. **Height/weight ranges in race tables** - New columns added to races
   - Query race schema
   - Assert: heightRange, weightRange columns exist for all races

### Data Integrity Tests (Minimum 2)

- **Foreign key enforcement:** Try to insert character with invalid user_id
  - Assert: Database rejects with foreign key error

- **Unique constraints:** Try to create duplicate campaign_members entry
  - Assert: Database rejects with unique constraint error

---

## WORK UNIT 6: API Endpoints Tests

**File Location:** `server/tests/api-endpoints.test.ts`  
**Framework:** Vitest + supertest  
**Focus:** Integration between frontend and backend

### Tests Required (Minimum 10)

1. **GET /v1/characters** - Returns user's characters
   - Authenticated request
   - Assert: 200 OK, returns array of user's characters

2. **GET /v1/characters with no characters** - Empty array, not error
   - New user with no characters
   - GET /v1/characters
   - Assert: 200 OK, empty array []

3. **POST /v1/characters** - Creates character
   - POST with valid character data
   - Assert: 201 Created, returns created character with ID

4. **POST /v1/characters quota check** - Free tier limited
   - Free user with 5 existing characters
   - POST new character
   - Assert: 402 Payment Required

5. **PUT /v1/characters/:id** - Updates character
   - Create character → Update name → PUT
   - Assert: 200 OK, character updated in database

6. **DELETE /v1/characters/:id** - Soft or hard delete
   - Create character → DELETE
   - Assert: 204 No Content or 200 OK
   - Verify character gone from GET list

7. **GET /v1/campaigns/:id/characters** - Returns campaign's characters
   - Multiple users in campaign with characters
   - GET endpoint
   - Assert: Returns all characters for that campaign

8. **GET with invalid ID** - 404 for nonexistent character
   - GET /v1/characters/nonexistent-id
   - Assert: 404 Not Found

9. **POST with invalid data** - Validation errors
   - POST character with missing required fields (name)
   - Assert: 400 Bad Request, validation message

10. **Rate limiting on endpoints** - All endpoints respect rate limit
    - Make 11 requests in 1 minute (assuming limit = 10)
    - Request 11
    - Assert: 429 Too Many Requests

### Error Response Format Tests (Minimum 2)

- **Consistent error response structure:** All error responses have status, message, code
  - Trigger different errors (404, 400, 402)
  - Assert: All have `{status, message, code}` format

- **Error messages are user-readable:** User gets helpful message, not stack trace
  - Trigger error
  - Assert: Message is English, actionable, no code internals exposed

---

## WORK UNIT 7: Error Handling & Graceful Degradation Tests

**File Location:** `src/__tests__/integration/error-handling-edge-cases.test.tsx`  
**Framework:** Vitest  
**Focus:** Production resilience - app doesn't crash on failure

### Tests Required (Minimum 10)

1. **Database unavailable** - Graceful error, not crash
   - Mock Supabase to throw connection error
   - Try to save character
   - Assert: Returns 503 Service Unavailable, not 500 Internal Server Error

2. **Payment processor unavailable** - Purchase attempt shows user error
   - Mock Stripe API to fail
   - Try to upgrade to Pro
   - Assert: Shows "payment processor is down, try again later"

3. **Malformed JSON in request** - Server rejects gracefully
   - Send: `{invalid json}`
   - Assert: 400 Bad Request, not 500

4. **Missing required JSON field** - Clear error message
   - POST /v1/characters with `{name: "Bob"}` (missing class)
   - Assert: 400 with message "class is required"

5. **Concurrent character saves** - No duplicates created
   - User clicks save twice rapidly
   - Assert: Only one character created, or error on duplicate

6. **Very large character data** - Doesn't break system
   - Character backstory = 100,000 characters
   - Save
   - Assert: Either succeeds or returns 413 Payload Too Large (not 500)

7. **Special characters in inputs** - Properly escaped/encoded
   - Character name: `'; DROP TABLE characters; --`
   - Character name: `<script>alert('xss')</script>`
   - Character name: `../../../etc/passwd`
   - Assert: All saved as literal strings, no injection/traversal

8. **Null/undefined values** - Handled safely
   - Character with null race (not allowed, but test it)
   - Assert: Validation error, not crash

9. **Array boundary** - No off-by-one errors
   - Character with 0 spells
   - Character with 1 spell
   - Character with 100 spells
   - Assert: All handled correctly

10. **Emoji and unicode** - Properly stored and retrieved
    - Character name: "Þórarinn Αλεξάνδρειος 王"
    - Save and retrieve
    - Assert: Exact same characters returned

### Recovery Tests (Minimum 2)

- **Transient failure retry:** Request fails, retry succeeds
  - First attempt: Network timeout
  - Second attempt: Success
  - Assert: User can retry and succeed

- **Partial data recovery:** Started save, database went down mid-transaction
  - Assert: No corrupted partial data in database

---

## WORK UNIT 8: Performance & Load Tests

**File Location:** `server/tests/performance-load.test.ts`  
**Framework:** Vitest + custom timing  
**Focus:** Acceptable performance at scale

### Tests Required (Minimum 5)

1. **Character save speed** - Completes in <500ms
   - Save character
   - Measure time
   - Assert: < 500ms (under 1 second is OK, under 500ms is good)

2. **Character list load** - User with 100 characters
   - GET /v1/characters with 100 characters in database
   - Assert: < 1 second response time

3. **Search performance** - Searching 1000 characters
   - Query campaign characters (1000 total)
   - Filter by name
   - Assert: < 500ms

4. **Concurrent requests** - 10 simultaneous saves
   - 10 users each save character at same time
   - Assert: All complete successfully, none timeout

5. **Memory stability** - No memory leaks on repeated operations
   - Save character 1000 times
   - Measure memory usage
   - Assert: Memory doesn't grow unbounded

### SLA Tests (Minimum 2)

- **99th percentile performance:** Slowest 1% of requests acceptable
  - Run 1000 character saves
  - Get 99th percentile time
  - Assert: < 2 seconds

- **Zero errors under load:** No crashes during peak
  - Simulate 50 concurrent users, each making 10 requests
  - Assert: 0 errors, 500 total requests all succeed

---

## WORK UNIT 9: Integration Tests - Systems Working Together

**File Location:** `server/tests/integration-end-to-end.test.ts`  
**Framework:** Vitest  
**Focus:** Multi-system workflows

### Tests Required (Minimum 8)

1. **Complete user flow: Sign up → Create character → Save**
   - Register new account
   - Create character (full wizard)
   - Save character
   - Assert: Character in database under correct user

2. **Campaign collaboration: Create campaign → Invite user → Create character together**
   - User A creates campaign
   - User A invites User B
   - User B creates character in campaign
   - User A verifies User B's character in campaign
   - Assert: Both see same character

3. **Monetization flow: Free → Pro upgrade → Unlock features**
   - Free user hits 5 character limit
   - Upgrades to Pro
   - Creates 6th character
   - Assert: Success (no longer limited)

4. **Payment → Character unlock** - One payment unlocks features
   - Free user, limited to basic character attributes
   - Upgrades to Pro
   - Can now set physical attributes on character
   - Assert: Pro features available

5. **Character deletion → Quota release** - Deleting character frees quota
   - Free user with 5 characters (max)
   - Try to create 6th → Fails
   - Delete one character
   - Create new character
   - Assert: Succeeds (quota updated)

6. **Session persistence** - Create character, logout, login, see character
   - Login → Create character
   - Logout
   - Login again
   - GET /v1/characters
   - Assert: Character still there

7. **Concurrent edits handled** - Two users editing same campaign
   - User A and User B both in campaign
   - User A modifies campaign name
   - User B reads campaign
   - Assert: User B sees updated name (not stale)

8. **Error recovery flow** - Graceful handling when subsystem fails
   - Try to save character
   - Database temporarily down
   - Show error to user
   - User retries
   - Database recovered
   - Assert: Retry succeeds

---

## WORK UNIT 10: Regression Prevention & Test Maintenance

**File Location:** `server/tests/regression-suite.test.ts`  
**Framework:** Vitest  
**Purpose:** Prevent old bugs from reoccurring

### Tests Required (Minimum 5)

1. **Character name length regression** - Bug from Oct 2024 doesn't return
   - Once had: character name could be >1000 chars, broke UI
   - Assert: Name max 50 chars enforced

2. **Campaign membership data leak regression** - Can't see other campaigns
   - Once had: user could view any campaign
   - Assert: User can only see campaigns they're in

3. **Quota bypass regression** - Can't delete/recreate to reset quota
   - Once had: free user deletes char, creates 6 new
   - Assert: Quota tracks total created, not current

4. **Payment webhook replay** - Can't duplicate payment by resending webhook
   - Once had: duplicate webhook = duplicate charge
   - Assert: Idempotent - duplicate webhook processed only once

5. **JWT expiration bypass** - Can't use old token after logout
   - Once had: token worked even after logout
   - Assert: Logout invalidates token immediately

---

## ENVIRONMENT SETUP & MOCKING STRATEGY

### Supabase Mocking

Use `vi.mock('@supabase/supabase-js')` for unit tests:
```javascript
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({ data: [], error: null }))
      }))
    }))
  }))
}))
```

**Integration tests (WORK UNIT 6+):** Use real Supabase if possible, or detailed mock.

### Stripe Mocking

Mock payment processor to simulate success/failure:
```javascript
vi.mock('stripe', () => ({
  Stripe: vi.fn(() => ({
    charges: {
      create: vi.fn(() => ({ id: 'ch_123', status: 'succeeded' }))
    }
  }))
}))
```

### Database for Tests

- **Unit tests:** Mock all database calls
- **Integration tests:** Use test database or mocked Supabase
- **Never:** Use production database

---

## QUALITY GATES - MUST PASS ALL

### Before Submitting Test Suite

**Linting:**
```bash
npm run lint -- src/__tests__ server/tests
```
- Assert: 0 errors

**Test Execution:**
```bash
npm run server:test
cd server && npx vitest run
```
- Assert: 100% passing (27 existing + 100+ new = 127+ tests all passing)

**Coverage Report:**
```bash
npm run server:test -- --coverage
```
- Assert: 
  - Overall: ≥70% coverage
  - Critical paths (auth, payment, character save): ≥85% coverage
  - No files with <50% coverage

**Test Speed:**
```bash
npm run server:test -- --reporter=verbose
```
- Assert: Total runtime <30 seconds

**No Skipped Tests:**
```bash
grep -r "test.skip\|test.todo\|describe.skip" server/tests/ src/__tests__
```
- Assert: 0 results (all tests actually run)

---

## IF BLOCKED

**Problem:** Test fails but seems correct (test is right, code might be wrong)
- Flag with comment: `// VERIFICATION NEEDED: This test reveals a bug in production code`
- Still include test as-is
- Document the bug in WORK UNIT 10

**Problem:** Cannot mock Supabase correctly
- Use example from `server/tests/rules/*.spec.ts` as reference
- If still stuck, mock at a higher level (fetch calls)

**Problem:** Rate limiting test interferes with other tests
- Add test isolation: reset rate limit cache before each test
- Use unique user IDs to prevent collision

**Problem:** Some tests run >2 seconds (too slow)
- Check for real I/O (databases, networks) - mock instead
- Check for loops - may be infinite or unbounded
- Use `vi.useFakeTimers()` for time-based tests

**Problem:** Concurrency test is flaky (sometimes passes, sometimes fails)
- Add 100-200ms delay between concurrent operations
- Use barriers/callbacks to ensure operations complete before assertion
- Consider making test deterministic instead of timing-based

---

## DELIVERABLES CHECKLIST

**Before submission, verify ALL:**

- [ ] All 10 work units have test files created
- [ ] All test files pass `npm run lint`
- [ ] All tests pass (100% pass rate)
- [ ] Coverage report shows ≥70% overall, ≥85% critical paths
- [ ] Total test runtime <30 seconds
- [ ] No test.skip or test.todo remaining
- [ ] Each test has clear describe/it blocks
- [ ] Each test has at least one assertion (Assert: ...)
- [ ] Both positive and negative test cases included
- [ ] Edge cases covered (min 2-3 per work unit)
- [ ] Error handling tests included (WORK UNIT 7)
- [ ] Performance tests included (WORK UNIT 8)
- [ ] Integration tests included (WORK UNIT 9)
- [ ] Regression tests included (WORK UNIT 10)
- [ ] Mocking strategy followed (Supabase, Stripe mocked)
- [ ] All quality gates passing (lint, tests, coverage, speed)

---

## SUBMISSION FORMAT

Create or update these files:
```
src/__tests__/integration/character-creation-complete-flow.test.tsx
server/tests/payment-and-subscription.test.ts
server/tests/auth-and-authorization.test.ts
src/__tests__/integration/physical-attributes-feature.test.tsx
server/tests/database-schema.test.ts
server/tests/api-endpoints.test.ts
src/__tests__/integration/error-handling-edge-cases.test.tsx
server/tests/performance-load.test.ts
server/tests/integration-end-to-end.test.ts
server/tests/regression-suite.test.ts
```

Verify all pass:
```bash
npm run lint
npm run server:test
npm run server:test -- --coverage
```

---

## NOTES FOR AI CODER (IMPORTANT)

- **You're not writing tests for perfect code** - You're writing tests to catch bugs. Be paranoid.
- **Money-related tests are critical** - If you're unsure about payment/quota tests, over-test, don't under-test.
- **Security tests are non-negotiable** - SQL injection, XSS, data leakage - test all three.
- **Concurrency is hard** - Concurrent operations often fail in subtle ways. Test them.
- **Performance matters** - Users will leave if app is slow. Set realistic SLAs.
- **Integration tests are last** - Unit tests first, then integration. Integration tests catch cross-system bugs.
- **If a test seems stupid, write it anyway** - The stupid test often catches the real bugs.

---

**Status:** Ready for Jules | **Est. Time:** 4-6 hours | **Reusable:** Yes (update after major changes)
