# Rate Limits Quick Reference Card

## Current Limits (Per Minute)

| Endpoint Category | Free | Pro | Enterprise |
|------------------|------|-----|------------|
| **Default API** | 60 | 600 | 2,000 |
| **LLM/AI** | 20 | 120 | 600 |
| **Images** | 10 | 60 | 300 |

## Default API Endpoints

- `/v1/campaigns/*` - Campaign management
- `/v1/encounters/*` - Encounter tracking
- `/v1/rest/*` - Rest mechanics
- `/v1/spell-slots/*` - Spell slot management
- `/v1/spells/*` - Spell library
- `/v1/class-features/*` - Class features
- `/v1/billing/*` - Subscription management
- `/v1/personality/*` - Character personality

## Rate Limit Headers

```http
Retry-After: 60
```

## 429 Error Response

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

## Quick Code Snippet

```typescript
if (response.status === 429) {
  const data = await response.json();
  const retryAfter = data.error?.details?.retryAfter || 60;
  await sleep(retryAfter * 1000);
  // retry request
}
```

## Testing Different Tiers

```bash
# Free tier
curl http://localhost:4000/v1/campaigns

# Pro tier
curl -H "X-Plan: pro" http://localhost:4000/v1/campaigns

# Enterprise tier
curl -H "X-Plan: enterprise" http://localhost:4000/v1/campaigns
```

## Environment Variables

```env
# Example: Increase free tier limit
RATE_LIMIT_DEFAULT_IP_FREE=100
RATE_LIMIT_DEFAULT_USER_FREE=100
```

## More Info

See `/docs/RATE_LIMITS.md` for complete documentation.
