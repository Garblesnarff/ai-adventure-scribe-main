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
