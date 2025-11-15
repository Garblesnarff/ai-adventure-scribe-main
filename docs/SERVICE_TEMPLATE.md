# Service Pattern Template

## Overview

This document defines the standard pattern for all service classes in the AI Adventure Scribe codebase. All services should follow this pattern to ensure consistency, maintainability, and testability.

## Pattern: Static Class Pattern

**Decision**: All services use the **Static Class Pattern** with static methods.

**Rationale**:
- Majority of existing services use this pattern (11 of 13 as of Work Unit 2.3)
- Easier to mock entire service in tests
- Cleaner namespace organization
- TypeScript-friendly
- No instantiation required
- Clear separation of concerns

## Service Template

### File Structure

```typescript
/**
 * [Service Name] Service
 *
 * [Brief description of what this service does and its domain responsibility]
 * [Reference to D&D rules if applicable, e.g., "Follows PHB pg. 186"]
 *
 * @module server/services/[service-name]-service
 *
 * @example
 * ```typescript
 * // Import the service
 * import { ServiceNameService } from '../services/service-name-service.js';
 *
 * // Use service methods
 * const result = await ServiceNameService.methodName(params);
 * ```
 */

import { db } from '../../../db/client.js';
import { eq, and } from 'drizzle-orm';
import type { YourTypes } from '../types/your-types.js';
import { NotFoundError, ValidationError, BusinessLogicError } from '../lib/errors.js';

/**
 * Constants used by the service
 */
const SERVICE_CONSTANT = 'value';

/**
 * Helper function (private to module)
 */
function helperFunction(input: string): string {
  return input.trim();
}

/**
 * [Service Name] Service
 *
 * Provides [specific operations] for [domain concept].
 *
 * @example
 * ```typescript
 * const result = await ServiceNameService.mainOperation({ param: 'value' });
 * ```
 */
export class ServiceNameService {
  /**
   * Private static constants (if needed)
   */
  private static readonly INTERNAL_CONSTANT = 100;

  /**
   * [Method description - what it does and why]
   *
   * @param param1 - Description of parameter 1
   * @param param2 - Description of parameter 2
   * @returns Description of return value
   * @throws {NotFoundError} When the resource doesn't exist
   * @throws {ValidationError} When input validation fails
   * @throws {BusinessLogicError} When business rules are violated
   *
   * @example
   * ```typescript
   * const result = await ServiceNameService.methodName('id123', { field: 'value' });
   * console.log(result.data);
   * ```
   */
  static async methodName(
    param1: string,
    param2: YourType
  ): Promise<ReturnType> {
    try {
      // 1. Input validation
      if (!param1?.trim()) {
        throw new ValidationError('param1 is required');
      }

      // 2. Database operations
      const result = await db.query.yourTable.findFirst({
        where: eq(yourTable.id, param1),
      });

      if (!result) {
        throw new NotFoundError(`Resource not found: ${param1}`);
      }

      // 3. Business logic
      const processed = this.processData(result);

      // 4. Return result
      return {
        success: true,
        data: processed,
      };
    } catch (error) {
      // Log error context
      console.error(`Error in ServiceNameService.methodName:`, {
        param1,
        param2,
        error: error instanceof Error ? error.message : error,
      });

      // Re-throw known errors
      if (error instanceof NotFoundError ||
          error instanceof ValidationError ||
          error instanceof BusinessLogicError) {
        throw error;
      }

      // Wrap unexpected errors
      throw new InternalServerError(
        `Failed to execute methodName: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Private helper method
   * @param data - Data to process
   * @returns Processed data
   */
  private static processData(data: any): any {
    // Implementation
    return data;
  }
}
```

## Naming Conventions

### Service Class Names
- Format: `{Domain}Service` (PascalCase)
- Examples: `CombatInitiativeService`, `RestService`, `AIUsageService`, `BlogService`
- Export as named export: `export class ServiceNameService`

### File Names
- Format: `{domain}-service.ts` (kebab-case)
- Examples: `combat-initiative-service.ts`, `rest-service.ts`, `ai-usage-service.ts`

### Method Names
- Use descriptive verb phrases
- Examples: `startCombat()`, `applyCondition()`, `fetchPublishedBlogPosts()`
- Async methods should return `Promise<T>`

## Documentation Standards

### File-Level Documentation
Every service file must have:
1. Service name and purpose
2. Domain responsibility description
3. D&D rules reference (if applicable)
4. Module path
5. Usage example

### Class-Level Documentation
Every service class must have:
1. Brief description
2. Main operations overview
3. Basic usage example

### Method-Level Documentation
Every public method must document:
1. What the method does (behavior)
2. All parameters with types and descriptions
3. Return value with type and description
4. All possible thrown errors with conditions
5. Usage example (for complex methods)

## Error Handling

### Standard Error Types
Use the standard error classes from `lib/errors.js`:
- `NotFoundError` - Resource not found
- `ValidationError` - Input validation failed
- `BusinessLogicError` - Business rule violation
- `InternalServerError` - Unexpected server error

### Error Handling Pattern
```typescript
try {
  // Service logic
} catch (error) {
  // Log with context
  console.error('Error in ServiceName.method:', { context, error });

  // Re-throw known errors
  if (error instanceof NotFoundError) {
    throw error;
  }

  // Wrap unexpected errors
  throw new InternalServerError(`Operation failed: ${error.message}`);
}
```

## Database Operations

### Transaction Pattern
For operations that modify multiple tables:

```typescript
static async complexOperation(params: Params): Promise<Result> {
  return await db.transaction(async (tx) => {
    // All operations use tx instead of db
    const step1 = await tx.insert(table1).values(data1);
    const step2 = await tx.update(table2).set(data2);

    return { step1, step2 };
  });
}
```

### Query Pattern
```typescript
// Simple query
const result = await db.query.table.findFirst({
  where: eq(table.id, id),
});

