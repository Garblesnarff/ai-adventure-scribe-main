import { Router } from 'express';

import { mapBlogCategory, mapBlogPost, mapBlogTag } from './blog/mappers.js';
import {
  blogCategorySchema,
  blogCategoryUpdateSchema,
  blogListQuerySchema,
  blogMediaRequestSchema,
  blogPostInputSchema,
  blogPostPublishSchema,
  blogPostScheduleSchema,
  blogPostUpdateSchema,
  blogSlugCheckSchema,
  blogTagSchema,
  blogTagUpdateSchema,
} from './blog/schemas.js';
import { supabaseService } from '../../lib/supabase.js';
import { requireAuth } from '../../middleware/auth.js';
import { requireBlogAdmin } from '../../middleware/blog-admin.js';
import { requireBlogAuthor, canManagePost, getBlogRole } from '../../middleware/blog-author.js';

import type { BlogPostRow, BlogCategoryRow, BlogTagRow, BlogCategory, BlogTag } from './blog/types.js';
import type { Request, Response } from 'express';

const BLOG_POST_SELECT = `
  id,
  slug,
  title,
  summary,
  content,
  featured_image_url,
  hero_image_alt,
  seo_title,
  seo_description,
  seo_keywords,
  canonical_url,
  status,
  scheduled_for,
  published_at,
  metadata,
  created_at,
  updated_at,
  author_id,
  categories:blog_post_categories (
    category:blog_categories (
      id,
      slug,
      name,
      description,
      created_at,
      updated_at
    )
  ),
  tags:blog_post_tags (
    tag:blog_tags (
      id,
      slug,
      name,
      description,
      created_at,
      updated_at
    )
  )
`;

const BLOG_POST_SUMMARY_SELECT = `
  id,
  slug,
  title,
  summary,
  featured_image_url,
  hero_image_alt,
  status,
  scheduled_for,
  published_at,
  created_at,
  updated_at,
  author_id,
  categories:blog_post_categories (
    category:blog_categories (
      id,
      slug,
      name,
      description
    )
  ),
  tags:blog_post_tags (
    tag:blog_tags (
      id,
      slug,
      name
    )
  )
`;

function handleValidationError(res: Response, error: any) {
  return res.status(400).json({
    error: 'Invalid request payload',
    details: error?.flatten?.() ?? error?.issues ?? error,
  });
}

async function syncPostRelations(postId: string, categoryIds?: string[], tagIds?: string[]) {
  if (categoryIds !== undefined) {
    const { error: deleteError } = await supabaseService
      .from('blog_post_categories')
      .delete()
      .eq('post_id', postId);
    if (deleteError) throw deleteError;

    if (categoryIds.length > 0) {
      const insertPayload = categoryIds.map((categoryId) => ({
        post_id: postId,
        category_id: categoryId,
      }));
      const { error: insertError } = await supabaseService
        .from('blog_post_categories')
        .insert(insertPayload);
      if (insertError) throw insertError;
    }
  }

  if (tagIds !== undefined) {
    const { error: deleteError } = await supabaseService
      .from('blog_post_tags')
      .delete()
      .eq('post_id', postId);
    if (deleteError) throw deleteError;

    if (tagIds.length > 0) {
      const insertPayload = tagIds.map((tagId) => ({
        post_id: postId,
        tag_id: tagId,
      }));
      const { error: insertError } = await supabaseService
        .from('blog_post_tags')
        .insert(insertPayload);
      if (insertError) throw insertError;
    }
  }
}

const slugNotFoundError = (error: any) => (error && typeof error === 'object' && 'code' in error && (error as any).code === 'PGRST116');

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(value: string | null | undefined): value is string {
  if (!value) return false;
  return UUID_REGEX.test(value);
}

async function fetchAuthorIdForUser(userId: string): Promise<string | null> {
  const { data, error } = await supabaseService
    .from('blog_authors')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data?.id ?? null;
}

