import type {
  BlogCategory,
  BlogMediaAsset,
  BlogPost,
  BlogPostListFilters,
  BlogPostStatus,
  BlogTag,
  SignedUploadRequest,
  SignedUploadResponse,
} from '@/types/blog';
import type { SupabaseClient } from '@supabase/supabase-js';

import { supabase } from '@/integrations/supabase/client';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8888';
const BLOG_MEDIA_BUCKET = 'blog-media';
const BLOG_MEDIA_PREFIX = 'uploads';

const supabaseClient = supabase as SupabaseClient<any, any, any>;

export type BlogPostMutationInput = {
  title: string;
  slug: string;
  content: string;
  excerpt?: string | null;
  coverImageUrl?: string | null;
  status: BlogPostStatus;
  seoTitle?: string | null;
  seoDescription?: string | null;
  publishedAt?: string | null;
  scheduledFor?: string | null;
  categoryIds?: string[];
  tagIds?: string[];
  allowComments?: boolean;
};

type Maybe<T> = T | null | undefined;

const toStringArray = (value: Maybe<any>): string[] => {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value
      .map((item) => (item == null ? null : String(item)))
      .filter((item): item is string => Boolean(item));
  }
  return [];
};

const coerceDate = (value: Maybe<string>): string | null => {
  if (!value) return null;
  try {
    const iso = new Date(value).toISOString();
    if (iso === 'Invalid Date') return null;
    return iso;
  } catch {
    return null;
  }
};

const mapCategory = (row: any): BlogCategory => ({
  id: String(row.id),
  title: row.name ?? row.title ?? '',
  slug: row.slug ?? '',
  description: row.description ?? null,
  createdAt: row.created_at ?? row.createdAt ?? new Date().toISOString(),
  updatedAt: row.updated_at ?? row.updatedAt ?? null,
  createdBy: row.created_by ?? row.createdBy ?? null,
});

const mapTag = (row: any): BlogTag => ({
  id: String(row.id),
  name: row.name ?? '',
  slug: row.slug ?? '',
  description: row.description ?? null,
  createdAt: row.created_at ?? row.createdAt ?? new Date().toISOString(),
  updatedAt: row.updated_at ?? row.updatedAt ?? null,
  createdBy: row.created_by ?? row.createdBy ?? null,
});

const mapBlogPost = (row: any): BlogPost => ({
  id: String(row.id),
  title: row.title ?? '',
  slug: row.slug ?? '',
  excerpt: row.excerpt ?? row.summary ?? null,
  content: row.content ?? '',
  coverImageUrl: row.cover_image_url ?? row.featured_image_url ?? row.coverImageUrl ?? null,
  status: (row.status ?? 'draft') as BlogPostStatus,
  seoTitle: row.seo_title ?? row.seoTitle ?? null,
  seoDescription: row.seo_description ?? row.seoDescription ?? null,
  publishedAt: coerceDate(row.published_at ?? row.publishedAt),
  scheduledFor: coerceDate(row.scheduled_for ?? row.scheduledFor),
  createdAt: row.created_at ?? row.createdAt ?? new Date().toISOString(),
  updatedAt: row.updated_at ?? row.updatedAt ?? row.created_at ?? new Date().toISOString(),
  authorId: row.author_id ?? row.authorId ?? '',
  authorRole: row.authorRole ?? null,
  categoryIds: toStringArray(row.category_ids ?? row.categoryIds),
  tagIds: toStringArray(row.tag_ids ?? row.tagIds),
  categories: Array.isArray(row.categories)
    ? row.categories.map(mapCategory)
    : undefined,
  tags: Array.isArray(row.tags)
    ? row.tags.map(mapTag)
    : undefined,
});

const buildInsertPayload = (input: BlogPostMutationInput) => ({
  title: input.title,
  slug: input.slug,
  content: input.content,
  summary: input.excerpt ?? null,
  featured_image_url: input.coverImageUrl ?? null,
  status: input.status,
  seo_title: input.seoTitle ?? null,
  seo_description: input.seoDescription ?? null,
  published_at: input.publishedAt ?? null,
  scheduled_for: input.scheduledFor ?? null,
  /* columns for category/tag links moved to join tables; kept here for compatibility no-ops */
  allow_comments: input.allowComments ?? true,
});

