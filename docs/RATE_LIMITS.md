# API Rate Limiting

## Overview

AI Adventure Scribe implements intelligent plan-aware rate limiting to ensure fair usage, prevent abuse, and provide a consistent API experience. The rate limiting system supports multiple tiers and adapts to user subscription plans.

## Rate Limiting Strategy

The system uses a **sliding window** algorithm with both per-IP and per-user limits:

- **Per-IP limits**: Protects against abuse from a single IP address
- **Per-user limits**: Provides plan-specific quotas for authenticated users
- **Memory-based**: Uses in-memory storage for fast performance (can be extended to Redis/Postgres)
- **Fail-open**: If the rate limiter encounters errors, requests are allowed through

## Rate Limit Tiers

### Free Tier

**Default API Endpoints** (`/v1/campaigns`, `/v1/rest`, `/v1/spells`, etc.)
- **Per-IP Limit:** 60 requests per minute
- **Per-User Limit:** 60 requests per minute
- **Window:** 60 seconds (1 minute)
- **Reset:** Rolling window

**LLM Endpoints** (AI-powered features)
- **Per-IP Limit:** 20 requests per minute
- **Per-User Limit:** 10 requests per minute
- **Window:** 60 seconds (1 minute)

**Image Generation** (`/v1/images`)
- **Per-IP Limit:** 10 requests per minute
- **Per-User Limit:** 5 requests per minute
- **Window:** 60 seconds (1 minute)

### Pro Tier

**Default API Endpoints**
- **Per-IP Limit:** 600 requests per minute
- **Per-User Limit:** 600 requests per minute
- **Window:** 60 seconds (1 minute)
- **Reset:** Rolling window

**LLM Endpoints**
- **Per-IP Limit:** 120 requests per minute
- **Per-User Limit:** 60 requests per minute
- **Window:** 60 seconds (1 minute)

**Image Generation**
- **Per-IP Limit:** 60 requests per minute
- **Per-User Limit:** 30 requests per minute
- **Window:** 60 seconds (1 minute)

### Enterprise Tier

**Default API Endpoints**
- **Per-IP Limit:** 2,000 requests per minute
- **Per-User Limit:** 2,000 requests per minute
- **Window:** 60 seconds (1 minute)
- **Reset:** Rolling window

**LLM Endpoints**
- **Per-IP Limit:** 600 requests per minute
- **Per-User Limit:** 300 requests per minute
- **Window:** 60 seconds (1 minute)

**Image Generation**
- **Per-IP Limit:** 300 requests per minute
- **Per-User Limit:** 150 requests per minute
- **Window:** 60 seconds (1 minute)

## Rate-Limited Endpoints

All endpoints under `/v1/` are rate-limited:

| Endpoint Category | Route | Limit Type | Description |
|------------------|-------|------------|-------------|
| Campaigns API | `/v1/campaigns/*` | `default` | Campaign management |
| Encounters API | `/v1/encounters/*` | `default` | Encounter tracking |
| Rest API | `/v1/rest/*` | `default` | Short/long rest mechanics |
| Spell Slots API | `/v1/spell-slots/*` | `default` | Spell slot management |
| Spells API | `/v1/spells/*` | `default` | Spell library |
| Class Features API | `/v1/class-features/*` | `default` | D&D class abilities |
| Billing API | `/v1/billing/*` | `default` | Subscription management |
| Personality API | `/v1/personality/*` | `default` | Character personality |
| Image API | `/v1/images/*` | `images` | AI image generation |
| LLM API | `/v1/llm/*` | `llm` | AI text generation |

## Rate Limit Response Headers

The API currently returns a `Retry-After` header when rate limits are exceeded. Future versions will include standard rate limit headers.

### Current Headers (on 429 response)

```http
Retry-After: 60
```

### Planned Headers (future enhancement)

```http
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1699564800
Retry-After: 60
```

## Handling Rate Limits

### 429 Too Many Requests Response

When a rate limit is exceeded, the API returns:

**Status Code:** `429 Too Many Requests`

**Response Body:**

```json
{
  "error": {
    "name": "RateLimitError",
    "message": "Too many requests from this IP, please try again later",
    "code": "RATE_LIMIT_EXCEEDED",
    "statusCode": 429,
    "details": {
      "scope": "ip",
      "limit": 60,
      "window": 60,
      "retryAfter": 45
    }
  }
}
```

Or for per-user limits:

```json
{
  "error": {
    "name": "RateLimitError",
    "message": "Too many requests from this user, please try again later",
    "code": "RATE_LIMIT_EXCEEDED",
    "statusCode": 429,
    "details": {
      "scope": "user",
      "limit": 60,
      "window": 60,
      "retryAfter": 35
    }
  }
}
```

