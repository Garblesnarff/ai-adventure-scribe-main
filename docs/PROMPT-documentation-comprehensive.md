# Jules Prompt: Comprehensive Documentation for AI Coders

**Status:** Production-Ready | **Last Updated:** 2025-10-23 | **Reusable:** Yes

---

## CORE TASK

Add comprehensive inline documentation and architectural guides to the codebase. **Documentation is written for AI agents, not humans.** The next AI coder (Jules, Claude, or other) needs to understand WHY code exists, not just WHAT it does.

## CRITICAL CONTEXT

- **Audience:** AI coding agents (Jules, myself, future AI tools) who will maintain/extend this code
- **Goal:** Enable autonomous coding without constant context-switching to business logic
- **Current State:** Minimal comments, no architecture docs, "self-documenting" code that isn't
- **Revenue Risk:** AI coder misses business logic → breaks payment/auth → money lost
- **Scale:** 2,300+ lines across 9 PRs; needs 40-50% comment coverage

## SUCCESS CRITERIA (MUST ACHIEVE ALL)

- [ ] All production code files have meaningful comments (40-50% line coverage)
- [ ] All business logic clearly explained (WHY, not just WHAT)
- [ ] Architecture document complete (ARCHITECTURE_FOR_AI.md)
- [ ] API contracts documented with examples
- [ ] Data validation rules explicit
- [ ] Security implications flagged
- [ ] Edge cases documented
- [ ] Third-party integrations explained
- [ ] Debugging guide included
- [ ] Pre-deploy checklist created
- [ ] No lint errors in code or documentation

---

## WORK UNIT 1: Character Context Documentation

**File:** `src/contexts/CharacterContext.tsx`  
**Type:** Core state management - critical for entire app  
**Audience:** AI coders extending character system

### Required Documentation

**File-level comment** explaining:
- What this context manages (character state throughout creation and gameplay)
- Why it's centralized here (shared state across 10+ components)
- Life cycle (created on entry → saved → loaded when reopened)
- Performance implications (dispatch is fast, but many subscribers = render cascade if not memoized)

**Example:**
```typescript
/**
 * CHARACTER CONTEXT - Central state management for character creation and display
 * 
 * WHY THIS EXISTS:
 * - 10+ components need access to same character data (race, class, abilities, etc)
 * - Prevents prop drilling through 7 levels of components
 * - Enables undo/redo and draft management
 * 
 * BUSINESS LOGIC:
 * - isDirty flag prevents data loss on back button
 * - canSave validation ensures required fields before database save
 * - Character cannot be saved without: name, race, class (mandatory for monetization)
 * 
 * INTEGRATION:
 * - Read from: /pages/CharacterCreateEntry (entry point)
 * - Write to: Supabase when user clicks "Save Character"
 * - Consumed by: 10+ child components via useCharacter() hook
 * 
 * PERFORMANCE NOTE:
 * - Memoized with useMemo to prevent unnecessary re-renders
 * - 100+ render cycles possible during character creation (if not optimized)
 * - Each dispatch triggers re-render of all subscribers
 * 
 * SECURITY NOTE:
 * - campaign_id is set when creating character in campaign context
 * - This field is CRITICAL - without it, user sees other campaigns' characters
 * - Always verify campaign_id matches authenticated user
 */
```

### Each Reducer Case - Document WHY

For every case in characterReducer:

```typescript
case 'SET_ABILITY_SCORE':
  /**
   * WHY: User manually adjusts ability score (strength, dexterity, etc)
   * 
   * BUSINESS IMPACT:
   * - Ability scores determine character power level
   * - Pro tier users can manually set; Free tier must use standard array or rolls
   * - DO NOT remove this capability for free users without changing monetization
   * 
   * FLOW:
   * 1. Component: AbilityScoreInput
   * 2. Dispatch: SET_ABILITY_SCORE with new score
   * 3. Reducer: Update single ability, mark isDirty=true
   * 4. Effect: Character not saved until user clicks "Save Character"
   * 
   * EDGE CASES:
   * - Score can be 3-20 (D&D 5e rules), validate in component
   * - If character is in campaign, affects shared party power level
   * - TODO: Add ability modifier to derived calculations
   * 
   * DEPENDENCIES:
   * - Changing this affects: CharacterSheet (display), AbiityScoreInput (UI)
   * - RLS policy must allow user to update their own character abilities
   */
```

### State Interface Documentation

```typescript
/**
 * CHARACTER STATE - Represents one character from creation → gameplay
 * 
 * REQUIRED FIELDS (character cannot save without these):
 * - name: string (1-50 chars, stored on character sheet)
 * - race: CharacterRace (determines speed, languages, physical traits)
 * - class: CharacterClass (determines hit die, abilities, spells)
 * 
 * OPTIONAL FIELDS (nice to have, don't block save):
 * - background, personality traits, physical attributes, etc
 * 
 * MONETIZATION FIELDS:
 * - campaign_id: nullable string (free users: 1 campaign, pro: unlimited)
 * - If campaign_id set, character is "campaign-scoped" (shared with teammates)
 * - If campaign_id null, character is "personal" (only visible to owner)
 * 
 * FLAGS:
 * - isDirty: true if unsaved changes exist (shows "*" in UI, prevents accidental loss)
 * - isLoading: true during save (shows spinner, disables buttons)
 * - errors: array of validation errors (what user must fix before saving)
 * 
 * NEVER:
 * - Modify state directly - always dispatch
 * - Store user_id (comes from auth context, not character context)
 * - Store JWT token (security risk)
 */
```

---

## WORK UNIT 2: Physical Attributes Component Documentation

**File:** `src/components/character-creation/steps/PhysicalStep.tsx`  
**Type:** UI component - new feature (Oct 23)  
**Audience:** AI extending character creation

### Required Documentation

