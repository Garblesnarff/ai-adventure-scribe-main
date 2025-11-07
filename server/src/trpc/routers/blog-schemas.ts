/**
 * Blog Zod Validation Schemas
 *
 * Reusable schemas for blog post, category, and tag validation.
 * These are used by tRPC procedures for input validation.
 */

import { z } from 'zod';

/**
 * Slug validation regex (lowercase alphanumeric with hyphens)
 */
const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * Blog post list query parameters
 */
export const blogListQuerySchema = z.object({
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(10),
  category: z.string().min(1).optional(),
  tag: z.string().min(1).optional(),
  search: z.string().min(1).optional(),
  status: z.enum(['draft', 'review', 'scheduled', 'published', 'archived']).optional(),
});

/**
 * Blog post creation input
 */
export const blogPostInputSchema = z.object({
  title: z.string().min(3).max(200),
  slug: z.string().regex(slugRegex, { message: 'Invalid slug format' }),
  summary: z.string().max(400).optional().nullable(),
  content: z.string().optional().nullable(),
  featuredImageUrl: z.string().min(1).optional().nullable(),
  heroImageAlt: z.string().max(200).optional().nullable(),
  seoTitle: z.string().max(200).optional().nullable(),
  seoDescription: z.string().max(400).optional().nullable(),
  seoKeywords: z.array(z.string()).max(20).optional().nullable(),
  canonicalUrl: z.string().url().optional().nullable(),
  status: z.enum(['draft', 'review', 'scheduled', 'published']).default('draft'),
  scheduledFor: z.string().datetime().optional().nullable(),
  publishedAt: z.string().datetime().optional().nullable(),
  metadata: z.record(z.unknown()).optional().nullable(),
  authorId: z.string().uuid().optional(),
  categoryIds: z.array(z.string().uuid()).max(10).optional(),
  tagIds: z.array(z.string().uuid()).max(20).optional(),
});

/**
 * Blog post update input (all fields optional)
 */
export const blogPostUpdateSchema = blogPostInputSchema.partial().extend({
  status: z.enum(['draft', 'review', 'scheduled', 'published', 'archived']).optional(),
});

/**
 * Category schema
 */
export const blogCategorySchema = z.object({
  name: z.string().min(2).max(120),
  slug: z.string().regex(slugRegex, { message: 'Invalid slug format' }),
  description: z.string().max(400).optional().nullable(),
});

/**
 * Tag schema
 */
export const blogTagSchema = z.object({
  name: z.string().min(2).max(120),
  slug: z.string().regex(slugRegex, { message: 'Invalid slug format' }),
  description: z.string().max(400).optional().nullable(),
});

/**
 * Type exports for TypeScript inference
 */
export type BlogListQuery = z.infer<typeof blogListQuerySchema>;
export type BlogPostInput = z.infer<typeof blogPostInputSchema>;
export type BlogPostUpdate = z.infer<typeof blogPostUpdateSchema>;
export type BlogCategoryInput = z.infer<typeof blogCategorySchema>;
export type BlogTagInput = z.infer<typeof blogTagSchema>;
