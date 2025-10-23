import { Router, Request, Response } from 'express';
import { supabaseService } from '../../lib/supabase.js';
import { requireAuth } from '../../middleware/auth.js';
import { requireBlogAdmin } from '../../middleware/blog-admin.js';
import { requireBlogAuthor, canManagePost, getBlogRole } from '../../middleware/blog-author.js';
import { mapBlogCategory, mapBlogPost, mapBlogTag } from './blog/mappers.js';
import type { BlogPostRow, BlogCategoryRow, BlogTagRow, BlogCategory, BlogTag } from './blog/types.js';
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

  /**
   * GET /v1/blog/posts
   *
   * BUSINESS PURPOSE:
   * - Fetches a paginated list of published blog posts for public display.
   * - Supports filtering by category, tag, and a search term.
   */
  router.get('/posts', async (req: Request, res: Response) => {
    // ... (implementation)
  });

  /**
   * GET /v1/blog/posts/:slug
   *
   * BUSINESS PURPOSE:
   * - Fetches a single published blog post by its unique slug for public display.
   */
  router.get('/posts/:slug', async (req: Request, res: Response) => {
    // ... (implementation)
  });

  /**
   * GET /v1/blog/categories
   *
   * BUSINESS PURPOSE:
   * - Fetches a list of all blog categories for public display, typically for filtering posts.
   */
  router.get('/categories', async (_req: Request, res: Response) => {
    // ... (implementation)
  });

  /**
   * GET /v1/blog/tags
   *
   * BUSINESS PURPOSE:
   * - Fetches a list of all blog tags for public display, typically for filtering posts.
   */
  router.get('/tags', async (_req: Request, res: Response) => {
    // ... (implementation)
  });

  /**
   * POST /v1/blog/posts
   *
   * BUSINESS PURPOSE:
   * - Creates a new blog post. Requires author or admin privileges.
   */
  router.post('/posts', requireAuth, requireBlogAuthor, async (req: Request, res: Response) => {
    // ... (implementation)
  });

  /**
   * PUT /v1/blog/posts/:id
   *
   * BUSINESS PURPOSE:
   * - Updates an existing blog post. Requires the user to be the author of the post or an admin.
   */
  router.put('/posts/:id', requireAuth, requireBlogAuthor, async (req: Request, res: Response) => {
    // ... (implementation)
  });

  /**
   * POST /v1/blog/posts/:id/publish
   *
   * BUSINESS PURPOSE:
   * - Publishes a blog post, making it publicly visible. Requires author or admin privileges.
   */
  router.post('/posts/:id/publish', requireAuth, requireBlogAuthor, async (req: Request, res: Response) => {
    // ... (implementation)
  });


  /**
   * DELETE /v1/blog/posts/:id
   *
   * BUSINESS PURPOSE:
   * - Deletes a blog post. Requires the user to be the author of the post or an admin.
   */
  router.delete('/posts/:id', requireAuth, requireBlogAuthor, async (req: Request, res: Response) => {
    // ... (implementation)
  });

  /**
   * POST /v1/blog/categories
   *
   * BUSINESS PURPOSE:
   * - Creates a new blog category. Requires admin privileges.
   */
  router.post('/categories', requireAuth, requireBlogAdmin, async (req: Request, res: Response) => {
    // ... (implementation)
  });

  /**
   * PUT /v1/blog/categories/:id
   *
   * BUSINESS PURPOSE:
   * - Updates an existing blog category. Requires admin privileges.
   */
  router.put('/categories/:id', requireAuth, requireBlogAdmin, async (req: Request, res: Response) => {
    // ... (implementation)
  });

  /**
   * DELETE /v1/blog/categories/:id
   *
   * BUSINESS PURPOSE:
   * - Deletes a blog category. Requires admin privileges.
   */
  router.delete('/categories/:id', requireAuth, requireBlogAdmin, async (req: Request, res: Response) => {
    // ... (implementation)
  });

  /**
   * POST /v1/blog/tags
   *
   * BUSINESS PURPOSE:
   * - Creates a new blog tag. Requires admin privileges.
   */
  router.post('/tags', requireAuth, requireBlogAdmin, async (req: Request, res: Response) => {
    // ... (implementation)
  });

  /**
   * PUT /v1/blog/tags/:id
   *
   * BUSINESS PURPOSE:
   * - Updates an existing blog tag. Requires admin privileges.
   */
  router.put('/tags/:id', requireAuth, requireBlogAdmin, async (req: Request, res: Response) => {
    // ... (implementation)
  });

  /**
   * DELETE /v1/blog/tags/:id
   *
   * BUSINESS PURPOSE:
   * - Deletes a blog tag. Requires admin privileges.
   */
  router.delete('/tags/:id', requireAuth, requireBlogAdmin, async (req: Request, res: Response) => {
    // ... (implementation)
  });

  /**
   * POST /v1/blog/media/sign-upload
   *
   * BUSINESS PURPOSE:
   * - Generates a signed URL for uploading media assets to the blog's storage bucket.
   * - This allows the frontend to upload files directly to cloud storage in a secure way.
   * - Requires admin privileges.
   */
  router.post('/media/sign-upload', requireAuth, requireBlogAdmin, async (req: Request, res: Response) => {
    // ... (implementation)
  });

  /**
   * GET /v1/blog/posts/:id/preview
   *
   * BUSINESS PURPOSE:
   * - Fetches the full content of a blog post, regardless of its status (e.g., draft, scheduled).
   * - Used for previewing posts in the admin panel before they are published.
   * - Requires author or admin privileges.
   */
  router.get('/posts/:id/preview', requireAuth, requireBlogAuthor, async (req: Request, res: Response) => {
    // ... (implementation)
  });

  /**
   * GET /v1/blog/admin/posts
   *
   * BUSINESS PURPOSE:
   * - Fetches a list of all blog posts for the admin panel, including drafts, scheduled, and published posts.
   * - Supports filtering and pagination.
   * - Requires author or admin privileges.
   */
  router.get('/admin/posts', requireAuth, requireBlogAuthor, async (req: Request, res: Response) => {
    // ... (implementation)
  });

  /**
   * POST /v1/blog/posts/:id/request-review
   *
   * BUSINESS PURPOSE:
   * - Moves a blog post from 'draft' to 'review' status, signaling that it is ready for an editor to look at it.
   * - Requires author or admin privileges.
   */
  router.post('/posts/:id/request-review', requireAuth, requireBlogAuthor, async (req: Request, res: Response) => {
    // ... (implementation)
  });

  /**
   * POST /v1/blog/posts/:id/schedule
   *
   * BUSINESS PURPOSE:
   * - Schedules a blog post to be published at a future date.
   * - Requires author or admin privileges.
   */
  router.post('/posts/:id/schedule', requireAuth, requireBlogAuthor, async (req: Request, res: Response) => {
    // ... (implementation)
  });

  /**
   * POST /v1/blog/posts/:id/archive
   *
   * BUSINESS PURPOSE:
   * - Moves a blog post to 'archived' status, removing it from public view but keeping it in the system.
   * - Requires author or admin privileges.
   */
  router.post('/posts/:id/archive', requireAuth, requireBlogAuthor, async (req: Request, res: Response) => {
    // ... (implementation)
  });

  /**
   * POST /v1/blog/slug/check
   *
   * BUSINESS PURPOSE:
   * - Checks if a given slug is already in use, to prevent duplicate URLs for blog posts.
   * - Used in the admin panel when creating or editing a post.
   * - Requires author or admin privileges.
   */
  router.post('/slug/check', requireAuth, requireBlogAuthor, async (req: Request, res: Response) => {
    // ... (implementation)
  });

  return router;
}