**Component-level comment:**
```typescript
/**
 * PHYSICAL STEP - Character appearance customization
 * 
 * BUSINESS LOGIC:
 * - Cosmetic only: height/weight don't affect gameplay mechanics
 * - Physical attributes show on character sheet for immersion
 * - Promotes player engagement (players want their character to "look right")
 * 
 * UX NOTES:
 * - Imperial/Metric toggle: International users need metric (50% of traffic from EU/AU)
 * - Sliders for height/weight: Better UX than text input for numeric ranges
 * - Color inputs for eyes/hair: Free text because infinite color descriptions exist
 * 
 * MONETIZATION:
 * - Physical attributes available to all tiers
 * - No premium feature restriction
 * - Goal: Make basic character feel complete and playable
 * 
 * INTEGRATION:
 * - Read campaign defaults from CampaignContext (art style, theme color)
 * - Write to CharacterContext via dispatch (SET_HEIGHT, SET_WEIGHT, etc)
 * - Saved to database when user clicks "Save Character"
 * 
 * TECHNICAL NOTES:
 * - useMetric state is component-local (doesn't persist - user choice per session)
 * - Race-aware ranges prevent 3'0" humans or 9'0" halflings
 * - Conversion math: inches * 2.54 = cm, lbs * 0.453592 = kg
 */
```

### Conversion Function Documentation

```typescript
/**
 * WHY THESE CONVERSIONS:
 * - 2.54: Exact inches-to-cm ratio (1 inch = 2.54 cm, fixed by international standard)
 * - 0.453592: Exact pounds-to-kg ratio (1 lb = 0.453592 kg)
 * 
 * ROUNDING:
 * - Round to nearest integer (user doesn't care about 0.3cm difference)
 * - Math.round() used (not floor/ceil) for fairness
 * 
 * STORAGE:
 * - Always store as imperial internally (character.height = 70 inches)
 * - Convert to metric only for display
 * - Why: Most D&D rules use imperial, easier for game calculations
 */

const convertToMetricHeight = (inches: number) => {
  return Math.round(inches * 2.54); // TODO: Verify 2.54 is exact enough
};
```

### Race Range Documentation

```typescript
/**
 * RACE HEIGHT/WEIGHT RANGES - Physical characteristics per D&D 5e
 * 
 * WHY THESE SPECIFIC RANGES:
 * - Based on official D&D 5e character creation rules
 * - Maintains game balance (prevents unrealistic builds)
 * - Creates immersion (humans can't be 12 feet tall)
 * 
 * EXAMPLE:
 * - Human: 60-76 inches (5'0" to 6'4") - matches average human population
 * - Dwarf: 48-60 inches (4'0" to 5'0") - below human for short stature
 * - Half-Orc: 66-80 inches (5'6" to 6'8") - above human for intimidation
 * 
 * IF CHANGING RANGES:
 * - Do NOT add validation to UI - validation happens here (race.heightRange)
 * - Sliders will clamp to new range automatically
 * - If you remove this data, character creation breaks - search for usages first
 * 
 * MISSING RACES TODO:
 * - Goliath race not added yet (add heightRange: [85, 107])
 */
```

---

## WORK UNIT 3: Type Definitions Documentation

**File:** `src/types/character.ts`  
**Type:** TypeScript interfaces - contracts between systems  
**Audience:** AI coders writing new features

### Each Interface - Add JSDoc

```typescript
/**
 * CHARACTER - Represents a player character in any state
 * 
 * LIFECYCLE:
 * 1. Created: User enters name, race, class (minimal fields)
 * 2. Developed: User adds abilities, skills, equipment (optional fields)
 * 3. Saved: All fields persisted to database with user_id and timestamp
 * 4. Loaded: Retrieved from database when user plays or edits
 * 5. Deleted: Soft-deleted (record stays, is_deleted flag set)
 * 
 * REQUIRED FIELDS (cannot save without):
 * - name: 1-50 characters, shown in character list
 * - race: CharacterRace object, determines traits and languages
 * - class: CharacterClass object, determines abilities and spells
 * 
 * OPTIONAL FIELDS (nice to have):
 * - background: influences roleplay and skills
 * - physical attributes: cosmetic only, no game impact
 * - spells: depends on class (clerics can have spells, barbarians cannot)
 * 
 * MONETIZATION:
 * - campaign_id: if set, character visible to campaign members
 * - if null, character private to owner
 * - Free tier: max 1 campaign per user
 * - Pro tier: unlimited campaigns
 * 
 * DATABASE MAPPING:
 * - Stored in Supabase 'characters' table
 * - user_id: References auth.users (RLS enforces ownership)
 * - campaign_id: Nullable reference to campaigns table
 * - created_at: Auto-set by Supabase
 * - updated_at: Auto-updated by Supabase
 * 
 * SECURITY:
 * - RLS policy: Users can only see their own characters
 * - RLS policy: Campaign members can see campaign's characters
 * - Never send user_id to frontend (derived from auth context)
 * - Never send JWT in character object
 */
export interface Character { ... }

/**
 * CHARACTER_RACE - Available races player can choose
 * 
 * BUSINESS LOGIC:
 * - Defines core character traits (speed, languages, abilities)
 * - D&D 5e official races + some homebrew (Dragonborn, Tiefling, etc)
 * 
 * FIELDS:
 * - id: Used in database and character sheet lookups (string key)
 * - name: Displayed to player (Human, Elf, Dwarf, etc)
 * - traits: Special abilities (Extra Attack, Darkvision, etc) - FOR FUTURE
 * - subraces: Optional variants (e.g., High Elf vs Wood Elf)
 * - heightRange: [min, max] in inches - used to clamp physical step sliders
 * - weightRange: [min, max] in pounds - used to validate and suggest reasonable weight
 * 
 * IF ADDING A NEW RACE:
 * 1. Add to src/data/races/newrace.ts
 * 2. Import in src/data/races/index.ts
 * 3. Add heightRange and weightRange (required)
 * 4. Test: Physical step slider should clamp to new range
 * 5. Test: Character save should work with new race
 * 
 * NEVER:
 * - Remove race from list (existing characters reference it)
 * - Change race.id (it's a foreign key to character records)
 * - Change abilityScoreIncrease without updating game calculations
 */
export interface CharacterRace { ... }

/**
 * ABILITY_SCORES - The 6 core abilities in D&D
 * 
 * WHY THESE EXIST:
 * - Determine what character is good at (Strength = melee, Intelligence = spells)
 * - Range 3-20 in D&D 5e (lower is worse, higher is better)
 * - Create character variety (barbarian high Strength, wizard high Intelligence)
 * 
 * HOW CALCULATED:
 * - Players roll 4d6, drop lowest (standard method) - implemented in character creation
 * - Or use standard array: [15, 14, 13, 12, 10, 8]
 * - Race can modify scores (human +1 to all, half-elf +2 to two chosen)
 * 
 * MODIFIERS:
 * - Modifier = (score - 10) / 2, rounded down
 * - Score 16 = modifier +3
 * - Score 8 = modifier -1
 * - Used in combat/skill checks (attach Modifier to each ability)
 * 
 * STORAGE:
 * - Store base score (before race modifiers)
 * - Calculate final score = base + race modifier
 * - Store modifier separately for quick lookup in combat
 * 
 * TODO: Currently not persisted to database
 * After v1 launch, add ability_scores table join
 */
```

