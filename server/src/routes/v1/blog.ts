import { Router, Request, Response } from 'express';
import { supabaseService } from '../../lib/supabase.js';
import { requireAuth } from '../../middleware/auth.js';
import { requireBlogAdmin } from '../../middleware/blog-admin.js';
import { mapBlogCategory, mapBlogPost, mapBlogTag } from './blog/mappers.js';
import type { BlogPostRow, BlogCategoryRow, BlogTagRow, BlogCategory, BlogTag } from './blog/types.js';
import {
  blogCategorySchema,
  blogCategoryUpdateSchema,
  blogListQuerySchema,
  blogMediaRequestSchema,
  blogPostInputSchema,
  blogPostPublishSchema,
  blogPostUpdateSchema,
  blogTagSchema,
  blogTagUpdateSchema,
} from './blog/schemas.js';

const BLOG_POST_SELECT = `
  id,
  slug,
  title,
  summary,
  content,
  cover_image,
  status,
  published_at,
  created_at,
  updated_at,
  author_id,
  reading_time_minutes,
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

export default function blogRouter() {
  const router = Router();

  router.get('/posts', async (req: Request, res: Response) => {
    const parsed = blogListQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return handleValidationError(res, parsed.error);
    }
    const { page, pageSize, category, tag } = parsed.data;
    const rangeStart = (page - 1) * pageSize;
    const rangeEnd = rangeStart + pageSize - 1;

    try {
      const { data, error, count } = await supabaseService
        .from('blog_posts')
        .select(BLOG_POST_SELECT, { count: 'exact' })
        .eq('status', 'published')
        .order('published_at', { ascending: false })
        .range(rangeStart, rangeEnd);

      if (error) throw error;

      const mapped = (data ?? []).map((row) => mapBlogPost(row as unknown as BlogPostRow));
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

      return res.json(mapBlogPost(data as unknown as BlogPostRow));
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

  router.post('/posts', requireAuth, requireBlogAdmin, async (req: Request, res: Response) => {
    const parsed = blogPostInputSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      return handleValidationError(res, parsed.error);
    }

    const payload = parsed.data;
    const status = payload.status ?? 'draft';
    const nowIso = new Date().toISOString();

    try {
      const { data: inserted, error: insertError } = await supabaseService
        .from('blog_posts')
        .insert({
          title: payload.title,
          slug: payload.slug,
          summary: payload.summary ?? null,
          content: payload.content ?? null,
          cover_image: payload.coverImage ?? null,
          status,
          author_id: req.user!.userId,
          published_at: status === 'published' ? payload.publishedAt ?? nowIso : null,
        })
        .select('id')
        .single();

      if (insertError || !inserted) {
        if ((insertError as any)?.code === '23505') {
          return res.status(409).json({ error: 'Slug already exists' });
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
      return res.status(500).json({ error: 'Failed to create blog post' });
    }
  });

  router.put('/posts/:id', requireAuth, requireBlogAdmin, async (req: Request, res: Response) => {
    const parsed = blogPostUpdateSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      return handleValidationError(res, parsed.error);
    }

    const payload = parsed.data;
    const { id } = req.params;

    const updatePayload: Record<string, unknown> = {};

    if (payload.title !== undefined) updatePayload.title = payload.title;
    if (payload.slug !== undefined) updatePayload.slug = payload.slug;
    if (payload.summary !== undefined) updatePayload.summary = payload.summary ?? null;
    if (payload.content !== undefined) updatePayload.content = payload.content ?? null;
    if (payload.coverImage !== undefined) updatePayload.cover_image = payload.coverImage ?? null;
    if (payload.status !== undefined) updatePayload.status = payload.status;
    if (payload.publishedAt !== undefined) updatePayload.published_at = payload.publishedAt;

    if (payload.status === 'published' && payload.publishedAt === undefined) {
      updatePayload.published_at = new Date().toISOString();
    }

    if (payload.status && payload.status !== 'published' && payload.publishedAt === undefined) {
      updatePayload.published_at = null;
    }

    const hasUpdates = Object.keys(updatePayload).length > 0;

    try {
      if (hasUpdates) {
        updatePayload.updated_at = new Date().toISOString();
        const { error: updateError } = await supabaseService
          .from('blog_posts')
          .update(updatePayload)
          .eq('id', id)
          .select('id')
          .single();

        if (updateError) {
          if ((updateError as any).code === 'PGRST116') {
            return res.status(404).json({ error: 'Blog post not found' });
          }
          if ((updateError as any)?.code === '23505') {
            return res.status(409).json({ error: 'Slug already exists' });
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
      return res.status(500).json({ error: 'Failed to update blog post' });
    }
  });

  router.post('/posts/:id/publish', requireAuth, requireBlogAdmin, async (req: Request, res: Response) => {
    const parsed = blogPostPublishSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      return handleValidationError(res, parsed.error);
    }

    const publishTimestamp = parsed.data.publishedAt ?? new Date().toISOString();
    const { id } = req.params;

    try {
      const { data, error } = await supabaseService
        .from('blog_posts')
        .update({
          status: 'published',
          published_at: publishTimestamp,
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

  router.delete('/posts/:id', requireAuth, requireBlogAdmin, async (req: Request, res: Response) => {
    const { id } = req.params;

    try {
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

  router.get('/posts/:id/preview', requireAuth, requireBlogAdmin, async (req: Request, res: Response) => {
    const { id } = req.params;

    try {
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
      return res.status(500).json({ error: 'Failed to fetch blog post preview' });
    }
  });

  return router;
}
