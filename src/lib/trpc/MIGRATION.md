# tRPC Backend Integration Migration Guide

This guide explains how to connect the frontend tRPC client to the backend router once Work Unit 3.1 is complete.

## Current State

The frontend tRPC client is fully configured and integrated into the application with:
- Type-safe client in `client.ts`
- Provider with authentication in `Provider.tsx`
- Convenience hooks in `hooks.ts`
- Temporary type stubs in `router-types.ts`

## Migration Steps

### Step 1: Verify Backend Implementation

Ensure the backend tRPC router is implemented at:
```
server/src/trpc/root.ts
```

The file should export an `AppRouter` type:
```ts
export type AppRouter = typeof appRouter;
```

### Step 2: Update Type Import

In `src/lib/trpc/client.ts`, replace the type import:

**Before:**
```ts
import type { AppRouter } from './router-types';
```

**After:**
```ts
import type { AppRouter } from '../../../server/src/trpc/root';
```

### Step 3: Remove Temporary Type Stubs

Delete the temporary type stub file:
```bash
rm src/lib/trpc/router-types.ts
```

### Step 4: Update Index Exports

In `src/lib/trpc/index.ts`, update the type export:

**Before:**
```ts
export type { AppRouter } from './router-types';
```

**After:**
```ts
export type { AppRouter } from '../../../server/src/trpc/root';
```

### Step 5: Configure Backend Endpoint

Ensure the backend tRPC endpoint matches the frontend configuration:

**Backend (server/src/app.ts or similar):**
```ts
app.use('/api/trpc', createExpressMiddleware({ router: appRouter }));
```

**Frontend (.env):**
```env
VITE_TRPC_API_URL=/api/trpc
```

### Step 6: Test the Integration

1. Start the backend server:
   ```bash
   npm run server:dev
   ```

2. Start the frontend:
   ```bash
   npm run dev:frontend
   ```

3. Navigate to the example component:
   ```
   /app/examples/trpc
   ```

4. Test basic operations:
   - Query: Load posts
   - Mutation: Create a new post
   - Error handling: Try with invalid data
   - Optimistic updates: Check UI updates immediately

### Step 7: Verify Type Safety

1. Make a change to a backend procedure
2. Restart the TypeScript server in your IDE
3. Verify that frontend code shows type errors if the interface changed
4. This confirms end-to-end type safety is working

## Verification Checklist

- [ ] Backend tRPC router is implemented
- [ ] `AppRouter` type is exported from backend
- [ ] Frontend imports actual router types (not stubs)
- [ ] Temporary `router-types.ts` is deleted
- [ ] API endpoint URLs match between frontend and backend
- [ ] Authentication headers are being sent correctly
- [ ] Example component works without errors
- [ ] Type safety is enforced across the stack

## Common Issues

### Types Not Updating

**Problem:** Frontend still shows old types after backend changes.

**Solution:**
1. Restart TypeScript server in your IDE
2. Clear TypeScript cache: `rm -rf node_modules/.cache`
3. Rebuild backend: `npm run server:build`
4. Restart dev server

### CORS Errors

**Problem:** Browser shows CORS errors when making requests.

**Solution:**
Ensure backend has CORS configured for the frontend origin:
```ts
import cors from 'cors';
app.use(cors({
  origin: 'http://localhost:5173', // Vite default port
  credentials: true
}));
```

### 401 Unauthorized Errors

**Problem:** All requests return 401 errors.

**Solution:**
1. Check that Supabase session is valid
2. Verify authorization header is being sent:
   - Open browser DevTools > Network tab
   - Find tRPC request
   - Check headers include `Authorization: Bearer <token>`
3. Ensure backend is validating tokens correctly

### Type Import Errors

**Problem:** `Cannot find module '../../../server/src/trpc/root'`

**Solution:**
1. Verify backend file exists at that path
2. Check TypeScript configuration includes server paths
3. May need to add to `tsconfig.json`:
   ```json
   {
     "include": ["src", "server/src/trpc/root.ts"]
   }
   ```

## Testing After Migration

### Unit Tests

Add tests for tRPC hooks:
```tsx
import { renderHook, waitFor } from '@testing-library/react';
import { trpc } from '@/lib/trpc';
import { TRPCProvider } from '@/lib/trpc/Provider';

describe('tRPC hooks', () => {
  it('should fetch posts', async () => {
    const { result } = renderHook(
      () => trpc.blog.getPosts.useQuery(),
      { wrapper: TRPCProvider }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBeDefined();
  });
});
```

### Integration Tests

Test full flow from UI to database:
1. Create a post via UI
2. Verify it appears in the list
3. Delete the post
4. Verify it's removed

## Performance Optimization

After migration, consider these optimizations:

1. **Enable request batching** (already configured):
   - Multiple requests in same tick are batched into one HTTP request

2. **Tune stale time** per query:
   ```tsx
   const { data } = trpc.blog.getPosts.useQuery(undefined, {
     staleTime: 1000 * 60 * 10, // 10 minutes for rarely changing data
   });
   ```

3. **Implement pagination** for large lists:
   ```tsx
   const { data, fetchNextPage } = trpc.blog.getPosts.useInfiniteQuery(
     { limit: 20 },
     { getNextPageParam: (lastPage) => lastPage.nextCursor }
   );
   ```

4. **Use prefetching** for better UX:
   ```tsx
   const utils = trpc.useUtils();
   const handleMouseEnter = () => {
     utils.blog.getPost.prefetch({ id: postId });
   };
   ```

## Next Steps

After successful migration:

1. **Migrate existing API calls** to tRPC:
   - Identify fetch calls in the codebase
   - Create corresponding tRPC procedures
   - Replace fetch calls with tRPC hooks

2. **Add more routes** to the backend router:
   - Characters
   - Campaigns
   - Sessions
   - Game state

3. **Implement subscriptions** for real-time features:
   - Use tRPC subscriptions for live game updates
   - Replace WebSocket handlers where appropriate

4. **Add error monitoring**:
   - Integrate with error tracking service
   - Add custom error handling for specific error codes

5. **Document API**:
   - Generate API documentation from tRPC schema
   - Add examples for each procedure