### Enum/Union Documentation

```typescript
/**
 * GENDER - Character presentation/pronouns
 * 
 * VALUES:
 * - "male": For roleplay and character sheet presentation
 * - "female": For roleplay and character sheet presentation
 * 
 * NOTES:
 * - Cosmetic only (no gameplay impact)
 * - Players choose for immersion/roleplay
 * - Used in flavor text if AI narrator implemented
 * - D&D 5e rules ignore gender (no mechanical difference)
 * 
 * FUTURE: Consider non-binary option if players request
 */
export type Gender = 'male' | 'female';
```

---

## WORK UNIT 4: Authentication & Authorization Documentation

**File:** `server/src/middleware/auth.ts`  
**Type:** Security critical - guards all data  
**Audience:** AI coders implementing new features

### Required Documentation

**File-level security warning:**
```typescript
/**
 * AUTHENTICATION & AUTHORIZATION MIDDLEWARE
 * 
 * ⚠️ SECURITY CRITICAL: Changes here can expose user data or allow unauthorized access
 * 
 * FLOW:
 * 1. Request arrives with Authorization: Bearer <token>
 * 2. Extract token, verify JWT signature (must match secret key)
 * 3. Verify token not expired (exp claim)
 * 4. Extract user_id from token payload
 * 5. Attach user_id to req.user (used by routes)
 * 
 * WHAT BREAKS IF YOU CHANGE THIS:
 * - Token verification disabled: Anyone can pretend to be any user
 * - Expiration check removed: Logout doesn't work, tokens persist forever
 * - User_id not extracted: Routes can't know who's requesting
 * - RLS policies not enforced: Users see other users' data
 * 
 * JWT TOKEN FORMAT:
 * {
 *   "userId": "user_123",
 *   "email": "user@example.com",
 *   "plan": "free" | "pro" | "ultra",
 *   "iat": 1697000000,    // issued at
 *   "exp": 1697086400     // expires in 24 hours
 * }
 * 
 * TOKEN SECURITY:
 * - Signed with secret key (process.env.JWT_SECRET)
 * - If secret exposed, attacker can forge tokens
 * - If secret lost, all existing tokens invalid (users must re-login)
 * - TTL = 24 hours (refresh token could extend, not implemented yet)
 * 
 * TEST THIS:
 * - Invalid signature: Fake token should be rejected
 * - Expired token: Token with exp=yesterday should be rejected
 * - Missing token: Request without Authorization should get 401
 * - Valid token: Request with valid token should succeed
 * 
 * AUDIT: Reviewed security 2025-10-23 by AI, no known vulnerabilities
 */
```

### Each Function - Security Comments

```typescript
/**
 * VERIFY JWT TOKEN SIGNATURE
 * 
 * WHY THIS MATTERS:
 * - If this fails silently, attacker can forge tokens
 * - Must reject ANY token without valid signature
 * 
 * IMPLEMENTATION:
 * - Use jsonwebtoken.verify() (industry standard)
 * - Pass secret key (must match token signing secret)
 * - If verify throws, token is invalid (reject with 401)
 * 
 * COMMON MISTAKES:
 * - Forgetting to pass secret key (tokens pass through unchecked)
 * - Catching all errors (hides real problems)
 * - Not checking token expiration (separate from signature)
 * 
 * ATTACK VECTORS:
 * - Token with wrong signature: verify() throws, caught, rejected ✓
 * - Token with no signature (none algorithm): verify() rejects ✓
 * - Token modified after signing: verify() throws ✓
 * - Token with future exp date: verify() ignores (check exp separately)
 */
export function verifyToken(token: string) {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return decoded;
  } catch (error) {
    // Token verification failed (signature invalid or expired)
    // Log for security audit
    logger.warn('Invalid token attempt', { error: error.message });
    throw new Error('Token verification failed');
  }
}
```

---

## WORK UNIT 5: Database & RLS Documentation

**File:** `supabase/migrations/*.sql`  
**Type:** Data infrastructure - core to data isolation  
**Audience:** AI coders adding new features requiring database changes

### Migration Comment Template

```sql
-- MIGRATION: [Name]
-- PURPOSE: [What business problem this solves]
-- 
-- BUSINESS IMPACT:
-- - [How this affects users/features]
-- - [Why this is important]
-- 
-- SCHEMA CHANGES:
-- - New table: [table_name] (stores [what data])
-- - New column: [column_name] on [table] (used for [what purpose])
-- - New constraint: [constraint type] (prevents [what bad thing])
-- 
-- RLS POLICIES:
-- - [Policy name]: [Who can access what] because [business reason]
-- 
-- MIGRATION SAFETY:
-- - Backward compatible: YES/NO (can rollback without data loss: YES/NO)
-- - Requires downtime: YES/NO
-- - Data migration needed: YES/NO (if yes, steps below)
-- 
-- IF REVERTING THIS MIGRATION:
-- - [What data gets deleted/modified]
-- - [What features stop working]
-- - [Manual cleanup needed]
-- 
-- TESTED BY:
-- - [Test case 1]
-- - [Test case 2]

CREATE TABLE campaigns (
  -- Core data
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  
  -- Business data
  name TEXT NOT NULL, -- Displayed in UI, required
  description TEXT,   -- Optional marketing text
  
  -- Metadata
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- RLS POLICIES FOR CAMPAIGNS TABLE
-- 
-- POLICY: Users can see campaigns they own
-- BUSINESS REASON: Private campaigns - user shouldn't see other campaigns
-- 
-- POLICY: Campaign members can see campaign details
-- BUSINESS REASON: Collaborative play - members need to see shared campaign
-- 
-- POLICY: Only campaign creator can edit
-- BUSINESS REASON: Prevent data corruption from unauthorized edits
```

