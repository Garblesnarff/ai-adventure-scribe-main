# tRPC Client Setup

This directory contains the frontend tRPC client configuration for type-safe API communication with the backend.

## Overview

tRPC provides end-to-end type safety between the frontend and backend without code generation. Changes to the backend API are immediately reflected in the frontend TypeScript types.

## Architecture

```
src/lib/trpc/
├── client.ts        # tRPC React client instance
├── Provider.tsx     # React provider with QueryClient
├── hooks.ts         # Convenience hooks and utilities
├── router-types.ts  # Type definitions (temporary until backend is ready)
└── README.md        # This file
```

## Setup

The tRPC client is already integrated into the application. The `TRPCProvider` wraps the app in `App.tsx`.

### Provider Hierarchy

```tsx
<AuthProvider>          {/* Provides authentication state */}
  <TRPCProvider>        {/* Provides tRPC client + React Query */}
    <App />
  </TRPCProvider>
</AuthProvider>
```

## Usage

### Basic Query

```tsx
import { trpc } from '@/lib/trpc/hooks';

function BlogList() {
  const { data, isLoading, error } = trpc.blog.getPosts.useQuery();

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <ul>
      {data?.map(post => (
        <li key={post.id}>{post.title}</li>
      ))}
    </ul>
  );
}
```

### Query with Parameters

```tsx
import { trpc } from '@/lib/trpc/hooks';

function BlogPost({ postId }: { postId: string }) {
  const { data: post } = trpc.blog.getPost.useQuery({ id: postId });

  return <div>{post?.title}</div>;
}
```

### Mutations

```tsx
import { trpc } from '@/lib/trpc/hooks';
import { toast } from 'sonner';

function CreatePostForm() {
  const utils = trpc.useUtils();

  const createPost = trpc.blog.createPost.useMutation({
    onSuccess: () => {
      // Invalidate and refetch posts list
      utils.blog.getPosts.invalidate();
      toast.success('Post created!');
    },
    onError: (error) => {
      toast.error(`Failed to create post: ${error.message}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createPost.mutate({
      title: 'My Post',
      content: 'Post content here...',
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* form fields */}
      <button type="submit" disabled={createPost.isPending}>
        {createPost.isPending ? 'Creating...' : 'Create Post'}
      </button>
    </form>
  );
}
```

### Optimistic Updates

```tsx
import { trpc } from '@/lib/trpc/hooks';

function UpdatePost({ postId }: { postId: string }) {
  const utils = trpc.useUtils();

  const updatePost = trpc.blog.updatePost.useMutation({
    onMutate: async (newData) => {
      // Cancel outgoing refetches
      await utils.blog.getPost.cancel({ id: postId });

      // Snapshot previous value
      const previous = utils.blog.getPost.getData({ id: postId });

      // Optimistically update
      utils.blog.getPost.setData({ id: postId }, (old) =>
        old ? { ...old, ...newData } : old
      );

      return { previous };
    },
    onError: (err, newData, context) => {
      // Rollback on error
      if (context?.previous) {
        utils.blog.getPost.setData({ id: postId }, context.previous);
      }
    },
    onSettled: () => {
      // Refetch after error or success
      utils.blog.getPost.invalidate({ id: postId });
    },
  });

  return (
    <button onClick={() => updatePost.mutate({ id: postId, title: 'Updated!' })}>
      Update Title
    </button>
  );
}
```

### Infinite Queries (Pagination)

```tsx
import { trpc } from '@/lib/trpc/hooks';

function InfiniteBlogList() {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = trpc.blog.getPosts.useInfiniteQuery(
    { limit: 10 },
    {
      getNextPageParam: (lastPage) => lastPage.nextCursor,
    }
  );

  return (
    <>
      {data?.pages.map((page, i) => (
        <div key={i}>
          {page.posts.map(post => (
            <div key={post.id}>{post.title}</div>
          ))}
        </div>
      ))}

      {hasNextPage && (
        <button
          onClick={() => fetchNextPage()}
          disabled={isFetchingNextPage}
        >
          {isFetchingNextPage ? 'Loading...' : 'Load More'}
        </button>
      )}
    </>
  );
}
```

## Authentication

Authentication is handled automatically. The `TRPCProvider` integrates with the `AuthContext` to:

1. Retrieve the current Supabase session
2. Include the access token in every request's `Authorization` header
3. Automatically update headers when the session changes

No manual token management is required in components.

## Error Handling

### Component-Level Error Handling

```tsx
import { trpc } from '@/lib/trpc/hooks';

