# TypeScript Strict Mode Error Reference

Quick reference guide for the most common TypeScript errors encountered after enabling strict mode.

## Error Codes & Solutions

### TS7026: JSX element implicitly has type 'any'
**Cause**: Missing React type declarations
**Solution**:
```bash
npm install --save-dev @types/react @types/react-dom
```

**Example**:
```tsx
// Before (error)
<div>Hello</div>

// After (fixed by installing types)
<div>Hello</div>  // Works once @types/react is installed
```

---

### TS7006: Parameter implicitly has 'any' type
**Cause**: Function parameter missing explicit type annotation
**Solution**: Add explicit types

**Example**:
```typescript
// Before (error)
const handler = (req, res) => { }

// After (fixed)
import { Request, Response } from 'express';
const handler = (req: Request, res: Response) => { }

// Or for callbacks
posts.map(post => post.id)  // Error
posts.map((post: Post) => post.id)  // Fixed
```

---

### TS7016: Could not find a declaration file for module
**Cause**: Third-party module lacks type definitions
**Solution**:
1. Install @types package: `npm install --save-dev @types/package-name`
2. If no @types exists, create declaration file

**Example**:
```bash
# For express
npm install --save-dev @types/express

# For cors
npm install --save-dev @types/cors
```

**Manual declaration** (if @types doesn't exist):
```typescript
// types/module-name.d.ts
declare module 'module-name' {
  export default function(): void;
}
```

---

### TS2307: Cannot find module or its type declarations
**Cause**: Module not installed or missing types
**Solution**:
1. Verify module is installed: `npm list package-name`
2. Install missing @types package
3. Check import path is correct

**Example**:
```typescript
// Check if installed
npm list react-router-dom

// If missing
npm install react-router-dom
npm install --save-dev @types/react-router-dom
```

---

### TS2532: Object is possibly 'undefined'
**Cause**: Accessing properties on potentially undefined objects
**Solution**: Add null checks or optional chaining

**Example**:
```typescript
// Before (error)
const value = obj.property.nested;

// After (fixed with optional chaining)
const value = obj?.property?.nested;

// Or with null check
if (obj && obj.property) {
  const value = obj.property.nested;
}

// Or with default value
const value = obj?.property?.nested ?? defaultValue;
```

---

### TS2322: Type is not assignable
**Cause**: Assigning incompatible types, often with undefined
**Solution**: Handle undefined cases explicitly

**Example**:
```typescript
// Before (error with noUncheckedIndexedAccess)
const config = RATE_CONFIGS['key'];  // Type: Config | undefined
const result: Config = config;  // Error!

// After (fixed)
const config = RATE_CONFIGS['key'];
if (!config) throw new Error('Config not found');
const result: Config = config;  // OK

// Or with default
const config = RATE_CONFIGS['key'] ?? DEFAULT_CONFIG;
```

---

### TS18048: Possibly 'undefined'
**Cause**: Using value that might be undefined without checking
**Solution**: Add guards or assertions

**Example**:
```typescript
// Before (error)
const result = array[index].property;

// After (fixed with guard)
const item = array[index];
if (item) {
  const result = item.property;
}

// Or with non-null assertion (use carefully!)
const result = array[index]!.property;
```

---

### TS2741: Property is missing in type
**Cause**: Object missing required properties
**Solution**: Add missing properties or make them optional

**Example**:
```typescript
// Type definition
interface Props {
  name: string;
  age: number;
}

// Before (error)
const data: Props = { name: 'John' };  // Missing 'age'

// After (fixed)
const data: Props = { name: 'John', age: 30 };

// Or make optional
interface Props {
  name: string;
  age?: number;  // Now optional
}
```

---

### TS7031: Binding element implicitly has 'any' type
**Cause**: Destructured parameters without types
**Solution**: Add type annotation to parent or destructured elements

**Example**:
```typescript
// Before (error)
const Component = ({ name, age }) => { }

// After (fixed)
interface Props {
  name: string;
  age: number;
}
const Component = ({ name, age }: Props) => { }

// Or inline
const Component = ({ name, age }: { name: string; age: number }) => { }
```

---

### TS2345: Argument type mismatch
**Cause**: Passing wrong type to function, often undefined when string expected
**Solution**: Ensure correct type or handle undefined

**Example**:
```typescript
// Before (error)
function process(value: string) { }
const maybeString: string | undefined = getData();
process(maybeString);  // Error!

// After (fixed with guard)
if (maybeString !== undefined) {
  process(maybeString);
}

// Or with default
process(maybeString ?? '');

// Or with assertion (if you're certain)
process(maybeString!);
```

---

### noImplicitReturns: Not all code paths return a value
**Cause**: Function with return type doesn't return in all branches
**Solution**: Add return statements or explicitly return undefined

**Example**:
```typescript
// Before (error)
function getValue(condition: boolean): string {
  if (condition) {
    return 'yes';
  }
  // Missing return!
}

// After (fixed)
function getValue(condition: boolean): string {
  if (condition) {
    return 'yes';
  }
  return 'no';  // Added
}

// Or make return type optional
function getValue(condition: boolean): string | undefined {
  if (condition) {
    return 'yes';
  }
  // Implicitly returns undefined - OK now
}
```

---

### noFallthroughCasesInSwitch: Fallthrough case in switch
**Cause**: Switch case doesn't have break, return, or throw
**Solution**: Add break or return, or add comment if intentional

**Example**:
```typescript
// Before (error)
switch (value) {
  case 'a':
    doSomething();
  case 'b':  // Error: fallthrough
    doOther();
    break;
}

// After (fixed)
switch (value) {
  case 'a':
    doSomething();
    break;  // Added
  case 'b':
    doOther();
    break;
}

// Or with intentional fallthrough comment
switch (value) {
  case 'a':
    doSomething();
    // falls through
  case 'b':
    doOther();
    break;
}
```

---

### noUncheckedIndexedAccess: Element implicitly has 'undefined' type
**Cause**: Accessing array/object by index without checking existence
**Solution**: Add checks or handle undefined

**Example**:
```typescript
// Before (error with strict mode)
const first = array[0];  // Type: T | undefined
first.method();  // Error!

// After (fixed)
const first = array[0];
if (first) {
  first.method();  // OK
}

// Or with optional chaining
array[0]?.method();

// For objects
const config = configs['key'];
if (config) {
  useConfig(config);
}
```

---

## Common Patterns & Best Practices

### Express Route Handlers
```typescript
import { Request, Response, NextFunction } from 'express';

// Correct typing
router.get('/path', async (req: Request, res: Response) => {
  // ...
});

// With custom request
interface AuthRequest extends Request {
  user?: User;
}

router.get('/auth', async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  // ...
});
```

### Array/Object Safety
```typescript
// Dictionary access
const config = CONFIG_MAP[key];
if (!config) {
  throw new Error(`Config not found: ${key}`);
}
// Now config is definitely defined

// Array access
const first = array.at(0);  // Returns T | undefined
const safe = array[0] ?? defaultValue;

// Better: check length first
if (array.length > 0) {
  const first = array[0];  // Still T | undefined in strict mode
  if (first) {
    // Use first
  }
}
```

### Type Guards
```typescript
// Custom type guard
function isDefined<T>(value: T | undefined): value is T {
  return value !== undefined;
}

// Usage
const maybeValue: string | undefined = getValue();
if (isDefined(maybeValue)) {
  // maybeValue is string here
  console.log(maybeValue.toUpperCase());
}

// Array filter with type guard
const definedItems = items.filter(isDefined);
// Type: T[] (no undefined)
```

### Handling Callbacks
```typescript
// Before
array.map(item => item.id)  // Error: parameter 'item' implicitly has 'any'

// After - explicit type
interface Item { id: string; }
array.map((item: Item) => item.id)

// Better - infer from typed array
const items: Item[] = getItems();
items.map(item => item.id)  // OK, item is inferred as Item
```

## Quick Checklist for Migration

- [ ] Install all @types packages
- [ ] Add explicit types to function parameters
- [ ] Add null/undefined checks before accessing properties
- [ ] Ensure all switch cases have break/return
- [ ] Ensure all code paths return values
- [ ] Add type guards for array/object access
- [ ] Type all callbacks explicitly
- [ ] Test after each file is fixed

## Resources

- [TypeScript Handbook - Strict Mode](https://www.typescriptlang.org/docs/handbook/compiler-options.html)
- [TypeScript Error Reference](https://typescript.tv/errors/)
- [Type Guards](https://www.typescriptlang.org/docs/handbook/2/narrowing.html)