// Complex query with relations
const result = await db.query.table.findFirst({
  where: and(
    eq(table.id, id),
    eq(table.userId, userId)
  ),
  with: {
    relatedTable: true,
  },
});
```

## Testing Pattern

### Mock Strategy for Static Classes
```typescript
import { vi } from 'vitest';
import { ServiceNameService } from '../service-name-service.js';

describe('ServiceNameService', () => {
  // Spy on individual methods
  it('should call method correctly', async () => {
    const spy = vi.spyOn(ServiceNameService, 'methodName')
      .mockResolvedValue(mockResult);

    const result = await ServiceNameService.methodName(params);

    expect(spy).toHaveBeenCalledWith(params);
    expect(result).toEqual(mockResult);

    spy.mockRestore();
  });

  // Or mock entire class
  vi.mock('../service-name-service.js', () => ({
    ServiceNameService: {
      methodName: vi.fn().mockResolvedValue(mockResult),
      anotherMethod: vi.fn().mockResolvedValue(mockResult2),
    }
  }));
});
```

## Import Pattern

### In Route Files
```typescript
import { ServiceNameService } from '../../services/service-name-service.js';

// Usage
const result = await ServiceNameService.methodName(params);
```

### In Other Services
```typescript
import { OtherService } from './other-service.js';

export class MyService {
  static async myMethod() {
    // Call other service
    const data = await OtherService.getData();
    return this.processData(data);
  }
}
```

## Best Practices

### DO
- ✅ Use static methods for all public operations
- ✅ Use private static methods for internal helpers
- ✅ Document all public methods with JSDoc
- ✅ Use TypeScript types for all parameters and returns
- ✅ Validate inputs at the start of methods
- ✅ Use standard error classes
- ✅ Log errors with context
- ✅ Use transactions for multi-table operations
- ✅ Keep services focused on a single domain
- ✅ Write tests for all public methods

### DON'T
- ❌ Don't create service instances
- ❌ Don't use non-static methods
- ❌ Don't use class constructors
- ❌ Don't store instance state
- ❌ Don't mix multiple domains in one service
- ❌ Don't swallow errors silently
- ❌ Don't use `any` type without justification
- ❌ Don't skip input validation
- ❌ Don't leave methods undocumented
- ❌ Don't perform business logic in routes

## Service Responsibility Guidelines

### Single Responsibility Principle
Each service should handle one domain concept:
- `CombatInitiativeService` - Initiative and turn order
- `ConditionsService` - Status conditions
- `RestService` - Resting and recovery
- `ProgressionService` - Leveling and experience
- `ClassFeaturesService` - Class features and abilities

### When to Create a New Service
Create a new service when:
1. You have a distinct domain concept (e.g., inventory, quests, npcs)
2. The operations are logically grouped
3. The service would have at least 3-5 related methods
4. It reduces complexity in existing services

### When to Extend Existing Service
Extend an existing service when:
1. The operation is closely related to existing methods
2. It uses the same database tables
3. It shares significant business logic

## Migration Checklist

When converting an existing service to this pattern:

- [ ] Convert function exports to static class methods
- [ ] Update all imports in route files
- [ ] Update all imports in other services
- [ ] Update test files with new mocking strategy
- [ ] Add/update JSDoc documentation
- [ ] Add file-level documentation
- [ ] Add class-level documentation
- [ ] Add method-level documentation
- [ ] Verify all tests pass
- [ ] Check for TypeScript errors
- [ ] Review error handling

## Examples

### Complete Service Example
See existing services for complete examples:
- `/server/src/services/combat-initiative-service.ts` - Complex domain logic
- `/server/src/services/rest-service.ts` - Multi-table transactions
- `/server/src/services/ai-usage-service.ts` - External integrations
- `/server/src/services/blog-service.ts` - Data transformation

## Version History

- **2025-11-14**: Initial template created (Work Unit 2.3)
- Pattern standardized across all services
- 13/13 services now use static class pattern
