# Orphaned Components Audit - Work Unit B3

This document tracks components remaining in `src/components/` after feature extraction, categorized by status and recommendation.

## Executive Summary

After extracting feature-specific components to their respective features, the following components remain in `src/components/`:

- **Shared/Keep (3 directories)**: Components used across features
- **Separate Workspace (1 directory)**: Blog admin (separate codebase per recent work)
- **Total Extracted**: 9 component directories moved to features

## Components Remaining in src/components/

### ✅ SHARED - Keep in src/components/

These components are truly shared across multiple features or provide developer utilities:

#### 1. `debug/` - Developer Utilities
**Status**: KEEP - Shared developer tool
**Files**:
- `IndexedDBCleanupPanel.tsx` (1 file)

**Used by**: Developer debugging/settings pages
**Reason**: Cross-cutting developer utility, not feature-specific
**Recommendation**: Keep as shared component

#### 2. `safety/` - Shared UI Component
**Status**: KEEP - Shared across features
**Files**:
- `SafetyBanner.tsx` (1 file)

**Used by**:
- `src/features/game-session/components/game/game-content/GameMainContent.tsx`

**Reason**: Safety/compliance component displayed across multiple contexts
**Recommendation**: Keep as shared component

#### 3. `examples/` - Documentation/Testing
**Status**: KEEP - Development documentation
**Files**:
- `TRPCExample.tsx` (1 file)
- `README.md` (documentation)

**Used by**: None (example code for developers)
**Reason**: Educational component demonstrating tRPC patterns
**Recommendation**: Keep as developer reference

### 🔄 SEPARATE WORKSPACE - Not Managed Here

#### 4. `blog-admin/` - Blog Administration
**Status**: SEPARATE WORKSPACE - Do not move
**Files**: 14 files across blog post editor, media manager, category/tag management

**Used by**:
- `src/pages/BlogAdmin.tsx`

**Reason**: Per recent architectural work, blog should be a completely separate workspace/codebase
**Recommendation**: Do not extract. Will be moved to separate blog workspace in future work unit.
**Reference**: See recent commit `a260591 - docs: add completion guide for blog workspace separation`

## Components Successfully Extracted to Features

### ✅ Moved to src/features/combat/
- All combat UI components (24 files)
- **Destination**: `src/features/combat/components/ui/`
- **Public API**: `src/features/combat/components/index.ts`

### ✅ Moved to src/features/game-session/
- All game UI components (32+ files across multiple subdirectories)
- DiceRollEmbed.tsx
- game-interface.tsx
- **Destination**: `src/features/game-session/components/game/` and `/dice/`
- **Public API**: Updated `src/features/game-session/components/index.ts`

### ✅ Moved to src/features/campaign/
- Gallery components (3 files)
- **Destination**: `src/features/campaign/components/gallery/`
- **Public API**: Updated `src/features/campaign/components/index.ts`

### ✅ Moved to src/features/character/
- Spell components (7 files)
- Spellcasting components (2 files + tests)
- **Destination**:
  - `src/features/character/components/spells/`
  - `src/features/character/components/spellcasting/`
- **Public API**: Updated `src/features/character/components/index.ts`

### ✅ Moved to src/features/auth/
- Auth components (2 files - already moved in previous work)
- **Destination**: `src/features/auth/components/`
- **Public API**: Created `src/features/auth/index.ts`

### ✅ Moved to src/features/landing/
- Landing page components (10 files)
- Launch page components (12 files - already moved)
- **Destination**:
  - `src/features/landing/components/home/`
  - `src/features/landing/components/launch/`
- **Public API**: Created `src/features/landing/index.ts`
- **Documentation**: Created `src/features/landing/README.md`

## New Features Created

### auth/
- **Location**: `src/features/auth/`
- **Components**: AuthPage, ProtectedRoute
- **Documentation**: Created README.md
- **Public API**: Complete

### landing/
- **Location**: `src/features/landing/`
- **Components**: Home landing sections, Launch page sections
- **Documentation**: Created README.md
- **Public API**: Complete with sub-exports (home, launch)

## Updated Feature APIs

All existing features received updated public APIs to export newly moved components:

1. **combat/**: Added component exports, updated README
2. **game-session/**: Added game, dice, memory, message components
3. **campaign/**: Added gallery components
4. **character/**: Added spell and spellcasting components

## Recommendations

### Immediate Actions
- ✅ Keep: `debug/`, `safety/`, `examples/` in src/components/
- ✅ Monitor: `blog-admin/` for future workspace separation

### Future Work
1. **Blog Workspace Separation** (Future Work Unit)
   - Create separate blog workspace/repository
   - Move `src/components/blog-admin/` to new workspace
   - Update `src/pages/BlogAdmin.tsx` or deprecate

2. **Shared Components Organization**
   - Consider creating `src/components/shared/` subdirectory
   - Group: `debug/`, `safety/` as truly shared utilities

3. **Examples Enhancement**
   - Add more feature examples as patterns emerge
   - Document integration patterns for new developers

## Metrics

- **Original component directories**: 13
- **Extracted to features**: 9 directories
- **Remaining (shared)**: 3 directories
- **Separate workspace**: 1 directory (blog-admin)
- **New features created**: 2 (auth, landing)
- **Features updated**: 4 (combat, game-session, campaign, character)

## Conclusion

The `src/components/` directory has been successfully cleaned up, with only truly shared components and developer utilities remaining. Feature-specific components have been properly extracted to their respective feature modules with complete public APIs and documentation.

**Status**: ✅ COMPLETE - Clean architecture achieved
