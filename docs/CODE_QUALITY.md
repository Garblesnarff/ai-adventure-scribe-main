# Code Quality Tools Configuration

This document explains the code quality tools configured for this project, how to use them, and best practices for maintaining high code quality.

## Overview

The project uses the following code quality tools:

1. **ESLint** - Static code analysis for TypeScript/JavaScript
2. **Prettier** - Code formatting
3. **TypeScript** - Static type checking
4. **Type Coverage** - Measures TypeScript type coverage

## Quick Start

```bash
# Run linting (check for issues)
npm run lint

# Run linting with auto-fix
npm run lint:fix

# Check code formatting
npm run format:check

# Format code automatically
npm run format

# Check TypeScript types
npm run type-check

# Check type coverage percentage
npm run type-coverage
```

## ESLint Configuration

### Overview

ESLint is configured with strict TypeScript rules to catch potential bugs and enforce consistent code style.

### Configuration File

**File:** `/eslint.config.js`

The configuration uses ESLint 9's flat config format with the following features:

- TypeScript-ESLint recommended rules
- React Hooks rules
- Import organization rules
- Custom architectural boundaries enforcement
- Prettier integration (no conflicts)

### Rules Enforced

#### TypeScript Rules (Errors)

- `@typescript-eslint/no-explicit-any` - **Prohibits `any` types**
  - Use specific types or `unknown` instead
  - Forces better type safety

- `@typescript-eslint/no-unused-vars` - **No unused variables**
  - Exception: Variables starting with `_` are allowed
  - Helps identify dead code

- `@typescript-eslint/no-require-imports` - **No CommonJS imports**
  - Use ES6 `import` statements instead
  - Ensures modern module syntax

- `@typescript-eslint/consistent-type-imports` - **Consistent type imports**
  - Types must be imported with `import type`
  - Example: `import type { User } from './types'`

- `@typescript-eslint/ban-ts-comment` - **Prohibits TS comments without description**
  - `@ts-ignore` and `@ts-expect-error` require explanations (min 10 chars)
  - Ensures code issues are documented

#### Function Return Types (Warnings)

- `@typescript-eslint/explicit-function-return-type` - **Explicit return types**
  - Functions should declare return types
  - Exceptions: expressions, typed function expressions
  - Example:
    ```typescript
    // Good
    function getUser(): User { ... }

    // Allowed (expression)
    const getUser = () => { ... }

    // Bad
    function getUser() { ... }
    ```

#### Error Handling (Errors)

- `no-throw-literal` - **Throw Error objects, not literals**
  ```typescript
  // Good
  throw new Error('Something went wrong')

  // Bad
  throw 'Something went wrong'
  ```

- `prefer-promise-reject-errors` - **Reject with Error objects**
  ```typescript
  // Good
  return Promise.reject(new Error('Failed'))

  // Bad
  return Promise.reject('Failed')
  ```

#### Import Organization (Errors)

- `import/order` - **Enforces import order**
  - Groups: builtin, external, internal, parent/sibling, index, type
  - Alphabetically sorted within groups
  - Empty lines between groups
  - Example:
    ```typescript
    // Built-in Node modules
    import fs from 'fs'

    // External dependencies
    import React from 'react'
    import { useQuery } from '@tanstack/react-query'

    // Internal modules
    import { Button } from '@/components/ui/button'
    import { useAuth } from '@/hooks/useAuth'

    // Type imports
    import type { User } from '@/types'
    ```

- `import/no-duplicates` - **No duplicate imports**
  - Combine multiple imports from same module

- `import/newline-after-import` - **Empty line after imports**

#### Code Quality (Errors)

- `no-console` - **No console statements** (warnings)
  - Exception: `console.warn` and `console.error` allowed
  - Use proper logging in production

- `no-debugger` - **No debugger statements**
- `prefer-const` - **Use const when possible**
- `no-var` - **Use let/const, not var**
- `eqeqeq` - **Use === and !== instead of == and !=**
- `curly` - **Always use curly braces for blocks**

#### Code Standards

- `max-lines` - **200 lines maximum per file**
  - Encourages smaller, more focused modules
  - Exceptions documented in config for large files

#### Architectural Boundaries

The configuration enforces architectural rules:

- Domain layer cannot depend on UI layer
- Features cannot import from other features' internals
- Shared layer cannot depend on features
- Infrastructure layer is self-contained

