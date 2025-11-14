# Troubleshooting Guide

> Last Updated: 2025-11-14

## Table of Contents

1. [Quick Diagnostics](#quick-diagnostics)
2. [Development Issues](#development-issues)
3. [Database Issues](#database-issues)
4. [API Issues](#api-issues)
5. [Authentication Issues](#authentication-issues)
6. [AI Service Issues](#ai-service-issues)
7. [Performance Issues](#performance-issues)
8. [Build Issues](#build-issues)
9. [Testing Issues](#testing-issues)
10. [Deployment Issues](#deployment-issues)
11. [Getting Help](#getting-help)

---

## Quick Diagnostics

### System Health Check

Run these commands to quickly diagnose common issues:

```bash
# Check Node.js version (should be 22.x)
node --version

# Check npm version
npm --version

# Check for dependency issues
npm ls

# Test database connection
npm run db:test

# Run health check
curl http://localhost:8888/health

# Check environment variables
npm run check-env
```

### Common Symptoms

| Symptom | Likely Cause | Quick Fix |
|---------|-------------|-----------|
| Blank white screen | Build error or routing issue | Check browser console, rebuild |
| 401 Unauthorized | Authentication token expired | Logout and login again |
| 500 Internal Server Error | Backend error | Check server logs |
| Slow AI responses | Rate limiting or API issues | Check AI service status |
| Database connection error | Wrong credentials or network | Check DATABASE_URL |
| CORS error | Frontend/backend mismatch | Verify CORS configuration |

---

## Development Issues

### Issue: Dev server won't start

**Symptoms:**
```
Error: Cannot find module 'vite'
EADDRINUSE: address already in use :::5173
```

**Solutions:**

```bash
# 1. Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# 2. Kill process using port
lsof -ti:5173 | xargs kill -9

# Or use a different port
npm run dev -- --port 3000

# 3. Clear cache
rm -rf node_modules/.vite
npm run dev
```

### Issue: Hot reload not working

**Symptoms:**
- Changes not reflecting in browser
- Have to manually refresh

**Solutions:**

```bash
# 1. Check file watcher limits (Linux/Mac)
echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf
sudo sysctl -p

# 2. Restart dev server
# Press Ctrl+C and run npm run dev again

# 3. Clear browser cache
# Open DevTools → Network → Disable cache
```

### Issue: Module not found errors

**Symptoms:**
```
Cannot find module '@/components/Button'
Module not found: Error: Can't resolve 'react-router-dom'
```

**Solutions:**

```bash
# 1. Check if package is installed
npm ls react-router-dom

# 2. Install missing package
npm install react-router-dom

# 3. Check import paths
# Ensure @ alias is configured in tsconfig.json and vite.config.ts

# 4. Restart TypeScript server in VS Code
# Ctrl+Shift+P → "TypeScript: Restart TS Server"
```

### Issue: TypeScript errors after git pull

**Symptoms:**
- Red squiggly lines everywhere
- Types don't match

**Solutions:**

```bash
# 1. Reinstall dependencies (types may have changed)
npm install

# 2. Clear TypeScript cache
rm -rf node_modules/.cache

# 3. Restart IDE
# Close and reopen VS Code or your editor

# 4. Check if types need manual installation
npm install --save-dev @types/node @types/react
```

---

## Database Issues

### Issue: Connection refused

**Symptoms:**
```
Error: connect ECONNREFUSED 127.0.0.1:5432
Connection terminated unexpectedly
```

**Solutions:**

```bash
# 1. Check if Supabase project is running
# Visit your Supabase dashboard

# 2. Verify DATABASE_URL
echo $DATABASE_URL
# Should be: postgresql://postgres:[password]@[host]:5432/postgres

# 3. Check network connectivity
ping db.your-project.supabase.co

# 4. Verify firewall rules
# Ensure your IP is whitelisted in Supabase

# 5. Test connection directly
psql $DATABASE_URL
```

### Issue: Migration fails

**Symptoms:**
```
Migration failed: duplicate key value violates unique constraint
ERROR: column "new_column" already exists
```

**Solutions:**

```bash
# 1. Check migration history
npm run db:history

# 2. Rollback last migration
npm run db:rollback

# 3. Drop and recreate (DEVELOPMENT ONLY)
npm run db:reset

# 4. For production: Manual intervention needed
# Connect to database and investigate:
psql $DATABASE_URL

# Check existing columns
\d+ table_name

# Fix manually if needed, then retry migration
```

### Issue: Row Level Security (RLS) blocking queries

**Symptoms:**
```
Error: new row violates row-level security policy
Queries return empty results unexpectedly
```

**Solutions:**

```sql
-- 1. Check if RLS is enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public';

-- 2. Check RLS policies
SELECT * FROM pg_policies
WHERE tablename = 'characters';

-- 3. Verify auth context
SELECT auth.uid();  -- Should return your user ID

-- 4. Temporary bypass (DEVELOPMENT ONLY)
ALTER TABLE characters DISABLE ROW LEVEL SECURITY;

-- 5. Fix policy (example)
DROP POLICY IF EXISTS "Users can read own characters" ON characters;
CREATE POLICY "Users can read own characters"
  ON characters FOR SELECT
  USING (auth.uid() = player_id);
```

### Issue: Slow queries

**Symptoms:**
- API endpoints take > 2 seconds
- Database CPU usage high

**Solutions:**

```sql
-- 1. Find slow queries
SELECT pid, now() - pg_stat_activity.query_start AS duration, query
FROM pg_stat_activity
WHERE (now() - pg_stat_activity.query_start) > interval '2 seconds'
AND state = 'active';

-- 2. Explain query performance
EXPLAIN ANALYZE
SELECT * FROM characters WHERE player_id = 'user-123';

-- 3. Check missing indexes
SELECT schemaname, tablename, indexname
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename;

-- 4. Create missing index (example)
CREATE INDEX idx_characters_player_id ON characters(player_id);

-- 5. Vacuum and analyze
VACUUM ANALYZE;
```

---

## API Issues

### Issue: CORS errors

**Symptoms:**
```
Access to fetch at 'http://localhost:8888/api' from origin 'http://localhost:5173'
has been blocked by CORS policy
```

**Solutions:**

```typescript
// 1. Check CORS configuration in backend
// server/src/app.ts
import cors from 'cors';

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// 2. Verify environment variables
// FRONTEND_URL should match your frontend origin
console.log('Frontend URL:', process.env.FRONTEND_URL);

// 3. Check if preflight request is handled
// OPTIONS requests should return 200

// 4. For development, use wildcard (temporary)
app.use(cors({ origin: '*' }));  // ONLY FOR DEVELOPMENT
```

### Issue: 401 Unauthorized

**Symptoms:**
- API returns 401 for authenticated requests
- Token seems valid

**Solutions:**

```typescript
// 1. Check if token is being sent
// In browser DevTools → Network → Headers
// Should see: Authorization: Bearer eyJhbGc...

// 2. Verify token hasn't expired
const token = localStorage.getItem('token');
const payload = JSON.parse(atob(token.split('.')[1]));
console.log('Expires:', new Date(payload.exp * 1000));

// 3. Check auth middleware
// server/src/middleware/auth.ts
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const { data: user, error } = await supabaseService.auth.getUser(token);

    if (error || !user) {
      console.error('Auth error:', error);
      return res.status(401).json({ error: 'Invalid token' });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(401).json({ error: 'Authentication failed' });
  }
}

// 4. Refresh token if expired
// Frontend should handle token refresh
```

### Issue: Rate limiting errors

**Symptoms:**
```
429 Too Many Requests
Rate limit exceeded
```

**Solutions:**

```typescript
// 1. Check rate limit configuration
// server/src/middleware/rate-limit.ts
console.log('Rate limit config:', {
  windowMs: 60000,
  max: 100,
});

// 2. Verify user's plan
// Rate limits are plan-aware
const userPlan = await getUserPlan(userId);
console.log('User plan:', userPlan);

// 3. Check if IP is being shared (NAT)
// Multiple users behind same IP can hit limits

// 4. Implement exponential backoff on frontend
async function fetchWithRetry(url: string, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url);
      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After') || 60;
        await sleep(retryAfter * 1000);
        continue;
      }
      return response;
    } catch (error) {
      if (i === maxRetries - 1) throw error;
    }
  }
}

// 5. For development, increase limits
// Add X-Plan header (DEVELOPMENT ONLY)
headers: { 'X-Plan': 'enterprise' }
```

---

## Authentication Issues

### Issue: Unable to login

**Symptoms:**
- "Invalid credentials" error
- Form submits but nothing happens

**Solutions:**

```bash
# 1. Check if user exists in Supabase
# Go to Supabase Dashboard → Authentication → Users

# 2. Verify email confirmation
# Check if email is confirmed

# 3. Test with test account
VITE_DEV_TEST_EMAIL=test@example.com
VITE_DEV_TEST_PASSWORD=testpass123
npm run seed:test-data

# 4. Check Supabase auth configuration
# Dashboard → Authentication → Settings
# Email auth should be enabled

# 5. Check browser console for errors
# Open DevTools → Console
```

### Issue: Session expires too quickly

**Symptoms:**
- Have to login multiple times per hour
- Token expires unexpectedly

**Solutions:**

```typescript
// 1. Check token expiration settings
// In Supabase Dashboard → Authentication → Settings
// JWT Expiry: 3600 (1 hour default)

// 2. Implement token refresh
import { supabaseClient } from './lib/supabase';

supabaseClient.auth.onAuthStateChange((event, session) => {
  if (event === 'TOKEN_REFRESHED') {
    console.log('Token refreshed');
  }
});

// 3. Manually refresh token before expiry
const { data, error } = await supabaseClient.auth.refreshSession();

// 4. Check if localStorage is being cleared
// Some browser extensions clear localStorage
```

### Issue: "User already registered" error

**Symptoms:**
- Can't create account with email
- Email shows as taken but can't login

**Solutions:**

```sql
-- 1. Check auth.users table in Supabase
SELECT id, email, confirmed_at, deleted_at
FROM auth.users
WHERE email = 'user@example.com';

-- 2. If user exists but deleted
-- Contact Supabase support to recover

-- 3. If email not confirmed
-- Resend confirmation email via Supabase dashboard

-- 4. For development, use different email
-- Or delete test users via dashboard
```

---

## AI Service Issues

### Issue: AI responses are slow or timeout

**Symptoms:**
- Waiting > 30 seconds for response
- "Request timeout" error

**Solutions:**

```typescript
// 1. Check AI service status
// Google Gemini: https://status.cloud.google.com/
// OpenAI: https://status.openai.com/
// Anthropic: https://status.anthropic.com/

// 2. Verify API keys are valid
const response = await fetch('https://generativelanguage.googleapis.com/v1/models', {
  headers: { 'x-goog-api-key': process.env.VITE_GEMINI_API_KEY },
});
console.log('API status:', response.status);

// 3. Check rate limits
console.log(AIService.getApiStats());
// Shows: requests, failures, rate limit status

// 4. Enable fallback chain
// AI automatically falls back: Gemini → OpenAI → Anthropic

// 5. Reduce context window
// Sending too much history can slow responses
const context = conversationHistory.slice(-10);  // Last 10 messages only

// 6. Increase timeout
const response = await fetch(aiEndpoint, {
  signal: AbortSignal.timeout(60000),  // 60 seconds
});
```

### Issue: AI returns errors or gibberish

**Symptoms:**
```
Error: Invalid response from AI
AI response is not JSON
Response doesn't match expected format
```

**Solutions:**

```typescript
// 1. Check prompt formatting
console.log('Prompt:', prompt);
// Ensure prompt is clear and well-structured

// 2. Verify response parsing
try {
  const parsed = JSON.parse(aiResponse);
  console.log('Parsed:', parsed);
} catch (error) {
  console.error('Parse error:', error);
  console.log('Raw response:', aiResponse);
}

// 3. Add retry logic
async function generateWithRetry(prompt: string, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await aiService.generate(prompt);
      if (isValidResponse(response)) {
        return response;
      }
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await sleep(1000 * (i + 1));  // Exponential backoff
    }
  }
}

// 4. Check AI model version
// Older models may not support newer features
console.log('Model:', process.env.GEMINI_MODEL || 'gemini-pro');

// 5. Simplify prompt
// Remove complex instructions and test with simple prompt
const simplePrompt = "Say 'Hello world'";
```

### Issue: AI key rotation not working

**Symptoms:**
- Using only first API key
- Exhausting rate limits on one key

**Solutions:**

```typescript
// 1. Verify multiple keys are configured
console.log('API keys:', process.env.VITE_GEMINI_API_KEYS?.split(',').length);

// 2. Check rotation logic
// src/services/ai/key-rotation.ts
const keys = apiKeys.split(',').filter(k => k.trim());
console.log('Available keys:', keys.length);

// 3. Test each key individually
for (const key of keys) {
  const result = await testApiKey(key);
  console.log(`Key ${key.slice(0, 10)}... status:`, result);
}

// 4. Clear failed key cache
// Failed keys are temporarily disabled
localStorage.removeItem('failedApiKeys');
```

---

## Performance Issues

### Issue: Slow page load times

**Symptoms:**
- Initial page load > 5 seconds
- Lighthouse score < 70

**Solutions:**

```bash
# 1. Run Lighthouse audit
npm run lighthouse

# 2. Check bundle size
npm run build -- --report
# Opens bundle visualizer

# 3. Enable compression
# Should already be enabled in vite.config.ts
# Verify with: curl -H "Accept-Encoding: gzip" https://yoursite.com

# 4. Optimize images
# Convert to WebP format
# Use appropriate sizes (srcset)

# 5. Lazy load heavy components
import { lazy } from 'react';
const GameSession = lazy(() => import('./pages/GameSession'));

# 6. Check CDN caching
# Verify Cache-Control headers
curl -I https://yoursite.com
```

### Issue: High memory usage

**Symptoms:**
- Browser tab crashes
- "Out of memory" errors
- Memory usage > 1GB

**Solutions:**

```typescript
// 1. Check for memory leaks
// Use Chrome DevTools → Memory → Take heap snapshot

// 2. Clean up useEffect hooks
useEffect(() => {
  const subscription = data$.subscribe();

  return () => {
    subscription.unsubscribe();  // Important!
  };
}, []);

// 3. Limit conversation history
const MAX_MESSAGES = 100;
const messages = allMessages.slice(-MAX_MESSAGES);

// 4. Clear IndexedDB periodically
import { clearOldData } from './lib/indexeddb';
useEffect(() => {
  clearOldData(90);  // Clear data older than 90 days
}, []);

// 5. Optimize re-renders
// Use React.memo for expensive components
const ExpensiveComponent = React.memo(({ data }) => {
  // Component code
});

// 6. Use virtual scrolling for long lists
import { VirtualList } from 'react-window';
```

### Issue: Slow database queries

**Symptoms:**
- API endpoints take > 2 seconds
- Database CPU at 100%

**Solutions:**

```sql
-- 1. Find slow queries (see Database Issues section)

-- 2. Add strategic indexes
CREATE INDEX CONCURRENTLY idx_characters_player_id
ON characters(player_id);

-- 3. Use query optimization
-- Before: N+1 query problem
SELECT * FROM characters WHERE player_id = 'user-123';
-- Then for each character:
SELECT * FROM character_spells WHERE character_id = 'char-456';

-- After: Single JOIN query
SELECT c.*, cs.spell_id, s.name
FROM characters c
LEFT JOIN character_spells cs ON cs.character_id = c.id
LEFT JOIN spells s ON s.id = cs.spell_id
WHERE c.player_id = 'user-123';

-- 4. Enable query caching
-- Use TanStack Query with appropriate staleTime

-- 5. Analyze and vacuum
ANALYZE characters;
VACUUM ANALYZE;
```

---

## Build Issues

### Issue: Build fails with TypeScript errors

**Symptoms:**
```
error TS2322: Type 'string' is not assignable to type 'number'
Build failed with 47 errors
```

**Solutions:**

```bash
# 1. Check for type errors
npm run type-check

# 2. Fix errors one by one
# Start with most common issues:
# - Missing type annotations
# - Incorrect type assertions
# - Any types that should be specific

# 3. Update type definitions
npm install --save-dev @types/node @types/react

# 4. Check tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true
  }
}

# 5. Temporarily skip type checking (NOT RECOMMENDED)
# Only for emergency deploys
tsc --noEmit false
```

### Issue: Build succeeds but app doesn't work

**Symptoms:**
- Production build shows blank screen
- Console errors in production
- Works fine in development

**Solutions:**

```bash
# 1. Test production build locally
npm run build
npm run preview

# 2. Check environment variables
# Ensure VITE_ prefix for frontend variables
# Verify they're set in deployment platform

# 3. Enable source maps temporarily
# vite.config.ts
build: {
  sourcemap: true  # Helps debug production issues
}

# 4. Check console for errors
# Open browser DevTools in production

# 5. Verify asset paths
# Ensure correct base path in vite.config.ts
base: '/your-subdirectory/' # If not at root
```

---

## Testing Issues

### Issue: Tests failing locally

**Symptoms:**
```
FAIL  src/components/CharacterCard.test.tsx
Expected: 200, Received: 404
```

**Solutions:**

```bash
# 1. Run tests in watch mode to debug
npm run test:watch

# 2. Check test isolation
# Each test should set up its own data
beforeEach(async () => {
  await setupTestData();
});

afterEach(async () => {
  await cleanupTestData();
});

# 3. Check for timing issues
# Use waitFor for async operations
await waitFor(() => {
  expect(screen.getByText('Success')).toBeInTheDocument();
});

# 4. Mock external services
vi.mock('../services/ai', () => ({
  generateResponse: vi.fn().mockResolvedValue('Mock response'),
}));

# 5. Clear test database
npm run db:test:reset
```

### Issue: Tests pass locally but fail in CI

**Symptoms:**
- Green locally, red in GitHub Actions
- Timing-related failures

**Solutions:**

```yaml
# 1. Increase timeouts in CI
# vitest.config.ts
export default defineConfig({
  test: {
    testTimeout: 10000,  // 10 seconds instead of 5
  },
});

# 2. Check for environment differences
# - Different Node.js version
# - Different timezone
# - Different environment variables

# 3. Run tests serially in CI
npm test -- --no-threads

# 4. Add CI-specific debugging
if (process.env.CI) {
  console.log('Debug info:', debugData);
}

# 5. Check GitHub Actions logs
# Download artifacts to see full logs
```

---

## Deployment Issues

### Issue: Deployment fails

**Symptoms:**
```
Build failed
Deployment timed out
Health check failed
```

**Solutions:**

```bash
# 1. Check build logs in deployment platform
# Look for specific error messages

# 2. Verify environment variables
# All required variables must be set

# 3. Test build locally
npm run build
npm run server:build

# 4. Check resource limits
# Ensure enough memory/CPU allocated

# 5. Verify deployment configuration
# Check Procfile, package.json scripts, etc.

# Example Procfile
web: npm run server:start
```

### Issue: Health check failing

**Symptoms:**
```
Health check failed on /health
Service marked as unhealthy
```

**Solutions:**

```typescript
// 1. Test health endpoint locally
curl http://localhost:8888/health

// 2. Check health check configuration
// Ensure it's checking correct endpoint
// Health check path: /health
// Expected status: 200
// Timeout: 30 seconds

// 3. Verify dependencies in health check
// server/src/routes/health.ts
router.get('/health', async (req, res) => {
  try {
    // Check database
    await supabaseService.from('characters').select('id').limit(1);

    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: 'connected',
    });
  } catch (error) {
    res.status(503).json({
      status: 'error',
      error: 'Database connection failed',
    });
  }
});

// 4. Increase health check timeout
// Some platforms default to 5 seconds, increase to 30
```

---

## Getting Help

### Before Asking for Help

1. **Check this troubleshooting guide** first
2. **Search existing issues** on GitHub
3. **Check logs** for error messages:
   ```bash
   # Backend logs
   pm2 logs infiniterealms-api

   # Database logs
   # Supabase Dashboard → Logs

   # Browser console
   # Open DevTools → Console
   ```
4. **Reproduce the issue** in a minimal environment
5. **Document steps to reproduce**

### Where to Get Help

**Documentation:**
- [README.md](/home/user/ai-adventure-scribe-main/README.md) - Project overview
- [ARCHITECTURE.md](/home/user/ai-adventure-scribe-main/ARCHITECTURE.md) - System design
- [DEVELOPMENT.md](/home/user/ai-adventure-scribe-main/DEVELOPMENT.md) - Dev setup
- [TESTING.md](/home/user/ai-adventure-scribe-main/TESTING.md) - Testing guide
- [DEPLOYMENT.md](/home/user/ai-adventure-scribe-main/DEPLOYMENT.md) - Deployment guide

**Community:**
- GitHub Issues - Bug reports and feature requests
- GitHub Discussions - Questions and community help
- Discord (if available) - Real-time chat support

**Commercial Support:**
- Premium support available for Pro/Enterprise users
- Email: support@infiniterealms.com

### How to Report an Issue

When reporting an issue, include:

1. **Environment details:**
   ```
   - OS: macOS 14.0
   - Node.js: 22.5.1
   - Browser: Chrome 120
   - Package version: 1.2.3
   ```

2. **Steps to reproduce:**
   ```
   1. Go to character creation
   2. Select "Dwarf" race
   3. Select "Fighter" class
   4. Click "Next"
   5. Error appears
   ```

3. **Expected behavior:**
   ```
   Should advance to ability scores step
   ```

4. **Actual behavior:**
   ```
   Shows "Failed to load classes" error
   ```

5. **Error logs:**
   ```
   Console error:
   TypeError: Cannot read property 'name' of undefined
   at CharacterCreation.tsx:45

   Network error:
   GET /api/v1/classes → 500 Internal Server Error

   Server log:
   [ERROR] Database connection failed: timeout
   ```

6. **Screenshots** (if applicable)

---

## Common Error Messages

### "Cannot find module"

**Cause:** Missing dependency or incorrect import path

**Fix:**
```bash
npm install
# Or install specific package
npm install missing-package
```

### "EADDRINUSE"

**Cause:** Port already in use

**Fix:**
```bash
# Find and kill process
lsof -ti:8888 | xargs kill -9
# Or use different port
PORT=9000 npm run server:start
```

### "CORS policy error"

**Cause:** Backend not configured for frontend origin

**Fix:** See [API Issues - CORS errors](#issue-cors-errors)

### "Invalid token" or "401 Unauthorized"

**Cause:** Expired or missing authentication token

**Fix:** See [Authentication Issues](#authentication-issues)

### "Rate limit exceeded"

**Cause:** Too many requests from same IP/user

**Fix:** See [API Issues - Rate limiting errors](#issue-rate-limiting-errors)

### "Database connection failed"

**Cause:** Wrong credentials or network issue

**Fix:** See [Database Issues](#database-issues)

---

**Document Version:** 1.0
**Last Updated:** 2025-11-14
**Maintained By:** Development Team
