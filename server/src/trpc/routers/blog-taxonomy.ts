/**
 * Blog Taxonomy Router
 *
 * tRPC procedures for blog categories and tags management.
 * Separated from main blog router for maintainability.
 */

import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, publicProcedure, protectedProcedure } from '../trpc.js';
import {
  blogCategories,
  blogTags,
  blogPostCategories,
  blogPostTags,
} from '../../../../db/schema/index.js';
import { eq, sql } from 'drizzle-orm';
import { blogCategorySchema, blogTagSchema } from './blog-schemas.js';

export const blogTaxonomyRouter = router({
  /**
   * Get all categories (PUBLIC)
   */
  getCategories: publicProcedure
    .input(z.object({ includeCount: z.boolean().default(false) }))
    .query(async ({ input, ctx }) => {
      const categories = await ctx.db
        .select()
        .from(blogCategories)
        .orderBy(blogCategories.name);

      if (!input.includeCount) {
        return categories;
      }

      // Add post counts
      const categoriesWithCount = await Promise.all(
        categories.map(async (category) => {
          const [result] = await ctx.db
            .select({ count: sql<number>`count(*)::int` })
            .from(blogPostCategories)
            .where(eq(blogPostCategories.categoryId, category.id));

          return {
            ...category,
            postCount: result?.count ?? 0,
          };
        })
      );

      return categoriesWithCount;
    }),

  /**
   * Get all tags (PUBLIC)
   */
  getTags: publicProcedure
    .input(z.object({ includeCount: z.boolean().default(false) }))
    .query(async ({ input, ctx }) => {
      const tags = await ctx.db.select().from(blogTags).orderBy(blogTags.name);

      if (!input.includeCount) {
        return tags;
      }

      // Add post counts
      const tagsWithCount = await Promise.all(
        tags.map(async (tag) => {
          const [result] = await ctx.db
            .select({ count: sql<number>`count(*)::int` })
            .from(blogPostTags)
            .where(eq(blogPostTags.tagId, tag.id));

          return {
            ...tag,
            postCount: result?.count ?? 0,
          };
        })
      );

      return tagsWithCount;
    }),

  /**
   * Create category (PROTECTED - admin only in production)
   */
  createCategory: protectedProcedure
    .input(blogCategorySchema)
    .mutation(async ({ input, ctx }) => {
      try {
        const [category] = await ctx.db
          .insert(blogCategories)
          .values({
            ...input,
            metadata: {},
          })
          .returning();

        return category;
      } catch (error: any) {
        // Handle unique constraint violation (duplicate slug)
        if (error?.code === '23505') {
          throw new TRPCError({
            code: 'CONFLICT',
            message: 'Category slug already exists',
          });
        }
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create category',
        });
      }
    }),

  /**
   * Update category (PROTECTED - admin only in production)
   */
  updateCategory: protectedProcedure
    .input(z.object({ id: z.string().uuid(), updates: blogCategorySchema.partial() }))
    .mutation(async ({ input, ctx }) => {
      const { id, updates } = input;

      if (Object.keys(updates).length === 0) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Nothing to update',
        });
      }

      try {
        const [category] = await ctx.db
          .update(blogCategories)
          .set({ ...updates, updatedAt: new Date() })
          .where(eq(blogCategories.id, id))
          .returning();

        if (!category) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Category not found' });
        }

        return category;
      } catch (error: any) {
        if (error instanceof TRPCError) throw error;

        if (error?.code === '23505') {
          throw new TRPCError({
            code: 'CONFLICT',
            message: 'Category slug already exists',
          });
        }
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to update category',
        });
      }
    }),

  /**
   * Delete category (PROTECTED)
   */
  deleteCategory: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      // Delete post associations
      await ctx.db.delete(blogPostCategories).where(eq(blogPostCategories.categoryId, input.id));

      // Delete category
      await ctx.db.delete(blogCategories).where(eq(blogCategories.id, input.id));

      return { success: true };
    }),

  /**
   * Create tag (PROTECTED - admin only in production)
   */
  createTag: protectedProcedure.input(blogTagSchema).mutation(async ({ input, ctx }) => {
    try {
      const [tag] = await ctx.db
        .insert(blogTags)
        .values({
          ...input,
          metadata: {},
        })
        .returning();

      return tag;
    } catch (error: any) {
      if (error?.code === '23505') {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'Tag slug already exists',
        });
      }
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to create tag',
      });
    }
  }),

  /**
   * Update tag (PROTECTED - admin only in production)
   */
  updateTag: protectedProcedure
    .input(z.object({ id: z.string().uuid(), updates: blogTagSchema.partial() }))
    .mutation(async ({ input, ctx }) => {
      const { id, updates } = input;

      if (Object.keys(updates).length === 0) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Nothing to update',
        });
      }

      try {
        const [tag] = await ctx.db
          .update(blogTags)
          .set({ ...updates, updatedAt: new Date() })
          .where(eq(blogTags.id, id))
          .returning();

        if (!tag) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Tag not found' });
        }

        return tag;
      } catch (error: any) {
        if (error instanceof TRPCError) throw error;

        if (error?.code === '23505') {
          throw new TRPCError({
            code: 'CONFLICT',
            message: 'Tag slug already exists',
          });
        }
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to update tag',
        });
      }
    }),

  /**
   * Delete tag (PROTECTED - admin only in production)
   */
  deleteTag: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      // Delete post associations
      await ctx.db.delete(blogPostTags).where(eq(blogPostTags.tagId, input.id));

      // Delete tag
      await ctx.db.delete(blogTags).where(eq(blogTags.id, input.id));

      return { success: true };
    }),

  /**
   * Add categories to a post (PROTECTED)
   * Replaces existing category associations with new ones
   */
  addCategoriesToPost: protectedProcedure
    .input(
      z.object({
        postId: z.string().uuid(),
        categoryIds: z.array(z.string().uuid()).min(1).max(10),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Delete existing category associations
      await ctx.db.delete(blogPostCategories).where(eq(blogPostCategories.postId, input.postId));

      // Insert new associations
      if (input.categoryIds.length > 0) {
        await ctx.db.insert(blogPostCategories).values(
          input.categoryIds.map((categoryId) => ({
            postId: input.postId,
            categoryId,
          }))
        );
      }

      return { success: true };
    }),

  /**
   * Add tags to a post (PROTECTED)
   * Replaces existing tag associations with new ones
   */
  addTagsToPost: protectedProcedure
    .input(
      z.object({
        postId: z.string().uuid(),
        tagIds: z.array(z.string().uuid()).min(1).max(20),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Delete existing tag associations
      await ctx.db.delete(blogPostTags).where(eq(blogPostTags.postId, input.postId));

      // Insert new associations
      if (input.tagIds.length > 0) {
        await ctx.db.insert(blogPostTags).values(
          input.tagIds.map((tagId) => ({
            postId: input.postId,
            tagId,
          }))
        );
      }

      return { success: true };
    }),
});
