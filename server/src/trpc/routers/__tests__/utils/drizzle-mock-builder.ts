/**
 * Drizzle Mock Builder
 *
 * Provides chainable mock implementations for Drizzle ORM query builder.
 * This solves the issue where Vitest mocks break method chaining required by Drizzle queries.
 *
 * Usage:
 * ```typescript
 * const mockDb = createDrizzleMock();
 *
 * // Set up expected return value
 * mockDb.setQueryResult([{ id: '1', name: 'Test' }]);
 *
 * // Now the chain works:
 * const result = await mockDb.select().from(table).where(eq(field, value));
 * // result === [{ id: '1', name: 'Test' }]
 * ```
 */

import { vi } from 'vitest';

/**
 * Creates a chainable query builder mock that mimics Drizzle's API
 */
export function createQueryChainMock(finalResult: any = []) {
  const chain = {
    // SELECT operations
    select: vi.fn().mockReturnThis(),

    // FROM operations
    from: vi.fn().mockReturnThis(),

    // WHERE operations
    where: vi.fn().mockReturnThis(),

    // JOIN operations
    innerJoin: vi.fn().mockReturnThis(),
    leftJoin: vi.fn().mockReturnThis(),
    rightJoin: vi.fn().mockReturnThis(),
    fullJoin: vi.fn().mockReturnThis(),

    // ORDERING operations
    orderBy: vi.fn().mockReturnThis(),

    // LIMIT/OFFSET operations
    limit: vi.fn().mockReturnThis(),
    offset: vi.fn().mockReturnThis(),

    // UPDATE operations
    set: vi.fn().mockReturnThis(),

    // INSERT operations
    values: vi.fn().mockReturnThis(),

    // RETURN operations (terminal methods that resolve the chain)
    returning: vi.fn().mockResolvedValue(finalResult),

    // Make the chain awaitable (for queries without explicit .returning())
    then: (resolve: (value: any) => void) => {
      return Promise.resolve(finalResult).then(resolve);
    },
  };

  return chain;
}

/**
 * Creates a complete Drizzle database mock with chainable query builders
 */
export function createDrizzleMock() {
  let queryResults: any[] = [[]]; // Array of results for sequential queries
  let queryIndex = 0;
  let insertResult: any = [];
  let updateResult: any = [];
  let deleteResult: any = [];

  const mock = {
    /**
     * Set the result that will be returned by the next SELECT query
     * For multiple queries, call this multiple times or use setQueryResults
     */
    setQueryResult(result: any) {
      queryResults = [result];
      queryIndex = 0;
    },

    /**
     * Set multiple results for sequential SELECT queries
     * Each call to select() will use the next result in the array
     */
    setQueryResults(results: any[]) {
      queryResults = results;
      queryIndex = 0;
    },

    /**
     * Set the result that will be returned by INSERT operations
     */
    setInsertResult(result: any) {
      insertResult = result;
    },

    /**
     * Set the result that will be returned by UPDATE operations
     */
    setUpdateResult(result: any) {
      updateResult = result;
    },

    /**
     * Set the result that will be returned by DELETE operations
     */
    setDeleteResult(result: any) {
      deleteResult = result;
    },

    /**
     * SELECT query builder
     * Returns different results for sequential calls when using setQueryResults
     */
    select: vi.fn(() => {
      const result = queryResults[queryIndex] || queryResults[queryResults.length - 1] || [];
      queryIndex++;
      return createQueryChainMock(result);
    }),

    /**
     * INSERT query builder
     */
    insert: vi.fn(() => createQueryChainMock(insertResult)),

    /**
     * UPDATE query builder
     */
    update: vi.fn(() => createQueryChainMock(updateResult)),

    /**
     * DELETE query builder
     */
    delete: vi.fn(() => createQueryChainMock(deleteResult)),

    /**
     * Reset all mock call histories and query index
     */
    reset() {
      this.select.mockClear();
      this.insert.mockClear();
      this.update.mockClear();
      this.delete.mockClear();
      queryIndex = 0;
    },
  };

  return mock;
}

/**
 * Helper to create a mock context with a chainable database
 *
 * @example
 * ```typescript
 * const ctx = createMockContext();
 * ctx.mockDb.setQueryResult([{ id: '1', name: 'Test' }]);
 *
 * // Use in tests
 * const result = await ctx.db.select().from(table).where(condition);
 * ```
 */
export function createMockContextWithDb(user?: any) {
  const drizzleMock = createDrizzleMock();

  return {
    req: {} as any,
    res: {} as any,
    db: drizzleMock as any,
    mockDb: drizzleMock, // Expose for test manipulation
    user: user || null,
  };
}

/**
 * Helper to generate valid UUID v4 strings for tests
 */
export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Helper to generate deterministic UUID for tests (based on seed string)
 */
export function mockUUID(seed: string): string {
  // Create a simple hash from the seed
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash) + seed.charCodeAt(i);
    hash = hash & hash; // Convert to 32bit integer
  }

  // Use the hash to create a deterministic UUID
  const hex = Math.abs(hash).toString(16).padStart(8, '0');
  return `${hex}-0000-4000-a000-${hex}${hex}`;
}