const buildUpdatePayload = (input: Partial<BlogPostMutationInput>) => {
  const payload: Record<string, any> = {};
  if (input.title !== undefined) payload.title = input.title;
  if (input.slug !== undefined) payload.slug = input.slug;
  if (input.content !== undefined) payload.content = input.content;
  if (input.excerpt !== undefined) payload.summary = input.excerpt ?? null;
  if (input.coverImageUrl !== undefined) payload.featured_image_url = input.coverImageUrl ?? null;
  if (input.status !== undefined) payload.status = input.status;
  if (input.seoTitle !== undefined) payload.seo_title = input.seoTitle ?? null;
  if (input.seoDescription !== undefined) payload.seo_description = input.seoDescription ?? null;
  if (input.publishedAt !== undefined) payload.published_at = input.publishedAt ?? null;
  if (input.scheduledFor !== undefined) payload.scheduled_for = input.scheduledFor ?? null;
  // category_ids and tag_ids are maintained via join tables in this schema
  if (input.allowComments !== undefined) payload.allow_comments = input.allowComments;
  return payload;
};

const fetchWithAuth = async (path: string, options: RequestInit = {}): Promise<Response> => {
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || res.statusText);
  }

  return res;
};

export const listBlogPosts = async (filters?: BlogPostListFilters): Promise<BlogPost[]> => {
  let query = supabaseClient
    .from('blog_posts')
    .select(`
      id,
      title,
      slug,
      summary,
      content,
      featured_image_url,
      status,
      seo_title,
      seo_description,
      published_at,
      scheduled_for,
      created_at,
      updated_at,
      author_id
    `);

  if (filters?.status && filters.status !== 'all') {
    query = query.eq('status', filters.status);
  }
  if (filters?.scheduledOnly) {
    query = query.not('scheduled_for', 'is', null);
  }
  if (filters?.search) {
    query = query.ilike('title', `%${filters.search}%`);
  }
  // category/tag filters require joins; omitted in this minimal client query

  const sortBy = filters?.sortBy || 'updatedAt';
  const ascending = filters?.sortDirection === 'asc';
  const columnMap: Record<string, string> = {
    updatedAt: 'updated_at',
    createdAt: 'created_at',
    title: 'title',
    status: 'status',
    publishedAt: 'published_at',
  };
  query = query.order(columnMap[sortBy] || 'updated_at', {
    ascending,
    nullsFirst: ascending,
  });

  const { data, error } = await query;
  if (error) {
    throw new Error(error.message);
  }

  const rows = (data ?? []).map((row: any) => ({
    ...row,
    excerpt: row.summary,
    cover_image_url: row.featured_image_url,
  }));
  return rows.map(mapBlogPost);
};

export const getBlogPostById = async (id: string): Promise<BlogPost | null> => {
  const { data, error } = await supabaseClient
    .from('blog_posts')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data ? mapBlogPost(data) : null;
};

export const getBlogPostBySlug = async (slug: string): Promise<BlogPost | null> => {
  const { data, error } = await supabaseClient
    .from('blog_posts')
    .select('*')
    .eq('slug', slug)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data ? mapBlogPost(data) : null;
};

export const createBlogPost = async (input: BlogPostMutationInput): Promise<BlogPost> => {
  const payload = buildInsertPayload(input);
  const { data, error } = await supabaseClient
    .from('blog_posts')
    .insert(payload)
    .select('*')
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return mapBlogPost(data);
};

export const updateBlogPost = async (id: string, input: Partial<BlogPostMutationInput>): Promise<BlogPost> => {
  if (!id) throw new Error('Missing blog post id');
  const payload = buildUpdatePayload(input);

  if (Object.keys(payload).length === 0) {
    const existing = await getBlogPostById(id);
    if (!existing) {
      throw new Error('Unable to load blog post for update');
    }
    return existing;
  }

  const { data, error } = await supabaseClient
    .from('blog_posts')
    .update(payload)
    .eq('id', id)
    .select('*')
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return mapBlogPost(data);
};

export const deleteBlogPost = async (id: string): Promise<void> => {
  const { error } = await supabaseClient
    .from('blog_posts')
    .delete()
    .eq('id', id);

  if (error) {
    throw new Error(error.message);
  }
};

