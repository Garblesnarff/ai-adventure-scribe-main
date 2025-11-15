# TypeScript Patterns and Best Practices

This document outlines recommended TypeScript patterns for the AI Adventure Scribe codebase, with a focus on avoiding `any` types and leveraging type safety.

## Table of Contents

- [Core Principles](#core-principles)
- [Avoiding `any` Types](#avoiding-any-types)
- [Type Inference](#type-inference)
- [Drizzle ORM Type Inference](#drizzle-orm-type-inference)
- [Type Guards](#type-guards)
- [Generic Types](#generic-types)
- [JSONB and Dynamic Data](#jsonb-and-dynamic-data)
- [Common Patterns](#common-patterns)

---

## Core Principles

1. **Never use `any`** - It defeats TypeScript's type safety
2. **Use `unknown` for truly dynamic data** - It's type-safe and forces you to check types
3. **Leverage type inference** - Let TypeScript infer types when possible
4. **Use Drizzle-inferred types** - Don't duplicate type definitions
5. **Create type guards** - For runtime type validation
6. **Be explicit when needed** - Add types when inference isn't clear

---

## Avoiding `any` Types

### Why Avoid `any`?

- ❌ Loses compile-time error detection
- ❌ No IntelliSense/autocomplete support
- ❌ Potential runtime errors
- ❌ Makes refactoring dangerous

### Alternatives to `any`

| Instead of... | Use... | When... |
|--------------|--------|---------|
| `any` | `unknown` | Type is truly dynamic |
| `any[]` | `unknown[]` | Array of dynamic items |
| `Record<string, any>` | `Record<string, unknown>` | Dynamic object |
| `any` | Union type | Limited set of types |
| `any` | Generic `<T>` | Reusable function |

---

## Type Inference

TypeScript can often infer types automatically. Let it!

### ✅ Good - Let TypeScript Infer

```typescript
// TypeScript infers: const result: GameSession
const result = await db.query.gameSessions.findFirst({
  where: eq(gameSessions.id, sessionId),
});

// TypeScript infers: const messages: DialogueHistory[]
const messages = await db.query.dialogueHistory.findMany({
  where: eq(dialogueHistory.sessionId, sessionId),
});
```

### ❌ Bad - Unnecessary Type Annotation

```typescript
// Redundant, TypeScript already knows the type
const result: GameSession = await db.query.gameSessions.findFirst({
  where: eq(gameSessions.id, sessionId),
});
```

### When to Add Explicit Types

Add types when:
- Function parameters (always)
- Function return types (recommended for public APIs)
- Complex object literals
- Type inference would be unclear

---

## Drizzle ORM Type Inference

Use Drizzle's built-in type inference instead of creating duplicate types.

### Schema Definition

```typescript
// db/schema/game.ts
export const gameSessions = pgTable('game_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  campaignId: uuid('campaign_id').references(() => campaigns.id),
  sessionNumber: integer('session_number'),
  status: text('status').default('active'),
  sessionState: jsonb('session_state'),
  // ...
});

// Export inferred types
export type GameSession = InferSelectModel<typeof gameSessions>;
export type NewGameSession = InferInsertModel<typeof gameSessions>;
```

### ✅ Good - Use Drizzle Types

```typescript
import { type GameSession, type NewGameSession } from '../../../db/schema/index.js';

class SessionService {
  static async createSession(data: NewGameSession): Promise<GameSession> {
    const [session] = await db
      .insert(gameSessions)
      .values(data)
      .returning();

    return session;
  }
}
```

### ❌ Bad - Duplicate Type Definitions

```typescript
// Don't do this - the type already exists in the schema!
interface GameSession {
  id: string;
  campaignId: string | null;
  sessionNumber: number | null;
  status: string;
  // ... duplicating the schema
}
```

---

## Type Guards

Use type guards for runtime type validation.

### Basic Type Guard

```typescript
function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function isNumber(value: unknown): value is number {
  return typeof value === 'number';
}
```

### Complex Type Guard

```typescript
import { type CombatParticipant } from '../types/combat.js';

function isCombatParticipant(obj: unknown): obj is CombatParticipant {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'encounterId' in obj &&
    'name' in obj &&
    'initiative' in obj &&
    typeof (obj as CombatParticipant).id === 'string' &&
    typeof (obj as CombatParticipant).encounterId === 'string' &&
    typeof (obj as CombatParticipant).name === 'string' &&
    typeof (obj as CombatParticipant).initiative === 'number'
  );
}
```

### Using Type Guards

```typescript
function processData(data: unknown): void {
  if (isCombatParticipant(data)) {
    // TypeScript now knows data is CombatParticipant
    console.log(data.name); // ✅ Type-safe
    console.log(data.initiative); // ✅ Type-safe
  }
}
```

---

## Generic Types

Use generics for reusable, type-safe code.

### Generic Function

```typescript
function findById<T extends { id: string }>(
  items: T[],
  id: string
): T | undefined {
  return items.find(item => item.id === id);
}

// Usage - type is inferred
const participant = findById(participants, '123'); // CombatParticipant | undefined
const session = findById(sessions, '456'); // GameSession | undefined
```

### Generic Class

```typescript
class Repository<T extends { id: string }> {
  constructor(private items: T[]) {}

  findById(id: string): T | undefined {
    return this.items.find(item => item.id === id);
  }

  findAll(): T[] {
    return [...this.items];
  }
}

// Usage
const participantRepo = new Repository<CombatParticipant>(participants);
const sessionRepo = new Repository<GameSession>(sessions);
```

---

## JSONB and Dynamic Data

Handle JSONB and dynamic data type-safely.

### ✅ Good - Use `unknown` for Dynamic Data

```typescript
// Function parameter
static async updateSessionState(
  sessionId: string,
  stateUpdate: Record<string, unknown>  // ✅ Use unknown, not any
): Promise<GameSession> {
  const current = await this.getSessionById(sessionId);
  const currentState = (current?.sessionState as Record<string, unknown>) || {};

  const newState = {
    ...currentState,
    ...stateUpdate,
    lastUpdate: new Date().toISOString(),
  };

  // ...
}
```

### Type-Safe JSONB Access

```typescript
// Define a type for your JSONB structure
interface SessionState {
  combatLog?: Array<{ timestamp: string; entry: unknown }>;
  currentScene?: string;
  flags?: Record<string, boolean>;
}

// Use type assertion with validation
function getSessionState(session: GameSession): SessionState {
  const state = session.sessionState as unknown;

  // Validate the structure
  if (!state || typeof state !== 'object') {
    return {};
  }

  return state as SessionState;
}
```

### ❌ Bad - Using `any`

```typescript
// Don't do this
static async updateSessionState(
  sessionId: string,
  stateUpdate: Record<string, any>  // ❌ Loses type safety
): Promise<GameSession> {
  // ...
}
```

---

## Common Patterns

### Pattern 1: Unknown Arrays

When dealing with arrays of unknown items:

```typescript
// ✅ Good
function processItems(items: unknown[]): string[] {
  return items
    .filter((item): item is { name?: string } =>
      typeof item === 'object' && item !== null && 'name' in item
    )
    .map(item => item.name ?? 'Unknown')
    .filter((name): name is string => typeof name === 'string');
}

// ❌ Bad
function processItems(items: any[]): string[] {
  return items.map(item => item.name || 'Unknown');
}
```

### Pattern 2: Union Types for Limited Values

```typescript
// ✅ Good - Specific union type
type EffectValue =
  | string
  | number
  | boolean
  | undefined;

function mergeEffects(
  current: EffectValue,
  incoming: EffectValue
): EffectValue {
  // Type-safe logic
}

// ❌ Bad
function mergeEffects(current: any, incoming: any): any {
  // No type safety
}
```

### Pattern 3: Optional Chaining with Type Assertions

```typescript
// ✅ Good
interface BlogAuthorRow {
  id?: string;
  display_name?: string | null;
}

const author = row.author as BlogAuthorRow | null | undefined;
const displayName = author?.display_name ?? 'Anonymous';

// ❌ Bad
const displayName = (row.author as any)?.display_name ?? 'Anonymous';
```

### Pattern 4: Discriminated Unions

```typescript
// ✅ Good - Type-safe event handling
type CombatEvent =
  | { type: 'damage'; participantId: string; amount: number }
  | { type: 'healing'; participantId: string; amount: number }
  | { type: 'condition'; participantId: string; condition: string };

function handleEvent(event: CombatEvent): void {
  switch (event.type) {
    case 'damage':
      // TypeScript knows event has participantId and amount
      applyDamage(event.participantId, event.amount);
      break;
    case 'healing':
      applyHealing(event.participantId, event.amount);
      break;
    case 'condition':
      applyCondition(event.participantId, event.condition);
      break;
  }
}

// ❌ Bad
function handleEvent(event: { type: string; payload: any }): void {
  // No type safety for payload
}
```

### Pattern 5: Utility Types

```typescript
// Create reusable utility types
export type Nullable<T> = T | null;
export type Optional<T> = T | undefined;
export type DeepPartial<T> = {
  [P in keyof T]?: DeepPartial<T[P]>;
};

// Usage
type OptionalGameSession = DeepPartial<GameSession>;
type NullableCharacter = Nullable<Character>;
```

---

## Checklist for Code Reviews

When reviewing TypeScript code, verify:

- [ ] No `any` types used
- [ ] `unknown` used instead of `any` for dynamic data
- [ ] Type guards created for runtime validation
- [ ] Drizzle-inferred types used instead of duplicates
- [ ] Function parameters have explicit types
- [ ] Public API functions have return types
- [ ] Union types used for limited value sets
- [ ] Generic types used for reusable code
- [ ] JSONB data properly typed
- [ ] Type assertions include validation

---

## Migration Guide

### Replacing `any` in Existing Code

**Step 1:** Find all `any` types
```bash
grep -rn ": any" server/src/services/
grep -rn "as any" server/src/services/
grep -rn "<any>" server/src/services/
```

**Step 2:** Categorize each usage
- Function parameters → Use proper type or `unknown`
- Return types → Define explicit type
- Variables → Let TypeScript infer or use `unknown`
- Type assertions → Use proper type with validation
- Generics → Define type parameter

**Step 3:** Replace with proper types
```typescript
// Before
function process(data: any): any { }

// After
function process(data: unknown): ProcessedData | null {
  if (!isValidData(data)) return null;
  // ... type-safe processing
}
```

**Step 4:** Run TypeScript compiler
```bash
npx tsc --project server/tsconfig.json --noEmit
```

---

## Resources

- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- [Drizzle ORM Type Safety](https://orm.drizzle.team/docs/goodies#type-safety)
- [TypeScript Deep Dive](https://basarat.gitbook.io/typescript/)

---

## Questions?

If you're unsure about a type pattern:
1. Check this document first
2. Look for similar patterns in the codebase
3. Ask in code review
4. Default to `unknown` over `any`
