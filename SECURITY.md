# Security Guidelines

This document outlines security best practices and requirements for the AI Adventure Scribe application.

## Table of Contents

1. [Security Checklist for New Endpoints](#security-checklist-for-new-endpoints)
2. [Authentication & Authorization](#authentication--authorization)
3. [Input Validation](#input-validation)
4. [Rate Limiting](#rate-limiting)
5. [Error Handling](#error-handling)
6. [XSS Prevention](#xss-prevention)
7. [Environment Variables](#environment-variables)
8. [Database Security](#database-security)
9. [API Security](#api-security)
10. [Testing](#testing)

---

## Security Checklist for New Endpoints

Before deploying any new endpoint, verify:

- [ ] **Authentication**: Does this endpoint require authentication?
  - If yes: Add `router.use(requireAuth)` or `requireAuth` middleware
  - If no: Document why in code comments with `// SECURITY: Public endpoint because...`

- [ ] **Authorization**: Does this endpoint access user-specific resources?
  - If yes: Verify ownership using database JOINs (see patterns below)
  - Never trust client-provided IDs without verification

- [ ] **Rate Limiting**: Add appropriate rate limiting
  - Protected endpoints: `planRateLimit('default')` or `planRateLimit('llm')`
  - Public endpoints: Custom rate limiter with appropriate limits
  - SEO endpoints: `max: 30 per minute` (bots crawl infrequently)
  - Blog endpoints: `max: 100 per minute` (legitimate readers)
  - Error/metric endpoints: Aggressive limits (20-50 per minute)

- [ ] **Input Validation**: Validate all inputs
  - Numeric inputs: Use bounded `parseInt` with `Math.min/Math.max`
  - String inputs: Validate length, format, and characters
  - Arrays: Validate length and element types
  - Objects: Validate structure and required fields

- [ ] **Error Handling**: Use generic error messages
  - Client: Generic messages only (`"Failed to fetch resource"`)
  - Server: Detailed logging with `console.error`
  - Never expose stack traces in production

- [ ] **SQL Injection**: Use parameterized queries
  - Always use Supabase query builder (auto-parameterized)
  - Never concatenate user input into queries

- [ ] **XSS Prevention**: Sanitize user-generated content
  - Input: Validate and sanitize before storage
  - Output: Sanitize before rendering (especially with `dangerouslySetInnerHTML`)

---

## Authentication & Authorization

### ✅ DO: Require Authentication on Protected Endpoints

```typescript
import { requireAuth } from '../../middleware/auth.js';
import { planRateLimit } from '../../middleware/rate-limit.js';

export default function protectedRouter() {
  const router = Router();

  // SECURITY: Require authentication for all routes
  router.use(requireAuth);
  router.use(planRateLimit('default'));

  // Routes here...

  return router;
}
```

### ✅ DO: Verify Resource Ownership

```typescript
// GOOD: Verify ownership using database JOIN
router.get('/:id', async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const { id } = req.params;

  const { data, error } = await supabaseService
    .from('resources')
    .select('*')
    .eq('id', id)
    .eq('user_id', userId)  // Verify ownership
    .single();

  if (error || !data) {
    return res.status(404).json({ error: 'Resource not found' });
  }

  return res.json(data);
});
```

### ❌ DON'T: Trust Client-Provided IDs Without Verification

```typescript
// BAD: No ownership verification
router.get('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;

  const { data } = await supabaseService
    .from('resources')
    .select('*')
    .eq('id', id)  // VULNERABLE: Any user can access any resource
    .single();

  return res.json(data);
});
```

### ✅ DO: Verify Ownership for Related Resources

```typescript
// GOOD: Verify ownership through relationship
router.post('/campaigns/:campaignId/sessions', async (req, res) => {
  const userId = req.user!.userId;
  const { campaignId } = req.params;

  // Verify campaign ownership before creating session
  const { data: campaign } = await supabaseService
    .from('campaigns')
    .select('id')
    .eq('id', campaignId)
    .eq('user_id', userId)
    .single();

  if (!campaign) {
    return res.status(404).json({ error: 'Campaign not found' });
  }

  // Now safe to create session...
});
```

### Plan Tier Testing

```typescript
// SECURITY: X-Plan header only allowed in test/dev environments
// This prevents production users from bypassing plan restrictions
const isTestOrDev = process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'development';

if (isTestOrDev) {
  const headerPlan = req.headers['x-plan'] as string | undefined;
  if (headerPlan) {
    return headerPlan.toLowerCase();
  }
}
```

---

## Input Validation

### ✅ DO: Bound Numeric Inputs

```typescript
// GOOD: Bounded parseInt prevents resource exhaustion
router.get('/spells', async (req, res) => {
  const level = req.query.level as string;

  // Spell levels are 0-9 in D&D 5e
  const levelNum = Math.max(0, Math.min(parseInt(level) || 0, 9));

  const { data } = await supabaseService
    .from('spells')
    .select('*')
    .eq('level', levelNum);

  return res.json(data);
});
```

### ❌ DON'T: Use Unbounded parseInt

```typescript
// BAD: Unbounded parseInt can cause issues
const level = parseInt(req.query.level as string);  // Could be NaN, negative, or huge number
```

### ✅ DO: Validate String Inputs

```typescript
// GOOD: Validate format and length
router.get('/personality/random/:type', async (req, res) => {
  const { background } = req.query;

  if (background && typeof background === 'string') {
    // Only allow alphanumeric, hyphens, underscores
    const validBackground = /^[a-zA-Z0-9_-]+$/.test(background);

    if (!validBackground) {
      return res.status(400).json({
        error: 'Invalid background parameter',
        message: 'Background must contain only alphanumeric characters, hyphens, and underscores'
      });
    }
  }
});
```

### ✅ DO: Validate Array Inputs

```typescript
// GOOD: Validate array length and contents
router.post('/character/spells', async (req, res) => {
  const { spells } = req.body;

  if (!Array.isArray(spells)) {
    return res.status(400).json({ error: 'Spells must be an array' });
  }

  if (spells.length > 100) {
    return res.status(400).json({ error: 'Too many spells (max 100)' });
  }

  // Validate each spell ID is a valid UUID
  const validSpells = spells.every(id =>
    typeof id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
  );

  if (!validSpells) {
    return res.status(400).json({ error: 'Invalid spell IDs' });
  }
});
```

---

## Rate Limiting

### ✅ DO: Use Plan-Aware Rate Limiting for Protected Endpoints

```typescript
import { planRateLimit } from '../../middleware/rate-limit.js';

router.use(requireAuth);
router.use(planRateLimit('default'));  // Adjusts limits based on user's plan
```

### ✅ DO: Use Custom Rate Limiting for Public Endpoints

```typescript
import { createRateLimiter } from '../../middleware/rate-limit.js';

// Public blog endpoints - generous limits for legitimate readers
const publicRateLimit = createRateLimiter({
  windowMs: 60_000,        // 1 minute window
  max: 100,                // 100 requests per minute per IP
  key: 'blog-public'       // Unique key for this limiter
});

router.get('/posts', publicRateLimit, async (req, res) => {
  // Handler...
});
```

### ✅ DO: Use Aggressive Rate Limiting for Abuse-Prone Endpoints

```typescript
// Error reporting endpoints - prevent log poisoning
const errorRateLimit = createRateLimiter({
  windowMs: 60_000,
  max: 20,  // Very low limit - errors should be rare
  key: 'observability:error'
});

router.post('/error', errorRateLimit, (req, res) => {
  // Handler...
});
```

### Rate Limiting Guidelines

| Endpoint Type | Rate Limit | Reasoning |
|---------------|------------|-----------|
| Protected (default) | Plan-aware | Free: 100/min, Pro: 500/min, Enterprise: 2000/min |
| Protected (LLM) | Plan-aware | Free: 10/min, Pro: 50/min, Enterprise: 200/min |
| Public (blog/content) | 100/min | Generous for legitimate readers |
| Public (SEO) | 30/min | Bots crawl infrequently |
| Error reporting | 20/min | Errors should be rare |
| Metrics | 50/min | Higher throughput for analytics |

---

## Error Handling

### ✅ DO: Use Generic Error Messages to Clients

```typescript
// GOOD: Generic message, detailed logging
try {
  const { data, error } = await supabaseService
    .from('characters')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('[CHARACTERS] Database error:', {
      error,
      characterId: id,
      userId: req.user?.userId,
      timestamp: new Date().toISOString()
    });

    return res.status(500).json({
      error: 'Failed to fetch character',
      message: 'An internal error occurred. Please try again.'
    });
  }
} catch (error) {
  console.error('[CHARACTERS] Unexpected error:', error);
  return res.status(500).json({
    error: 'Internal server error'
  });
}
```

### ❌ DON'T: Expose Internal Errors to Clients

```typescript
// BAD: Exposes database structure and internal details
try {
  // ...operation
} catch (error) {
  return res.status(500).json({
    error: error.message,  // Could expose sensitive info
    stack: error.stack      // NEVER expose stack traces
  });
}
```

### ✅ DO: Log Detailed Information Server-Side

```typescript
// GOOD: Comprehensive server-side logging
console.error('[ENDPOINT_NAME] Error details:', {
  error: error instanceof Error ? {
    message: error.message,
    stack: error.stack,
    name: error.name
  } : error,
  context: {
    userId: req.user?.userId,
    resourceId: req.params.id,
    requestId: res.locals.requestId,
    timestamp: new Date().toISOString(),
    method: req.method,
    path: req.path
  }
});
```

---

## XSS Prevention

### ✅ DO: Sanitize User-Generated HTML

```typescript
import sanitizeHtml from 'sanitize-html';

// GOOD: Sanitize on render (defense-in-depth)
const sanitizedContent = useMemo(() => {
  const rawHtml = post?.content || '';

  return sanitizeHtml(rawHtml, {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat([
      'h1', 'h2', 'h3', 'img', 'figure', 'figcaption'
    ]),
    allowedAttributes: {
      ...sanitizeHtml.defaults.allowedAttributes,
      img: ['src', 'alt', 'title', 'width', 'height'],
      a: ['href', 'title', 'target', 'rel']
    },
    allowedSchemes: ['http', 'https', 'mailto'],
    transformTags: {
      // Force external links to open in new tab with security
      'a': (tagName, attribs) => {
        if (attribs.href && !attribs.href.startsWith('/')) {
          return {
            tagName: 'a',
            attribs: {
              ...attribs,
              target: '_blank',
              rel: 'noopener noreferrer'
            }
          };
        }
        return { tagName, attribs };
      }
    }
  });
}, [post?.content]);

// Use sanitized content
<div dangerouslySetInnerHTML={{ __html: sanitizedContent }} />
```

### ❌ DON'T: Use dangerouslySetInnerHTML Without Sanitization

```typescript
// BAD: Direct HTML injection
<div dangerouslySetInnerHTML={{ __html: post.content }} />
```

### ✅ DO: Sanitize Input on Backend Too (Defense-in-Depth)

```typescript
// GOOD: Sanitize before storage
router.post('/blog/posts', requireAuth, async (req, res) => {
  const { content } = req.body;

  const sanitizedContent = sanitizeHtml(content, {
    allowedTags: [...],
    allowedAttributes: {...}
  });

  const { data, error } = await supabaseService
    .from('blog_posts')
    .insert({ content: sanitizedContent })
    .select()
    .single();
});
```

---

## Environment Variables

### ✅ DO: Validate Environment Variables at Startup

```typescript
import { validateEnvironmentOrExit } from './utils/validate-env.js';

// At server startup (in server/src/index.ts)
validateEnvironmentOrExit(process.env.NODE_ENV === 'production');
```

### ✅ DO: Define Required Variables with Validation

```typescript
// In validate-env.ts
const ENV_VARIABLES: EnvConfig[] = [
  {
    name: 'JWT_SECRET',
    required: true,
    description: 'Secret key for signing JWT tokens',
    validate: (val) => val.length >= 32  // At least 32 characters
  },
  {
    name: 'SUPABASE_URL',
    required: true,
    description: 'Supabase project URL',
    validate: (val) => val.startsWith('https://') && val.includes('.supabase.co')
  },
  {
    name: 'NODE_ENV',
    required: true,
    description: 'Application environment',
    validate: (val) => ['production', 'development', 'test'].includes(val)
  }
];
```

### ❌ DON'T: Use Hardcoded Secrets in Production

```typescript
// BAD: Hardcoded fallback in production
const JWT_SECRET = process.env.JWT_SECRET || 'default_secret';

// GOOD: Require secret in production
const JWT_SECRET = process.env.JWT_SECRET || (() => {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET is required in production');
  }
  console.warn('WARNING: Using default JWT secret in development');
  return 'dev_secret_change_me';
})();
```

### Environment Variable Checklist

Required in Production:
- `JWT_SECRET` (≥32 characters)
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_JWT_SECRET`
- `NODE_ENV` (must be "production", "development", or "test")

Optional (with warnings):
- `OPENROUTER_API_KEY` / `OPENAI_API_KEY` / `ANTHROPIC_API_KEY` (at least one required for AI features)
- `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` (both required if billing enabled)
- `DATABASE_URL` (optional direct database access)
- `PORT` (defaults to 3001)

---

## Database Security

### ✅ DO: Use Singleton Pattern for Connection Pools

```typescript
// GOOD: Prevents connection pool exhaustion
let poolInstance: Pool | null = null;

export function createClient(): Pool {
  if (!poolInstance) {
    poolInstance = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });
  }
  return poolInstance;
}
```

### ❌ DON'T: Create New Pools on Every Request

```typescript
// BAD: Creates new pool on every request (connection exhaustion)
export function createClient(): Pool {
  return new Pool({
    connectionString: process.env.DATABASE_URL
  });
}
```

### ✅ DO: Use Parameterized Queries

```typescript
// GOOD: Supabase automatically parameterizes
const { data } = await supabaseService
  .from('users')
  .select('*')
  .eq('email', userEmail);  // Automatically parameterized
```

### ❌ DON'T: Concatenate User Input into Queries

```typescript
// BAD: SQL injection vulnerability (don't do this even with Supabase)
const query = `SELECT * FROM users WHERE email = '${userEmail}'`;
```

---

## API Security

### Webhook Signature Verification

```typescript
// ✅ DO: Always verify webhook signatures
router.post('/stripe/webhook', async (req, res) => {
  const signature = req.headers['stripe-signature'] as string;
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!endpointSecret) {
    console.error('STRIPE_WEBHOOK_SECRET not configured');
    return res.status(500).send('Webhook secret not configured');
  }

  try {
    const event = stripe.webhooks.constructEvent(
      req.body,
      signature,
      endpointSecret
    );
    // Process event...
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
});
```

### External API Calls

```typescript
// ✅ DO: Use circuit breaker pattern for external APIs
// (Already implemented in /server/src/lib/circuit-breaker.ts)

import { withCircuitBreaker } from '../lib/circuit-breaker.js';

const response = await withCircuitBreaker(
  'openai-api',
  () => fetch('https://api.openai.com/v1/...'),
  {
    failureThreshold: 5,
    resetTimeout: 60000
  }
);
```

---

## Testing

### Security Test Checklist

- [ ] **Authorization Tests**: Verify users cannot access other users' resources
- [ ] **Input Validation Tests**: Test boundary conditions for all inputs
- [ ] **Rate Limiting Tests**: Verify rate limits are enforced
- [ ] **Authentication Tests**: Verify protected endpoints reject unauthenticated requests
- [ ] **XSS Tests**: Verify HTML sanitization prevents script injection
- [ ] **Error Handling Tests**: Verify error messages don't leak sensitive info

### Example Authorization Test

```typescript
describe('Character Authorization', () => {
  it('should prevent users from accessing other users\' characters', async () => {
    const user1Token = await getAuthToken(user1);
    const user2Character = await createCharacter(user2);

    const response = await request(app)
      .get(`/api/v1/characters/${user2Character.id}`)
      .set('Authorization', `Bearer ${user1Token}`);

    expect(response.status).toBe(404); // Not 403, to avoid info leakage
    expect(response.body.error).toBe('Character not found');
  });
});
```

### Example Input Validation Test

```typescript
describe('Spell Level Validation', () => {
  it('should bound spell level to 0-9', async () => {
    const token = await getAuthToken(user);

    // Test upper bound
    const response1 = await request(app)
      .get('/api/v1/spells?level=999')
      .set('Authorization', `Bearer ${token}`);

    // Should be treated as level 9 (max)
    expect(response1.status).toBe(200);

    // Test lower bound
    const response2 = await request(app)
      .get('/api/v1/spells?level=-5')
      .set('Authorization', `Bearer ${token}`);

    // Should be treated as level 0 (min)
    expect(response2.status).toBe(200);
  });
});
```

---

## Security Incident Response

If you discover a security vulnerability:

1. **DO NOT** commit sensitive information to version control
2. **DO NOT** discuss the vulnerability publicly until patched
3. Document the vulnerability privately
4. Assess impact and severity using CVSS scoring
5. Develop and test a fix
6. Deploy the fix to production immediately
7. Notify affected users if data was compromised
8. Document the incident and lessons learned

## Security Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [CVSS Calculator](https://www.first.org/cvss/calculator/3.1)
- [Supabase Security Best Practices](https://supabase.com/docs/guides/platform/security)
- [Express.js Security Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)

---

## Updates to This Document

This document should be updated whenever:
- New security patterns are established
- Security vulnerabilities are discovered and fixed
- New features introduce new security considerations
- Security tooling or dependencies are updated

Last Updated: 2025-11-05