### Running ESLint

```bash
# Check for issues
npm run lint

# Fix auto-fixable issues
npm run lint:fix

# Lint specific files
npx eslint src/components/MyComponent.tsx
```

### Common Issues and Fixes

#### Issue: "Unexpected any"

**Problem:**
```typescript
function processData(data: any) { ... }
```

**Fix:**
```typescript
// Option 1: Use specific type
function processData(data: UserData) { ... }

// Option 2: Use unknown if type truly unknown
function processData(data: unknown) {
  // Type guard needed
  if (isUserData(data)) {
    // Now data is UserData
  }
}

// Option 3: Use generic
function processData<T>(data: T) { ... }
```

#### Issue: "Use import type"

**Problem:**
```typescript
import { User } from './types'
```

**Fix:**
```typescript
import type { User } from './types'
```

#### Issue: "Missing return type"

**Problem:**
```typescript
function calculateTotal(items) {
  return items.reduce((sum, item) => sum + item.price, 0)
}
```

**Fix:**
```typescript
function calculateTotal(items: Item[]): number {
  return items.reduce((sum, item) => sum + item.price, 0)
}
```

#### Issue: "Import order violations"

**Fix:**
Run `npm run lint:fix` to automatically reorganize imports.

## Prettier Configuration

### Overview

Prettier automatically formats code for consistency across the project.

### Configuration File

**File:** `/.prettierrc.json`

```json
{
  "semi": true,
  "trailingComma": "all",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2,
  "useTabs": false,
  "arrowParens": "always",
  "endOfLine": "lf",
  "bracketSpacing": true,
  "bracketSameLine": false
}
```

### Settings Explained

- **Single quotes** - Use `'` instead of `"`
- **Trailing commas** - Always use trailing commas (helps with git diffs)
- **100 character line width** - Balances readability and horizontal space
- **2-space indentation** - Standard for JavaScript/TypeScript
- **Semicolons** - Always use semicolons
- **Arrow function parentheses** - Always use parentheses around arrow function parameters

### Running Prettier

```bash
# Format all files
npm run format

# Check formatting without changing files
npm run format:check

# Format specific files
npx prettier --write src/components/MyComponent.tsx
```

### Ignored Files

See `/.prettierignore` for files excluded from formatting (build outputs, generated files, etc.)

## TypeScript Type Checking

### Configuration

TypeScript is configured with strict mode enabled for maximum type safety.

**Frontend:** `/tsconfig.app.json`
- Strict mode enabled
- No implicit any
- Strict null checks

**Server:** `/server/tsconfig.json`
- Strict mode enabled
- All strict checks enabled
- No unchecked indexed access

### Running Type Checks

```bash
# Type check entire project
npm run type-check

# Type check only (no type coverage)
npx tsc --noEmit

# Type check server
npx tsc -p server/tsconfig.json --noEmit
```

## Type Coverage

### Overview

Type coverage measures what percentage of your code has explicit types vs `any` or missing types.

### Current Coverage

**Frontend (src/):** 98.23% (240,607 / 244,924 typed)
**Server (server/):** 96.46% (48,622 / 50,404 typed)

Both exceed the 95% minimum threshold!

### Running Type Coverage

```bash
# Get type coverage percentage
npm run type-coverage

# Check that coverage meets 95% minimum
npm run type-check

# Get detailed report (shows untyped locations)
npx type-coverage -p tsconfig.app.json --detail
npx type-coverage -p server/tsconfig.json --detail
```

### Improving Type Coverage

When type-coverage shows untyped code:

```typescript
// Before (untyped)
const items = data.items

// After (typed)
const items: Item[] = data.items
// or
const items = data.items as Item[]
// or (best)
interface ApiResponse {
  items: Item[]
}
const data: ApiResponse = await fetchData()
const items = data.items // inferred as Item[]
```

## IDE Integration

### VS Code

Install these extensions for the best experience:

1. **ESLint** (`dbaeumer.vscode-eslint`)
   - Shows linting errors inline
   - Auto-fix on save

2. **Prettier** (`esbenp.prettier-vscode`)
   - Format on save
   - Format on paste

3. **TypeScript** (built-in)
   - Type checking
   - IntelliSense

### VS Code Settings

