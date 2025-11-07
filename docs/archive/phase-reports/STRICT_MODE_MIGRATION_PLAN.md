# Strict TypeScript Mode Migration Plan

## Overview
This document outlines the strategy for migrating the codebase to strict TypeScript mode after enabling strict compiler options.

## Configuration Changes Made
- ✅ Enabled `strict: true` in all tsconfig files
- ✅ Added `noUncheckedIndexedAccess: true`
- ✅ Added `noImplicitReturns: true`
- ✅ Added `noFallthroughCasesInSwitch: true`
- ✅ Created `tsconfig.strict.json` for gradual migration

## Current Error Summary

### Frontend (src/)
**Total Errors: 98**

#### Breakdown by Error Type:
- **TS7026 (74 errors)**: JSX element implicitly has type 'any' - Missing React type declarations
- **TS7006 (8 errors)**: Parameter implicitly has 'any' type
- **TS2307 (7 errors)**: Cannot find module declarations
- **TS7016 (3 errors)**: Could not find declaration files
- **TS2741 (3 errors)**: Missing required properties
- **TS2532 (2 errors)**: Object is possibly 'undefined'
- **TS7031 (1 error)**: Binding element implicitly has 'any' type

#### Files Requiring Attention:
1. **src/__tests__/accessibility/spell-selection-accessibility.test.tsx** (84 errors)
   - Primary issue: Missing @types/react, @types/react-dom
   - Secondary: Implicit any types in callbacks

2. **src/App.tsx** (14 errors)
   - Missing module type declarations
   - JSX intrinsic element issues

### Backend (server/src/)
**Total Errors: 392**

#### Breakdown by Error Type:
- **TS7026 (289 errors)**: JSX element implicitly has type 'any' - Blog SSR views missing React types
- **TS7006 (47 errors)**: Parameter implicitly has 'any' type
- **TS7016 (35 errors)**: Could not find declaration files
- **TS2307 (8 errors)**: Cannot find module declarations
- **TS2345 (3 errors)**: Argument type mismatch
- **TS2322 (3 errors)**: Type assignment errors
- **TS18048 (3 errors)**: Possibly 'undefined' issues
- **TS2741 (2 errors)**: Missing required properties
- **TS2532 (2 errors)**: Object is possibly 'undefined'

#### Files Requiring Attention (by error count):
1. **server/src/views/blog/index.tsx** (126 errors) - React SSR view
2. **server/src/views/blog/post.tsx** (120 errors) - React SSR view
3. **server/src/views/blog/document.tsx** (49 errors) - React SSR view
4. **server/src/routes/v1/blog.ts** (13 errors) - Implicit any in callbacks
5. **server/src/routes/v1/personality.ts** (7 errors)
6. **server/src/routes/seo.ts** (7 errors)
7. **server/src/routes/blog.tsx** (6 errors)
8. **server/src/middleware/rate-limit.ts** (6 errors) - Type safety issues
9. **server/src/app.ts** (6 errors)
10. **server/src/utils/react-stream.ts** (5 errors)

## Migration Strategy

### Phase 1: Install Missing Type Declarations (Priority 1)
**Impact**: Resolves ~330 of 490 errors (67%)**

```bash
# Install missing type declarations
npm install --save-dev @types/react @types/react-dom
npm install --save-dev @types/express @types/cors @types/ws
npm install --save-dev @types/node

# Server-specific types
cd server
npm install --save-dev @types/sanitize-html
```

**Expected Resolution**:
- All TS7026 errors (JSX implicit any) - 363 errors
- Most TS7016 errors (missing declarations) - ~35 errors
- Most TS2307 errors (cannot find module) - ~15 errors

### Phase 2: Fix Blog SSR Views (Priority 2)
**Files**: `server/src/views/blog/*.tsx`
**Error Count**: 295 errors

After Phase 1, remaining issues will likely be:
- Missing component prop types
- Implicit any in event handlers
- Possibly undefined object access

**Approach**:
1. Start with `document.tsx` (base layout)
2. Then `index.tsx` (home page)
3. Finally `post.tsx` (post view)

### Phase 3: Fix API Route Handlers (Priority 3)
**Files**: Express route handlers
**Error Count**: ~50 errors

Issues:
- Implicit any in req/res parameters
- Map/filter callbacks with implicit any

**Approach**:
1. Create type-safe wrapper utilities for Express handlers
2. Add explicit types to all route handler parameters
3. Type all callback functions in data transformations

### Phase 4: Fix Middleware & Utilities (Priority 4)
**Files**:
- `server/src/middleware/rate-limit.ts`
- `server/src/rules/actions.ts`
- `server/src/rules/dice.ts`
- `server/src/utils/markdown.ts`
- `server/src/utils/react-stream.ts`

**Error Count**: ~20 errors

Issues:
- Optional chaining with noUncheckedIndexedAccess
- Possibly undefined object access
- Type guard improvements needed

### Phase 5: Fix Test Files (Priority 5)
**Files**: Test suites
**Error Count**: Varies

**Approach**:
1. Install @types/vitest
2. Create test utility types
3. Fix implicit any in mock callbacks

## Recommended Execution Order

### Week 1: Foundation
1. ✅ Enable strict mode in tsconfig
2. Install all missing type declarations (Phase 1)
3. Verify error count reduction
4. Document any new patterns discovered

### Week 2: Blog Platform
1. Fix server/src/views/blog/document.tsx
2. Fix server/src/views/blog/index.tsx
3. Fix server/src/views/blog/post.tsx
4. Test SSR rendering still works

### Week 3: API Layer
1. Create Express handler type utilities
2. Fix server/src/routes/v1/blog.ts
3. Fix server/src/routes/v1/personality.ts
4. Fix remaining route handlers

### Week 4: Infrastructure
1. Fix middleware files
2. Fix utility functions
3. Fix test files
4. Enable stricter linting rules

## Validation Strategy

After each phase:
```bash
# Check remaining errors
npx tsc --noEmit

# Run tests
npm test
npm run server:test

# Verify builds work
npm run build
npm run server:build
```

## Success Metrics

- **Phase 1 Complete**: Errors reduced to ~160 (67% reduction)
- **Phase 2 Complete**: Errors reduced to ~50 (90% reduction)
- **Phase 3 Complete**: Errors reduced to ~20 (96% reduction)
- **Phase 4 Complete**: Errors reduced to ~5 (99% reduction)
- **Phase 5 Complete**: Zero TypeScript errors

## Notes

### Why This Order?
1. **Type declarations first**: Biggest impact, least risky
2. **Blog views second**: Self-contained, affects SSR only
3. **API routes third**: Core functionality, needs careful testing
4. **Infrastructure fourth**: Affects everything, needs all types resolved
5. **Tests last**: Can be fixed incrementally without blocking dev

### Safety Considerations
- Each phase is independently testable
- No changes to runtime behavior
- Can pause migration at any phase
- Backward compatible with existing code

### Using tsconfig.strict.json
For gradual migration, you can check specific directories:
```bash
# Check only a specific file
npx tsc --project tsconfig.strict.json --noEmit src/specific-file.ts

# Or temporarily modify include in tsconfig.strict.json
```

## Automation Opportunities
- Create codemod scripts for common patterns
- ESLint rules to prevent regressions
- CI/CD checks for new files meeting strict mode
- Pre-commit hooks for changed files
