/**
 * Blog Posts Router Test Suite
 *
 * Comprehensive tests for blog post CRUD operations, including:
 * - List procedure with pagination and filtering
 * - Get single post by slug
 * - Create post (protected, requires auth)
 * - Update post (protected, author/admin only)
 * - Delete post (protected, author/admin only)
 * - Authorization checks
 * - Input validation (Zod schemas)
 * - Database error handling
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TRPCError } from '@trpc/server';
import type { Context } from '../../context';
import { blogPostsRouter } from '../blog-posts';
import * as blogHelpers from '../blog-helpers';

// Mock the database module
vi.mock('../../../../db/client', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

// Mock helper functions
vi.mock('../blog-helpers', () => ({
  resolveAuthorId: vi.fn(),
  normalizeStatusFields: vi.fn(),
  syncPostCategories: vi.fn(),
  syncPostTags: vi.fn(),
  canManagePost: vi.fn(),
}));

/**
 * Helper to create a mock tRPC context
 */
function createMockContext(user?: any): Context {
  return {
    req: {} as any,
    res: {} as any,
    db: {
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      innerJoin: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      offset: vi.fn().mockReturnThis(),
      set: vi.fn().mockReturnThis(),
      values: vi.fn().mockReturnThis(),
      returning: vi.fn().mockResolvedValue([]),
    } as any,
    user: user || null,
  };
}

/**
 * Helper to create a mock blog post
 */
function createMockPost(overrides = {}) {
  return {
    id: '550e8400-e29b-41d4-a716-446655440000',
    slug: 'test-post',
    title: 'Test Post',
    summary: 'Test summary',
    content: 'Test content',
    featuredImageUrl: null,
    status: 'published',
    publishedAt: new Date('2025-01-01'),
    createdAt: new Date('2025-01-01'),
    authorId: 'author-id-123',
    ...overrides,
  };
}

/**
 * Helper to create caller function for router
 */
function createCaller(ctx: Context) {
  return blogPostsRouter.createCaller(ctx);
}

