# tRPC Quick Start Guide

## What is tRPC?

tRPC provides end-to-end type safety between your TypeScript server and client. No code generation, no schema files - just TypeScript types that flow automatically.

## Current Setup

- **Endpoint**: `http://localhost:8888/api/trpc`
- **Active Routers**: `blog` (already migrated)
- **Auth**: Supabase JWT tokens via `Authorization: Bearer <token>`
- **Database**: Drizzle ORM available via `ctx.db`

## Creating a New Router (5 Minutes)

### 1. Create Router File

```typescript
// server/src/trpc/routers/campaign.ts
import { z } from 'zod';
import { router, protectedProcedure } from '../trpc.js';

export const campaignRouter = router({
  // List all campaigns
  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.query.campaigns.findMany({
      where: eq(campaigns.userId, ctx.user.userId),
    });
  }),

  // Create campaign
  create: protectedProcedure
    .input(z.object({
      name: z.string().min(1),
      description: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const [campaign] = await ctx.db.insert(campaigns)
        .values({ ...input, userId: ctx.user.userId })
        .returning();
      return campaign;
    }),
});
```

### 2. Add to Root Router

```typescript
// server/src/trpc/root.ts
import { campaignRouter } from './routers/campaign.js';

export const appRouter = router({
  blog: blogRouter,
  campaign: campaignRouter, // ← Add this line
});
```

### 3. Use in Client

```typescript
// Automatically typed!
const { data: campaigns } = trpc.campaign.list.useQuery();
const create = trpc.campaign.create.useMutation();

create.mutate({ name: 'New Campaign' });
```

## Common Patterns

### Query (Read Data)
```typescript
myProcedure: protectedProcedure.query(async ({ ctx }) => {
  return ctx.db.select().from(myTable);
})
```

### Mutation (Write Data)
```typescript
myProcedure: protectedProcedure
  .input(z.object({ name: z.string() }))
  .mutation(async ({ ctx, input }) => {
    return ctx.db.insert(myTable).values(input);
  })
```

### Input Validation
```typescript
.input(z.object({
  id: z.string().uuid(),
  name: z.string().min(3).max(100),
  age: z.number().int().positive(),
  email: z.string().email().optional(),
}))
```

### Error Handling
```typescript
import { TRPCError } from '@trpc/server';

if (!resource) {
  throw new TRPCError({
    code: 'NOT_FOUND',
    message: 'Resource not found',
  });
}
```

## Available Procedures

- **publicProcedure**: No auth required (`ctx.user` may be null)
- **protectedProcedure**: Auth required (`ctx.user` guaranteed non-null)
- **adminProcedure**: Admin role required (`ctx.user.plan` is admin/enterprise)

## Context Available

```typescript
ctx.db      // Drizzle database client
ctx.user    // { userId: string, email?: string, plan: string }
ctx.req     // Express request
ctx.res     // Express response
```

## Error Codes

- `UNAUTHORIZED` - Not authenticated
- `FORBIDDEN` - Not authorized
- `NOT_FOUND` - Resource doesn't exist
- `BAD_REQUEST` - Invalid input
- `INTERNAL_SERVER_ERROR` - Server error
- `CONFLICT` - Duplicate/conflict

## Testing Auth Locally

```bash
# Set plan header for testing
curl -H "X-Plan: pro" \
     -H "Authorization: Bearer <token>" \
     http://localhost:8888/api/trpc/campaign.list
```

## Debugging

All requests are logged:
```
[tRPC] query campaign.list - user-123 - 45ms - OK
[tRPC] mutation campaign.create - user-123 - 120ms - ERROR
```

## Migration Checklist

Moving from Express to tRPC:

- [ ] Copy business logic from Express route
- [ ] Create Zod schema for input
- [ ] Create tRPC procedure
- [ ] Add to router
- [ ] Update client to use tRPC hook
- [ ] Remove old Express route

## Need Help?

- See `EXAMPLES.md` for detailed examples
- See `routers/README.md` for best practices
- Check existing `blog.ts` router for real examples
