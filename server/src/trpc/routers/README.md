# tRPC Routers

This directory contains feature-specific tRPC routers that implement type-safe API endpoints.

## Overview

Each router file defines procedures (endpoints) for a specific domain of the application. Routers use:
- **publicProcedure**: No authentication required
- **protectedProcedure**: Requires authenticated user
- **adminProcedure**: Requires admin role

## Active Routers

### blog.ts
Blog CMS operations including posts, authors, categories, and tags management.

## Creating a New Router

To create a new feature router:

1. **Create router file** (e.g., `campaign.ts`):
```typescript
import { z } from 'zod';
import { router, publicProcedure, protectedProcedure } from '../trpc.js';
import { campaigns } from '../../../../db/schema.js';
import { eq } from 'drizzle-orm';

export const campaignRouter = router({
  // List all campaigns for the authenticated user
  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.select().from(campaigns)
      .where(eq(campaigns.userId, ctx.user.userId));
  }),

  // Get campaign by ID
  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const campaign = await ctx.db.select().from(campaigns)
        .where(eq(campaigns.id, input.id))
        .limit(1);
      return campaign[0] ?? null;
    }),

  // Create new campaign
  create: protectedProcedure
    .input(z.object({
      name: z.string().min(1).max(255),
      description: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const [newCampaign] = await ctx.db.insert(campaigns)
        .values({
          userId: ctx.user.userId,
          name: input.name,
          description: input.description,
        })
        .returning();
      return newCampaign;
    }),
});
```

2. **Add to root router** (`../root.ts`):
```typescript
import { campaignRouter } from './routers/campaign.js';

export const appRouter = router({
  blog: blogRouter,
  campaign: campaignRouter, // Add your router
});
```

3. **Use from client** (TypeScript client automatically knows the types):
```typescript
// Client automatically has full type safety
const campaigns = await trpc.campaign.list.query();
const newCampaign = await trpc.campaign.create.mutate({
  name: "Dragon's Lair",
  description: "A perilous quest",
});
```

## Best Practices

### File Organization
- Keep each router under 200 lines
- Split large routers into multiple files by subdomain
- Use clear, descriptive procedure names

### Input Validation
Always use Zod schemas for input validation:
```typescript
.input(z.object({
  email: z.string().email(),
  age: z.number().min(0).max(120),
}))
```

### Error Handling
Use tRPC error codes for consistent error responses:
```typescript
import { TRPCError } from '@trpc/server';

if (!resource) {
  throw new TRPCError({
    code: 'NOT_FOUND',
    message: 'Resource not found',
  });
}
```

### Database Queries
- Use Drizzle ORM from `ctx.db`
- Leverage TypeScript types from schema
- Always filter by user ID for user-owned resources:
```typescript
.where(eq(table.userId, ctx.user.userId))
```

### Authentication
- Use `protectedProcedure` for user-specific data
- Use `adminProcedure` for admin-only operations
- Access user via `ctx.user` (guaranteed non-null in protected procedures)

## Available Error Codes

tRPC provides these error codes:
- `UNAUTHORIZED`: User not authenticated
- `FORBIDDEN`: User lacks permission
- `NOT_FOUND`: Resource doesn't exist
- `BAD_REQUEST`: Invalid input
- `INTERNAL_SERVER_ERROR`: Server error
- `TIMEOUT`: Request timeout
- `CONFLICT`: Resource conflict (duplicate, etc.)
- `PRECONDITION_FAILED`: Required precondition failed
- `PAYLOAD_TOO_LARGE`: Request body too large
- `METHOD_NOT_SUPPORTED`: HTTP method not supported

## Context Available in Procedures

All procedures have access to:
```typescript
{
  db: DrizzleClient,        // Type-safe database client
  user: AuthUser | null,    // Current user (non-null in protected procedures)
  req: Express.Request,     // Express request object
  res: Express.Response,    // Express response object
}
```

## Testing Routers

Use Vitest to test routers:
```typescript
import { appRouter } from '../root.js';
import { createContext } from '../context.js';

describe('Campaign Router', () => {
  it('should list campaigns for authenticated user', async () => {
    const ctx = await createContext(mockRequest, mockResponse);
    const caller = appRouter.createCaller(ctx);
    const campaigns = await caller.campaign.list();
    expect(campaigns).toBeDefined();
  });
});
```

## Migration from Express Routes

When migrating from Express to tRPC:

1. Identify the Express route handler
2. Extract business logic
3. Define input schema with Zod
4. Create tRPC procedure
5. Test thoroughly
6. Update client to use tRPC
7. Remove old Express route

Example migration:
```typescript
// Before (Express)
app.get('/api/campaigns/:id', requireAuth, async (req, res) => {
  const campaign = await db.select().from(campaigns)
    .where(eq(campaigns.id, req.params.id));
  res.json(campaign[0]);
});

// After (tRPC)
getById: protectedProcedure
  .input(z.object({ id: z.string().uuid() }))
  .query(async ({ ctx, input }) => {
    const campaign = await ctx.db.select().from(campaigns)
      .where(eq(campaigns.id, input.id))
      .limit(1);
    return campaign[0] ?? null;
  })
```

## Resources

- [tRPC Documentation](https://trpc.io/docs)
- [Zod Documentation](https://zod.dev)
- [Drizzle ORM Documentation](https://orm.drizzle.team)