---

## WORK UNIT 6: API Endpoints Documentation

**File:** `server/src/routes/v1/*.ts`  
**Type:** API contracts - frontend/backend integration  
**Audience:** AI implementing frontend features or backend routes

### Route Documentation Template

```typescript
/**
 * GET /v1/characters
 * 
 * BUSINESS PURPOSE:
 * - Returns all characters belonging to authenticated user
 * - Used in: Character list page, campaign character selection, etc
 * - WHO CAN USE: Any authenticated user
 * 
 * REQUEST:
 * - Method: GET
 * - Auth: Required (Bearer token)
 * - Headers: Authorization: Bearer <jwt>
 * - Query params: None yet (TODO: add pagination)
 * 
 * RESPONSE SUCCESS (200 OK):
 * {
 *   "data": [
 *     {
 *       "id": "char_123",
 *       "name": "Aragorn",
 *       "race": "Human",
 *       "class": "Fighter",
 *       "level": 5,
 *       "campaign_id": null,  // null = personal character
 *       "created_at": "2025-10-20T00:00:00Z"
 *     },
 *     ...
 *   ],
 *   "count": 3,    // Total characters for user
 *   "limit": 100   // Items per page (pagination future)
 * }
 * 
 * RESPONSE ERRORS:
 * - 401 Unauthorized: No token or invalid token
 *   { "error": "Authentication required" }
 * 
 * - 500 Internal Server Error: Database connection failed
 *   { "error": "Failed to fetch characters" }
 * 
 * BUSINESS LOGIC:
 * - Uses RLS: SELECT only returns user's own characters
 * - If user has 0 characters, returns empty array (not null, not error)
 * - Characters in campaigns show campaign_id (used for filtering)
 * 
 * PERFORMANCE:
 * - Query is simple (just SELECT by user_id)
 * - Should complete <200ms for typical user (5-20 characters)
 * - If slow: Check database indexes on characters(user_id)
 * 
 * MONETIZATION:
 * - Free tier: Returns all characters (limit 5 checked on CREATE, not GET)
 * - Pro tier: Unlimited characters
 * - Note: GET doesn't enforce limit - client responsible for UI
 * 
 * TESTING:
 * - Test: User sees their own characters only
 * - Test: User doesn't see other users' characters (RLS enforced)
 * - Test: Empty array if no characters
 * - Test: 401 if no auth token
 */
router.get('/characters', requireAuth, async (req, res) => {
  // Implementation
});
```

### Error Response Documentation

```typescript
/**
 * ERROR RESPONSE FORMAT - All errors follow this standard
 * 
 * EVERY error from this API should return:
 * {
 *   "status": 400,       // HTTP status code
 *   "code": "INVALID_INPUT",  // Machine-readable error code (for client switch statements)
 *   "message": "User-friendly message describing what went wrong and how to fix",
 *   "details": {         // Optional: additional debugging info
 *     "field": "name",   // Which field failed validation
 *     "constraint": "maxLength",  // What constraint violated
 *   }
 * }
 * 
 * WHY THIS FORMAT:
 * - status: Standard HTTP allows client to understand severity (4xx = client error, 5xx = server error)
 * - code: Machine-readable for client error handling (if code == "QUOTA_EXCEEDED" show upgrade button)
 * - message: Human-readable for user error display
 * - details: Debugging info (API logs include this for troubleshooting)
 * 
 * COMMON ERROR CODES:
 * - QUOTA_EXCEEDED (402): User hit limit, needs to upgrade
 * - RATE_LIMITED (429): User made too many requests, try again later
 * - UNAUTHORIZED (401): No valid auth token
 * - FORBIDDEN (403): Authenticated but not allowed to access
 * - VALIDATION_ERROR (400): Invalid input (missing field, wrong type)
 * - SERVER_ERROR (500): Something broke on server (database down, etc)
 * 
 * CLIENT HANDLING:
 * - 402: Show "Upgrade to Pro" button
 * - 429: Show "Too many requests, try again in X seconds"
 * - 401: Show login/logout modal
 * - 403: Show "You don't have permission to do this"
 * - 400: Show validation error per field
 * - 500: Show "Something went wrong, please try again"
 * 
 * IF ADDING NEW ERROR CODE:
 * 1. Define here in comment
 * 2. Update client error handler
 * 3. Document what client should do
 */
```

---

## WORK UNIT 7: Error Handling & Recovery Documentation

**Files:** `src/services/ai-service.ts`, `server/src/routes/v1/ai.ts`  
**Type:** Reliability patterns - prevents cascading failures  
**Audience:** AI coders implementing features that can fail

### Error Handling Pattern Documentation

```typescript
/**
 * ERROR HANDLING PATTERNS IN THIS CODEBASE
 * 
 * PATTERN 1: Try/catch with logging
 * WHY: Know when errors happen (for debugging and monitoring)
 * 
 * try {
 *   const result = await risky_operation();
 *   return result;
 * } catch (error) {
 *   logger.error('Operation failed', {
 *     error: error.message,
 *     context: { userId, characterId },
 *     timestamp: new Date()
 *   });
 *   throw error; // Re-throw or handle
 * }
 * 
 * PATTERN 2: Graceful degradation
 * WHY: App keeps working even if secondary feature fails
 * 
 * try {
 *   const heroImage = await generateImage(character);
 *   character.image = heroImage;
 * } catch (error) {
 *   // Image generation failed, but character creation continues
 *   logger.warn('Image generation failed', error);
 *   character.image = null; // Use default
 * }
 * // Character saves without image, user sees default
 * 
 * PATTERN 3: Retry with backoff
 * WHY: Transient failures (network glitch) might succeed on retry
 * 
 * async function retry(fn, maxRetries = 3) {
 *   for (let i = 0; i < maxRetries; i++) {
 *     try {
 *       return await fn();
 *     } catch (error) {
 *       if (i === maxRetries - 1) throw error;
 *       await sleep(Math.pow(2, i) * 100); // 100ms, 200ms, 400ms
 *     }
 *   }
 * }
 * 
 * PATTERN 4: Circuit breaker
 * WHY: If service is down, don't keep hammering it - wait before retrying
 * Implemented in server/src/utils/circuit-breaker.ts
 * 
 * WHEN TO USE EACH PATTERN:
 * - Database error: FAIL-FAST (return 500, user knows it failed)
 * - Image generation: GRACEFUL DEGRADATION (show default, not error)
 * - Payment processor: RETRY WITH BACKOFF (might be temporary)
 * - Third-party API down: CIRCUIT BREAKER (stop trying for N seconds)
 */
```

