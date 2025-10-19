import { z } from 'zod';

const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const blogListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
  category: z.string().min(1).optional(),
  tag: z.string().min(1).optional(),
  search: z.string().min(1).optional(),
  status: z.enum(['draft', 'review', 'scheduled', 'published', 'archived']).optional(),
  scheduledOnly: z.coerce.boolean().optional(),
});

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
  status: z.enum(['draft', 'review', 'scheduled', 'published']).optional(),
  scheduledFor: z.string().datetime().optional().nullable(),
  metadata: z.record(z.unknown()).optional().nullable(),
  authorId: z.string().uuid().optional(),
  categoryIds: z.array(z.string().min(1)).max(10).optional(),
  tagIds: z.array(z.string().min(1)).max(20).optional(),
  publishedAt: z.string().datetime().optional(),
});

export const blogPostUpdateSchema = blogPostInputSchema.partial().extend({
  status: z.enum(['draft', 'review', 'scheduled', 'published', 'archived']).optional(),
});

export const blogPostPublishSchema = z.object({
  publishedAt: z.string().datetime().optional(),
});

export const blogPostScheduleSchema = z.object({
  scheduledFor: z.string().datetime(),
});

export const blogSlugCheckSchema = z.object({
  slug: z.string().regex(slugRegex, { message: 'Invalid slug format' }),
  excludeId: z.string().uuid().optional(),
});

export const blogCategorySchema = z.object({
  name: z.string().min(2).max(120),
  slug: z.string().regex(slugRegex, { message: 'Invalid slug format' }),
  description: z.string().max(400).optional().nullable(),
});

export const blogCategoryUpdateSchema = blogCategorySchema.partial();

export const blogTagSchema = z.object({
  name: z.string().min(2).max(120),
  slug: z.string().regex(slugRegex, { message: 'Invalid slug format' }),
  description: z.string().max(400).optional().nullable(),
});

export const blogTagUpdateSchema = blogTagSchema.partial();

export const blogMediaRequestSchema = z.object({
  path: z.string().min(1),
  contentType: z.string().min(1).optional(),
});

export type BlogListQuery = z.infer<typeof blogListQuerySchema>;
export type BlogPostInput = z.infer<typeof blogPostInputSchema>;
export type BlogPostUpdateInput = z.infer<typeof blogPostUpdateSchema>;
export type BlogCategoryInput = z.infer<typeof blogCategorySchema>;
export type BlogCategoryUpdateInput = z.infer<typeof blogCategoryUpdateSchema>;
export type BlogTagInput = z.infer<typeof blogTagSchema>;
export type BlogTagUpdateInput = z.infer<typeof blogTagUpdateSchema>;
export type BlogPublishInput = z.infer<typeof blogPostPublishSchema>;
export type BlogScheduleInput = z.infer<typeof blogPostScheduleSchema>;
export type BlogSlugCheckInput = z.infer<typeof blogSlugCheckSchema>;
export type BlogMediaRequestInput = z.infer<typeof blogMediaRequestSchema>;