export const listBlogCategories = async (): Promise<BlogCategory[]> => {
  const { data, error } = await supabaseClient
    .from('blog_categories')
    .select('*')
    .order('name', { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map(mapCategory);
};

export const createBlogCategory = async (input: { title: string; slug: string; description?: string | null; }): Promise<BlogCategory> => {
  const { data, error } = await supabaseClient
    .from('blog_categories')
    .insert({
      name: input.title,
      slug: input.slug,
      description: input.description ?? null,
    })
    .select('*')
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return mapCategory(data);
};

export const updateBlogCategory = async (id: string, input: { title?: string; slug?: string; description?: string | null; }): Promise<BlogCategory> => {
  const { data, error } = await supabaseClient
    .from('blog_categories')
    .update({
      ...(input.title !== undefined ? { name: input.title } : {}),
      ...(input.slug !== undefined ? { slug: input.slug } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
    })
    .eq('id', id)
    .select('*')
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return mapCategory(data);
};

export const deleteBlogCategory = async (id: string): Promise<void> => {
  const { error } = await supabaseClient
    .from('blog_categories')
    .delete()
    .eq('id', id);

  if (error) {
    throw new Error(error.message);
  }
};

export const listBlogTags = async (): Promise<BlogTag[]> => {
  const { data, error } = await supabaseClient
    .from('blog_tags')
    .select('*')
    .order('name', { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map(mapTag);
};

export const createBlogTag = async (input: { name: string; slug: string; description?: string | null; }): Promise<BlogTag> => {
  const { data, error } = await supabaseClient
    .from('blog_tags')
    .insert({
      name: input.name,
      slug: input.slug,
      description: input.description ?? null,
    })
    .select('*')
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return mapTag(data);
};

export const updateBlogTag = async (id: string, input: { name?: string; slug?: string; description?: string | null; }): Promise<BlogTag> => {
  const { data, error } = await supabaseClient
    .from('blog_tags')
    .update({
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.slug !== undefined ? { slug: input.slug } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
    })
    .eq('id', id)
    .select('*')
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return mapTag(data);
};

export const deleteBlogTag = async (id: string): Promise<void> => {
  const { error } = await supabaseClient
    .from('blog_tags')
    .delete()
    .eq('id', id);

  if (error) {
    throw new Error(error.message);
  }
};

export const listBlogMedia = async (prefix: string = BLOG_MEDIA_PREFIX, bucket: string = BLOG_MEDIA_BUCKET): Promise<BlogMediaAsset[]> => {
  const { data, error } = await supabaseClient.storage
    .from(bucket)
    .list(prefix, { limit: 500, offset: 0 });

  if (error) {
    throw new Error(error.message);
  }

  if (!Array.isArray(data)) {
    return [];
  }

  const assets: BlogMediaAsset[] = data
    .filter((item: any) => item && typeof item.name === 'string' && !item.name.endsWith('/'))
    .map((item: any) => {
      const path = `${prefix}/${item.name}`;
      const { data: urlData } = supabaseClient.storage.from(bucket).getPublicUrl(path);
      return {
        id: path,
        path,
        bucket,
        publicUrl: urlData.publicUrl,
        name: item.name,
        mimeType: item.metadata?.mimetype ?? item.content_type ?? null,
        size: item.size ?? item.metadata?.size ?? null,
        createdAt: item.created_at ?? item.updated_at ?? null,
      } as BlogMediaAsset;
    });

  assets.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  return assets;
};

export const requestSignedUpload = async (params: SignedUploadRequest): Promise<SignedUploadResponse> => {
  const res = await fetchWithAuth('/v1/blog/media/sign-upload', {
    method: 'POST',
    body: JSON.stringify({
      filename: params.filename,
      contentType: params.contentType,
      bucket: params.bucket || BLOG_MEDIA_BUCKET,
    }),
  });
  const data = (await res.json()) as SignedUploadResponse;
  return data;
};

export const uploadWithSignedUrl = async (signedUrl: string, file: Blob, contentType: string): Promise<void> => {
  const res = await fetch(signedUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': contentType,
    },
    body: file,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || res.statusText);
  }
};

export const deleteBlogMedia = async (path: string, bucket: string = BLOG_MEDIA_BUCKET): Promise<void> => {
  const { error } = await supabaseClient.storage.from(bucket).remove([path]);
  if (error) {
    throw new Error(error.message);
  }
};

export const buildMediaPublicUrl = (path: string, bucket: string = BLOG_MEDIA_BUCKET): string => {
  const { data } = supabaseClient.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
};

export { BLOG_MEDIA_BUCKET, BLOG_MEDIA_PREFIX };