---

## WORK UNIT 8: Third-Party Integration Documentation

**Files:** `src/integrations/supabase/`, `server/src/lib/supabase.ts`  
**Type:** External service contracts - integration points  
**Audience:** AI debugging integration issues

### Integration Pattern Documentation

```typescript
/**
 * SUPABASE INTEGRATION
 * 
 * WHAT IS SUPABASE:
 * - PostgreSQL database hosted on AWS
 * - Provides: Database, Authentication, RLS (Row-Level Security), Real-time
 * - We use: Database (primary), RLS (data isolation)
 * 
 * CONNECTION:
 * - URL: process.env.SUPABASE_URL (project URL)
 * - Key: process.env.SUPABASE_ANON_KEY (public read-only key, safe for client)
 * - Role: Service key for admin operations (backend only)
 * 
 * USAGE PATTERNS:
 * 
 * 1. CLIENT-SIDE (Browser):
 *    const { data } = await supabase
 *      .from('characters')
 *      .select('*')
 *      .eq('id', characterId);
 *    // RLS automatically filters: only returns if authenticated user owns character
 * 
 * 2. SERVER-SIDE (Node.js):
 *    const { data } = await supabaseService
 *      .from('characters')
 *      .select('*')
 *      .eq('id', characterId);
 *    // No RLS (server has full access), must manually verify user owns character
 * 
 * KEY DIFFERENCE:
 * - Client: RLS enforces data isolation (safe)
 * - Server: Must verify ownership manually (developer's job)
 * 
 * COMMON BUGS:
 * - Forgetting .eq('user_id', userId) on server (returns other users' data!)
 * - Using public key instead of service key on server (slow, limited)
 * - Assuming RLS works on server (it doesn't - RLS only for client)
 * 
 * IF SUPABASE IS DOWN:
 * - Frontend can't fetch data (user sees loading spinner forever)
 * - Backend returns 503 Service Unavailable
 * - Should be alerted (monitor response times)
 * 
 * DATA BACKUP:
 * - Database backups: Automatic daily (configured in Supabase dashboard)
 * - If data deleted: Contact Supabase support (within 30 days recoverable)
 * - RLS policies backed up: Stored in migrations/
 */
```

### Payment Integration Documentation

```typescript
/**
 * STRIPE INTEGRATION
 * 
 * WHAT IS STRIPE:
 * - Payment processor (credit card payments)
 * - Handles: Card validation, fraud detection, charging, refunds
 * - PCI compliant (we never touch card data)
 * 
 * FLOW:
 * 1. Frontend: User fills card on Stripe form (handled by Stripe.js)
 * 2. Stripe: Validates card, creates token (never sent to our server)
 * 3. Frontend: Sends token to backend (/api/upgrade endpoint)
 * 4. Backend: Calls stripe.charges.create(amount, token)
 * 5. Stripe: Charges card, confirms
 * 6. Backend: Updates user subscription in database
 * 7. Frontend: User sees "upgrade successful", features unlocked
 * 
 * WEBHOOK FLOW:
 * - Stripe sends webhook: "charge.succeeded" event
 * - Backend receives, verifies signature (ensures it's from Stripe, not attacker)
 * - Backend updates user tier
 * - Note: Webhook can arrive AFTER customer already using Pro features
 * - Note: Webhook can arrive BEFORE frontend receives success (async)
 * 
 * ERROR SCENARIOS:
 * - Declined card: Stripe returns error, user sees "Try different card"
 * - Network error during charge: Unknown if charged or not (must retry idempotently)
 * - Webhook fails: Charge succeeds but user tier not updated (monitor webhooks)
 * 
 * IDEMPOTENCY:
 * - If charge request times out, must retry with same request ID
 * - Stripe uses request ID to prevent duplicate charges
 * - If you lose request ID, Stripe might charge twice
 * - Solution: Always generate and store request ID before charging
 * 
 * TESTING:
 * - Test cards: Stripe provides test card numbers (4242 4242 4242 4242)
 * - Test declining: Use 4000 0000 0000 0002
 * - Test 3D secure: Use 4000 0000 0000 3220
 * - Never test with real cards (wasteful, maybe fraud)
 * 
 * IF STRIPE IS DOWN:
 * - Can't process new upgrades (show maintenance message)
 * - Existing Pro users unaffected (subscription in database)
 * - Webhook backlog: Stripe retries for 72 hours
 * - If webhook lost: Must manually update user tier
 */
```

---

## WORK UNIT 9: Debugging Guide & Observability

**File:** Create new file `docs/DEBUGGING_GUIDE_FOR_AI.md`  
**Type:** Troubleshooting reference  
**Audience:** AI coders debugging issues

### Required Content

**Common Issues & Solutions:**

