# Error Handling Guide

This guide describes the standardized error handling system implemented across all AI Adventure Scribe services and API routes.

## Table of Contents

- [Overview](#overview)
- [Implementation Status](#implementation-status)
- [Error Hierarchy](#error-hierarchy)
- [Error Codes](#error-codes)
- [Usage Guide](#usage-guide)
- [Response Format](#response-format)
- [Frontend Integration](#frontend-integration)
- [Testing](#testing)
- [Best Practices](#best-practices)

## Overview

The application uses a centralized error handling system that provides:

- **Consistent error responses** across all API endpoints
- **Type-safe error classes** for different error scenarios
- **Automatic error logging** with context
- **Proper HTTP status codes** for all error types
- **Detailed error information** for debugging (development only)

## Implementation Status

**Completion: 100% ✅**

All services have been standardized to use custom error classes. The following services have been updated:

### Recently Completed Services (Work Unit 4.1)
- ✅ **InventoryService** (8 errors converted)
  - Item management errors
  - Consumable/ammunition usage errors
  - Encumbrance calculation errors
- ✅ **CharacterService** (1 error converted)
  - Character creation errors
- ✅ **SessionService** (4 errors converted)
  - Session lifecycle errors
  - Message management errors
- ✅ **ClassFeaturesService** (8 errors converted)
  - Feature grant/usage errors
  - Subclass selection errors
- ✅ **CombatAttackService** (7 errors converted)
  - Attack resolution errors
  - Spell attack errors
- ✅ **ProgressionService** (10 errors converted)
  - XP and leveling errors
  - Ability score improvement errors

### Previously Completed Services
- ✅ **CombatHPService**
- ✅ **CombatInitiativeService**
- ✅ **ConditionsService**
- ✅ **RestService**
- ✅ **SpellSlotsService**

**Total Conversions: 38 generic errors converted to custom error types**

## Error Hierarchy

All custom errors extend from `AppError`, which provides consistent structure and behavior.

### Base Error Class

```typescript
export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code?: string,
    public details?: unknown
  )
}
```

### Error Types

#### ValidationError (400)
Used when user input fails validation or violates rules.

```typescript
import { ValidationError } from '../lib/errors.js';

// Example usage
if (level < 1 || level > 20) {
  throw new ValidationError('Level must be between 1 and 20', { level });
}

if (healingAmount < 0) {
  throw new ValidationError('Healing amount must be non-negative', { healingAmount });
}
```

**When to use:**
- Invalid input parameters
- Data validation failures
- Rule violations in user-provided data

#### UnauthorizedError (401)
Used when authentication is required but not provided.

```typescript
import { UnauthorizedError } from '../lib/errors.js';

// Example usage
if (!user) {
  throw new UnauthorizedError('Authentication required');
}
```

**When to use:**
- Missing authentication token
- Invalid authentication credentials
- Expired authentication session

#### ForbiddenError (403)
Used when user lacks permission for an action.

```typescript
import { ForbiddenError } from '../lib/errors.js';

// Example: User role check
if (user.role !== 'admin') {
  throw new ForbiddenError('Admin access required');
}

// Example: Resource ownership (InventoryService)
if (item.characterId !== input.characterId) {
  throw new ForbiddenError('Item does not belong to this character');
}
```

**When to use:**
- Insufficient permissions
- Resource ownership violations
- Role-based access control failures

#### NotFoundError (404)
Used when a requested resource doesn't exist.

```typescript
import { NotFoundError } from '../lib/errors.js';

// Example: Simple resource lookup
if (!character) {
  throw new NotFoundError('Character', characterId);
}

// Example: Combat encounter (CombatAttackService)
if (!targetStats) {
  throw new NotFoundError('Target stats', targetId);
}

// Example: Inventory item (InventoryService)
if (!item) {
  throw new NotFoundError('Inventory item', input.itemId);
}

// Example: Ammunition lookup (InventoryService)
if (items.length === 0) {
  throw new NotFoundError(`Ammunition "${ammoType}"`, characterId);
}

// Example: Class feature (ClassFeaturesService)
if (!feature) {
  throw new NotFoundError('Feature', featureId);
}
```

**When to use:**
- Database record not found
- Invalid resource ID
- Deleted or non-existent resources

#### ConflictError (409)
Used when an operation conflicts with existing data.

```typescript
import { ConflictError } from '../lib/errors.js';

// Example: Duplicate user email
const existing = await db.query.users.findFirst({ where: eq(users.email, email) });
if (existing) {
  throw new ConflictError('Email already registered', { email });
}

// Example: Feature already granted (ClassFeaturesService)
if (existing) {
  throw new ConflictError(`Feature ${feature.featureName} already granted to character`, {
    featureId,
    characterId,
  });
}

// Example: Subclass already chosen (ClassFeaturesService)
if (existing) {
  throw new ConflictError(
    `Character already has subclass ${existing.subclassName} for ${className}. Subclass choices are permanent.`,
    { existingSubclass: existing.subclassName, className }
  );
}
```

**When to use:**
- Duplicate key violations
- Conflicting state changes
- Race conditions
- Permanent choices already made

#### BusinessLogicError (422)
Used when request is valid but violates business rules.

```typescript
import { BusinessLogicError } from '../lib/errors.js';

// Example: Spell slots (SpellSlotsService)
if (usedSlots > totalSlots) {
  throw new BusinessLogicError('Cannot use more spell slots than available', {
    used: usedSlots,
    total: totalSlots
  });
}

// Example: Death saves (CombatHPService)
if (!status.isConscious) {
  throw new BusinessLogicError('Cannot roll death save for conscious participant', { participantId });
}

// Example: Insufficient quantity (InventoryService)
if (item.quantity < quantityToUse) {
  throw new BusinessLogicError(
    `Insufficient quantity. Available: ${item.quantity}, Requested: ${quantityToUse}`,
    { available: item.quantity, requested: quantityToUse, itemId: input.itemId }
  );
}

// Example: Character level cap (ProgressionService)
if (newLevel > 20) {
  throw new BusinessLogicError('Character is already at maximum level (20)', {
    characterId,
    currentLevel: oldLevel,
  });
}

// Example: Subclass level requirement (ClassFeaturesService)
if (level < requiredLevel) {
  throw new BusinessLogicError(
    `${className} chooses subclass at level ${requiredLevel}. Character is level ${level}.`,
    { className, requiredLevel, characterLevel: level }
  );
}

// Example: Character has no stats (ProgressionService)
if (!character.stats) {
  throw new BusinessLogicError('Character has no stats', { characterId });
}
```

**When to use:**
- Business rule violations
- Invalid state transitions
- D&D 5E rule violations
- Game mechanics violations
- Resource constraints

#### InternalServerError (500)
Used when an unexpected error occurs.

```typescript
import { InternalServerError } from '../lib/errors.js';

// Example: Database insert failure (InventoryService)
if (!item) {
  throw new InternalServerError('Failed to create inventory item');
}

// Example: Database update failure (SessionService)
if (!updated) {
  throw new InternalServerError('Failed to update session state');
}

// Example: Cascading operation failure (CombatAttackService)
try {
  const hpResult = await CombatHPService.applyDamage(targetId, damageData);
  // ...
} catch (error) {
  console.error('Failed to apply damage to HP:', error);
  throw new InternalServerError('Attack succeeded but damage application failed', { error });
}
```

**When to use:**
- Database operation failures
- Third-party API failures
- Unexpected system errors
- Programming errors
- Cascading operation failures

## Error Codes

Standardized error codes are defined in `server/src/lib/error-codes.ts`:

### Generic Codes
- `VALIDATION_ERROR` - Input validation failure
- `NOT_FOUND` - Resource not found
- `UNAUTHORIZED` - Authentication required
- `FORBIDDEN` - Insufficient permissions
- `CONFLICT` - Resource conflict
- `BUSINESS_LOGIC_ERROR` - Business rule violation
- `INTERNAL_ERROR` - Internal server error

### D&D 5E Specific Codes
- `COMBAT_NOT_ACTIVE` - Combat encounter not active
- `PARTICIPANT_NOT_FOUND` - Combat participant not found
- `INSUFFICIENT_SPELL_SLOTS` - Not enough spell slots
- `CHARACTER_DEAD` - Character is dead
- `CHARACTER_UNCONSCIOUS` - Character is unconscious
- `CONDITION_NOT_FOUND` - Condition not found
- `INVALID_LEVEL` - Invalid character level
- `INSUFFICIENT_EXPERIENCE` - Not enough XP to level up

## Usage Guide

### In Services

```typescript
import { NotFoundError, ValidationError, BusinessLogicError } from '../lib/errors.js';

export class CombatService {
  static async startCombat(sessionId: string, participants: CreateParticipantInput[]) {
    // Validate input
    if (!participants || participants.length === 0) {
      throw new ValidationError('At least one participant is required');
    }

    // Check resource exists
    const session = await db.query.gameSessions.findFirst({
      where: eq(gameSessions.id, sessionId),
    });

    if (!session) {
      throw new NotFoundError('Game session', sessionId);
    }

    // Business logic validation
    if (session.status === 'ended') {
      throw new BusinessLogicError('Cannot start combat in ended session', { sessionId });
    }

    // ... rest of logic
  }
}
```

### In Routes (Option 1: Try-Catch)

```typescript
import { asyncHandler } from '../lib/async-handler.js';

app.post('/api/combat/:encounterId/attack', async (req, res, next) => {
  try {
    const result = await CombatAttackService.resolveAttack(
      req.params.encounterId,
      req.body
    );
    res.json(result);
  } catch (error) {
    next(error); // Pass to error handler
  }
});
```

### In Routes (Option 2: Async Handler)

```typescript
import { asyncHandler } from '../lib/async-handler.js';

app.post('/api/combat/:encounterId/attack', asyncHandler(async (req, res) => {
  const result = await CombatAttackService.resolveAttack(
    req.params.encounterId,
    req.body
  );
  res.json(result);
}));
```

## Response Format

All errors return a consistent JSON format:

### Success Response
```json
{
  "data": {
    // ... response data
  }
}
```

### Error Response
```json
{
  "error": {
    "name": "ValidationError",
    "message": "Level must be between 1 and 20",
    "code": "VALIDATION_ERROR",
    "statusCode": 400,
    "details": {
      "level": 25
    }
  }
}
```

### HTTP Status Codes

| Code | Error Type | Meaning |
|------|------------|---------|
| 400 | ValidationError | Invalid input |
| 401 | UnauthorizedError | Authentication required |
| 403 | ForbiddenError | Insufficient permissions |
| 404 | NotFoundError | Resource not found |
| 409 | ConflictError | Resource conflict |
| 422 | BusinessLogicError | Business rule violation |
| 500 | InternalServerError | Server error |

## Frontend Integration

### TypeScript Type Definitions

```typescript
interface ErrorResponse {
  error: {
    name: string;
    message: string;
    code: string;
    statusCode: number;
    details?: unknown;
  };
}
```

### Handling Errors

```typescript
async function attackEnemy(encounterId: string, attackData: AttackData) {
  try {
    const response = await fetch(`/api/combat/${encounterId}/attack`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(attackData),
    });

    if (!response.ok) {
      const errorData: ErrorResponse = await response.json();

      // Handle specific error types
      switch (errorData.error.code) {
        case 'NOT_FOUND':
          showNotification('Combat encounter not found');
          break;
        case 'BUSINESS_LOGIC_ERROR':
          showNotification(errorData.error.message);
          break;
        case 'VALIDATION_ERROR':
          showValidationError(errorData.error.details);
          break;
        default:
          showNotification('An error occurred');
      }

      return null;
    }

    return await response.json();
  } catch (error) {
    showNotification('Network error occurred');
    return null;
  }
}
```

### React Hook Example

```typescript
import { useState } from 'react';

function useApiCall<T>(apiFunction: () => Promise<T>) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<ErrorResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const execute = async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await apiFunction();
      setData(result);
    } catch (err: any) {
      if (err.error) {
        setError(err as ErrorResponse);
      } else {
        setError({
          error: {
            name: 'UnknownError',
            message: 'An unexpected error occurred',
            code: 'UNKNOWN_ERROR',
            statusCode: 500,
          }
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return { data, error, loading, execute };
}
```

## Testing

### Unit Tests

```typescript
import { NotFoundError, ValidationError } from '../lib/errors.js';

describe('CombatService', () => {
  test('throws NotFoundError when encounter not found', async () => {
    await expect(
      CombatService.startCombat('invalid-id', [])
    ).rejects.toThrow(NotFoundError);
  });

  test('throws ValidationError when no participants', async () => {
    await expect(
      CombatService.startCombat('valid-session-id', [])
    ).rejects.toThrow(ValidationError);
  });

  test('throws BusinessLogicError when session ended', async () => {
    const session = await createSession({ status: 'ended' });

    await expect(
      CombatService.startCombat(session.id, [{ name: 'Fighter' }])
    ).rejects.toThrow(BusinessLogicError);
  });
});
```

### Integration Tests

```typescript
import request from 'supertest';
import app from '../app.js';

describe('POST /api/combat/:encounterId/attack', () => {
  test('returns 404 when encounter not found', async () => {
    const response = await request(app)
      .post('/api/combat/invalid-id/attack')
      .send({ attackerId: 'test', targetId: 'test' });

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('NOT_FOUND');
    expect(response.body.error.message).toContain('not found');
  });

  test('returns 422 when business logic violated', async () => {
    const encounter = await createInactiveEncounter();

    const response = await request(app)
      .post(`/api/combat/${encounter.id}/attack`)
      .send({ attackerId: 'test', targetId: 'test' });

    expect(response.status).toBe(422);
    expect(response.body.error.code).toBe('BUSINESS_LOGIC_ERROR');
  });
});
```

## Best Practices

### DO ✅

1. **Use specific error types**
   ```typescript
   throw new NotFoundError('Character', characterId);
   ```

2. **Include context in error details**
   ```typescript
   throw new ValidationError('Invalid level', { level, min: 1, max: 20 });
   ```

3. **Use async handler for routes**
   ```typescript
   app.get('/characters/:id', asyncHandler(async (req, res) => {
     // ... code
   }));
   ```

4. **Log errors with context**
   ```typescript
   console.error('Error details:', { characterId, level, error });
   ```

5. **Throw errors early**
   ```typescript
   if (!character) {
     throw new NotFoundError('Character', characterId);
   }
   // Continue with valid character
   ```

### DON'T ❌

1. **Don't use generic Error**
   ```typescript
   throw new Error('Something went wrong'); // ❌ Don't do this
   throw new InternalServerError('Database operation failed'); // ✅ Do this
   ```

2. **Don't swallow errors**
   ```typescript
   try {
     await service.method();
   } catch (error) {
     // ❌ Don't ignore errors
   }
   ```

3. **Don't expose sensitive information**
   ```typescript
   throw new InternalServerError('Database password invalid'); // ❌
   throw new InternalServerError('Database connection failed'); // ✅
   ```

4. **Don't use wrong error types**
   ```typescript
   throw new ValidationError('Character not found'); // ❌ Use NotFoundError
   throw new NotFoundError('Character', characterId); // ✅
   ```

5. **Don't forget error details**
   ```typescript
   throw new ValidationError('Invalid input'); // ❌ No context
   throw new ValidationError('Invalid level', { level }); // ✅ With context
   ```

## Adding Custom Errors

To add a new error type:

1. **Add to error hierarchy** (`server/src/lib/errors.ts`):
   ```typescript
   export class RateLimitError extends AppError {
     constructor(message: string, details?: unknown) {
       super(429, message, 'RATE_LIMIT_EXCEEDED', details);
     }
   }
   ```

2. **Add error code** (`server/src/lib/error-codes.ts`):
   ```typescript
   export enum ErrorCode {
     // ... existing codes
     RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
   }
   ```

3. **Use in services**:
   ```typescript
   import { RateLimitError } from '../lib/errors.js';

   if (requestCount > limit) {
     throw new RateLimitError('Rate limit exceeded', { requestCount, limit });
   }
   ```

## Support

For questions or issues with error handling:
- Check this documentation
- Review existing service implementations
- Consult the error hierarchy in `server/src/lib/errors.ts`
- Review error codes in `server/src/lib/error-codes.ts`
