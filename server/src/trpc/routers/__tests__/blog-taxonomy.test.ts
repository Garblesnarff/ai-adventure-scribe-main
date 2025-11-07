/**
 * Blog Taxonomy Router Test Suite
 *
 * Comprehensive tests for blog categories and tags management, including:
 * - List all categories (public)
 * - List all tags (public)
 * - Get category with post counts
 * - Get tags with post counts
 * - Create category (protected)
 * - Update category (protected)
 * - Delete category (protected)
 * - Create tag (protected)
 * - Update tag (protected)
 * - Delete tag (protected)
 * - Add categories to post
 * - Add tags to post
 * - Authorization checks
 * - Input validation
 * - Database error handling (duplicate slugs, constraints)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TRPCError } from '@trpc/server';
import type { Context } from '../../context';
import { blogTaxonomyRouter } from '../blog-taxonomy';
import { createMockContextWithDb, mockUUID } from './utils/drizzle-mock-builder';

// Mock the database module
vi.mock('../../../../db/client', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

/**
 * Helper to create a mock tRPC context
 */
function createMockContext(user?: any): Context {
  const mockCtx = createMockContextWithDb(user);
  return mockCtx as unknown as Context;
}

/**
 * Helper to create a mock category
 */
function createMockCategory(overrides = {}) {
  return {
    id: mockUUID('category-550e8400'),
    name: 'Test Category',
    slug: 'test-category',
    description: 'Test description',
    seoTitle: null,
    seoDescription: null,
    metadata: {},
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    ...overrides,
  };
}

/**
 * Helper to create a mock tag
 */
function createMockTag(overrides = {}) {
  return {
    id: mockUUID('tag-660e8400'),
    name: 'Test Tag',
    slug: 'test-tag',
    description: 'Test tag description',
    metadata: {},
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    ...overrides,
  };
}

/**
 * Helper to create caller function for router
 */
function createCaller(ctx: Context) {
  return blogTaxonomyRouter.createCaller(ctx);
}

