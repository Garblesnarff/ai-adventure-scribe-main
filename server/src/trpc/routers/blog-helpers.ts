/**
 * Blog Helper Functions
 *
 * Utility functions for blog post operations including:
 * - Author resolution
 * - Status field normalization
 * - Post relation management
 */

import { TRPCError } from '@trpc/server';
import { eq } from 'drizzle-orm';
import { blogAuthors, blogPostCategories, blogPostTags } from '../../../../db/schema/index.js';
import type { Context } from '../context.js';

/**
 * Resolve author ID for the current user
 * If authorId is provided (admin override), validates it exists
 * Otherwise, fetches author profile for current user
 */
export async function resolveAuthorId(
  ctx: Context,
  explicitAuthorId?: string
): Promise<string> {
  // If explicit author ID provided, validate it exists
  if (explicitAuthorId) {
    const [author] = await ctx.db
      .select({ id: blogAuthors.id })
      .from(blogAuthors)
      .where(eq(blogAuthors.id, explicitAuthorId))
      .limit(1);

    if (!author) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Author not found',
      });
    }
    return author.id;
  }

  // Otherwise, get author ID for current user
  if (!ctx.user) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'Authentication required',
    });
  }

  const [author] = await ctx.db
    .select({ id: blogAuthors.id })
    .from(blogAuthors)
    .where(eq(blogAuthors.userId, ctx.user.userId))
    .limit(1);

  if (!author) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'You must create an author profile before creating posts',
    });
  }

  return author.id;
}

/**
 * Normalize status-related fields based on post status
 * Ensures proper values for publishedAt and scheduledFor
 */
export function normalizeStatusFields(
  status: 'draft' | 'review' | 'scheduled' | 'published' | 'archived',
  scheduledFor?: string | null,
  publishedAt?: string | null
): {
  status: 'draft' | 'review' | 'scheduled' | 'published' | 'archived';
  publishedAt: Date | null;
  scheduledFor: Date | null;
} {
  switch (status) {
    case 'published':
      return {
        status: 'published',
        publishedAt: publishedAt ? new Date(publishedAt) : new Date(),
        scheduledFor: null,
      };

    case 'scheduled':
      return {
        status: 'scheduled',
        scheduledFor: scheduledFor ? new Date(scheduledFor) : null,
        publishedAt: null,
      };

    case 'draft':
    case 'review':
    case 'archived':
    default:
      return {
        status,
        publishedAt: null,
        scheduledFor: null,
      };
  }
}

/**
 * Sync post categories
 * Deletes existing relationships and creates new ones
 */
export async function syncPostCategories(
  ctx: Context,
  postId: string,
  categoryIds: string[]
): Promise<void> {
  // Delete existing categories
  await ctx.db.delete(blogPostCategories).where(eq(blogPostCategories.postId, postId));

  // Insert new categories
  if (categoryIds.length > 0) {
    await ctx.db.insert(blogPostCategories).values(
      categoryIds.map((categoryId) => ({
        postId,
        categoryId,
      }))
    );
  }
}

/**
 * Sync post tags
 * Deletes existing relationships and creates new ones
 */
export async function syncPostTags(
  ctx: Context,
  postId: string,
  tagIds: string[]
): Promise<void> {
  // Delete existing tags
  await ctx.db.delete(blogPostTags).where(eq(blogPostTags.postId, postId));

  // Insert new tags
  if (tagIds.length > 0) {
    await ctx.db.insert(blogPostTags).values(
      tagIds.map((tagId) => ({
        postId,
        tagId,
      }))
    );
  }
}

/**
 * Check if user can manage a post
 * Users can manage their own posts, admins can manage all posts
 */
export async function canManagePost(
  ctx: Context,
  postId: string,
  authorId: string
): Promise<boolean> {
  if (!ctx.user) {
    return false;
  }

  // Get current user's author profile
  const [userAuthor] = await ctx.db
    .select({ id: blogAuthors.id })
    .from(blogAuthors)
    .where(eq(blogAuthors.userId, ctx.user.userId))
    .limit(1);

  if (!userAuthor) {
    return false;
  }

  // User can manage if they're the author
  if (userAuthor.id === authorId) {
    return true;
  }

  // Admin users can manage all posts
  if (ctx.user.plan === 'admin' || ctx.user.plan === 'enterprise') {
    return true;
  }

  return false;
}