```markdown
# DEBUGGING GUIDE FOR AI CODERS

## Problem: Character save silently fails

**Symptoms:**
- User clicks "Save", spinner shows, then nothing
- No error message
- Character not in database

**Diagnostics:**
1. Check browser console (F12): Any errors? Network request failed?
2. Check server logs: Is save endpoint even called? Did it return 200 or error?
3. Check database: Did character record get inserted?

**Solutions (in order):**
1. Is user authenticated? If no token, request returns 401 silently
2. Is user in campaign? If campaign_id invalid, FK constraint fails
3. Database connection down? Check Supabase dashboard
4. Quota exceeded? Free user hitting 5 character limit gets 402

**Code to check:**
- src/hooks/use-character-save.ts (frontend save logic)
- server/src/routes/v1/ai.ts POST /characters endpoint
- RLS policy on characters table (might reject save)

---

## Problem: Payment not processing

**Symptoms:**
- User submits payment, sees "Processing..."
- Screen freezes or shows generic error

**Diagnostics:**
1. Check Stripe dashboard: Did charge attempt appear?
2. Check server logs: Error message from Stripe?
3. Check webhook logs: Did Stripe send confirmation?

**Solutions:**
1. Card declined: Check Stripe decline reason
2. Network timeout: Retry with same request ID (Stripe is idempotent)
3. Webhook missed: Manually update user tier in database (temporary)

---

## Problem: User sees other users' characters

**Symptoms:**
- User logged in as Alice, sees Bob's characters in list
- CRITICAL SECURITY BUG

**Root causes (most likely):**
1. RLS policy missing from characters table
2. RLS policy written incorrectly (missing user_id check)
3. Frontend fetching with wrong query (not filtering by current user)
4. Backend GET endpoint not verifying user owns character

**Immediate fix:**
1. Stop the app (prevent data leakage)
2. Check RLS policy:
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'characters';
   ```
3. If policy missing, run migration to add it
4. If policy wrong, fix in migration then revert+re-run

**Code review:**
- Verify SELECT queries have: WHERE user_id = authenticated_user_id
- Verify GET endpoints: Check character.user_id === req.user.userId

---

## Problem: Rate limiting blocking legitimate requests

**Symptoms:**
- User gets 429 Too Many Requests
- User didn't do anything unusual

**Diagnostics:**
1. Is user making rapid requests (double-click button)?
2. Is browser auto-retrying failed requests?
3. Is rate limit threshold too low?

**Solutions:**
1. Add debounce to button (prevent double-click submits)
2. Check circuit breaker: Is external service down, causing retries?
3. Increase rate limit threshold (trade-off: less protection against abuse)

**Code to check:**
- Rate limit middleware in server/src/middleware/rate-limit.ts
- Button debounce in UI components
- Retry logic in fetch interceptor
```

---

## WORK UNIT 10: Pre-Deploy Validation Checklist

**File:** Create new file `docs/DEPLOY_CHECKLIST.md`  
**Type:** Deployment validation  
**Audience:** AI (or human) deploying code to production

### Required Content

```markdown
# PRE-DEPLOY CHECKLIST

**Before deploying to production, verify ALL of the following:**

## Security Checks
- [ ] No API keys/secrets hardcoded in code
  ```bash
  rg "(API_KEY|SECRET|PASSWORD)" src/ server/ --no-binary
  ```
  Should return: 0 results (only env vars like process.env.SECRET)

- [ ] RLS policies enabled on all tables
  ```sql
  SELECT tablename, policyname FROM pg_policies 
  WHERE tablename IN ('characters', 'campaigns', 'campaign_members')
  ORDER BY tablename;
  ```
  Should return: 3+ rows per table

- [ ] JWT token verification working
  - Test: Valid token → 200 OK
  - Test: Invalid token → 401 Unauthorized
  - Test: Expired token → 401 Unauthorized

- [ ] CORS configured correctly (only allow your domains)
  - Test: Request from allowed domain → 200 OK
  - Test: Request from random domain → Blocked

## Data Integrity Checks
- [ ] No orphaned records (character with deleted user_id)
  ```sql
  SELECT COUNT(*) FROM characters WHERE user_id NOT IN (SELECT id FROM auth.users);
  ```
  Should return: 0

- [ ] Campaign membership is consistent
  ```sql
  SELECT COUNT(*) FROM characters WHERE campaign_id NOT IN (SELECT id FROM campaigns);
  ```
  Should return: 0

## Performance Checks
- [ ] Character list loads in <1 second
  - User with 100 characters
  - GET /v1/characters
  - Response time: Should be <1s

- [ ] Payment processing completes in <5 seconds
  - Test upgrade purchase
  - Should complete without timeout

## Functionality Checks
- [ ] Character creation wizard works end-to-end
  - Create character with all fields
  - Save character
  - Reload page
  - Character still there

- [ ] Payment processing works
  - Test with Stripe test card: 4242 4242 4242 4242
  - User tier updates
  - Pro features unlocked

- [ ] Campaign collaboration works
  - User A creates campaign, User B joins
  - Both see same campaign
  - Both can create characters in campaign

## Monitoring Checks
- [ ] Error logging configured
  - Check: logger.error() calls are working
  - Errors appear in monitoring dashboard

- [ ] Performance monitoring configured
  - API response times tracked
  - Slow queries identified

- [ ] Webhook logging configured
  - Stripe webhooks logged
  - Can verify if webhooks received

## Final Approval
- [ ] Code reviewed (another human or AI)
- [ ] All tests passing (npm run test)
- [ ] No linting errors (npm run lint)
- [ ] All checklist items above verified
- [ ] Deployment plan documented (if rollback needed)

**If ANY item is unchecked, DO NOT DEPLOY.**

**Deployment command:**
```bash
git push origin main --force  # Only if absolutely necessary
# Better: git push origin feature-branch && create PR for review
```

**After deployment:**
- [ ] Monitor error logs for 10 minutes
- [ ] Spot-check a few users' characters (verify data integrity)
- [ ] Verify payments are processing (check Stripe dashboard)
- [ ] Test character creation wizard on live site
```

---

## WORK UNIT 11: Test Documentation & Patterns

**File:** Create new file `docs/TESTING_GUIDE_FOR_AI.md`  
**Type:** Testing reference  
**Audience:** AI coders writing tests

### Required Content

```markdown
# TESTING GUIDE FOR AI CODERS

## Test Organization

**By type:**
- Unit tests: Single function/component in isolation
- Integration tests: Multiple parts working together
- E2E tests: Full user workflows

**Our structure:**
- Unit tests: Keep alongside component files or in __tests__/unit/
- Integration tests: In __tests__/integration/
- E2E tests: In e2e/

## Writing Character-Related Tests

