import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { BlogPost, BlogPostListFilters } from '@/types/blog';

import {
  createBlogPost,
  deleteBlogPost,
  getBlogPostById,
  getBlogPostBySlug,
  listBlogPosts,
  updateBlogPost,
  type BlogPostMutationInput,
} from '@/services/blog/blog-service';

const buildFiltersKey = (filters?: BlogPostListFilters) => ({
  status: filters?.status ?? 'all',
  search: filters?.search ?? '',
  scheduledOnly: Boolean(filters?.scheduledOnly),
  categoryId: filters?.categoryId ?? null,
  tagId: filters?.tagId ?? null,
  sortBy: filters?.sortBy ?? 'updatedAt',
  sortDirection: filters?.sortDirection ?? 'desc',
});

export const BLOG_POSTS_QUERY_KEY = 'blog-posts';

export function useBlogPosts(filters?: BlogPostListFilters) {
  return useQuery<BlogPost[]>({
    queryKey: [BLOG_POSTS_QUERY_KEY, buildFiltersKey(filters)],
    queryFn: () => listBlogPosts(filters),
    staleTime: 1000 * 30,
    gcTime: 1000 * 60 * 5,
  });
}

export function useBlogPostById(id?: string) {
  return useQuery<BlogPost | null>({
    queryKey: ['blog-post', 'id', id],
    queryFn: () => (id ? getBlogPostById(id) : Promise.resolve(null)),
    enabled: Boolean(id),
  });
}

export function useBlogPostBySlug(slug?: string) {
  return useQuery<BlogPost | null>({
    queryKey: ['blog-post', 'slug', slug],
    queryFn: () => (slug ? getBlogPostBySlug(slug) : Promise.resolve(null)),
    enabled: Boolean(slug),
  });
}

export function useCreateBlogPost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: BlogPostMutationInput) => createBlogPost(input),
    onSuccess: (post) => {
      queryClient.setQueryData(['blog-post', 'id', post.id], post);
      queryClient.invalidateQueries({ queryKey: [BLOG_POSTS_QUERY_KEY] });
    },
  });
}

export function useUpdateBlogPost(id?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<BlogPostMutationInput>) => {
      if (!id) throw new Error('Missing blog post id');
      return updateBlogPost(id, input);
    },
    onSuccess: (post) => {
      queryClient.setQueryData(['blog-post', 'id', post.id], post);
      queryClient.invalidateQueries({ queryKey: [BLOG_POSTS_QUERY_KEY] });
    },
  });
}

export function useDeleteBlogPost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteBlogPost(id),
    onSuccess: (_, id) => {
      queryClient.removeQueries({ queryKey: ['blog-post', 'id', id], exact: true });
      queryClient.invalidateQueries({ queryKey: [BLOG_POSTS_QUERY_KEY] });
    },
  });
}

export function useUpdateBlogPostById() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<BlogPostMutationInput> }) => {
      return updateBlogPost(id, input);
    },
    onSuccess: (post) => {
      queryClient.setQueryData(['blog-post', 'id', post.id], post);
      queryClient.invalidateQueries({ queryKey: [BLOG_POSTS_QUERY_KEY] });
    },
  });
}
