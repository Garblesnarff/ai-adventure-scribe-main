import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { BlogCategory, BlogTag } from '@/types/blog';

import {
  createBlogCategory,
  createBlogTag,
  deleteBlogCategory,
  deleteBlogTag,
  listBlogCategories,
  listBlogTags,
  updateBlogCategory,
  updateBlogTag,
} from '@/services/blog/blog-service';

export const BLOG_CATEGORIES_QUERY_KEY = 'blog-categories';
export const BLOG_TAGS_QUERY_KEY = 'blog-tags';

const generateTempId = () => {
  const globalCrypto =
    typeof globalThis !== 'undefined' ? (globalThis.crypto as Crypto | undefined) : undefined;
  if (globalCrypto?.randomUUID) {
    return globalCrypto.randomUUID();
  }
  return Math.random().toString(36).slice(2, 10);
};

export function useBlogCategories() {
  return useQuery<BlogCategory[]>({
    queryKey: [BLOG_CATEGORIES_QUERY_KEY],
    queryFn: () => listBlogCategories(),
    staleTime: 1000 * 60,
  });
}

export function useBlogTags() {
  return useQuery<BlogTag[]>({
    queryKey: [BLOG_TAGS_QUERY_KEY],
    queryFn: () => listBlogTags(),
    staleTime: 1000 * 60,
  });
}

export function useCreateBlogCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createBlogCategory,
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: [BLOG_CATEGORIES_QUERY_KEY] });
      const previous = queryClient.getQueryData<BlogCategory[]>([BLOG_CATEGORIES_QUERY_KEY]);
      const optimistic: BlogCategory = {
        id: generateTempId(),
        title: input.title,
        slug: input.slug,
        description: input.description ?? null,
        createdAt: new Date().toISOString(),
        updatedAt: null,
      };
      queryClient.setQueryData<BlogCategory[]>([BLOG_CATEGORIES_QUERY_KEY], (old) =>
        old ? [optimistic, ...old] : [optimistic],
      );
      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData([BLOG_CATEGORIES_QUERY_KEY], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [BLOG_CATEGORIES_QUERY_KEY] });
    },
  });
}

export function useUpdateBlogCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      values,
    }: {
      id: string;
      values: { title?: string; slug?: string; description?: string | null };
    }) => updateBlogCategory(id, values),
    onMutate: async ({ id, values }) => {
      await queryClient.cancelQueries({ queryKey: [BLOG_CATEGORIES_QUERY_KEY] });
      const previous = queryClient.getQueryData<BlogCategory[]>([BLOG_CATEGORIES_QUERY_KEY]);
      queryClient.setQueryData<BlogCategory[]>(
        [BLOG_CATEGORIES_QUERY_KEY],
        (old) =>
          old?.map((category) =>
            category.id === id
              ? {
                  ...category,
                  ...(values.title !== undefined ? { title: values.title } : {}),
                  ...(values.slug !== undefined ? { slug: values.slug } : {}),
                  ...(values.description !== undefined ? { description: values.description } : {}),
                  updatedAt: new Date().toISOString(),
                }
              : category,
          ) ?? [],
      );
      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData([BLOG_CATEGORIES_QUERY_KEY], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [BLOG_CATEGORIES_QUERY_KEY] });
    },
  });
}

export function useDeleteBlogCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteBlogCategory(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: [BLOG_CATEGORIES_QUERY_KEY] });
      const previous = queryClient.getQueryData<BlogCategory[]>([BLOG_CATEGORIES_QUERY_KEY]);
      queryClient.setQueryData<BlogCategory[]>(
        [BLOG_CATEGORIES_QUERY_KEY],
        (old) => old?.filter((category) => category.id !== id) ?? [],
      );
      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData([BLOG_CATEGORIES_QUERY_KEY], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [BLOG_CATEGORIES_QUERY_KEY] });
    },
  });
}

export function useCreateBlogTag() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createBlogTag,
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: [BLOG_TAGS_QUERY_KEY] });
      const previous = queryClient.getQueryData<BlogTag[]>([BLOG_TAGS_QUERY_KEY]);
      const optimistic: BlogTag = {
        id: generateTempId(),
        name: input.name,
        slug: input.slug,
        description: input.description ?? null,
        createdAt: new Date().toISOString(),
        updatedAt: null,
      };
      queryClient.setQueryData<BlogTag[]>([BLOG_TAGS_QUERY_KEY], (old) =>
        old ? [optimistic, ...old] : [optimistic],
      );
      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData([BLOG_TAGS_QUERY_KEY], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [BLOG_TAGS_QUERY_KEY] });
    },
  });
}

export function useUpdateBlogTag() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      values,
    }: {
      id: string;
      values: { name?: string; slug?: string; description?: string | null };
    }) => updateBlogTag(id, values),
    onMutate: async ({ id, values }) => {
      await queryClient.cancelQueries({ queryKey: [BLOG_TAGS_QUERY_KEY] });
      const previous = queryClient.getQueryData<BlogTag[]>([BLOG_TAGS_QUERY_KEY]);
      queryClient.setQueryData<BlogTag[]>(
        [BLOG_TAGS_QUERY_KEY],
        (old) =>
          old?.map((tag) =>
            tag.id === id
              ? {
                  ...tag,
                  ...(values.name !== undefined ? { name: values.name } : {}),
                  ...(values.slug !== undefined ? { slug: values.slug } : {}),
                  ...(values.description !== undefined ? { description: values.description } : {}),
                  updatedAt: new Date().toISOString(),
                }
              : tag,
          ) ?? [],
      );
      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData([BLOG_TAGS_QUERY_KEY], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [BLOG_TAGS_QUERY_KEY] });
    },
  });
}

export function useDeleteBlogTag() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteBlogTag(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: [BLOG_TAGS_QUERY_KEY] });
      const previous = queryClient.getQueryData<BlogTag[]>([BLOG_TAGS_QUERY_KEY]);
      queryClient.setQueryData<BlogTag[]>(
        [BLOG_TAGS_QUERY_KEY],
        (old) => old?.filter((tag) => tag.id !== id) ?? [],
      );
      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData([BLOG_TAGS_QUERY_KEY], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [BLOG_TAGS_QUERY_KEY] });
    },
  });
}
