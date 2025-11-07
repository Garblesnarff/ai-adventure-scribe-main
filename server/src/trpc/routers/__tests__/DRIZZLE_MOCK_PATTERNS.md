# Drizzle Mock Builder - Test Pattern Guide

## Overview
This guide shows how to update tRPC tests to use the chainable Drizzle mock builder utility.

## Problem
The original tests used manual mocking that broke Drizzle's method chaining:
```typescript
// ❌ BROKEN: Chain breaks because returning isn't chainable
ctx.db.select = vi.fn().mockReturnThis();
ctx.db.from = vi.fn().mockReturnThis();
ctx.db.where = vi.fn().mockReturnThis();
ctx.db.returning = vi.fn().mockResolvedValue([]); // Chain ends here!
```

When Drizzle tries to call `ctx.db.select().from().where()`, it fails because the chain isn't properly maintained.

## Solution
Use the `drizzle-mock-builder` utility that provides proper chainable mocks:

```typescript
import { createMockContextWithDb, mockUUID } from './utils/drizzle-mock-builder';
```

## Common Patterns

### Pattern 1: Simple SELECT Query
**Before:**
```typescript
const ctx = createMockContext();
const mockData = [{ id: '1', name: 'Test' }];
ctx.db.orderBy = vi.fn().mockResolvedValueOnce(mockData);
```

**After:**
```typescript
const ctx = createMockContext() as any;
const mockData = [{ id: '1', name: 'Test' }];
ctx.mockDb.setQueryResult(mockData);
```

### Pattern 2: Multiple Sequential Queries
**Before:**
```typescript
const ctx = createMockContext();
ctx.db.orderBy = vi.fn().mockResolvedValueOnce(mockCategories);

const countChain = {
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockResolvedValue([{ count: 5 }]),
};
vi.spyOn(ctx.db, 'select').mockReturnValue(countChain as any);
```

**After:**
```typescript
const ctx = createMockContext() as any;
// First query returns categories, subsequent queries return counts
ctx.mockDb.setQueryResults([
  mockCategories,      // First SELECT
  [{ count: 5 }],     // Second SELECT (count query)
  [{ count: 5 }],     // Third SELECT (another count)
]);
```

### Pattern 3: INSERT with RETURNING
**Before:**
```typescript
const ctx = createMockContext({ userId: 'user-123' });
const newRecord = createMockCategory();
ctx.db.returning = vi.fn().mockResolvedValueOnce([newRecord]);
```

**After:**
```typescript
const ctx = createMockContext({ userId: 'user-123' }) as any;
const newRecord = createMockCategory();
ctx.mockDb.setInsertResult([newRecord]);
```

### Pattern 4: UPDATE with RETURNING
**Before:**
```typescript
const ctx = createMockContext({ userId: 'user-123' });
const updatedRecord = createMockCategory({ name: 'Updated' });
ctx.db.returning = vi.fn().mockResolvedValueOnce([updatedRecord]);
```

**After:**
```typescript
const ctx = createMockContext({ userId: 'user-123' }) as any;
const updatedRecord = createMockCategory({ name: 'Updated' });
ctx.mockDb.setUpdateResult([updatedRecord]);
```

### Pattern 5: DELETE
**Before:**
```typescript
const ctx = createMockContext({ userId: 'user-123' });
ctx.db.where = vi.fn().mockResolvedValue([]);
```

**After:**
```typescript
const ctx = createMockContext({ userId: 'user-123' }) as any;
ctx.mockDb.setDeleteResult([]);
```

### Pattern 6: UUID Generation
**Before:**
```typescript
function createMockCategory(overrides = {}) {
  return {
    id: '550e8400-e29b-41d4-a716-446655440000', // Hard-coded UUID
    name: 'Test',
    // ...
  };
}
```

**After:**
```typescript
import { mockUUID } from './utils/drizzle-mock-builder';

function createMockCategory(overrides = {}) {
  return {
    id: mockUUID('category-550e8400'), // Deterministic UUID from seed
    name: 'Test',
    // ...
  };
}
```