### Field Descriptions

- **error.name**: Always `"RateLimitError"` for rate limit errors
- **error.message**: Human-readable error message
- **error.code**: Machine-readable error code: `"RATE_LIMIT_EXCEEDED"`
- **error.statusCode**: HTTP status code (always `429`)
- **error.details.scope**: Whether the limit is `"ip"` (per-IP) or `"user"` (per-user)
- **error.details.limit**: Maximum requests allowed in the window
- **error.details.window**: Time window in seconds
- **error.details.retryAfter**: Seconds to wait before retrying

### Best Practices

1. **Monitor Response Codes**: Always check for `429` status codes
2. **Implement Exponential Backoff**: Use increasing delays for retries
3. **Respect Retry-After**: Wait at least the specified time before retrying
4. **Cache Responses**: Reduce unnecessary API calls by caching results
5. **Batch Operations**: Combine multiple operations where possible
6. **Upgrade Plans**: Consider Pro or Enterprise tier for higher limits

### Example: Client-Side Rate Limit Handling

#### TypeScript/JavaScript

```typescript
async function makeApiRequest(url: string, options?: RequestInit, maxRetries = 3) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);

      if (response.status === 429) {
        const data = await response.json();
        const retryAfter = data.error?.details?.retryAfter || 60;

        console.warn(`Rate limited (${data.error?.details?.scope}). Retrying after ${retryAfter}s...`);
        await sleep(retryAfter * 1000);
        continue;
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      if (attempt === maxRetries - 1) throw error;

      // Exponential backoff for network errors
      const backoff = Math.pow(2, attempt) * 1000;
      await sleep(backoff);
    }
  }

  throw new Error('Max retries exceeded');
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Usage
try {
  const data = await makeApiRequest('/v1/campaigns/123');
  console.log(data);
} catch (error) {
  console.error('API request failed:', error);
}
```

#### Python

```python
import time
import requests

def make_api_request(url, max_retries=3):
    for attempt in range(max_retries):
        try:
            response = requests.get(url)

            if response.status_code == 429:
                data = response.json()
                error_details = data.get('error', {}).get('details', {})
                retry_after = error_details.get('retryAfter', 60)
                scope = error_details.get('scope', 'unknown')

                print(f'Rate limited ({scope}). Retrying after {retry_after}s...')
                time.sleep(retry_after)
                continue

            response.raise_for_status()
            return response.json()

        except requests.RequestException as e:
            if attempt == max_retries - 1:
                raise

            # Exponential backoff
            backoff = 2 ** attempt
            time.sleep(backoff)

    raise Exception('Max retries exceeded')

# Usage
try:
    data = make_api_request('https://api.example.com/v1/campaigns/123')
    print(data)
except Exception as e:
    print(f'API request failed: {e}')
```

## Configuration

Rate limits can be configured via environment variables in the server.

### Environment Variables

```env
# Default API Limits (campaigns, rest, spells, etc.)
RATE_LIMIT_DEFAULT_IP_WINDOW=60000           # 60 seconds in ms
RATE_LIMIT_DEFAULT_IP_FREE=60                # Free tier
RATE_LIMIT_DEFAULT_IP_PRO=600                # Pro tier
RATE_LIMIT_DEFAULT_IP_ENTERPRISE=2000        # Enterprise tier

RATE_LIMIT_DEFAULT_USER_WINDOW=60000         # 60 seconds in ms
RATE_LIMIT_DEFAULT_USER_FREE=60
RATE_LIMIT_DEFAULT_USER_PRO=600
RATE_LIMIT_DEFAULT_USER_ENTERPRISE=2000

# LLM Endpoint Limits
RATE_LIMIT_LLM_IP_WINDOW=60000
RATE_LIMIT_LLM_IP_FREE=20
RATE_LIMIT_LLM_IP_PRO=120
RATE_LIMIT_LLM_IP_ENTERPRISE=600

RATE_LIMIT_LLM_USER_WINDOW=60000
RATE_LIMIT_LLM_USER_FREE=10
RATE_LIMIT_LLM_USER_PRO=60
RATE_LIMIT_LLM_USER_ENTERPRISE=300

# Image Generation Limits
RATE_LIMIT_IMAGES_IP_WINDOW=60000
RATE_LIMIT_IMAGES_IP_FREE=10
RATE_LIMIT_IMAGES_IP_PRO=60
RATE_LIMIT_IMAGES_IP_ENTERPRISE=300

RATE_LIMIT_IMAGES_USER_WINDOW=60000
RATE_LIMIT_IMAGES_USER_FREE=5
RATE_LIMIT_IMAGES_USER_PRO=30
RATE_LIMIT_IMAGES_USER_ENTERPRISE=150
```

