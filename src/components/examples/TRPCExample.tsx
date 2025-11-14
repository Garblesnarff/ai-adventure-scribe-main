/**
 * tRPC Example Component
 *
 * This component demonstrates how to use tRPC for type-safe API calls.
 * It shows queries, mutations, optimistic updates, and error handling.
 *
 * @module components/examples/TRPCExample
 */

import { Loader2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { trpc } from '@/infrastructure/api';

/**
 * TRPCExample Component
 *
 * Demonstrates tRPC usage patterns including:
 * - Queries with loading states
 * - Mutations with optimistic updates
 * - Cache invalidation
 * - Error handling
 */
export function TRPCExample() {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  // Query: Fetch all blog posts
  const { data: posts, isLoading, error, refetch } = trpc.blog.getPosts.useQuery();

  // Mutation: Create a new blog post
  const utils = trpc.useUtils();
  const createPost = trpc.blog.createPost.useMutation({
    onMutate: async (newPost) => {
      // Cancel outgoing refetches to avoid overwriting optimistic update
      await utils.blog.getPosts.cancel();

      // Snapshot the previous value
      const previousPosts = utils.blog.getPosts.getData();

      // Optimistically update the cache
      utils.blog.getPosts.setData(undefined, (old) => [
        ...(old || []),
        {
          id: 'temp-' + Date.now(),
          title: newPost.title,
          content: newPost.content,
          authorId: 'current-user',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ]);

      return { previousPosts };
    },
    onError: (err, newPost, context) => {
      // Rollback to previous state on error
      if (context?.previousPosts) {
        utils.blog.getPosts.setData(undefined, context.previousPosts);
      }
      toast.error(`Failed to create post: ${err.message}`);
    },
    onSuccess: () => {
      // Show success message
      toast.success('Post created successfully!');
      // Clear form
      setTitle('');
      setContent('');
    },
    onSettled: () => {
      // Refetch to ensure data is up-to-date
      utils.blog.getPosts.invalidate();
    },
  });

  // Mutation: Delete a blog post
  const deletePost = trpc.blog.deletePost.useMutation({
    onMutate: async (variables) => {
      await utils.blog.getPosts.cancel();
      const previousPosts = utils.blog.getPosts.getData();

      // Optimistically remove from cache
      utils.blog.getPosts.setData(
        undefined,
        (old) => old?.filter((post) => post.id !== variables.id) || [],
      );

      return { previousPosts };
    },
    onError: (err, variables, context) => {
      if (context?.previousPosts) {
        utils.blog.getPosts.setData(undefined, context.previousPosts);
      }
      toast.error(`Failed to delete post: ${err.message}`);
    },
    onSuccess: () => {
      toast.success('Post deleted successfully!');
    },
    onSettled: () => {
      utils.blog.getPosts.invalidate();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      toast.error('Please fill in all fields');
      return;
    }
    createPost.mutate({ title, content });
  };

  const handleDelete = (postId: string) => {
    if (confirm('Are you sure you want to delete this post?')) {
      deletePost.mutate({ id: postId });
    }
  };

  return (
    <div className="container mx-auto py-8 space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>tRPC Example - Blog Posts</CardTitle>
          <CardDescription>
            This component demonstrates type-safe API calls with tRPC
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Create Post Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="title" className="block text-sm font-medium mb-2">
                Title
              </label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter post title..."
                disabled={createPost.isPending}
              />
            </div>

            <div>
              <label htmlFor="content" className="block text-sm font-medium mb-2">
                Content
              </label>
              <Textarea
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Enter post content..."
                rows={4}
                disabled={createPost.isPending}
              />
            </div>

            <div className="flex gap-2">
              <Button type="submit" disabled={createPost.isPending}>
                {createPost.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Post
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => refetch()}
                disabled={isLoading}
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Refresh
              </Button>
            </div>
          </form>

          {/* Posts List */}
          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold mb-4">Posts</h3>

            {isLoading && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            )}

            {error && (
              <div className="bg-destructive/10 text-destructive p-4 rounded-lg">
                Error loading posts: {error.message}
              </div>
            )}

            {posts && posts.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No posts yet. Create one above!
              </div>
            )}

            {posts && posts.length > 0 && (
              <div className="space-y-4">
                {posts.map((post) => (
                  <Card key={post.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-base">{post.title}</CardTitle>
                          <CardDescription>
                            {new Date(post.createdAt).toLocaleDateString()}
                          </CardDescription>
                        </div>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDelete(post.id)}
                          disabled={deletePost.isPending}
                        >
                          {deletePost.isPending && (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          )}
                          Delete
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">{post.content}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Usage Notes */}
      <Card>
        <CardHeader>
          <CardTitle>Type Safety Demonstration</CardTitle>
        </CardHeader>
        <CardContent className="prose prose-sm dark:prose-invert max-w-none">
          <p>This component demonstrates several tRPC patterns:</p>
          <ul>
            <li>
              <strong>Type-safe queries:</strong> The <code>getPosts</code> query automatically
              infers the return type from the backend
            </li>
            <li>
              <strong>Optimistic updates:</strong> Posts appear immediately in the UI before the
              server responds
            </li>
            <li>
              <strong>Automatic rollback:</strong> If the mutation fails, the UI reverts to the
              previous state
            </li>
            <li>
              <strong>Cache invalidation:</strong> After mutations, the cache is invalidated to
              ensure fresh data
            </li>
            <li>
              <strong>Error handling:</strong> Errors are caught and displayed with toast
              notifications
            </li>
          </ul>
          <p className="text-sm text-muted-foreground mt-4">
            Note: This example will only work once the backend tRPC router is implemented (Work Unit
            3.1).
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
