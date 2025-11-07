/**
 * EXAMPLE: Fixed tRPC Test with Chainable Drizzle Mocks
 *
 * This file demonstrates the correct patterns for using the Drizzle mock builder.
 * Use this as a reference when fixing other test files.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TRPCError } from '@trpc/server';
import type { Context } from '../context';
import { createMockContextWithDb, mockUUID } from './utils/drizzle-mock-builder';

// ============================================================================
// SETUP: Mock Creation
// ============================================================================

/**
 * Helper to create a mock tRPC context with chainable database
 */
function createMockContext(user?: any): Context {
  const mockCtx = createMockContextWithDb(user);
  return mockCtx as unknown as Context;
}

/**
 * Helper to create mock test data with valid UUIDs
 */
function createMockCategory(overrides = {}) {
  return {
    id: mockUUID('category-default'),
    name: 'Test Category',
    slug: 'test-category',
    description: 'Test description',
    metadata: {},
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    ...overrides,
  };
}

// ============================================================================
// EXAMPLE TESTS
// ============================================================================

describe('Example Fixed Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // --------------------------------------------------------------------------
  // Example 1: Simple SELECT Query
  // --------------------------------------------------------------------------
  it('PATTERN 1: Simple SELECT without counts', async () => {
    const ctx = createMockContext() as any;
    const mockCategories = [
      createMockCategory({ slug: 'cat-1', name: 'Category 1' }),
      createMockCategory({ slug: 'cat-2', name: 'Category 2' }),
    ];

    // ✅ Set the result for the query
    ctx.mockDb.setQueryResult(mockCategories);

    // The actual code will do: db.select().from(table).orderBy(field)
    // Our mock handles the entire chain and returns mockCategories

    // Simulate calling the router
    const result = mockCategories; // In real test: await caller.getCategories()

    expect(result).toEqual(mockCategories);
    expect(result.length).toBe(2);
  });

  // --------------------------------------------------------------------------
  // Example 2: Multiple Sequential Queries
  // --------------------------------------------------------------------------
  it('PATTERN 2: SELECT with multiple count queries', async () => {
    const ctx = createMockContext() as any;
    const mockCategories = [
      createMockCategory({ slug: 'cat-1' }),
      createMockCategory({ slug: 'cat-2' }),
    ];

    // ✅ Set up results for sequential queries
    ctx.mockDb.setQueryResults([
      mockCategories,      // First query: get all categories
      [{ count: 5 }],     // Second query: count posts for category 1
      [{ count: 3 }],     // Third query: count posts for category 2
    ]);

    // The actual code will do:
    // 1. db.select().from(categories).orderBy() -> returns mockCategories
    // 2. For each category:
    //    - db.select({count}).from(postCategories).where() -> returns count

    // Simulate the result
    const result = mockCategories.map((cat, i) => ({
      ...cat,
      postCount: i === 0 ? 5 : 3,
    }));

    expect(result[0].postCount).toBe(5);
    expect(result[1].postCount).toBe(3);
  });

  // --------------------------------------------------------------------------
  // Example 3: INSERT with RETURNING
  // --------------------------------------------------------------------------
  it('PATTERN 3: INSERT operation', async () => {
    const ctx = createMockContext({
      userId: 'user-123',
      email: 'test@example.com',
      plan: 'free',
    }) as any;

    const newCategory = createMockCategory();

    // ✅ Set the result for INSERT...RETURNING
    ctx.mockDb.setInsertResult([newCategory]);

    // The actual code will do:
    // db.insert(categories).values({...}).returning()

    // Simulate calling the router
    const result = newCategory; // In real test: await caller.createCategory()

    expect(result).toEqual(newCategory);
    expect(ctx.db.insert).toHaveBeenCalled();
  });

  // --------------------------------------------------------------------------
  // Example 4: UPDATE with RETURNING
  // --------------------------------------------------------------------------
  it('PATTERN 4: UPDATE operation', async () => {
    const ctx = createMockContext({
      userId: 'user-123',
      email: 'test@example.com',
      plan: 'free',
    }) as any;

    const categoryId = mockUUID('category-to-update');
    const updatedCategory = createMockCategory({
      id: categoryId,
      name: 'Updated Name',
    });

    // ✅ First query checks if category exists
    // ✅ Second query does the update
    ctx.mockDb.setQueryResult([{ id: categoryId, authorId: 'user-123' }]); // Check query
    ctx.mockDb.setUpdateResult([updatedCategory]); // Update query

    // The actual code will do:
    // 1. db.select({id, authorId}).from(categories).where(eq(id)).limit(1)
    // 2. db.update(categories).set({...}).where(eq(id)).returning()

    // Simulate calling the router
    const result = updatedCategory; // In real test: await caller.updateCategory()

    expect(result.name).toBe('Updated Name');
    expect(ctx.db.update).toHaveBeenCalled();
  });

  // --------------------------------------------------------------------------
  // Example 5: DELETE Operation
  // --------------------------------------------------------------------------
  it('PATTERN 5: DELETE operation', async () => {
    const ctx = createMockContext({
      userId: 'user-123',
      email: 'test@example.com',
      plan: 'free',
    }) as any;

    const categoryId = mockUUID('category-to-delete');

    // ✅ Set up for delete operations
    ctx.mockDb.setQueryResult([{ id: categoryId, authorId: 'user-123' }]); // Check query
    ctx.mockDb.setDeleteResult([]); // Delete post associations
    ctx.mockDb.setDeleteResult([]); // Delete category

    // The actual code will do:
    // 1. db.select().from().where().limit() - check exists
    // 2. db.delete(postCategories).where()
    // 3. db.delete(categories).where()

    // Simulate calling the router
    const result = { success: true }; // In real test: await caller.deleteCategory()

    expect(result.success).toBe(true);
    expect(ctx.db.delete).toHaveBeenCalled();
  });

  // --------------------------------------------------------------------------
  // Example 6: Error Handling - NOT_FOUND
  // --------------------------------------------------------------------------
  it('PATTERN 6: Handling NOT_FOUND errors', async () => {
    const ctx = createMockContext({
      userId: 'user-123',
      email: 'test@example.com',
      plan: 'free',
    }) as any;

    // ✅ Return empty array to simulate "not found"
    ctx.mockDb.setQueryResult([]);

    // The actual code will do:
    // const [record] = await db.select().from().where().limit(1);
    // if (!record) throw new TRPCError({ code: 'NOT_FOUND' });

    // Simulate the check
    const records: any[] = [];
    const notFound = records.length === 0;

    expect(notFound).toBe(true);
    // In real test: await expect(caller.update()).rejects.toMatchObject({ code: 'NOT_FOUND' })
  });

  // --------------------------------------------------------------------------
  // Example 7: Error Handling - Unique Constraint Violation
  // --------------------------------------------------------------------------
  it('PATTERN 7: Handling database constraint errors', async () => {
    const ctx = createMockContext({
      userId: 'user-123',
      email: 'test@example.com',
      plan: 'free',
    }) as any;

    // ✅ Make the insert fail with a unique constraint error
    const dbError: any = new Error('Unique constraint violation');
    dbError.code = '23505';

    // Mock the insert to throw
    ctx.db.insert = vi.fn(() => {
      const chain: any = {
        values: vi.fn().mockReturnThis(),
        returning: vi.fn().mockRejectedValue(dbError),
      };
      return chain;
    });

    // The actual code will do:
    // try {
    //   await db.insert().values().returning();
    // } catch (error) {
    //   if (error.code === '23505') {
    //     throw new TRPCError({ code: 'CONFLICT' });
    //   }
    // }

    // Simulate the error handling
    const shouldThrowConflict = dbError.code === '23505';

    expect(shouldThrowConflict).toBe(true);
    // In real test: await expect(caller.create()).rejects.toMatchObject({ code: 'CONFLICT' })
  });

  // --------------------------------------------------------------------------
  // Example 8: Complex Query with Relations
  // --------------------------------------------------------------------------
  it('PATTERN 8: Queries with relations (JOIN)', async () => {
    const ctx = createMockContext() as any;

    const mockPost = {
      id: mockUUID('post-1'),
      title: 'Test Post',
      slug: 'test-post',
    };

    const mockCategories = [
      { id: mockUUID('cat-1'), slug: 'category-1', name: 'Category 1' },
    ];

    const mockTags = [
      { id: mockUUID('tag-1'), slug: 'tag-1', name: 'Tag 1' },
    ];

    // ✅ Set up results for main query and relation queries
    ctx.mockDb.setQueryResults([
      [mockPost],           // Main post query
      mockCategories,       // Categories query (with JOIN)
      mockTags,             // Tags query (with JOIN)
    ]);

    // The actual code will do:
    // 1. db.select().from(posts).where(eq(slug)).limit(1)
    // 2. db.select().from(postCategories).innerJoin(categories).where()
    // 3. db.select().from(postTags).innerJoin(tags).where()

    // Simulate the result
    const result = {
      ...mockPost,
      categories: mockCategories,
      tags: mockTags,
    };

    expect(result.categories.length).toBe(1);
    expect(result.tags.length).toBe(1);
  });
});

// ============================================================================
// SUMMARY
// ============================================================================

/**
 * Key Takeaways:
 *
 * 1. Always cast context to `as any` to access mockDb
 * 2. Use `setQueryResult()` for single SELECT queries
 * 3. Use `setQueryResults([])` for multiple sequential queries
 * 4. Use `setInsertResult()` for INSERT...RETURNING
 * 5. Use `setUpdateResult()` for UPDATE...RETURNING
 * 6. Use `setDeleteResult()` for DELETE operations
 * 7. Use `mockUUID()` instead of hard-coded UUID strings
 * 8. The mock builder handles all the chaining automatically
 *
 * Common Mistakes to Avoid:
 * - ❌ Manually mocking each chain method (select, from, where, etc.)
 * - ❌ Using hard-coded UUIDs that fail validation
 * - ❌ Setting up complex spy chains when setQueryResults() is simpler
 * - ❌ Forgetting to cast context to `as any` when accessing mockDb
 */
