# Fix Memory Filtering Error in Game Page

## Issue Analysis
The game page shows a blank screen due to a JavaScript error in `useMemoryFiltering.ts:29`: "Cannot read properties of null (reading 'types')".

## Root Causes
1. **Primary**: `useMemoryFiltering(memories, selectedType)` is passing `selectedType` (string | null) directly as the options parameter, but the hook expects a `FilterOptions` object.

2. **Secondary**: `MEMORY_CATEGORIES` uses type values like 'character' that may not match the `MemoryType` union definition.

## Solution Plan

### Step 1: Fix the useMemoryFiltering Call
- Update the call in `MemoryPanel.tsx` to pass a proper `FilterOptions` object
- Convert `selectedType: string | null` to `types?: MemoryType[]` 
- Handle the null case properly

### Step 2: Align Type Definitions
- Update `MEMORY_CATEGORIES` to use valid `MemoryType` values
- Map UI-friendly names to actual memory types if needed
- Ensure consistency between filter UI and data model

### Step 3: Add Defensive Programming
- Improve error handling in `useMemoryFiltering` for edge cases
- Add type validation to prevent similar issues
- Ensure graceful degradation when types don't match

### Expected Outcome
- Game page loads without JavaScript errors
- Memory filtering works correctly for all memory types
- Type safety is maintained throughout the filtering system
- UI shows appropriate filter options based on available memory types

This fix will resolve the blank screen issue and restore the memory filtering functionality in the game interface.