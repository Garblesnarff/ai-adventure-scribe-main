/**
 * tRPC Usage Examples
 *
 * This file contains copy-paste examples for common tRPC patterns.
 * Not imported anywhere - just for developer reference.
 */

import { toast } from 'sonner';

import { trpc } from '@/lib/trpc';

// ============================================
// 1. BASIC QUERY
// ============================================
export function BasicQueryExample() {
  const { data, isLoading, error } = trpc.blog.getPosts.useQuery();

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <ul>
      {data?.map((post) => (
        <li key={post.id}>{post.title}</li>
      ))}
    </ul>
  );
}

// ============================================
// 2. QUERY WITH PARAMETERS
// ============================================
export function ParameterizedQueryExample({ postId }: { postId: string }) {
  const { data: post } = trpc.blog.getPost.useQuery({ id: postId });

  return <div>{post?.title}</div>;
}

// ============================================
// 3. SIMPLE MUTATION
// ============================================
export function SimpleMutationExample() {
  const createPost = trpc.blog.createPost.useMutation({
    onSuccess: () => {
      toast.success('Post created!');
    },
    onError: (error) => {
      toast.error(`Failed: ${error.message}`);
    },
  });

  const handleCreate = () => {
    createPost.mutate({
      title: 'My Post',
      content: 'Post content...',
    });
  };

  return (
    <button onClick={handleCreate} disabled={createPost.isPending}>
      {createPost.isPending ? 'Creating...' : 'Create Post'}
    </button>
  );
}

// ============================================
// 4. MUTATION WITH CACHE INVALIDATION
// ============================================
export function MutationWithInvalidationExample() {
  const utils = trpc.useUtils();

  const createPost = trpc.blog.createPost.useMutation({
    onSuccess: () => {
      // Invalidate posts query to refetch
      utils.blog.getPosts.invalidate();
      toast.success('Post created!');
    },
  });

  return (
    <button onClick={() => createPost.mutate({ title: 'Test', content: 'Test' })}>Create</button>
  );
}

// ============================================
// 5. OPTIMISTIC UPDATE
// ============================================
export function OptimisticUpdateExample() {
  const utils = trpc.useUtils();

  const createPost = trpc.blog.createPost.useMutation({
    onMutate: async (newPost) => {
      // Cancel outgoing refetches
      await utils.blog.getPosts.cancel();

      // Snapshot previous value
      const previous = utils.blog.getPosts.getData();

      // Optimistically update cache
      utils.blog.getPosts.setData(undefined, (old) => [
        ...(old || []),
        {
          id: 'temp-' + Date.now(),
          ...newPost,
          authorId: 'current-user',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ]);

      return { previous };
    },
    onError: (err, newPost, context) => {
      // Rollback on error
      if (context?.previous) {
        utils.blog.getPosts.setData(undefined, context.previous);
      }
      toast.error(`Failed: ${err.message}`);
    },
    onSettled: () => {
      // Refetch to ensure consistency
      utils.blog.getPosts.invalidate();
    },
  });

  return (
    <button onClick={() => createPost.mutate({ title: 'Test', content: 'Test' })}>
      Create (Optimistic)
    </button>
  );
}

// ============================================
// 6. DELETE WITH OPTIMISTIC REMOVAL
// ============================================
export function OptimisticDeleteExample() {
  const utils = trpc.useUtils();

  const deletePost = trpc.blog.deletePost.useMutation({
    onMutate: async (variables) => {
      await utils.blog.getPosts.cancel();
      const previous = utils.blog.getPosts.getData();

      // Optimistically remove from cache
      utils.blog.getPosts.setData(
        undefined,
        (old) => old?.filter((post) => post.id !== variables.id) || [],
      );

      return { previous };
    },
    onError: (err, variables, context) => {
      if (context?.previous) {
        utils.blog.getPosts.setData(undefined, context.previous);
      }
      toast.error(`Failed: ${err.message}`);
    },
    onSettled: () => {
      utils.blog.getPosts.invalidate();
    },
  });

  const handleDelete = (postId: string) => {
    if (confirm('Delete this post?')) {
      deletePost.mutate({ id: postId });
    }
  };

  return <button onClick={() => handleDelete('123')}>Delete</button>;
}

// ============================================
// 7. QUERY WITH OPTIONS
// ============================================
export function QueryWithOptionsExample({ userId }: { userId: string | null }) {
  const { data } = trpc.blog.getPosts.useQuery(undefined, {
    staleTime: 1000 * 60 * 10, // 10 minutes
    retry: 3,
    refetchOnWindowFocus: false,
    enabled: !!userId, // Only fetch if user is logged in
  });

  return <div>{data?.length} posts</div>;
}

// ============================================
// 8. PREFETCHING
// ============================================
export function PrefetchExample() {
  const utils = trpc.useUtils();

  const handleMouseEnter = async (postId: string) => {
    // Prefetch data before navigation
    await utils.blog.getPost.prefetch({ id: postId });
  };

  return (
    <a href="/post/123" onMouseEnter={() => handleMouseEnter('123')}>
      Hover to prefetch
    </a>
  );
}

// ============================================
// 9. MANUAL CACHE UPDATE
// ============================================
export function ManualCacheUpdateExample() {
  const utils = trpc.useUtils();

  const handleUpdate = () => {
    // Update cache directly without mutation
    utils.blog.getPost.setData({ id: '123' }, (old) => {
      if (!old) return old;
      return {
        ...old,
        title: 'Updated Title',
      };
    });
  };

  return <button onClick={handleUpdate}>Update Cache</button>;
}

// ============================================
// 10. FULL CRUD COMPONENT
// ============================================
export function FullCRUDExample() {
  const { data: posts, isLoading } = trpc.blog.getPosts.useQuery();
  const utils = trpc.useUtils();

  const createPost = trpc.blog.createPost.useMutation({
    onSuccess: () => utils.blog.getPosts.invalidate(),
  });

  const updatePost = trpc.blog.updatePost.useMutation({
    onSuccess: () => utils.blog.getPosts.invalidate(),
  });

  const deletePost = trpc.blog.deletePost.useMutation({
    onSuccess: () => utils.blog.getPosts.invalidate(),
  });

  if (isLoading) return <div>Loading...</div>;

  return (
    <div>
      <button onClick={() => createPost.mutate({ title: 'New', content: 'Content' })}>
        Create
      </button>

      {posts?.map((post) => (
        <div key={post.id}>
          <h3>{post.title}</h3>
          <button onClick={() => updatePost.mutate({ id: post.id, title: 'Updated' })}>
            Update
          </button>
          <button onClick={() => deletePost.mutate({ id: post.id })}>Delete</button>
        </div>
      ))}
    </div>
  );
}