Add to `.vscode/settings.json`:

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "eslint.validate": [
    "javascript",
    "javascriptreact",
    "typescript",
    "typescriptreact"
  ],
  "typescript.tsdk": "node_modules/typescript/lib"
}
```

### WebStorm / IntelliJ IDEA

1. Enable ESLint: Preferences > Languages & Frameworks > JavaScript > Code Quality Tools > ESLint
2. Enable Prettier: Preferences > Languages & Frameworks > JavaScript > Prettier
3. Enable "Run eslint --fix on save"
4. Enable "On save" for Prettier

## CI/CD Integration

### Pre-commit Checks

Consider adding these to your CI pipeline:

```yaml
# Example GitHub Actions
- name: Lint
  run: npm run lint

- name: Format Check
  run: npm run format:check

- name: Type Check
  run: npm run type-check
```

### Pre-commit Hooks (Optional)

To automatically lint and format before commits, install husky:

```bash
npm install --save-dev husky lint-staged

# Initialize husky
npx husky init

# Add pre-commit hook
echo "npx lint-staged" > .husky/pre-commit
```

Add to `package.json`:

```json
{
  "lint-staged": {
    "*.{ts,tsx}": [
      "eslint --fix",
      "prettier --write"
    ],
    "*.{json,css,md}": [
      "prettier --write"
    ]
  }
}
```

## Current State Report

### Initial Assessment (November 14, 2025)

#### ESLint Violations

**Total:** 7,399 problems
- **Errors:** 5,880
- **Warnings:** 1,519

**Top Issues:**
1. Import organization violations (imports in wrong order, missing newlines)
2. Type import consistency (not using `import type`)
3. Missing function return types
4. Use of `any` type
5. Unused variables
6. Files exceeding 200 lines
7. Missing error handling

#### Type Coverage

- **Frontend:** 98.23% ✓ (exceeds 95% target)
- **Server:** 96.46% ✓ (exceeds 95% target)

### Next Steps for Improvement

#### Priority 1 (Auto-fixable)
1. Run `npm run lint:fix` to fix import organization
2. Run `npm run format` to fix formatting issues
3. Auto-fix duplicate imports and simple violations

#### Priority 2 (Manual fixes)
1. Add explicit function return types
2. Replace `any` types with specific types
3. Remove unused variables/imports
4. Add try-catch error handling where needed

#### Priority 3 (Refactoring)
1. Break down files exceeding 200 lines
2. Fix architectural boundary violations
3. Improve error handling patterns

#### Priority 4 (Long-term)
1. Gradually increase type coverage to 99%+
2. Enable additional strict ESLint rules
3. Add custom rules for project-specific patterns
4. Consider enabling type-aware linting rules (currently disabled for performance)

## Maintenance

### Regular Tasks

1. **Before committing:**
   ```bash
   npm run lint:fix
   npm run format
   npm run type-check
   ```

2. **Weekly:**
   - Review linting violations: `npm run lint`
   - Check type coverage: `npm run type-coverage`

3. **Monthly:**
   - Update dependencies: `npm update`
   - Review and update ESLint rules
   - Check for new TypeScript strict settings

### Updating Dependencies

```bash
# Update ESLint and plugins
npm update eslint typescript-eslint eslint-config-prettier

# Update Prettier
npm update prettier

# Update TypeScript
npm update typescript
```

## Resources

- [ESLint Documentation](https://eslint.org/docs/)
- [TypeScript-ESLint](https://typescript-eslint.io/)
- [Prettier Documentation](https://prettier.io/docs/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Type Coverage](https://github.com/plantain-00/type-coverage)

## Support

For questions or issues with code quality tools:

1. Check this documentation
2. Review ESLint error messages (they often include suggestions)
3. Search [TypeScript-ESLint rules](https://typescript-eslint.io/rules/)
4. Ask in the team chat or create an issue

## Summary

The code quality tools are now configured to:

- ✓ Enforce TypeScript best practices
- ✓ Prevent `any` types
- ✓ Ensure consistent error handling
- ✓ Organize imports automatically
- ✓ Maintain consistent code formatting
- ✓ Track type coverage (>95%)
- ✓ Enforce architectural boundaries

**Important:** The tools are configured but NOT all violations are fixed. This is intentional to avoid breaking changes. Fix violations incrementally as you work on files.