function BlogPost({ id }: { id: string }) {
  const { data, error, isError } = trpc.blog.getPost.useQuery({ id });

  if (isError) {
    return <div>Error: {error.message}</div>;
  }

  return <div>{data?.title}</div>;
}
```

### Global Error Handling

Mutation errors are automatically logged via the logger configured in the QueryClient defaults.

## Cache Management

### Invalidate Queries

```tsx
const utils = trpc.useUtils();

// Invalidate all blog queries
utils.blog.invalidate();

// Invalidate specific query
utils.blog.getPosts.invalidate();

// Invalidate with specific input
utils.blog.getPost.invalidate({ id: '123' });
```

### Manual Cache Updates

```tsx
const utils = trpc.useUtils();

// Update cache directly
utils.blog.getPost.setData({ id: '123' }, (old) => ({
  ...old!,
  title: 'New Title',
}));
```

### Prefetching

```tsx
const utils = trpc.useUtils();

// Prefetch data before navigation
const handleMouseEnter = async () => {
  await utils.blog.getPost.prefetch({ id: '123' });
};
```

## Configuration

### API Endpoint

The API endpoint is configured via environment variable:

```env
VITE_TRPC_API_URL=/api/trpc
```

Default: `/api/trpc`

### Query Client Defaults

The QueryClient is configured with:

- **staleTime**: 5 minutes (data is fresh for 5 minutes)
- **retry**: 1 attempt (queries retry once on failure)
- **refetchOnWindowFocus**: Enabled in production only

You can override these per-query:

```tsx
const { data } = trpc.blog.getPosts.useQuery(undefined, {
  staleTime: 1000 * 60 * 10, // 10 minutes
  retry: 3, // Retry 3 times
  refetchOnWindowFocus: false, // Don't refetch on focus
});
```

## Type Safety

All queries and mutations are fully typed:

```tsx
// TypeScript knows the exact shape of the data
const { data } = trpc.blog.getPost.useQuery({ id: '123' });
// data is typed as: { id: string; title: string; ... } | undefined

// TypeScript enforces correct input types
createPost.mutate({
  title: 'My Post',
  content: 'Content',
  // TypeScript error if you add invalid fields or miss required ones
});
```

## Migration Notes

### Temporary Type Stubs

The `router-types.ts` file contains temporary type definitions until Work Unit 3.1 (backend tRPC setup) is completed.

**After backend implementation:**

1. Remove `router-types.ts`
2. Update `client.ts` to import from the backend:

```tsx
// Replace this:
import type { AppRouter } from './router-types';

// With this:
import type { AppRouter } from '../../../server/src/trpc/root';
```

### Replacing Existing API Calls

When migrating from direct fetch calls to tRPC:

**Before:**
```tsx
const response = await fetch('/api/v1/blog/posts');
const posts = await response.json();
```

**After:**
```tsx
const { data: posts } = trpc.blog.getPosts.useQuery();
```

Benefits:
- Type safety
- Automatic caching
- Loading states
- Error handling
- Refetch logic

## Best Practices

1. **Use mutations for data changes**: Always use `useMutation` for POST/PUT/DELETE operations
2. **Invalidate related queries**: After mutations, invalidate affected queries to refetch fresh data
3. **Leverage optimistic updates**: For better UX, update the UI optimistically before the server responds
4. **Handle loading and error states**: Always show appropriate UI for loading and error states
5. **Don't over-fetch**: Use query parameters to request only needed data
6. **Use prefetching**: Prefetch data when you know it will be needed soon (e.g., on hover)

## Troubleshooting

### No data returned

- Check that the backend tRPC server is running
- Verify the API endpoint configuration
- Check network tab for failed requests
- Ensure authentication token is valid

### Type errors

- Make sure backend types are in sync
- Rebuild the project after backend changes
- Check that `router-types.ts` matches backend schema

### Stale data

- Use `invalidate()` to force refetch
- Adjust `staleTime` for your use case
- Check if `refetchOnWindowFocus` is needed

## Resources

- [tRPC Documentation](https://trpc.io/docs)
- [React Query Documentation](https://tanstack.com/query/latest/docs/react/overview)
- [Work Unit 3.1 - Backend tRPC Setup](../../../docs/work-units/3.1-backend-trpc.md)