async function ensureAuthorExists(authorId: string): Promise<boolean> {
  if (!isUuid(authorId)) return false;
  const { data, error } = await supabaseService
    .from('blog_authors')
    .select('id')
    .eq('id', authorId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return Boolean(data?.id);
}

async function resolveAuthorIdForRequest(req: Request, explicitAuthorId?: string | null): Promise<string> {
  const userId = req.user!.userId;
  const role = req.blogRole ?? 'viewer';

  if (role === 'admin' && explicitAuthorId) {
    const exists = await ensureAuthorExists(explicitAuthorId);
    if (!exists) {
      throw new Error('BLOG_AUTHOR_NOT_FOUND');
    }
    return explicitAuthorId;
  }

  const authorId = await fetchAuthorIdForUser(userId);
  if (!authorId) {
    throw new Error('BLOG_AUTHOR_PROFILE_REQUIRED');
  }
  return authorId;
}

function normalizeSeoKeywords(keywords?: string[] | null): string[] {
  if (!keywords || keywords.length === 0) return [];
  const normalized = keywords.map((value) => value.trim()).filter(Boolean);
  return normalized;
}

function normalizeMetadata(metadata?: Record<string, unknown> | null): Record<string, unknown> {
  if (metadata && typeof metadata === 'object') {
    return metadata;
  }
  return {};
}

function normalizeStatusPayload(status: string, scheduledFor?: string | null, publishedAt?: string | null) {
  const payload: Record<string, unknown> = { status };

  switch (status) {
    case 'published': {
      payload.published_at = publishedAt ?? new Date().toISOString();
      payload.scheduled_for = null;
      break;
    }
    case 'scheduled': {
      payload.scheduled_for = scheduledFor ?? null;
      payload.published_at = null;
      break;
    }
    case 'draft':
    case 'review':
    case 'archived':
    default: {
      payload.scheduled_for = null;
      payload.published_at = null;
      break;
    }
  }

  return payload;
}

export default function blogRouter() {
  const router = Router();

  router.get('/posts', async (req: Request, res: Response) => {
    const parsed = blogListQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return handleValidationError(res, parsed.error);
    }
    const { page, pageSize, category, tag, search } = parsed.data;
    const rangeStart = (page - 1) * pageSize;
    const rangeEnd = rangeStart + pageSize - 1;

    try {
      let query = supabaseService
        .from('blog_posts')
        .select(BLOG_POST_SUMMARY_SELECT, { count: 'exact' })
        .eq('status', 'published')
        .lte('published_at', new Date().toISOString());

      if (search) {
        const sanitized = search.replace(/[%_]/g, '').trim();
        if (sanitized.length > 0) {
          query = query.or(`title.ilike.%${sanitized}%,summary.ilike.%${sanitized}%`);
        }
      }

      const { data, error, count } = await query
        .order('published_at', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false })
        .range(rangeStart, rangeEnd);

      if (error) throw error;

      const mapped = (data ?? []).map((row) => mapBlogPost(row as unknown as BlogPostRow, { includeContent: false }));
      const filtered = mapped.filter((post) => {
        const categoryOk = !category || post.categories.some((c) => c.slug === category || c.id === category);
        const tagOk = !tag || post.tags.some((t) => t.slug === tag || t.id === tag);
        return categoryOk && tagOk;
      });

      return res.json({
        data: filtered,
        meta: {
          page,
          pageSize,
          total: category || tag ? filtered.length : count ?? filtered.length,
        },
      });
    } catch (error) {
      return res.status(500).json({ error: 'Failed to fetch blog posts' });
    }
  });

  router.get('/posts/:slug', async (req: Request, res: Response) => {
    const { slug } = req.params;
    if (!slug) {
      return res.status(400).json({ error: 'Missing slug' });
    }

    try {
      const { data, error } = await supabaseService
        .from('blog_posts')
        .select(BLOG_POST_SELECT)
        .eq('slug', slug)
        .eq('status', 'published')
        .single();

      if (error || !data) {
        if (slugNotFoundError(error)) {
          return res.status(404).json({ error: 'Blog post not found' });
        }
        throw error;
      }

      return res.json(mapBlogPost(data as unknown as BlogPostRow, { includeHtml: true }));
    } catch (error) {
      return res.status(500).json({ error: 'Failed to fetch blog post' });
    }
  });

  router.get('/categories', async (_req: Request, res: Response) => {
    try {
      const { data, error } = await supabaseService
        .from('blog_categories')
        .select('*')
        .order('name', { ascending: true });
      if (error) throw error;
      const categories = (data ?? [])
        .map((row) => mapBlogCategory(row as BlogCategoryRow))
        .filter((value): value is BlogCategory => Boolean(value));
      return res.json(categories);
    } catch (error) {
      return res.status(500).json({ error: 'Failed to fetch categories' });
    }
  });

  router.get('/tags', async (_req: Request, res: Response) => {
    try {
      const { data, error } = await supabaseService
        .from('blog_tags')
        .select('*')
        .order('name', { ascending: true });
      if (error) throw error;
      const tags = (data ?? [])
        .map((row) => mapBlogTag(row as BlogTagRow))
        .filter((value): value is BlogTag => Boolean(value));
      return res.json(tags);
    } catch (error) {
      return res.status(500).json({ error: 'Failed to fetch tags' });
    }
  });

  router.post('/posts', requireAuth, requireBlogAuthor, async (req: Request, res: Response) => {
    const parsed = blogPostInputSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      return handleValidationError(res, parsed.error);
    }

    const payload = parsed.data;
    const status = payload.status ?? 'draft';

    try {
      const authorId = await resolveAuthorIdForRequest(req, payload.authorId ?? null);

      const statusFields = normalizeStatusPayload(status, payload.scheduledFor, payload.publishedAt);

      const { data: inserted, error: insertError } = await supabaseService
        .from('blog_posts')
        .insert({
          title: payload.title,
          slug: payload.slug,
          summary: payload.summary ?? null,
          content: payload.content ?? null,
          featured_image_url: payload.featuredImageUrl ?? null,
          hero_image_alt: payload.heroImageAlt ?? null,
          seo_title: payload.seoTitle ?? null,
          seo_description: payload.seoDescription ?? null,
          seo_keywords: normalizeSeoKeywords(payload.seoKeywords),
          canonical_url: payload.canonicalUrl ?? null,
          ...statusFields,
          metadata: normalizeMetadata(payload.metadata),
          author_id: authorId,
        })
        .select('id')
        .single();

      if (insertError || !inserted) {
        if ((insertError as any)?.code === '23505') {
          return res.status(409).json({ error: 'Slug already exists' });
        }
        if ((insertError as any)?.code === '23503') {
          return res.status(400).json({ error: 'Invalid author reference' });
        }
        throw insertError;
      }

      await syncPostRelations(inserted.id, payload.categoryIds, payload.tagIds);
      const { data, error } = await supabaseService
        .from('blog_posts')
        .select(BLOG_POST_SELECT)
        .eq('id', inserted.id)
        .single();

      if (error || !data) {
        throw error;
      }

      return res.status(201).json(mapBlogPost(data as unknown as BlogPostRow));
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'BLOG_AUTHOR_NOT_FOUND') {
          return res.status(400).json({ error: 'Author not found' });
        }
        if (error.message === 'BLOG_AUTHOR_PROFILE_REQUIRED') {
          return res.status(400).json({ error: 'You must create an author profile before creating posts' });
        }
      }
      return res.status(500).json({ error: 'Failed to create blog post' });
    }
  });

  router.put('/posts/:id', requireAuth, requireBlogAuthor, async (req: Request, res: Response) => {
    const parsed = blogPostUpdateSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      return handleValidationError(res, parsed.error);
    }

    const payload = parsed.data;
    const { id } = req.params;

    try {
      const userId = req.user!.userId;
      const canManage = await canManagePost(id, userId);
      if (!canManage) {
        return res.status(403).json({ error: 'You do not have permission to update this post' });
      }

      const updatePayload: Record<string, unknown> = {};

      if (payload.title !== undefined) updatePayload.title = payload.title;
      if (payload.slug !== undefined) updatePayload.slug = payload.slug;
      if (payload.summary !== undefined) updatePayload.summary = payload.summary ?? null;
      if (payload.content !== undefined) updatePayload.content = payload.content ?? null;
      if (payload.featuredImageUrl !== undefined) updatePayload.featured_image_url = payload.featuredImageUrl ?? null;
      if (payload.heroImageAlt !== undefined) updatePayload.hero_image_alt = payload.heroImageAlt ?? null;
      if (payload.seoTitle !== undefined) updatePayload.seo_title = payload.seoTitle ?? null;
      if (payload.seoDescription !== undefined) updatePayload.seo_description = payload.seoDescription ?? null;
      if (payload.seoKeywords !== undefined) updatePayload.seo_keywords = normalizeSeoKeywords(payload.seoKeywords);
      if (payload.canonicalUrl !== undefined) updatePayload.canonical_url = payload.canonicalUrl ?? null;
      if (payload.metadata !== undefined) updatePayload.metadata = normalizeMetadata(payload.metadata);

      if (payload.authorId !== undefined && req.blogRole === 'admin') {
        if (payload.authorId === null) {
          return res.status(400).json({ error: 'Author ID cannot be null' });
        }
        const exists = await ensureAuthorExists(payload.authorId);
        if (!exists) {
          return res.status(400).json({ error: 'Author not found' });
        }
        updatePayload.author_id = payload.authorId;
      }

      if (payload.status !== undefined) {
        if (payload.status === 'scheduled' && !payload.scheduledFor) {
          return res.status(400).json({ error: 'scheduledFor is required when scheduling a post' });
        }
        const statusFields = normalizeStatusPayload(payload.status, payload.scheduledFor, payload.publishedAt);
        Object.assign(updatePayload, statusFields);
      } else {
        if (payload.scheduledFor !== undefined) {
          updatePayload.scheduled_for = payload.scheduledFor;
        }
        if (payload.publishedAt !== undefined) {
          updatePayload.published_at = payload.publishedAt;
        }
      }

      const hasUpdates = Object.keys(updatePayload).length > 0;

      if (hasUpdates) {
        updatePayload.updated_at = new Date().toISOString();
        const { error: updateError } = await supabaseService
          .from('blog_posts')
          .update(updatePayload)
          .eq('id', id)
          .select('id')
          .single();

        if (updateError) {
          if ((updateError as any)?.code === '23505') {
            return res.status(409).json({ error: 'Slug already exists' });
          }
          if (slugNotFoundError(updateError)) {
            return res.status(404).json({ error: 'Blog post not found' });
          }
          throw updateError;
        }
      }

      if (payload.categoryIds !== undefined || payload.tagIds !== undefined) {
        await syncPostRelations(id, payload.categoryIds, payload.tagIds);
      }

      const { data, error } = await supabaseService
        .from('blog_posts')
        .select(BLOG_POST_SELECT)
        .eq('id', id)
        .single();

      if (error || !data) {
        if (slugNotFoundError(error)) {
          return res.status(404).json({ error: 'Blog post not found' });
        }
        throw error;
      }

      return res.json(mapBlogPost(data as unknown as BlogPostRow));
    } catch (error) {
      if (error instanceof Error && error.message === 'BLOG_AUTHOR_NOT_FOUND') {
        return res.status(400).json({ error: 'Author not found' });
      }
      return res.status(500).json({ error: 'Failed to update blog post' });
    }
  });

  router.post('/posts/:id/publish', requireAuth, requireBlogAuthor, async (req: Request, res: Response) => {
    const parsed = blogPostPublishSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      return handleValidationError(res, parsed.error);
    }

    const publishTimestamp = parsed.data.publishedAt ?? new Date().toISOString();
    const { id } = req.params;

    try {
      const userId = req.user!.userId;
      const canManage = await canManagePost(id, userId);
      if (!canManage) {
        return res.status(403).json({ error: 'You do not have permission to publish this post' });
      }

      const statusFields = normalizeStatusPayload('published', null, publishTimestamp);

      const { data, error } = await supabaseService
        .from('blog_posts')
        .update({
          ...statusFields,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select(BLOG_POST_SELECT)
        .single();

      if (error || !data) {
        if (slugNotFoundError(error)) {
          return res.status(404).json({ error: 'Blog post not found' });
        }
        throw error;
      }

      return res.json(mapBlogPost(data as unknown as BlogPostRow));
    } catch (error) {
      return res.status(500).json({ error: 'Failed to publish blog post' });
    }
  });

  router.delete('/posts/:id', requireAuth, requireBlogAuthor, async (req: Request, res: Response) => {
    const { id } = req.params;

    try {
      const userId = req.user!.userId;
      const canManage = await canManagePost(id, userId);
      if (!canManage) {
        return res.status(403).json({ error: 'You do not have permission to delete this post' });
      }

      const { error: categoryJoinError } = await supabaseService
        .from('blog_post_categories')
        .delete()
        .eq('post_id', id);
      if (categoryJoinError) throw categoryJoinError;

      const { error: tagJoinError } = await supabaseService
        .from('blog_post_tags')
        .delete()
        .eq('post_id', id);
      if (tagJoinError) throw tagJoinError;

      const { error } = await supabaseService
        .from('blog_posts')
        .delete()
        .eq('id', id)
        .select('id')
        .single();

      if (error) {
        if (slugNotFoundError(error)) {
          return res.status(404).json({ error: 'Blog post not found' });
        }
        throw error;
      }

      return res.status(204).send();
    } catch (error) {
      return res.status(500).json({ error: 'Failed to delete blog post' });
    }
  });

  router.post('/categories', requireAuth, requireBlogAdmin, async (req: Request, res: Response) => {
    const parsed = blogCategorySchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      return handleValidationError(res, parsed.error);
    }

    const payload = parsed.data;

    try {
      const { data, error } = await supabaseService
        .from('blog_categories')
        .insert({
          name: payload.name,
          slug: payload.slug,
          description: payload.description ?? null,
        })
        .select('*')
        .single();

      if (error || !data) {
        if ((error as any)?.code === '23505') {
          return res.status(409).json({ error: 'Category slug already exists' });
        }
        throw error;
      }

      const mapped = mapBlogCategory(data as BlogCategoryRow);
      return res.status(201).json(mapped);
    } catch (error) {
      return res.status(500).json({ error: 'Failed to create category' });
    }
  });

  router.put('/categories/:id', requireAuth, requireBlogAdmin, async (req: Request, res: Response) => {
    const parsed = blogCategoryUpdateSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      return handleValidationError(res, parsed.error);
    }

    const payload = parsed.data;
    const { id } = req.params;

    if (Object.keys(payload).length === 0) {
      return res.status(400).json({ error: 'Nothing to update' });
    }

    const updatePayload: Record<string, unknown> = {};
    if (payload.name !== undefined) updatePayload.name = payload.name;
    if (payload.slug !== undefined) updatePayload.slug = payload.slug;
    if (payload.description !== undefined) updatePayload.description = payload.description ?? null;

    try {
      const { data, error } = await supabaseService
        .from('blog_categories')
        .update(updatePayload)
        .eq('id', id)
        .select('*')
        .single();

      if (error || !data) {
        if (slugNotFoundError(error)) {
          return res.status(404).json({ error: 'Category not found' });
        }
        if ((error as any)?.code === '23505') {
          return res.status(409).json({ error: 'Category slug already exists' });
        }
        throw error;
      }

      const mapped = mapBlogCategory(data as BlogCategoryRow);
      return res.json(mapped);
    } catch (error) {
      return res.status(500).json({ error: 'Failed to update category' });
    }
  });

  router.delete('/categories/:id', requireAuth, requireBlogAdmin, async (req: Request, res: Response) => {
    const { id } = req.params;

    try {
      const { error: joinDeleteError } = await supabaseService
        .from('blog_post_categories')
        .delete()
        .eq('category_id', id);
      if (joinDeleteError) throw joinDeleteError;

      const { error } = await supabaseService
        .from('blog_categories')
        .delete()
        .eq('id', id)
        .select('id')
        .single();

      if (error) {
        if (slugNotFoundError(error)) {
          return res.status(404).json({ error: 'Category not found' });
        }
        throw error;
      }

      return res.status(204).send();
    } catch (error) {
      return res.status(500).json({ error: 'Failed to delete category' });
    }
  });

  router.post('/tags', requireAuth, requireBlogAdmin, async (req: Request, res: Response) => {
    const parsed = blogTagSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      return handleValidationError(res, parsed.error);
    }

    const payload = parsed.data;

    try {
      const { data, error } = await supabaseService
        .from('blog_tags')
        .insert({
          name: payload.name,
          slug: payload.slug,
          description: payload.description ?? null,
        })
        .select('*')
        .single();

      if (error || !data) {
        if ((error as any)?.code === '23505') {
          return res.status(409).json({ error: 'Tag slug already exists' });
        }
        throw error;
      }

      const mapped = mapBlogTag(data as BlogTagRow);
      return res.status(201).json(mapped);
    } catch (error) {
      return res.status(500).json({ error: 'Failed to create tag' });
    }
  });

  router.put('/tags/:id', requireAuth, requireBlogAdmin, async (req: Request, res: Response) => {
    const parsed = blogTagUpdateSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      return handleValidationError(res, parsed.error);
    }

    const payload = parsed.data;
    const { id } = req.params;

    if (Object.keys(payload).length === 0) {
      return res.status(400).json({ error: 'Nothing to update' });
    }

    const updatePayload: Record<string, unknown> = {};
    if (payload.name !== undefined) updatePayload.name = payload.name;
    if (payload.slug !== undefined) updatePayload.slug = payload.slug;
    if (payload.description !== undefined) updatePayload.description = payload.description ?? null;

    try {
      const { data, error } = await supabaseService
        .from('blog_tags')
        .update(updatePayload)
        .eq('id', id)
        .select('*')
        .single();

      if (error || !data) {
        if (slugNotFoundError(error)) {
          return res.status(404).json({ error: 'Tag not found' });
        }
        if ((error as any)?.code === '23505') {
          return res.status(409).json({ error: 'Tag slug already exists' });
        }
        throw error;
      }

      const mapped = mapBlogTag(data as BlogTagRow);
      return res.json(mapped);
    } catch (error) {
      return res.status(500).json({ error: 'Failed to update tag' });
    }
  });

  router.delete('/tags/:id', requireAuth, requireBlogAdmin, async (req: Request, res: Response) => {
    const { id } = req.params;

    try {
      const { error: joinDeleteError } = await supabaseService
        .from('blog_post_tags')
        .delete()
        .eq('tag_id', id);
      if (joinDeleteError) throw joinDeleteError;

      const { error } = await supabaseService
        .from('blog_tags')
        .delete()
        .eq('id', id)
        .select('id')
        .single();

      if (error) {
        if (slugNotFoundError(error)) {
          return res.status(404).json({ error: 'Tag not found' });
        }
        throw error;
      }

      return res.status(204).send();
    } catch (error) {
      return res.status(500).json({ error: 'Failed to delete tag' });
    }
  });

  router.post('/media/sign-upload', requireAuth, requireBlogAdmin, async (req: Request, res: Response) => {
    const parsed = blogMediaRequestSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      return handleValidationError(res, parsed.error);
    }

    const { path } = parsed.data;
    const bucket = process.env.BLOG_MEDIA_BUCKET;

    if (!bucket) {
      return res.status(500).json({ error: 'BLOG_MEDIA_BUCKET is not configured' });
    }

    try {
      const storageBucket = supabaseService.storage.from(bucket);
      const { data, error } = await storageBucket.createSignedUploadUrl(path);

      if (error || !data) {
        throw error;
      }

      return res.json({
        signedUrl: data.signedUrl,
        path: data.path,
        token: data.token,
      });
    } catch (error) {
      return res.status(500).json({ error: 'Failed to generate upload URL' });
    }
  });

  router.get('/posts/:id/preview', requireAuth, requireBlogAuthor, async (req: Request, res: Response) => {
    const { id } = req.params;

    try {
      const userId = req.user!.userId;
      const canManage = await canManagePost(id, userId);
      if (!canManage) {
        return res.status(403).json({ error: 'You do not have permission to preview this post' });
      }

      const { data, error } = await supabaseService
        .from('blog_posts')
        .select(BLOG_POST_SELECT)
        .eq('id', id)
        .single();

      if (error || !data) {
        if (slugNotFoundError(error)) {
          return res.status(404).json({ error: 'Blog post not found' });
        }
        throw error;
      }

      return res.json(mapBlogPost(data as unknown as BlogPostRow, { includeHtml: true }));
    } catch (error) {
      return res.status(500).json({ error: 'Failed to fetch blog post preview' });
    }
  });

  router.get('/admin/posts', requireAuth, requireBlogAuthor, async (req: Request, res: Response) => {
    const parsed = blogListQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return handleValidationError(res, parsed.error);
    }
    const { page, pageSize, category, tag, search, status, scheduledOnly } = parsed.data;
    const rangeStart = (page - 1) * pageSize;
    const rangeEnd = rangeStart + pageSize - 1;

    try {
      let query = supabaseService
        .from('blog_posts')
        .select(BLOG_POST_SUMMARY_SELECT, { count: 'exact' });

      if (status) {
        query = query.eq('status', status);
      }

      if (scheduledOnly) {
        query = query.not('scheduled_for', 'is', null);
      }

      if (search) {
        const sanitized = search.replace(/[%_]/g, '').trim();
        if (sanitized.length > 0) {
          query = query.or(`title.ilike.%${sanitized}%,summary.ilike.%${sanitized}%`);
        }
      }

      if (req.blogRole !== 'admin') {
        const { data: authorData } = await supabaseService
          .from('blog_authors')
          .select('id')
          .eq('user_id', req.user!.userId)
          .maybeSingle();

        if (authorData) {
          query = query.eq('author_id', authorData.id);
        } else {
          return res.json({ data: [], meta: { page, pageSize, total: 0 } });
        }
      }

      const { data, error, count } = await query
        .order('updated_at', { ascending: false })
        .range(rangeStart, rangeEnd);

      if (error) throw error;

      const mapped = (data ?? []).map((row) => mapBlogPost(row as unknown as BlogPostRow, { includeContent: false }));
      const filtered = mapped.filter((post) => {
        const categoryOk = !category || post.categories.some((c) => c.slug === category || c.id === category);
        const tagOk = !tag || post.tags.some((t) => t.slug === tag || t.id === tag);
        return categoryOk && tagOk;
      });

      return res.json({
        data: filtered,
        meta: {
          page,
          pageSize,
          total: category || tag ? filtered.length : count ?? filtered.length,
        },
      });
    } catch (error) {
      return res.status(500).json({ error: 'Failed to fetch blog posts' });
    }
  });

  router.post('/posts/:id/request-review', requireAuth, requireBlogAuthor, async (req: Request, res: Response) => {
    const { id } = req.params;

    try {
      const userId = req.user!.userId;
      const canManage = await canManagePost(id, userId);
      if (!canManage) {
        return res.status(403).json({ error: 'You do not have permission to update this post' });
      }

      const { data, error } = await supabaseService
        .from('blog_posts')
        .update({
          status: 'review',
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select(BLOG_POST_SELECT)
        .single();

      if (error || !data) {
        if (slugNotFoundError(error)) {
          return res.status(404).json({ error: 'Blog post not found' });
        }
        throw error;
      }

      return res.json(mapBlogPost(data as unknown as BlogPostRow));
    } catch (error) {
      return res.status(500).json({ error: 'Failed to request review for blog post' });
    }
  });

  router.post('/posts/:id/schedule', requireAuth, requireBlogAuthor, async (req: Request, res: Response) => {
    const parsed = blogPostScheduleSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      return handleValidationError(res, parsed.error);
    }

    const { scheduledFor } = parsed.data;
    const { id } = req.params;

    try {
      const userId = req.user!.userId;
      const canManage = await canManagePost(id, userId);
      if (!canManage) {
        return res.status(403).json({ error: 'You do not have permission to update this post' });
      }

      const { data, error } = await supabaseService
        .from('blog_posts')
        .update({
          status: 'scheduled',
          scheduled_for: scheduledFor,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select(BLOG_POST_SELECT)
        .single();

      if (error || !data) {
        if (slugNotFoundError(error)) {
          return res.status(404).json({ error: 'Blog post not found' });
        }
        throw error;
      }

      return res.json(mapBlogPost(data as unknown as BlogPostRow));
    } catch (error) {
      return res.status(500).json({ error: 'Failed to schedule blog post' });
    }
  });

  router.post('/posts/:id/archive', requireAuth, requireBlogAuthor, async (req: Request, res: Response) => {
    const { id } = req.params;

    try {
      const userId = req.user!.userId;
      const canManage = await canManagePost(id, userId);
      if (!canManage) {
        return res.status(403).json({ error: 'You do not have permission to update this post' });
      }

      const { data, error } = await supabaseService
        .from('blog_posts')
        .update({
          status: 'archived',
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select(BLOG_POST_SELECT)
        .single();

      if (error || !data) {
        if (slugNotFoundError(error)) {
          return res.status(404).json({ error: 'Blog post not found' });
        }
        throw error;
      }

      return res.json(mapBlogPost(data as unknown as BlogPostRow));
    } catch (error) {
      return res.status(500).json({ error: 'Failed to archive blog post' });
    }
  });

  router.post('/slug/check', requireAuth, requireBlogAuthor, async (req: Request, res: Response) => {
    const parsed = blogSlugCheckSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      return handleValidationError(res, parsed.error);
    }

    const { slug, excludeId } = parsed.data;

    try {
      let query = supabaseService
        .from('blog_posts')
        .select('id')
        .eq('slug', slug);

      if (excludeId) {
        query = query.neq('id', excludeId);
      }

      const { data, error } = await query.maybeSingle();

      if (error) throw error;

      return res.json({
        available: !data,
        slug,
      });
    } catch (error) {
      return res.status(500).json({ error: 'Failed to check slug availability' });
    }
  });

  return router;
}
