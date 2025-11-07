# tRPC Usage Examples

This document demonstrates how to use the tRPC setup for type-safe API calls.

## Server-Side Examples

### Creating a New Router

Here's an example of creating a campaign router:

```typescript
// server/src/trpc/routers/campaign.ts
import { z } from 'zod';
import { router, publicProcedure, protectedProcedure } from '../trpc.js';
import { eq } from 'drizzle-orm';

// Define your table schema (in db/schema.ts)
// export const campaigns = pgTable('campaigns', {
//   id: uuid('id').primaryKey().defaultRandom(),
//   userId: uuid('user_id').notNull(),
//   name: text('name').notNull(),
//   description: text('description'),
//   createdAt: timestamp('created_at').defaultNow(),
// });

export const campaignRouter = router({
  // List all campaigns for authenticated user
  list: protectedProcedure.query(async ({ ctx }) => {
    const { db, user } = ctx;

    // TypeScript knows user is non-null in protectedProcedure
    const campaigns = await db.query.campaigns.findMany({
      where: eq(campaigns.userId, user.userId),
      orderBy: desc(campaigns.createdAt),
    });

    return campaigns;
  }),

  // Get single campaign by ID
  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const campaign = await ctx.db.query.campaigns.findFirst({
        where: eq(campaigns.id, input.id),
      });

      if (!campaign) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Campaign not found',
        });
      }

      return campaign;
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

  // Update campaign
  update: protectedProcedure
    .input(z.object({
      id: z.string().uuid(),
      name: z.string().min(1).max(255).optional(),
      description: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...updates } = input;

      const [updated] = await ctx.db.update(campaigns)
        .set(updates)
        .where(eq(campaigns.id, id))
        .returning();

      if (!updated) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Campaign not found',
        });
      }

      return updated;
    }),

  // Delete campaign
  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.delete(campaigns)
        .where(eq(campaigns.id, input.id));

      return { success: true };
    }),
});
```

### Adding Router to Root

```typescript
// server/src/trpc/root.ts
import { router } from './trpc.js';
import { blogRouter } from './routers/blog.js';
import { campaignRouter } from './routers/campaign.js';

export const appRouter = router({
  blog: blogRouter,
  campaign: campaignRouter, // Add your new router
});

export type AppRouter = typeof appRouter;
```

## Client-Side Setup

### 1. Create tRPC Client

```typescript
// src/lib/trpc.ts
import { createTRPCReact } from '@trpc/react-query';
import type { AppRouter } from '../../server/src/trpc';

export const trpc = createTRPCReact<AppRouter>();
```

### 2. Setup Provider

```typescript
// src/App.tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { httpBatchLink } from '@trpc/client';
import { trpc } from './lib/trpc';
import { useState } from 'react';

function App() {
  const [queryClient] = useState(() => new QueryClient());
  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        httpBatchLink({
          url: 'http://localhost:8888/api/trpc',
          headers() {
            const token = localStorage.getItem('auth_token');
            return {
              Authorization: token ? `Bearer ${token}` : '',
            };
          },
        }),
      ],
    })
  );

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <YourApp />
      </QueryClientProvider>
    </trpc.Provider>
  );
}
```

### 3. Use in Components

```typescript
// src/components/CampaignList.tsx
import { trpc } from '../lib/trpc';

function CampaignList() {
  // Query - automatically typed, auto-refetches
  const { data: campaigns, isLoading, error } = trpc.campaign.list.useQuery();

  // Mutation - with optimistic updates
  const utils = trpc.useUtils();
  const createCampaign = trpc.campaign.create.useMutation({
    onSuccess: () => {
      // Invalidate and refetch campaigns list
      utils.campaign.list.invalidate();
    },
  });

  const handleCreate = () => {
    createCampaign.mutate({
      name: 'New Campaign',
      description: 'A fresh adventure',
    });
  };

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      <button onClick={handleCreate}>Create Campaign</button>
      {campaigns?.map((campaign) => (
        <div key={campaign.id}>{campaign.name}</div>
      ))}
    </div>
  );
}
```

## Advanced Examples