describe('Blog Taxonomy Router', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getCategories procedure', () => {
    it('should list all categories without counts', async () => {
      const ctx = createMockContext() as any;
      const mockCategories = [
        createMockCategory({ slug: 'cat-1', name: 'Category 1' }),
        createMockCategory({ slug: 'cat-2', name: 'Category 2' }),
      ];

      ctx.mockDb.setQueryResult(mockCategories);

      const caller = createCaller(ctx);
      const result = await caller.getCategories({ includeCount: false });

      expect(result).toEqual(mockCategories);
      expect(result.length).toBe(2);
      expect(result[0]).not.toHaveProperty('postCount');
    });

    it('should list all categories with post counts', async () => {
      const ctx = createMockContext() as any;
      const mockCategories = [
        createMockCategory({ slug: 'cat-1', name: 'Category 1' }),
        createMockCategory({ slug: 'cat-2', name: 'Category 2' }),
      ];

      // First query returns categories, subsequent queries return counts
      ctx.mockDb.setQueryResults([
        mockCategories,      // First select: get all categories
        [{ count: 5 }],     // Second select: count for first category
        [{ count: 5 }],     // Third select: count for second category
      ]);

      const caller = createCaller(ctx);
      const result = await caller.getCategories({ includeCount: true });

      expect(result.length).toBe(2);
      expect(result[0]).toHaveProperty('postCount');
      expect(result[0].postCount).toBe(5);
    });

    it('should handle zero post counts', async () => {
      const ctx = createMockContext() as any;
      const mockCategories = [createMockCategory()];

      // First query returns categories, second returns zero count
      ctx.mockDb.setQueryResults([
        mockCategories,      // Get categories
        [{ count: 0 }],     // Count query returns 0
      ]);

      const caller = createCaller(ctx);
      const result = await caller.getCategories({ includeCount: true });

      expect(result[0].postCount).toBe(0);
    });

    it('should be accessible without authentication', async () => {
      const ctx = createMockContext() as any; // No user
      ctx.mockDb.setQueryResult([]);

      const caller = createCaller(ctx);
      const result = await caller.getCategories({ includeCount: false });

      expect(result).toBeDefined();
    });
  });

  describe('getTags procedure', () => {
    it('should list all tags without counts', async () => {
      const ctx = createMockContext();
      const mockTags = [
        createMockTag({ slug: 'tag-1', name: 'Tag 1' }),
        createMockTag({ slug: 'tag-2', name: 'Tag 2' }),
      ];

      ctx.db.orderBy = vi.fn().mockResolvedValueOnce(mockTags);

      const caller = createCaller(ctx);
      const result = await caller.getTags({ includeCount: false });

      expect(result).toEqual(mockTags);
      expect(result.length).toBe(2);
      expect(result[0]).not.toHaveProperty('postCount');
    });

    it('should list all tags with post counts', async () => {
      const ctx = createMockContext();
      const mockTags = [
        createMockTag({ slug: 'tag-1', name: 'Tag 1' }),
        createMockTag({ slug: 'tag-2', name: 'Tag 2' }),
      ];

      ctx.db.orderBy = vi.fn().mockResolvedValueOnce(mockTags);

      const countChain = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([{ count: 3 }]),
      };
      vi.spyOn(ctx.db, 'select').mockReturnValue(countChain as any);

      const caller = createCaller(ctx);
      const result = await caller.getTags({ includeCount: true });

      expect(result.length).toBe(2);
      expect(result[0]).toHaveProperty('postCount');
      expect(result[0].postCount).toBe(3);
    });

    it('should be accessible without authentication', async () => {
      const ctx = createMockContext(); // No user
      ctx.db.orderBy = vi.fn().mockResolvedValueOnce([]);

      const caller = createCaller(ctx);
      const result = await caller.getTags({ includeCount: false });

      expect(result).toBeDefined();
    });
  });

  describe('createCategory procedure', () => {
    it('should create a category when authenticated', async () => {
      const ctx = createMockContext({
        userId: 'user-123',
        email: 'test@example.com',
        plan: 'free',
      });

      const newCategory = createMockCategory();
      ctx.db.returning = vi.fn().mockResolvedValueOnce([newCategory]);

      const caller = createCaller(ctx);
      const result = await caller.createCategory({
        name: 'Test Category',
        slug: 'test-category',
        description: 'Test description',
      });

      expect(result).toEqual(newCategory);
      expect(ctx.db.insert).toHaveBeenCalled();
      expect(ctx.db.values).toHaveBeenCalled();
    });

    it('should throw CONFLICT on duplicate slug', async () => {
      const ctx = createMockContext({
        userId: 'user-123',
        email: 'test@example.com',
        plan: 'free',
      });

      // Mock unique constraint violation
      const dbError: any = new Error('Unique constraint violation');
      dbError.code = '23505';
      ctx.db.returning = vi.fn().mockRejectedValueOnce(dbError);

      const caller = createCaller(ctx);

      await expect(
        caller.createCategory({
          name: 'Test Category',
          slug: 'duplicate-slug',
        })
      ).rejects.toThrow(TRPCError);
      await expect(
        caller.createCategory({
          name: 'Test Category',
          slug: 'duplicate-slug',
        })
      ).rejects.toMatchObject({
        code: 'CONFLICT',
      });
    });

    it('should require authentication', async () => {
      const ctx = createMockContext(); // No user
      const caller = createCaller(ctx);

      await expect(
        caller.createCategory({
          name: 'Test Category',
          slug: 'test-category',
        })
      ).rejects.toThrow(TRPCError);
    });

    it('should validate input schema', async () => {
      const ctx = createMockContext({
        userId: 'user-123',
        email: 'test@example.com',
        plan: 'free',
      });
      const caller = createCaller(ctx);

      // Name too short
      await expect(
        caller.createCategory({ name: 'T', slug: 'test' })
      ).rejects.toThrow();

      // Invalid slug format
      await expect(
        caller.createCategory({ name: 'Test', slug: 'Invalid Slug!' })
      ).rejects.toThrow();

      // Missing required fields
      await expect(caller.createCategory({ name: 'Test' } as any)).rejects.toThrow();
    });

    it('should handle database errors gracefully', async () => {
      const ctx = createMockContext({
        userId: 'user-123',
        email: 'test@example.com',
        plan: 'free',
      });

      const dbError = new Error('Database connection failed');
      ctx.db.returning = vi.fn().mockRejectedValueOnce(dbError);

      const caller = createCaller(ctx);

      await expect(
        caller.createCategory({
          name: 'Test Category',
          slug: 'test-category',
        })
      ).rejects.toThrow(TRPCError);
      await expect(
        caller.createCategory({
          name: 'Test Category',
          slug: 'test-category',
        })
      ).rejects.toMatchObject({
        code: 'INTERNAL_SERVER_ERROR',
      });
    });
  });

  describe('updateCategory procedure', () => {
    it('should update a category when authenticated', async () => {
      const ctx = createMockContext({
        userId: 'user-123',
        email: 'test@example.com',
        plan: 'free',
      });

      const updatedCategory = createMockCategory({ name: 'Updated Category' });
      ctx.db.returning = vi.fn().mockResolvedValueOnce([updatedCategory]);

      const caller = createCaller(ctx);
      const result = await caller.updateCategory({
        id: '550e8400-e29b-41d4-a716-446655440000',
        updates: { name: 'Updated Category' },
      });

      expect(result).toEqual(updatedCategory);
      expect(ctx.db.update).toHaveBeenCalled();
      expect(ctx.db.set).toHaveBeenCalled();
    });

    it('should throw BAD_REQUEST if no updates provided', async () => {
      const ctx = createMockContext({
        userId: 'user-123',
        email: 'test@example.com',
        plan: 'free',
      });

      const caller = createCaller(ctx);

      await expect(
        caller.updateCategory({
          id: '550e8400-e29b-41d4-a716-446655440000',
          updates: {},
        })
      ).rejects.toThrow(TRPCError);
      await expect(
        caller.updateCategory({
          id: '550e8400-e29b-41d4-a716-446655440000',
          updates: {},
        })
      ).rejects.toMatchObject({
        code: 'BAD_REQUEST',
      });
    });

    it('should throw NOT_FOUND for non-existent category', async () => {
      const ctx = createMockContext({
        userId: 'user-123',
        email: 'test@example.com',
        plan: 'free',
      });

      ctx.db.returning = vi.fn().mockResolvedValueOnce([]); // No category returned

      const caller = createCaller(ctx);

      await expect(
        caller.updateCategory({
          id: 'non-existent-id',
          updates: { name: 'Updated' },
        })
      ).rejects.toThrow(TRPCError);
      await expect(
        caller.updateCategory({
          id: 'non-existent-id',
          updates: { name: 'Updated' },
        })
      ).rejects.toMatchObject({
        code: 'NOT_FOUND',
      });
    });

    it('should throw CONFLICT on duplicate slug', async () => {
      const ctx = createMockContext({
        userId: 'user-123',
        email: 'test@example.com',
        plan: 'free',
      });

      const dbError: any = new Error('Unique constraint violation');
      dbError.code = '23505';
      ctx.db.returning = vi.fn().mockRejectedValueOnce(dbError);

      const caller = createCaller(ctx);

      await expect(
        caller.updateCategory({
          id: '550e8400-e29b-41d4-a716-446655440000',
          updates: { slug: 'duplicate-slug' },
        })
      ).rejects.toThrow(TRPCError);
      await expect(
        caller.updateCategory({
          id: '550e8400-e29b-41d4-a716-446655440000',
          updates: { slug: 'duplicate-slug' },
        })
      ).rejects.toMatchObject({
        code: 'CONFLICT',
      });
    });

    it('should validate UUID format', async () => {
      const ctx = createMockContext({
        userId: 'user-123',
        email: 'test@example.com',
        plan: 'free',
      });
      const caller = createCaller(ctx);

      await expect(
        caller.updateCategory({
          id: 'invalid-uuid',
          updates: { name: 'Updated' },
        })
      ).rejects.toThrow();
    });
  });

  describe('deleteCategory procedure', () => {
    it('should delete a category and its associations', async () => {
      const ctx = createMockContext({
        userId: 'user-123',
        email: 'test@example.com',
        plan: 'free',
      });

      ctx.db.where = vi.fn().mockResolvedValue([]);

      const caller = createCaller(ctx);
      const result = await caller.deleteCategory({
        id: '550e8400-e29b-41d4-a716-446655440000',
      });

      expect(result).toEqual({ success: true });
      expect(ctx.db.delete).toHaveBeenCalledTimes(2); // Once for associations, once for category
    });

    it('should require authentication', async () => {
      const ctx = createMockContext(); // No user
      const caller = createCaller(ctx);

      await expect(
        caller.deleteCategory({
          id: '550e8400-e29b-41d4-a716-446655440000',
        })
      ).rejects.toThrow(TRPCError);
    });

    it('should validate UUID format', async () => {
      const ctx = createMockContext({
        userId: 'user-123',
        email: 'test@example.com',
        plan: 'free',
      });
      const caller = createCaller(ctx);

      await expect(
        caller.deleteCategory({ id: 'invalid-uuid' })
      ).rejects.toThrow();
    });
  });

  describe('createTag procedure', () => {
    it('should create a tag when authenticated', async () => {
      const ctx = createMockContext({
        userId: 'user-123',
        email: 'test@example.com',
        plan: 'free',
      });

      const newTag = createMockTag();
      ctx.db.returning = vi.fn().mockResolvedValueOnce([newTag]);

      const caller = createCaller(ctx);
      const result = await caller.createTag({
        name: 'Test Tag',
        slug: 'test-tag',
        description: 'Test description',
      });

      expect(result).toEqual(newTag);
      expect(ctx.db.insert).toHaveBeenCalled();
    });

    it('should throw CONFLICT on duplicate slug', async () => {
      const ctx = createMockContext({
        userId: 'user-123',
        email: 'test@example.com',
        plan: 'free',
      });

      const dbError: any = new Error('Unique constraint violation');
      dbError.code = '23505';
      ctx.db.returning = vi.fn().mockRejectedValueOnce(dbError);

      const caller = createCaller(ctx);

      await expect(
        caller.createTag({
          name: 'Test Tag',
          slug: 'duplicate-slug',
        })
      ).rejects.toThrow(TRPCError);
      await expect(
        caller.createTag({
          name: 'Test Tag',
          slug: 'duplicate-slug',
        })
      ).rejects.toMatchObject({
        code: 'CONFLICT',
      });
    });

    it('should require authentication', async () => {
      const ctx = createMockContext(); // No user
      const caller = createCaller(ctx);

      await expect(
        caller.createTag({
          name: 'Test Tag',
          slug: 'test-tag',
        })
      ).rejects.toThrow(TRPCError);
    });

    it('should validate input schema', async () => {
      const ctx = createMockContext({
        userId: 'user-123',
        email: 'test@example.com',
        plan: 'free',
      });
      const caller = createCaller(ctx);

      // Invalid slug format
      await expect(
        caller.createTag({ name: 'Test', slug: 'Invalid Slug!' })
      ).rejects.toThrow();

      // Missing required fields
      await expect(caller.createTag({ name: 'Test' } as any)).rejects.toThrow();
    });
  });

  describe('updateTag procedure', () => {
    it('should update a tag when authenticated', async () => {
      const ctx = createMockContext({
        userId: 'user-123',
        email: 'test@example.com',
        plan: 'free',
      });

      const updatedTag = createMockTag({ name: 'Updated Tag' });
      ctx.db.returning = vi.fn().mockResolvedValueOnce([updatedTag]);

      const caller = createCaller(ctx);
      const result = await caller.updateTag({
        id: '660e8400-e29b-41d4-a716-446655440001',
        updates: { name: 'Updated Tag' },
      });

      expect(result).toEqual(updatedTag);
      expect(ctx.db.update).toHaveBeenCalled();
    });

    it('should throw BAD_REQUEST if no updates provided', async () => {
      const ctx = createMockContext({
        userId: 'user-123',
        email: 'test@example.com',
        plan: 'free',
      });

      const caller = createCaller(ctx);

      await expect(
        caller.updateTag({
          id: '660e8400-e29b-41d4-a716-446655440001',
          updates: {},
        })
      ).rejects.toThrow(TRPCError);
      await expect(
        caller.updateTag({
          id: '660e8400-e29b-41d4-a716-446655440001',
          updates: {},
        })
      ).rejects.toMatchObject({
        code: 'BAD_REQUEST',
      });
    });

    it('should throw NOT_FOUND for non-existent tag', async () => {
      const ctx = createMockContext({
        userId: 'user-123',
        email: 'test@example.com',
        plan: 'free',
      });

      ctx.db.returning = vi.fn().mockResolvedValueOnce([]);

      const caller = createCaller(ctx);

      await expect(
        caller.updateTag({
          id: 'non-existent-id',
          updates: { name: 'Updated' },
        })
      ).rejects.toThrow(TRPCError);
      await expect(
        caller.updateTag({
          id: 'non-existent-id',
          updates: { name: 'Updated' },
        })
      ).rejects.toMatchObject({
        code: 'NOT_FOUND',
      });
    });

    it('should throw CONFLICT on duplicate slug', async () => {
      const ctx = createMockContext({
        userId: 'user-123',
        email: 'test@example.com',
        plan: 'free',
      });

      const dbError: any = new Error('Unique constraint violation');
      dbError.code = '23505';
      ctx.db.returning = vi.fn().mockRejectedValueOnce(dbError);

      const caller = createCaller(ctx);

      await expect(
        caller.updateTag({
          id: '660e8400-e29b-41d4-a716-446655440001',
          updates: { slug: 'duplicate-slug' },
        })
      ).rejects.toThrow(TRPCError);
      await expect(
        caller.updateTag({
          id: '660e8400-e29b-41d4-a716-446655440001',
          updates: { slug: 'duplicate-slug' },
        })
      ).rejects.toMatchObject({
        code: 'CONFLICT',
      });
    });
  });

  describe('deleteTag procedure', () => {
    it('should delete a tag and its associations', async () => {
      const ctx = createMockContext({
        userId: 'user-123',
        email: 'test@example.com',
        plan: 'free',
      });

      ctx.db.where = vi.fn().mockResolvedValue([]);

      const caller = createCaller(ctx);
      const result = await caller.deleteTag({
        id: '660e8400-e29b-41d4-a716-446655440001',
      });

      expect(result).toEqual({ success: true });
      expect(ctx.db.delete).toHaveBeenCalledTimes(2); // Once for associations, once for tag
    });

    it('should require authentication', async () => {
      const ctx = createMockContext(); // No user
      const caller = createCaller(ctx);

      await expect(
        caller.deleteTag({
          id: '660e8400-e29b-41d4-a716-446655440001',
        })
      ).rejects.toThrow(TRPCError);
    });

    it('should validate UUID format', async () => {
      const ctx = createMockContext({
        userId: 'user-123',
        email: 'test@example.com',
        plan: 'free',
      });
      const caller = createCaller(ctx);

      await expect(caller.deleteTag({ id: 'invalid-uuid' })).rejects.toThrow();
    });
  });

  describe('addCategoriesToPost procedure', () => {
    it('should add categories to a post', async () => {
      const ctx = createMockContext({
        userId: 'user-123',
        email: 'test@example.com',
        plan: 'free',
      });

      ctx.db.where = vi.fn().mockResolvedValueOnce([]); // Delete existing
      ctx.db.values = vi.fn().mockResolvedValueOnce([]); // Insert new

      const caller = createCaller(ctx);
      const result = await caller.addCategoriesToPost({
        postId: 'post-id-123',
        categoryIds: ['cat-1', 'cat-2'],
      });

      expect(result).toEqual({ success: true });
      expect(ctx.db.delete).toHaveBeenCalled();
      expect(ctx.db.insert).toHaveBeenCalled();
    });

    it('should replace existing categories', async () => {
      const ctx = createMockContext({
        userId: 'user-123',
        email: 'test@example.com',
        plan: 'free',
      });

      ctx.db.where = vi.fn().mockResolvedValue([]);

      const caller = createCaller(ctx);
      await caller.addCategoriesToPost({
        postId: 'post-id-123',
        categoryIds: ['new-cat-1'],
      });

      expect(ctx.db.delete).toHaveBeenCalledTimes(1);
    });

    it('should validate array limits (max 10 categories)', async () => {
      const ctx = createMockContext({
        userId: 'user-123',
        email: 'test@example.com',
        plan: 'free',
      });
      const caller = createCaller(ctx);

      const tooManyCategories = Array.from({ length: 11 }, (_, i) => `cat-${i}`);

      await expect(
        caller.addCategoriesToPost({
          postId: 'post-id-123',
          categoryIds: tooManyCategories,
        })
      ).rejects.toThrow();
    });

    it('should validate empty array (min 1 category)', async () => {
      const ctx = createMockContext({
        userId: 'user-123',
        email: 'test@example.com',
        plan: 'free',
      });
      const caller = createCaller(ctx);

      await expect(
        caller.addCategoriesToPost({
          postId: 'post-id-123',
          categoryIds: [],
        })
      ).rejects.toThrow();
    });

    it('should require authentication', async () => {
      const ctx = createMockContext(); // No user
      const caller = createCaller(ctx);

      await expect(
        caller.addCategoriesToPost({
          postId: 'post-id-123',
          categoryIds: ['cat-1'],
        })
      ).rejects.toThrow(TRPCError);
    });
  });

  describe('addTagsToPost procedure', () => {
    it('should add tags to a post', async () => {
      const ctx = createMockContext({
        userId: 'user-123',
        email: 'test@example.com',
        plan: 'free',
      });

      ctx.db.where = vi.fn().mockResolvedValueOnce([]); // Delete existing
      ctx.db.values = vi.fn().mockResolvedValueOnce([]); // Insert new

      const caller = createCaller(ctx);
      const result = await caller.addTagsToPost({
        postId: 'post-id-123',
        tagIds: ['tag-1', 'tag-2', 'tag-3'],
      });

      expect(result).toEqual({ success: true });
      expect(ctx.db.delete).toHaveBeenCalled();
      expect(ctx.db.insert).toHaveBeenCalled();
    });

    it('should replace existing tags', async () => {
      const ctx = createMockContext({
        userId: 'user-123',
        email: 'test@example.com',
        plan: 'free',
      });

      ctx.db.where = vi.fn().mockResolvedValue([]);

      const caller = createCaller(ctx);
      await caller.addTagsToPost({
        postId: 'post-id-123',
        tagIds: ['new-tag-1'],
      });

      expect(ctx.db.delete).toHaveBeenCalledTimes(1);
    });

    it('should validate array limits (max 20 tags)', async () => {
      const ctx = createMockContext({
        userId: 'user-123',
        email: 'test@example.com',
        plan: 'free',
      });
      const caller = createCaller(ctx);

      const tooManyTags = Array.from({ length: 21 }, (_, i) => `tag-${i}`);

      await expect(
        caller.addTagsToPost({
          postId: 'post-id-123',
          tagIds: tooManyTags,
        })
      ).rejects.toThrow();
    });

    it('should validate empty array (min 1 tag)', async () => {
      const ctx = createMockContext({
        userId: 'user-123',
        email: 'test@example.com',
        plan: 'free',
      });
      const caller = createCaller(ctx);

      await expect(
        caller.addTagsToPost({
          postId: 'post-id-123',
          tagIds: [],
        })
      ).rejects.toThrow();
    });

    it('should require authentication', async () => {
      const ctx = createMockContext(); // No user
      const caller = createCaller(ctx);

      await expect(
        caller.addTagsToPost({
          postId: 'post-id-123',
          tagIds: ['tag-1'],
        })
      ).rejects.toThrow(TRPCError);
    });

    it('should validate UUID format for all IDs', async () => {
      const ctx = createMockContext({
        userId: 'user-123',
        email: 'test@example.com',
        plan: 'free',
      });
      const caller = createCaller(ctx);

      // Invalid post ID
      await expect(
        caller.addTagsToPost({
          postId: 'invalid-uuid',
          tagIds: ['tag-1'],
        })
      ).rejects.toThrow();

      // Invalid tag ID
      await expect(
        caller.addTagsToPost({
          postId: '550e8400-e29b-41d4-a716-446655440000',
          tagIds: ['invalid-uuid'],
        })
      ).rejects.toThrow();
    });
  });
});
