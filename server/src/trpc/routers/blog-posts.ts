/**
 * Blog Posts Router
 *
 * tRPC procedures for blog post CRUD operations.
 * Split from main blog router to maintain file size limits.
 */

import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, publicProcedure, protectedProcedure } from '../trpc.js';
import {
  blogPosts,
  blogCategories,
  blogTags,
  blogPostCategories,
  blogPostTags,
} from '../../../../db/schema/index.js';
import { eq, and, or, ilike, desc, lte, SQL, sql } from 'drizzle-orm';
import {
  blogListQuerySchema,
  blogPostInputSchema,
  blogPostUpdateSchema,
} from './blog-schemas.js';
import {
  resolveAuthorId,
  normalizeStatusFields,
  syncPostCategories,
  syncPostTags,
  canManagePost,
} from './blog-helpers.js';

/**
 * Fetch categories and tags for a post
 */
async function fetchPostRelations(ctx: any, postId: string) {
  const catSelect = { id: blogCategories.id, slug: blogCategories.slug, name: blogCategories.name };
  const tagSelect = { id: blogTags.id, slug: blogTags.slug, name: blogTags.name };

  const categories = await ctx.db
    .select(catSelect)
    .from(blogPostCategories)
    .innerJoin(blogCategories, eq(blogPostCategories.categoryId, blogCategories.id))
    .where(eq(blogPostCategories.postId, postId));

  const tags = await ctx.db
    .select(tagSelect)
    .from(blogPostTags)
    .innerJoin(blogTags, eq(blogPostTags.tagId, blogTags.id))
    .where(eq(blogPostTags.postId, postId));

  return { categories, tags };
}

export const blogPostsRouter = router({
  /**
   * Get paginated list of published posts (PUBLIC)
   */
  list: publicProcedure.input(blogListQuerySchema).query(async ({ input, ctx }) => {
    const { page, pageSize, category, tag, search } = input;
    const offset = (page - 1) * pageSize;

    const conditions: SQL[] = [eq(blogPosts.status, 'published'), lte(blogPosts.publishedAt, new Date())];

    if (search) {
      const sanitized = search.replace(/[%_]/g, '').trim();
      if (sanitized) {
        conditions.push(or(ilike(blogPosts.title, `%${sanitized}%`), ilike(blogPosts.summary, `%${sanitized}%`))!);
      }
    }

    const postSelect = {
      id: blogPosts.id, slug: blogPosts.slug, title: blogPosts.title, summary: blogPosts.summary,
      featuredImageUrl: blogPosts.featuredImageUrl, status: blogPosts.status,
      publishedAt: blogPosts.publishedAt, createdAt: blogPosts.createdAt, authorId: blogPosts.authorId,
    };

    const posts = await ctx.db
      .select(postSelect)
      .from(blogPosts)
      .where(and(...conditions))
      .orderBy(desc(blogPosts.publishedAt))
      .limit(pageSize)
      .offset(offset);

    const [countResult] = await ctx.db
      .select({ count: sql<number>`count(*)::int` })
      .from(blogPosts)
      .where(and(...conditions));

    const postsWithRelations = await Promise.all(
      posts.map(async (post) => ({ ...post, ...(await fetchPostRelations(ctx, post.id)) }))
    );

    const filtered = postsWithRelations.filter((post: any) => {
      const categoryOk = !category || post.categories.some((c: any) => c.slug === category);
      const tagOk = !tag || post.tags.some((t: any) => t.slug === tag);
      return categoryOk && tagOk;
    });

    return {
      data: filtered,
      meta: { page, pageSize, total: category || tag ? filtered.length : countResult?.count || 0 },
    };
  }),

  /**
   * Get single post by slug (PUBLIC)
   */
  getBySlug: publicProcedure.input(z.object({ slug: z.string().min(1) })).query(async ({ input, ctx }) => {
    const [post] = await ctx.db
      .select()
      .from(blogPosts)
      .where(and(eq(blogPosts.slug, input.slug), eq(blogPosts.status, 'published')))
      .limit(1);

    if (!post) throw new TRPCError({ code: 'NOT_FOUND', message: 'Blog post not found' });

    return { ...post, ...(await fetchPostRelations(ctx, post.id)) };
  }),

  /**
   * Create new blog post (PROTECTED)
   */
  create: protectedProcedure.input(blogPostInputSchema).mutation(async ({ input, ctx }) => {
    const { categoryIds, tagIds, ...postData } = input;
    const authorId = await resolveAuthorId(ctx, input.authorId);
    const statusFields = normalizeStatusFields(input.status || 'draft', input.scheduledFor, input.publishedAt);

    const [post] = await ctx.db
      .insert(blogPosts)
      .values({ ...postData, ...statusFields, authorId, seoKeywords: input.seoKeywords || [], metadata: input.metadata || {} })
      .returning();

    if (!post) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to create post' });

    if (categoryIds) await syncPostCategories(ctx, post.id, categoryIds);
    if (tagIds) await syncPostTags(ctx, post.id, tagIds);

    return post;
  }),

  /**
   * Update blog post (PROTECTED)
   */
  update: protectedProcedure
    .input(z.object({ id: z.string().uuid(), updates: blogPostUpdateSchema }))
    .mutation(async ({ input, ctx }) => {
      const { id, updates } = input;
      const { categoryIds, tagIds, ...postUpdates } = updates;

      const [existingPost] = await ctx.db
        .select({ id: blogPosts.id, authorId: blogPosts.authorId })
        .from(blogPosts)
        .where(eq(blogPosts.id, id))
        .limit(1);

      if (!existingPost) throw new TRPCError({ code: 'NOT_FOUND', message: 'Blog post not found' });
      if (!(await canManagePost(ctx, id, existingPost.authorId))) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Permission denied' });
      }

      const updatePayload: any = { ...postUpdates, updatedAt: new Date() };
      if (updates.status) {
        Object.assign(updatePayload, normalizeStatusFields(updates.status, updates.scheduledFor, updates.publishedAt));
      }

      const [updatedPost] = await ctx.db.update(blogPosts).set(updatePayload).where(eq(blogPosts.id, id)).returning();

      if (categoryIds !== undefined) await syncPostCategories(ctx, id, categoryIds);
      if (tagIds !== undefined) await syncPostTags(ctx, id, tagIds);

      return updatedPost;
    }),

  /**
   * Delete blog post (PROTECTED)
   */
  delete: protectedProcedure.input(z.object({ id: z.string().uuid() })).mutation(async ({ input, ctx }) => {
    const [existingPost] = await ctx.db
      .select({ id: blogPosts.id, authorId: blogPosts.authorId })
      .from(blogPosts)
      .where(eq(blogPosts.id, input.id))
      .limit(1);

    if (!existingPost) throw new TRPCError({ code: 'NOT_FOUND', message: 'Blog post not found' });
    if (!(await canManagePost(ctx, input.id, existingPost.authorId))) {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'Permission denied' });
    }

    await ctx.db.delete(blogPosts).where(eq(blogPosts.id, input.id));
    return { success: true };
  }),
});