**Template: Unit test for character save function**
```typescript
describe('saveCharacter', () => {
  it('should save character with all required fields', async () => {
    // Setup
    const character = {
      name: 'Aragorn',
      race: { id: 'human', name: 'Human' },
      class: { id: 'fighter', name: 'Fighter' }
    };

    // Execute
    const saved = await saveCharacter(character);

    // Assert: Character saved with correct data
    expect(saved.id).toBeDefined();
    expect(saved.name).toBe('Aragorn');
    expect(saved.race.id).toBe('human');
  });

  it('should reject character without name', async () => {
    const character = {
      name: '',  // Empty name invalid
      race: { id: 'human' },
      class: { id: 'fighter' }
    };

    // Assert: Should throw or return error
    await expect(saveCharacter(character)).rejects.toThrow('name is required');
  });
});
```

**Template: Integration test for full workflow**
```typescript
describe('Character creation workflow', () => {
  it('should create character from UI through database', async () => {
    // Setup: Mock user login
    const user = { id: 'user_123', email: 'test@example.com' };
    
    // Execute: Full wizard flow
    await createCharacter(user, {
      name: 'Legolas',
      race: 'elf',
      class: 'ranger'
    });

    // Verify: Character in database
    const saved = await getCharacterById(user.id, 'legolas_id');
    expect(saved).toBeDefined();
    
    // Verify: User can load character
    const characters = await listUserCharacters(user.id);
    expect(characters).toContainEqual(expect.objectContaining({ name: 'Legolas' }));
  });
});
```

## Mocking Strategy

**Mock Supabase for unit tests:**
```typescript
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn().mockResolvedValue({ data: [], error: null })
      }))
    }))
  }))
}));
```

**Use real Supabase for integration tests** (or detailed mock).

## What to Test

**Critical paths (MUST TEST):**
- [ ] Character save with valid data → Success
- [ ] Character save with missing required field → Error
- [ ] User quota enforcement → Free user max 5 characters
- [ ] User authentication → Invalid token rejected
- [ ] Data isolation → User can't see other users' characters

**Good to test:**
- [ ] Edge cases (very long name, special characters)
- [ ] Concurrent operations (two saves at same time)
- [ ] Error recovery (retry after transient failure)

**Lower priority:**
- [ ] UI animation timing
- [ ] Button hover states
- [ ] Perfect pixel alignment

## Running Tests

```bash
# All tests
npm run server:test

# Specific file
npm run server:test -- server/tests/payment.test.ts

# With coverage
npm run server:test -- --coverage

# Watch mode (re-run on file change)
npm run server:test -- --watch
```
```

---

## WORK UNIT 12: Data Validation Rules Documentation

**Files:** Update all validation functions with comments  
**Type:** Business rule enforcement  
**Audience:** AI implementing new features with validation

### Required Documentation for Each Validation

```typescript
/**
 * VALIDATE CHARACTER NAME
 * 
 * BUSINESS RULE:
 * - Name is required (player must name their character for immersion)
 * - Must be 1-50 characters (balance between flexibility and UI fit)
 * - Can contain spaces and common punctuation
 * 
 * WHY THESE LIMITS:
 * - Min 1: Empty name breaks character sheet display
 * - Max 50: UI character card truncates at 50 chars, looks ugly over
 * - Allowed chars: A-Z, a-z, spaces, hyphen, apostrophe (common in fantasy names)
 * 
 * DISALLOWED CHARS:
 * - SQL injection: '; DROP TABLE--  (sanitize with parameterized queries)
 * - XSS: <script>alert('xss')</script>  (escape when rendering)
 * - Control chars: \n, \t  (confuse UI display)
 * 
 * VALIDATION:
 * 1. Check: Not empty
 * 2. Check: Not whitespace only
 * 3. Check: Length between 1-50
 * 4. Check: Only allowed characters
 * 
 * IF VALIDATION FAILS:
 * - Return error with clear message: "Character name must be 1-50 characters"
 * - Show hint: "Spaces, hyphens, and apostrophes allowed"
 * - Do NOT reject on database - reject in UI/validation layer
 * 
 * TESTING:
 * - Valid: "Aragorn", "Gandalf the Grey", "R'ghn'llk", "X-Force"
 * - Invalid: "", "   ", "A"*51, "<XSS>", "'; DROP--", "\n\t"
 */
