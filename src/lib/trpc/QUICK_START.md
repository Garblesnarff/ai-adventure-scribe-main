# tRPC Quick Start Guide

Quick reference for using tRPC in components.

## Import

```tsx
import { trpc } from '@/lib/trpc';
```

## Basic Query

```tsx
function MyComponent() {
  const { data, isLoading, error } = trpc.blog.getPosts.useQuery();

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return <div>{data.map(post => post.title)}</div>;
}
```

## Query with Parameters

```tsx
function BlogPost({ id }: { id: string }) {
  const { data: post } = trpc.blog.getPost.useQuery({ id });
  return <div>{post?.title}</div>;
}
```

## Basic Mutation

```tsx
function CreatePost() {
  const createPost = trpc.blog.createPost.useMutation();

  const handleCreate = () => {
    createPost.mutate({
      title: 'My Post',
      content: 'Content here...'
    });
  };

  return (
    <button onClick={handleCreate} disabled={createPost.isPending}>
      Create
    </button>
  );
}
```

## Mutation with Cache Update

```tsx
function CreatePost() {
  const utils = trpc.useUtils();

  const createPost = trpc.blog.createPost.useMutation({
    onSuccess: () => {
      // Refetch posts list
      utils.blog.getPosts.invalidate();
    }
  });

  return <button onClick={() => createPost.mutate({ title, content })}>
    Create
  </button>;
}
```

## Optimistic Update

```tsx
const createPost = trpc.blog.createPost.useMutation({
  onMutate: async (newPost) => {
    // Cancel refetch
    await utils.blog.getPosts.cancel();

    // Save previous state
    const previous = utils.blog.getPosts.getData();

    // Update cache optimistically
    utils.blog.getPosts.setData(undefined, (old) => [...old, newPost]);

    return { previous };
  },
  onError: (err, newPost, context) => {
    // Rollback on error
    utils.blog.getPosts.setData(undefined, context.previous);
  },
  onSettled: () => {
    // Refetch to ensure consistency
    utils.blog.getPosts.invalidate();
  }
});
```

## Query Options

```tsx
const { data } = trpc.blog.getPosts.useQuery(undefined, {
  staleTime: 1000 * 60 * 10, // 10 minutes
  retry: 3,
  refetchOnWindowFocus: false,
  enabled: userIsLoggedIn, // Conditional fetching
});
```

## Manual Refetch

```tsx
const { data, refetch } = trpc.blog.getPosts.useQuery();

<button onClick={() => refetch()}>Refresh</button>
```

## Cache Utils

```tsx
const utils = trpc.useUtils();

// Invalidate (trigger refetch)
utils.blog.getPosts.invalidate();

// Prefetch
await utils.blog.getPost.prefetch({ id: '123' });

// Update cache directly
utils.blog.getPost.setData({ id: '123' }, (old) => ({
  ...old,
  title: 'Updated'
}));

// Get cached data
const cached = utils.blog.getPosts.getData();
```

## Error Handling

```tsx
const createPost = trpc.blog.createPost.useMutation({
  onError: (error) => {
    toast.error(`Failed: ${error.message}`);
  },
  onSuccess: () => {
    toast.success('Post created!');
  }
});
```

## Loading States

```tsx
const { data, isLoading, isFetching, isError } = trpc.blog.getPosts.useQuery();

// isLoading: true on first fetch
// isFetching: true on any fetch (including refetch)
// isError: true if query failed

const createPost = trpc.blog.createPost.useMutation();

// createPost.isPending: true while mutating
// createPost.isSuccess: true after success
// createPost.isError: true if failed
```

## Common Patterns

### List with Create

```tsx
function BlogManager() {
  const { data: posts } = trpc.blog.getPosts.useQuery();
  const utils = trpc.useUtils();

  const createPost = trpc.blog.createPost.useMutation({
    onSuccess: () => utils.blog.getPosts.invalidate()
  });

  return (
    <>
      <button onClick={() => createPost.mutate({ title, content })}>
        Create
      </button>
      {posts?.map(post => <div key={post.id}>{post.title}</div>)}
    </>
  );
}
```

### Edit with Optimistic Update

```tsx
const updatePost = trpc.blog.updatePost.useMutation({
  onMutate: async (updated) => {
    await utils.blog.getPost.cancel({ id: updated.id });
    const previous = utils.blog.getPost.getData({ id: updated.id });

    utils.blog.getPost.setData({ id: updated.id }, (old) => ({
      ...old,
      ...updated
    }));

    return { previous };
  },
  onError: (err, vars, context) => {
    utils.blog.getPost.setData({ id: vars.id }, context.previous);
  }
});
```

### Delete with Confirmation

```tsx
const deletePost = trpc.blog.deletePost.useMutation({
  onSuccess: () => utils.blog.getPosts.invalidate()
});

const handleDelete = (id: string) => {
  if (confirm('Delete this post?')) {
    deletePost.mutate({ id });
  }
};
```

## Tips

1. Always invalidate related queries after mutations
2. Use optimistic updates for better UX
3. Handle errors with toast notifications
4. Show loading states during operations
5. Use `enabled` option for conditional queries
6. Prefetch data on hover for better perceived performance

## See Also

- Full documentation: `src/lib/trpc/README.md`
- Migration guide: `src/lib/trpc/MIGRATION.md`
- Example component: `src/components/examples/TRPCExample.tsx`