### Default Values

If environment variables are not set, the middleware uses these defaults:

- **Default endpoints**: 60/min (free), 600/min (pro), 2000/min (enterprise)
- **LLM endpoints**: 20/min (free), 120/min (pro), 600/min (enterprise)
- **Image endpoints**: 10/min (free), 60/min (pro), 300/min (enterprise)

## Plan Detection

The rate limiter detects user plans in two ways:

1. **X-Plan Header** (for testing): Include `X-Plan: pro` or `X-Plan: enterprise` header
2. **User Object** (production): The plan is read from `req.user.plan` (set by authentication middleware)

### Testing with Different Plans

```bash
# Test as free tier (default)
curl https://api.example.com/v1/campaigns

# Test as pro tier
curl -H "X-Plan: pro" https://api.example.com/v1/campaigns

# Test as enterprise tier
curl -H "X-Plan: enterprise" https://api.example.com/v1/campaigns
```

## Exempt Endpoints

The following endpoints are **not** rate-limited:

- `GET /health` - Health check endpoint
- `GET /metrics` - Prometheus metrics (if enabled)
- Static assets and documentation

## Troubleshooting

### I'm hitting rate limits frequently

**Solutions:**
1. **Upgrade your plan**: Pro and Enterprise tiers offer 10x-33x higher limits
2. **Implement caching**: Cache API responses to reduce request volume
3. **Reduce polling**: Increase polling intervals or use webhooks if available
4. **Batch operations**: Combine related operations into single requests
5. **Optimize queries**: Fetch only the data you need

### Different limits for IP vs User

The system enforces **both** per-IP and per-user limits. You may hit the IP limit if:
- Multiple users share the same IP (corporate network, NAT)
- You're making unauthenticated requests (only IP limit applies)

**Solution:** Authenticate all requests to use per-user limits instead.

### Rate limit headers missing

The current implementation includes `Retry-After` on 429 responses. Standard rate limit headers (`X-RateLimit-*`) are planned for a future release.

### Need custom limits?

Enterprise customers can request custom rate limits. Contact:
- Email: support@aiadventurescribe.com
- Discord: [Community Server]

## Technical Details

### Sliding Window Algorithm

The rate limiter uses a **sliding window** approach:

1. Each request increments a counter for the current window
2. If the window has expired, a new window starts
3. The counter resets when the window resets
4. Limits are enforced per window

**Advantages:**
- More accurate than fixed windows
- Prevents burst traffic at window boundaries
- Memory efficient

**Example:**
```
Request at 10:00:00 -> Window starts at 10:00:00, expires at 10:01:00
Request at 10:00:30 -> Same window (50/60 used)
Request at 10:00:59 -> Same window (59/60 used)
Request at 10:01:01 -> New window starts at 10:01:01
```

### Storage Backend

**Current:** In-memory storage (MemoryStore)

**Pros:**
- Fast and efficient
- No external dependencies
- Simple to deploy

**Cons:**
- State is lost on server restart
- Not shared across multiple server instances

**Future:** Redis or PostgreSQL storage for distributed deployments

### Implementation

Rate limiting is implemented in `/server/src/middleware/rate-limit.ts` using the `planRateLimit` middleware function.

## Migration from Legacy Rate Limiter

If you're using the legacy `createRateLimiter` function, migrate to `planRateLimit` for plan-aware limits:

**Before:**
```typescript
import { createRateLimiter } from './middleware/rate-limit';

router.use(createRateLimiter({ windowMs: 60000, max: 100 }));
```

**After:**
```typescript
import { planRateLimit } from './middleware/rate-limit';

router.use(planRateLimit('default')); // or 'llm', 'images'
```

## Future Enhancements

Planned improvements to the rate limiting system:

- [ ] Standard rate limit headers (X-RateLimit-*)
- [ ] Redis/PostgreSQL storage for distributed systems
- [ ] Rate limit dashboard in admin panel
- [ ] Per-endpoint custom limits
- [ ] Rate limit analytics and reporting
- [ ] Burst allowances for short traffic spikes
- [ ] GraphQL query complexity-based limiting

## Contact & Support

For questions about rate limits or to request changes:

- **Documentation**: [API Documentation](https://docs.aiadventurescribe.com)
- **Email**: support@aiadventurescribe.com
- **Discord**: [Community Server](https://discord.gg/aiadventurescribe)
- **Enterprise**: enterprise@aiadventurescribe.com

---

*Last updated: 2025-11-14*
*Version: 1.0.0*
