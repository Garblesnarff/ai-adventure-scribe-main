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