### With Optimistic Updates

```typescript
const deleteCampaign = trpc.campaign.delete.useMutation({
  onMutate: async ({ id }) => {
    // Cancel outgoing refetches
    await utils.campaign.list.cancel();

    // Snapshot current value
    const previous = utils.campaign.list.getData();

    // Optimistically update
    utils.campaign.list.setData(undefined, (old) =>
      old?.filter((c) => c.id !== id)
    );

    return { previous };
  },
  onError: (err, variables, context) => {
    // Rollback on error
    utils.campaign.list.setData(undefined, context?.previous);
  },
  onSettled: () => {
    // Refetch after error or success
    utils.campaign.list.invalidate();
  },
});
```

### Infinite Query (Pagination)

```typescript
// Server
export const campaignRouter = router({
  infiniteList: protectedProcedure
    .input(z.object({
      limit: z.number().min(1).max(100).default(10),
      cursor: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const campaigns = await ctx.db.query.campaigns.findMany({
        where: eq(campaigns.userId, ctx.user.userId),
        limit: input.limit + 1,
        orderBy: desc(campaigns.createdAt),
      });

      let nextCursor: string | undefined;
      if (campaigns.length > input.limit) {
        const nextItem = campaigns.pop();
        nextCursor = nextItem!.id;
      }

      return {
        campaigns,
        nextCursor,
      };
    }),
});

// Client
const {
  data,
  fetchNextPage,
  hasNextPage,
  isLoading,
} = trpc.campaign.infiniteList.useInfiniteQuery(
  { limit: 10 },
  {
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  }
);
```

### Subscription (WebSocket)

```typescript
// Server (requires WebSocket setup)
export const campaignRouter = router({
  onUpdate: protectedProcedure
    .input(z.object({ campaignId: z.string().uuid() }))
    .subscription(async ({ ctx, input }) => {
      return observable<Campaign>((emit) => {
        // Setup your subscription logic
        const subscription = subscribeToCampaignUpdates(
          input.campaignId,
          (campaign) => emit.next(campaign)
        );

        return () => subscription.unsubscribe();
      });
    }),
});

// Client
const { data } = trpc.campaign.onUpdate.useSubscription(
  { campaignId: 'campaign-123' },
  {
    onData: (campaign) => {
      console.log('Campaign updated:', campaign);
    },
  }
);
```

## Error Handling

### Server-Side

```typescript
import { TRPCError } from '@trpc/server';

create: protectedProcedure
  .input(createCampaignSchema)
  .mutation(async ({ ctx, input }) => {
    try {
      // Your logic
    } catch (error) {
      if (error instanceof DatabaseError) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Database error',
          cause: error,
        });
      }
      throw error;
    }
  })
```

### Client-Side

```typescript
const { error } = trpc.campaign.list.useQuery();

if (error) {
  if (error.data?.code === 'UNAUTHORIZED') {
    // Redirect to login
  } else if (error.data?.code === 'NOT_FOUND') {
    // Show not found message
  }
}
```

## Testing

```typescript
import { appRouter } from './server/src/trpc/root';
import { createContext } from './server/src/trpc/context';

describe('Campaign Router', () => {
  it('should create campaign', async () => {
    const ctx = await createContext({
      req: mockRequest,
      res: mockResponse,
    });

    const caller = appRouter.createCaller(ctx);
    const campaign = await caller.campaign.create({
      name: 'Test Campaign',
    });

    expect(campaign.name).toBe('Test Campaign');
  });
});
```

## Type Safety Benefits

```typescript
// ✅ Full autocomplete
trpc.campaign.create.mutate({
  name: 'Valid', // TypeScript knows this is required
  description: 'Optional', // TypeScript knows this is optional
});

// ❌ TypeScript error - invalid input
trpc.campaign.create.mutate({
  name: 123, // Type error: expected string
});

// ✅ Response is fully typed
const { data } = trpc.campaign.list.useQuery();
// data is Campaign[] | undefined (TypeScript knows the exact type)

// ❌ TypeScript prevents typos
trpc.campaign.nonExistent.useQuery(); // Type error: doesn't exist
```