export function validateCharacterName(name: string): ValidationResult {
  if (!name || !name.trim()) {
    return { valid: false, error: 'Name is required' };
  }
  
  if (name.length > 50) {
    return { valid: false, error: 'Name must be 50 characters or less' };
  }
  
  if (!/^[a-zA-Z\s\-']+$/.test(name)) {
    return { valid: false, error: 'Name can only contain letters, spaces, hyphens, and apostrophes' };
  }
  
  return { valid: true };
}
```

---

## WORK UNIT 13: Architecture Document

**File:** Create `docs/ARCHITECTURE_FOR_AI.md`  
**Type:** System overview  
**Audience:** AI coders understanding system design

### Required Sections

```markdown
# SYSTEM ARCHITECTURE FOR AI CODERS

## High-Level Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     FRONTEND (React)                        │
│  Browser runs React app, user creates/edits characters      │
│  Uses JWT token for authentication                           │
└─────────────────────────────────────────────────────────────┘
                              │
                         HTTP/REST
                              │
┌─────────────────────────────────────────────────────────────┐
│                  BACKEND (Node.js + Express)                │
│  - Handles API requests (/v1/characters, /v1/campaigns, etc)│
│  - Verifies authentication & authorization                  │
│  - Enforces business rules (quotas, validation)             │
│  - Calls external services (Stripe, LLM, etc)              │
└─────────────────────────────────────────────────────────────┘
       │                    │                      │
   Supabase            Stripe                 LLM Services
   (Database)       (Payments)            (Image Gen, etc)
```

## Data Flow: Character Save

```
1. User clicks "Save Character" button
2. Frontend validates character data locally
3. POST /v1/characters with JWT token
4. Backend receives request:
   - Verifies JWT token (is user authenticated?)
   - Extracts user_id from token
   - Validates character data (required fields, constraints)
   - Checks quota (free user: max 5, pro: unlimited)
   - Saves to Supabase database
   - Returns 201 Created with saved character
5. Frontend receives response:
   - If 201: Show success, redirect to character sheet
   - If 402: Show "Upgrade to Pro" message
   - If 400: Show validation error message
   - If 401: Show login modal
   - If 500: Show "Something went wrong" message
6. Character appears in character list
```

## Monetization Model

```
FREE TIER:
- Max 5 characters total
- Max 1 campaign
- Basic attributes (name, race, class)
- No physical attributes

PRO TIER:
- Unlimited characters
- Unlimited campaigns
- All attributes
- Priority support
- Cost: $9.99/month
- Payment: Stripe credit card

ENFORCEMENT:
- Quota checked on character CREATE
- Campaign limit checked on campaign CREATE
- Feature gates checked when accessing features
```

## Security Model

```
AUTHENTICATION:
- User logs in with email/password
- Backend generates JWT token (24hr expiry)
- Frontend stores JWT in localStorage
- Every request includes: Authorization: Bearer <JWT>

AUTHORIZATION:
- JWT verified on every API call
- User_id extracted from token
- RLS policies on database enforce: users can only see their own data
- Backend manually verifies ownership for sensitive operations

DATA ISOLATION:
- User A cannot see User B's characters (RLS policy)
- User A cannot see other campaigns (RLS policy)
- User A cannot modify User B's character (backend verification)
- Campaign members can see campaign's characters (RLS policy)
```

## Known Limitations & TODOs

```
BEFORE PRODUCTION:
- [ ] Add refresh token (current JWT expires in 24hr)
- [ ] Add session invalidation (logout doesn't revoke token)
- [ ] Add rate limiting on login endpoint (brute force protection)
- [ ] Add email verification (prevent typos)
- [ ] Add password reset flow

FUTURE FEATURES:
- [ ] Real-time collaboration (WebSocket sync)
- [ ] Character backup/export
- [ ] Character versioning (undo changes)
- [ ] Social features (friend list, sharing)
- [ ] Mobile app
```

## When Things Go Wrong

```
SUPABASE DOWN:
- Frontend: Can't fetch/save characters, users see loading spinner
- Backend: Returns 503, users see "Service unavailable"
- Action: Contact Supabase support, monitor status page

STRIPE DOWN:
- Can't process new payments
- Existing Pro users unaffected (tier stored in database)
- Action: Show maintenance message, retry after Stripe recovers

DATABASE MIGRATION FAILED:
- Rollback to previous version
- Fix migration, test thoroughly
- Re-run on replica first
- Then on production

QUANTUM ENTANGLEMENT:
- If user data is quantum-entangled with another user
- TODO: Implement quantum decoherence protocol
- For now: Manual database cleanup
```

## Performance Targets

```
API Endpoints: <500ms 99th percentile
- GET /characters: <200ms typical, <500ms worst case
- POST /characters: <300ms (includes Supabase write)
- POST /upgrade: <5s (includes Stripe call)

Frontend Performance:
- Page load: <2s with full character data
- Character creation wizard: <100ms between steps
- Save character: Show spinner immediately, complete <5s

Database Performance:
- Query user's 100 characters: <500ms
- Check quota: <100ms (cached)
- RLS policy enforcement: <50ms per query
```
```

---

## SUCCESS CRITERIA (MUST ACHIEVE ALL)

- [ ] All production code files have meaningful comments (40-50% coverage)
- [ ] Each business logic section explains WHY (revenue impact, user impact, etc)
- [ ] ARCHITECTURE_FOR_AI.md complete and clear
- [ ] All API endpoints documented with request/response examples
- [ ] All validation rules documented with allowed/disallowed values
- [ ] Error scenarios and recovery strategies documented
- [ ] Security implications flagged throughout
- [ ] Debugging guide with common issues and solutions
- [ ] Pre-deploy validation checklist created
- [ ] Test patterns documented with examples
- [ ] Third-party integrations (Supabase, Stripe) clearly explained
- [ ] Known TODOs and launch blockers flagged
- [ ] No linting errors in generated documentation

---

## QUALITY GATES - MUST PASS ALL

**Before Submitting Documentation**

**Comments clarity check:**
```bash
rg "TODO:|FIXME:|HACK:|XXX:" src/ server/ docs/
```
- Should return: 0-5 (known TODOs documented, not code smells)

**Documentation completeness:**
- Check: ARCHITECTURE_FOR_AI.md exists and >500 lines
- Check: All critical files have comment coverage (40-50%)
- Check: All JSDoc comments present for public functions

**No secrets exposed:**
```bash
rg "(API_KEY|SECRET|PASSWORD|TOKEN)" docs/
```
- Should return: 0 results (only reference structure, not actual secrets)

---

## IF BLOCKED

**Problem:** Comments feel redundant (code is self-documenting)
- Reality: Code is NOT self-documenting for AI (different from humans)
- Solution: Add WHY comments anyway - why this feature exists, not just what it does

**Problem:** Too many TODOs to document
- Reality: More TODOs = more important to document (AI needs to know what NOT to do)
- Solution: Document TODOs with rationale

**Problem:** API documentation too detailed/boring
- Reality: Boring = good for API (consistency, clarity)
- Solution: Include examples (request/response) - helps AI understand immediately

---

## DELIVERABLES CHECKLIST

**Files to create/update:**

- [ ] ARCHITECTURE_FOR_AI.md (new file)
- [ ] DEBUGGING_GUIDE_FOR_AI.md (new file)
- [ ] TESTING_GUIDE_FOR_AI.md (new file)
- [ ] DEPLOY_CHECKLIST.md (new file)
- [ ] src/contexts/CharacterContext.tsx (add comments)
- [ ] src/components/character-creation/steps/PhysicalStep.tsx (add comments)
- [ ] src/types/character.ts (add JSDoc)
- [ ] server/src/middleware/auth.ts (add security comments)
- [ ] server/src/routes/v1/* (add endpoint documentation)
- [ ] supabase/migrations/* (add comments explaining business logic)

**Verification:**
```bash
# All files linted and error-free
npm run lint

# Documentation readable and complete
grep -l "WHY\|BUSINESS\|SECURITY\|MONETIZATION" \
  src/contexts/CharacterContext.tsx \
  docs/ARCHITECTURE_FOR_AI.md \
  docs/DEBUGGING_GUIDE_FOR_AI.md
```

---

**Status:** Ready for Jules | **Est. Time:** 3-4 hours | **Reusable:** Yes (update after features added)