describe('Blog Posts Router', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('list procedure', () => {
    it('should list published blog posts with default pagination', async () => {
      const ctx = createMockContext();
      const mockPosts = [
        createMockPost({ slug: 'post-1', title: 'Post 1' }),
        createMockPost({ slug: 'post-2', title: 'Post 2' }),
      ];

      // Mock the query chain
      ctx.db.select = vi.fn().mockReturnThis();
      ctx.db.from = vi.fn().mockReturnThis();
      ctx.db.where = vi.fn().mockReturnThis();
      ctx.db.orderBy = vi.fn().mockReturnThis();
      ctx.db.limit = vi.fn().mockReturnThis();
      ctx.db.offset = vi.fn().mockResolvedValueOnce(mockPosts);

      // Mock count query
      const countChain = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([{ count: 2 }]),
      };
      vi.spyOn(ctx.db, 'select').mockReturnValueOnce(countChain as any);

      // Mock relation fetches
      const relationChain = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        innerJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([]),
      };
      vi.spyOn(ctx.db, 'select').mockReturnValue(relationChain as any);

      const caller = createCaller(ctx);
      const result = await caller.list({ page: 1, pageSize: 10 });

      expect(result.data).toBeDefined();
      expect(result.data.length).toBeLessThanOrEqual(10);
      expect(result.meta).toEqual({
        page: 1,
        pageSize: 10,
        total: 2,
      });
    });

    it('should filter posts by search term', async () => {
      const ctx = createMockContext();
      const mockPosts = [createMockPost({ title: 'Matching Post' })];

      ctx.db.offset = vi.fn().mockResolvedValueOnce(mockPosts);
      const countChain = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([{ count: 1 }]),
      };
      vi.spyOn(ctx.db, 'select').mockReturnValueOnce(countChain as any);

      const relationChain = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        innerJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([]),
      };
      vi.spyOn(ctx.db, 'select').mockReturnValue(relationChain as any);

      const caller = createCaller(ctx);
      const result = await caller.list({
        page: 1,
        pageSize: 10,
        search: 'Matching',
      });

      expect(result.data).toBeDefined();
      expect(ctx.db.where).toHaveBeenCalled();
    });

    it('should filter posts by category slug', async () => {
      const ctx = createMockContext();
      const mockPosts = [createMockPost()];

      ctx.db.offset = vi.fn().mockResolvedValueOnce(mockPosts);
      const countChain = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([{ count: 1 }]),
      };
      vi.spyOn(ctx.db, 'select').mockReturnValueOnce(countChain as any);

      const relationChain = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        innerJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([
          { id: 'cat-1', slug: 'test-category', name: 'Test Category' },
        ]),
      };
      vi.spyOn(ctx.db, 'select').mockReturnValue(relationChain as any);

      const caller = createCaller(ctx);
      const result = await caller.list({
        page: 1,
        pageSize: 10,
        category: 'test-category',
      });

      expect(result.data).toBeDefined();
      expect(result.data.length).toBeGreaterThan(0);
    });

    it('should handle pagination correctly', async () => {
      const ctx = createMockContext();
      ctx.db.offset = vi.fn().mockResolvedValueOnce([]);
      const countChain = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([{ count: 0 }]),
      };
      vi.spyOn(ctx.db, 'select').mockReturnValueOnce(countChain as any);

      const caller = createCaller(ctx);
      const result = await caller.list({ page: 2, pageSize: 5 });

      expect(ctx.db.offset).toHaveBeenCalled();
      expect(result.meta.page).toBe(2);
      expect(result.meta.pageSize).toBe(5);
    });

    it('should validate input parameters', async () => {
      const ctx = createMockContext();
      const caller = createCaller(ctx);

      // Invalid page number (0)
      await expect(caller.list({ page: 0, pageSize: 10 })).rejects.toThrow();

      // Invalid page size (negative)
      await expect(caller.list({ page: 1, pageSize: -1 })).rejects.toThrow();

      // Page size exceeds maximum
      await expect(caller.list({ page: 1, pageSize: 101 })).rejects.toThrow();
    });
  });

  describe('getBySlug procedure', () => {
    it('should return a published post by slug', async () => {
      const ctx = createMockContext();
      const mockPost = createMockPost();

      ctx.db.limit = vi.fn().mockResolvedValueOnce([mockPost]);

      // Mock relation fetches
      const relationChain = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        innerJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([]),
      };
      vi.spyOn(ctx.db, 'select').mockReturnValue(relationChain as any);

      const caller = createCaller(ctx);
      const result = await caller.getBySlug({ slug: 'test-post' });

      expect(result).toBeDefined();
      expect(result.slug).toBe('test-post');
      expect(ctx.db.where).toHaveBeenCalled();
    });

    it('should throw NOT_FOUND for non-existent post', async () => {
      const ctx = createMockContext();
      ctx.db.limit = vi.fn().mockResolvedValueOnce([]);

      const caller = createCaller(ctx);

      await expect(caller.getBySlug({ slug: 'non-existent' })).rejects.toThrow(
        TRPCError
      );
      await expect(caller.getBySlug({ slug: 'non-existent' })).rejects.toMatchObject({
        code: 'NOT_FOUND',
      });
    });

    it('should validate slug input', async () => {
      const ctx = createMockContext();
      const caller = createCaller(ctx);

      // Empty slug
      await expect(caller.getBySlug({ slug: '' })).rejects.toThrow();
    });
  });

  describe('create procedure', () => {
    it('should create a new blog post when authenticated', async () => {
      const ctx = createMockContext({
        userId: 'user-123',
        email: 'test@example.com',
        plan: 'free',
      });

      const mockPost = createMockPost();
      vi.mocked(blogHelpers.resolveAuthorId).mockResolvedValue('author-id-123');
      vi.mocked(blogHelpers.normalizeStatusFields).mockReturnValue({
        status: 'draft',
        publishedAt: null,
        scheduledFor: null,
      });

      ctx.db.returning = vi.fn().mockResolvedValueOnce([mockPost]);

      const caller = createCaller(ctx);
      const result = await caller.create({
        title: 'New Post',
        slug: 'new-post',
        summary: 'Test summary',
        status: 'draft',
      });

      expect(result).toBeDefined();
      expect(result.title).toBe('Test Post');
      expect(blogHelpers.resolveAuthorId).toHaveBeenCalled();
      expect(blogHelpers.normalizeStatusFields).toHaveBeenCalled();
    });

    it('should sync categories and tags after creation', async () => {
      const ctx = createMockContext({
        userId: 'user-123',
        email: 'test@example.com',
        plan: 'free',
      });

      const mockPost = createMockPost();
      vi.mocked(blogHelpers.resolveAuthorId).mockResolvedValue('author-id-123');
      vi.mocked(blogHelpers.normalizeStatusFields).mockReturnValue({
        status: 'draft',
        publishedAt: null,
        scheduledFor: null,
      });

      ctx.db.returning = vi.fn().mockResolvedValueOnce([mockPost]);

      const caller = createCaller(ctx);
      await caller.create({
        title: 'New Post',
        slug: 'new-post',
        categoryIds: ['cat-1', 'cat-2'],
        tagIds: ['tag-1', 'tag-2'],
      });

      expect(blogHelpers.syncPostCategories).toHaveBeenCalledWith(
        ctx,
        mockPost.id,
        ['cat-1', 'cat-2']
      );
      expect(blogHelpers.syncPostTags).toHaveBeenCalledWith(ctx, mockPost.id, [
        'tag-1',
        'tag-2',
      ]);
    });

    it('should require authentication', async () => {
      const ctx = createMockContext(); // No user
      const caller = createCaller(ctx);

      await expect(
        caller.create({
          title: 'New Post',
          slug: 'new-post',
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

      // Missing required fields
      await expect(caller.create({ title: '', slug: 'test' })).rejects.toThrow();

      // Invalid slug format
      await expect(
        caller.create({ title: 'Test', slug: 'Invalid Slug!' })
      ).rejects.toThrow();

      // Title too short
      await expect(
        caller.create({ title: 'ab', slug: 'test' })
      ).rejects.toThrow();
    });

    it('should throw error if post creation fails', async () => {
      const ctx = createMockContext({
        userId: 'user-123',
        email: 'test@example.com',
        plan: 'free',
      });

      vi.mocked(blogHelpers.resolveAuthorId).mockResolvedValue('author-id-123');
      vi.mocked(blogHelpers.normalizeStatusFields).mockReturnValue({
        status: 'draft',
        publishedAt: null,
        scheduledFor: null,
      });

      ctx.db.returning = vi.fn().mockResolvedValueOnce([]); // No post returned

      const caller = createCaller(ctx);

      await expect(
        caller.create({
          title: 'New Post',
          slug: 'new-post',
        })
      ).rejects.toThrow(TRPCError);
      await expect(
        caller.create({
          title: 'New Post',
          slug: 'new-post',
        })
      ).rejects.toMatchObject({
        code: 'INTERNAL_SERVER_ERROR',
      });
    });
  });

  describe('update procedure', () => {
    it('should update post when user is author', async () => {
      const ctx = createMockContext({
        userId: 'user-123',
        email: 'test@example.com',
        plan: 'free',
      });

      const existingPost = { id: 'post-id', authorId: 'author-id-123' };
      const updatedPost = createMockPost({ title: 'Updated Title' });

      ctx.db.limit = vi.fn().mockResolvedValueOnce([existingPost]);
      ctx.db.returning = vi.fn().mockResolvedValueOnce([updatedPost]);

      vi.mocked(blogHelpers.canManagePost).mockResolvedValue(true);

      const caller = createCaller(ctx);
      const result = await caller.update({
        id: 'post-id',
        updates: { title: 'Updated Title' },
      });

      expect(result).toBeDefined();
      expect(result.title).toBe('Updated Title');
      expect(ctx.db.update).toHaveBeenCalled();
    });

    it('should allow admin to update any post', async () => {
      const ctx = createMockContext({
        userId: 'admin-123',
        email: 'admin@example.com',
        plan: 'admin',
      });

      const existingPost = { id: 'post-id', authorId: 'other-author' };
      const updatedPost = createMockPost({ title: 'Admin Updated' });

      ctx.db.limit = vi.fn().mockResolvedValueOnce([existingPost]);
      ctx.db.returning = vi.fn().mockResolvedValueOnce([updatedPost]);

      vi.mocked(blogHelpers.canManagePost).mockResolvedValue(true);

      const caller = createCaller(ctx);
      const result = await caller.update({
        id: 'post-id',
        updates: { title: 'Admin Updated' },
      });

      expect(result).toBeDefined();
      expect(blogHelpers.canManagePost).toHaveBeenCalled();
    });

    it('should throw FORBIDDEN if user cannot manage post', async () => {
      const ctx = createMockContext({
        userId: 'user-123',
        email: 'test@example.com',
        plan: 'free',
      });

      const existingPost = { id: 'post-id', authorId: 'other-author' };

      ctx.db.limit = vi.fn().mockResolvedValueOnce([existingPost]);
      vi.mocked(blogHelpers.canManagePost).mockResolvedValue(false);

      const caller = createCaller(ctx);

      await expect(
        caller.update({
          id: 'post-id',
          updates: { title: 'Unauthorized Update' },
        })
      ).rejects.toThrow(TRPCError);
      await expect(
        caller.update({
          id: 'post-id',
          updates: { title: 'Unauthorized Update' },
        })
      ).rejects.toMatchObject({
        code: 'FORBIDDEN',
      });
    });

    it('should throw NOT_FOUND for non-existent post', async () => {
      const ctx = createMockContext({
        userId: 'user-123',
        email: 'test@example.com',
        plan: 'free',
      });

      ctx.db.limit = vi.fn().mockResolvedValueOnce([]);

      const caller = createCaller(ctx);

      await expect(
        caller.update({
          id: 'non-existent-id',
          updates: { title: 'Updated Title' },
        })
      ).rejects.toThrow(TRPCError);
      await expect(
        caller.update({
          id: 'non-existent-id',
          updates: { title: 'Updated Title' },
        })
      ).rejects.toMatchObject({
        code: 'NOT_FOUND',
      });
    });

    it('should sync categories and tags when updated', async () => {
      const ctx = createMockContext({
        userId: 'user-123',
        email: 'test@example.com',
        plan: 'free',
      });

      const existingPost = { id: 'post-id', authorId: 'author-id-123' };
      const updatedPost = createMockPost();

      ctx.db.limit = vi.fn().mockResolvedValueOnce([existingPost]);
      ctx.db.returning = vi.fn().mockResolvedValueOnce([updatedPost]);

      vi.mocked(blogHelpers.canManagePost).mockResolvedValue(true);

      const caller = createCaller(ctx);
      await caller.update({
        id: 'post-id',
        updates: {
          categoryIds: ['new-cat-1'],
          tagIds: ['new-tag-1', 'new-tag-2'],
        },
      });

      expect(blogHelpers.syncPostCategories).toHaveBeenCalledWith(
        ctx,
        'post-id',
        ['new-cat-1']
      );
      expect(blogHelpers.syncPostTags).toHaveBeenCalledWith(ctx, 'post-id', [
        'new-tag-1',
        'new-tag-2',
      ]);
    });

    it('should normalize status fields when status is updated', async () => {
      const ctx = createMockContext({
        userId: 'user-123',
        email: 'test@example.com',
        plan: 'free',
      });

      const existingPost = { id: 'post-id', authorId: 'author-id-123' };
      const updatedPost = createMockPost({ status: 'published' });

      ctx.db.limit = vi.fn().mockResolvedValueOnce([existingPost]);
      ctx.db.returning = vi.fn().mockResolvedValueOnce([updatedPost]);

      vi.mocked(blogHelpers.canManagePost).mockResolvedValue(true);
      vi.mocked(blogHelpers.normalizeStatusFields).mockReturnValue({
        status: 'published',
        publishedAt: new Date(),
        scheduledFor: null,
      });

      const caller = createCaller(ctx);
      await caller.update({
        id: 'post-id',
        updates: { status: 'published' },
      });

      expect(blogHelpers.normalizeStatusFields).toHaveBeenCalled();
    });

    it('should validate UUID format for post ID', async () => {
      const ctx = createMockContext({
        userId: 'user-123',
        email: 'test@example.com',
        plan: 'free',
      });
      const caller = createCaller(ctx);

      await expect(
        caller.update({
          id: 'invalid-uuid',
          updates: { title: 'Updated' },
        })
      ).rejects.toThrow();
    });
  });

  describe('delete procedure', () => {
    it('should delete post when user is author', async () => {
      const ctx = createMockContext({
        userId: 'user-123',
        email: 'test@example.com',
        plan: 'free',
      });

      const existingPost = { id: 'post-id', authorId: 'author-id-123' };

      ctx.db.limit = vi.fn().mockResolvedValueOnce([existingPost]);
      ctx.db.where = vi.fn().mockResolvedValueOnce([]);

      vi.mocked(blogHelpers.canManagePost).mockResolvedValue(true);

      const caller = createCaller(ctx);
      const result = await caller.delete({ id: 'post-id' });

      expect(result).toEqual({ success: true });
      expect(ctx.db.delete).toHaveBeenCalled();
    });

    it('should allow admin to delete any post', async () => {
      const ctx = createMockContext({
        userId: 'admin-123',
        email: 'admin@example.com',
        plan: 'admin',
      });

      const existingPost = { id: 'post-id', authorId: 'other-author' };

      ctx.db.limit = vi.fn().mockResolvedValueOnce([existingPost]);
      ctx.db.where = vi.fn().mockResolvedValueOnce([]);

      vi.mocked(blogHelpers.canManagePost).mockResolvedValue(true);

      const caller = createCaller(ctx);
      const result = await caller.delete({ id: 'post-id' });

      expect(result).toEqual({ success: true });
      expect(blogHelpers.canManagePost).toHaveBeenCalled();
    });

    it('should throw FORBIDDEN if user cannot manage post', async () => {
      const ctx = createMockContext({
        userId: 'user-123',
        email: 'test@example.com',
        plan: 'free',
      });

      const existingPost = { id: 'post-id', authorId: 'other-author' };

      ctx.db.limit = vi.fn().mockResolvedValueOnce([existingPost]);
      vi.mocked(blogHelpers.canManagePost).mockResolvedValue(false);

      const caller = createCaller(ctx);

      await expect(caller.delete({ id: 'post-id' })).rejects.toThrow(TRPCError);
      await expect(caller.delete({ id: 'post-id' })).rejects.toMatchObject({
        code: 'FORBIDDEN',
      });
    });

    it('should throw NOT_FOUND for non-existent post', async () => {
      const ctx = createMockContext({
        userId: 'user-123',
        email: 'test@example.com',
        plan: 'free',
      });

      ctx.db.limit = vi.fn().mockResolvedValueOnce([]);

      const caller = createCaller(ctx);

      await expect(caller.delete({ id: 'non-existent-id' })).rejects.toThrow(
        TRPCError
      );
      await expect(caller.delete({ id: 'non-existent-id' })).rejects.toMatchObject({
        code: 'NOT_FOUND',
      });
    });

    it('should require authentication', async () => {
      const ctx = createMockContext(); // No user
      const caller = createCaller(ctx);

      await expect(caller.delete({ id: 'post-id' })).rejects.toThrow(TRPCError);
    });

    it('should validate UUID format for post ID', async () => {
      const ctx = createMockContext({
        userId: 'user-123',
        email: 'test@example.com',
        plan: 'free',
      });
      const caller = createCaller(ctx);

      await expect(caller.delete({ id: 'invalid-uuid' })).rejects.toThrow();
    });
  });
});