### Pattern 7: Complex Query Chains (SELECT with JOIN)
**Before:**
```typescript
const relationChain = {
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  innerJoin: vi.fn().mockReturnThis(),
  where: vi.fn().mockResolvedValue([]),
};
vi.spyOn(ctx.db, 'select').mockReturnValue(relationChain as any);
```

**After:**
```typescript
// This is handled automatically by the chainable mock
// Just set the result you want:
ctx.mockDb.setQueryResult([/* your expected data */]);
```

## Complete Example

Here's a complete before/after comparison:

**Before:**
```typescript
it('should list all categories with post counts', async () => {
  const ctx = createMockContext();
  const mockCategories = [
    createMockCategory({ slug: 'cat-1' }),
    createMockCategory({ slug: 'cat-2' }),
  ];

  ctx.db.orderBy = vi.fn().mockResolvedValueOnce(mockCategories);

  const countChain = {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockResolvedValue([{ count: 5 }]),
  };
  vi.spyOn(ctx.db, 'select').mockReturnValue(countChain as any);

  const caller = createCaller(ctx);
  const result = await caller.getCategories({ includeCount: true });

  expect(result.length).toBe(2);
  expect(result[0].postCount).toBe(5);
});
```

**After:**
```typescript
it('should list all categories with post counts', async () => {
  const ctx = createMockContext() as any;
  const mockCategories = [
    createMockCategory({ slug: 'cat-1' }),
    createMockCategory({ slug: 'cat-2' }),
  ];

  // Set up sequential query results
  ctx.mockDb.setQueryResults([
    mockCategories,      // Get all categories
    [{ count: 5 }],     // Count for first category
    [{ count: 5 }],     // Count for second category
  ]);

  const caller = createCaller(ctx);
  const result = await caller.getCategories({ includeCount: true });

  expect(result.length).toBe(2);
  expect(result[0].postCount).toBe(5);
});
```

## Implementation Checklist

When updating a test file:

1. ✅ Import chainable mock utilities:
   ```typescript
   import { createMockContextWithDb, mockUUID } from './utils/drizzle-mock-builder';
   ```

2. ✅ Update createMockContext to use the builder:
   ```typescript
   function createMockContext(user?: any): Context {
     const mockCtx = createMockContextWithDb(user);
     return mockCtx as unknown as Context;
   }
   ```

3. ✅ Replace hard-coded UUIDs with mockUUID():
   ```typescript
   id: mockUUID('some-seed-string')
   ```

4. ✅ Update all test contexts to use `as any`:
   ```typescript
   const ctx = createMockContext() as any;
   ```

5. ✅ Replace mock setup patterns:
   - `ctx.db.orderBy = vi.fn().mockResolvedValue(...)` → `ctx.mockDb.setQueryResult(...)`
   - `ctx.db.returning = vi.fn().mockResolvedValue(...)` → `ctx.mockDb.setInsertResult(...)` or `setUpdateResult(...)`
   - `ctx.db.where = vi.fn().mockResolvedValue(...)` → `ctx.mockDb.setDeleteResult(...)`

6. ✅ For multiple sequential queries, use `setQueryResults([...])` with an array

## API Reference

### `createMockContextWithDb(user?)`
Creates a mock tRPC context with a chainable database mock.

### `mockUUID(seed: string)`
Generates a deterministic UUID from a seed string for consistent test data.

### `mockDb.setQueryResult(result)`
Sets the result for the next SELECT query.

### `mockDb.setQueryResults(results[])`
Sets results for multiple sequential SELECT queries.

### `mockDb.setInsertResult(result)`
Sets the result for INSERT operations with RETURNING.

### `mockDb.setUpdateResult(result)`
Sets the result for UPDATE operations with RETURNING.

### `mockDb.setDeleteResult(result)`
Sets the result for DELETE operations.

### `mockDb.reset()`
Clears all mock call histories and resets query index.

## Status

**Tests Fixed:** 4/42 in blog-taxonomy.test.ts
**Tests Remaining:** 38
**Estimated Time:** ~30 minutes to apply patterns systematically

## Next Steps

1. Apply Pattern 1-5 systematically to all tests in blog-taxonomy.test.ts
2. Apply same patterns to blog-posts.test.ts
3. Run full test suite
4. Document pass rate improvement
