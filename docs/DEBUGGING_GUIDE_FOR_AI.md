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
- server/src/routes/v1/characters.ts POST /characters endpoint
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
