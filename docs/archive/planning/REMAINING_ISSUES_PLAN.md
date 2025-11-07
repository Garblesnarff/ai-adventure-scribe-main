# Comprehensive Plan: Remaining 13 Issues

## Overview
This document provides a detailed implementation plan for the remaining issues from the comprehensive codebase analysis. Issues are organized by priority and complexity.

---

## CRITICAL PRIORITY (2 issues)

### Issue #1: useGameSession Race Conditions
**Severity:** CRITICAL
**File:** `src/hooks/use-game-session.ts` (Lines 223-316)
**Complexity:** HIGH
**Estimated Time:** 4-6 hours

#### Problem Analysis
- Multiple race conditions in session initialization
- Unstable function dependencies in useEffect causing infinite loops
- Session state can get corrupted from concurrent updates
- Missing guards for initialization-in-progress state

#### Implementation Steps

**Step 1: Add initialization tracking ref**
```typescript
const initializingRef = useRef(false);
const mountedRef = useRef(true);
```

**Step 2: Wrap helper functions in useCallback with stable deps**
```typescript
const createGameSession = useCallback(async (campaignId: string, characterId?: string) => {
  // Implementation with stable dependencies only
}, []); // Remove changing dependencies

const cleanupSession = useCallback(async () => {
  // Implementation
}, []); // Stable
```

**Step 3: Refactor main useEffect**
```typescript
useEffect(() => {
  // Guard: prevent concurrent initialization
  if (initializingRef.current) {
    return;
  }

  // Guard: only initialize if needed
  if (sessionState !== 'idle') {
    return;
  }

  initializingRef.current = true;

  const initialize = async () => {
    try {
      // Session initialization logic
      if (!mountedRef.current) return;
      // ...
    } finally {
      initializingRef.current = false;
    }
  };

  initialize();

  return () => {
    mountedRef.current = false;
  };
}, [campaignId, characterId, sessionState]); // Only primitive/stable deps
```

**Step 4: Add session state synchronization queue**
```typescript
const stateUpdateQueue = useRef<Array<() => void>>([]);
const processingQueue = useRef(false);

const queueStateUpdate = useCallback((update: () => void) => {
  stateUpdateQueue.current.push(update);
  processQueue();
}, []);
```

**Step 5: Testing checklist**
- [ ] Rapid page navigation doesn't create duplicate sessions
- [ ] Component unmount cancels pending operations
- [ ] No infinite render loops
- [ ] Session state consistent across rapid changes
- [ ] Proper cleanup on campaign/character switch

#### Files Affected
- `src/hooks/use-game-session.ts` (primary)
- Any components using `useGameSession` (verify no breaking changes)

#### Dependencies
- None (can be done independently)

#### Risk Assessment
- **High Risk:** Core game functionality - thorough testing required
- **Breaking Change Potential:** Medium (API should remain compatible)
- **Rollback Strategy:** Git revert if session initialization breaks

---

### Issue #3: MessageHandler Stale Closure Bug
**Severity:** HIGH
**File:** `src/components/game/message/MessageHandler.tsx` (Lines 73-348)
**Complexity:** MEDIUM-HIGH
**Estimated Time:** 3-4 hours

#### Problem Analysis
- `handleSendMessage` captures stale `turnCount` values
- `messages` array not reflecting latest state during async operations
- Race conditions between multiple rapid message sends

#### Implementation Steps

**Step 1: Convert to functional state updates**
```typescript
// Before:
await updateGameSessionState({
  turn_count: turnCount + 1
});

// After:
await updateGameSessionState(prev => ({
  ...prev,
  turn_count: (prev.turn_count || 0) + 1
}));
```

**Step 2: Add refs for current values**
```typescript
const turnCountRef = useRef(turnCount);
const messagesRef = useRef(messages);

useEffect(() => {
  turnCountRef.current = turnCount;
}, [turnCount]);

useEffect(() => {
  messagesRef.current = messages;
}, [messages]);
```

**Step 3: Add request queue to prevent concurrent sends**
```typescript
const sendQueueRef = useRef<Array<{message: ChatMessage, resolve: Function, reject: Function}>>([]);
const isSendingRef = useRef(false);

const processSendQueue = useCallback(async () => {
  if (isSendingRef.current || sendQueueRef.current.length === 0) return;

  isSendingRef.current = true;
  const { message, resolve, reject } = sendQueueRef.current[0];

  try {
    // Process message using refs for current values
    await actualSendMessage(message, turnCountRef.current);
    resolve();
  } catch (error) {
    reject(error);
  } finally {
    sendQueueRef.current.shift();
    isSendingRef.current = false;
    processSendQueue(); // Process next
  }
}, []);
```

**Step 4: Update handleSendMessage to use queue**
```typescript
const handleSendMessage = useCallback((message: ChatMessage) => {
  return new Promise((resolve, reject) => {
    sendQueueRef.current.push({ message, resolve, reject });
    processSendQueue();
  });
}, [processSendQueue]);
```

**Step 5: Testing checklist**
- [ ] Rapid message sends process in order
- [ ] Turn count increments correctly
- [ ] No duplicate messages
- [ ] State updates reflect latest values
- [ ] Proper error handling for queued messages

#### Files Affected
- `src/components/game/message/MessageHandler.tsx` (primary)
- Test interaction with `GameContent.tsx`

#### Dependencies
- None (independent fix)

#### Risk Assessment
- **Medium Risk:** Core messaging - test thoroughly
- **Breaking Change Potential:** Low (internal implementation)
- **Performance Impact:** Positive (prevents race conditions)

---

## HIGH PRIORITY (3 issues)

### Issue #4: Z-Index Chaos Standardization
**Severity:** HIGH
**File:** Multiple components
**Complexity:** MEDIUM
**Estimated Time:** 2-3 hours

#### Problem Analysis
- Inconsistent z-index values: z-20, z-30, z-50, z-100
- Modals can be hidden behind loading overlays
- Dice roll popups obscured by other UI

#### Implementation Steps

**Step 1: Create z-index constants file**
```typescript
// src/constants/z-index.ts
export const Z_INDEX = {
  BASE: 0,
  DROPDOWN: 10,
  STICKY: 20,
  CARD_HOVER: 25,
  OVERLAY: 30,
  MODAL_BACKDROP: 40,
  MODAL: 50,
  POPOVER: 60,
  TOOLTIP: 70,
  TOAST: 80,
  LOADING_OVERLAY: 100,
} as const;

export type ZIndexLayer = typeof Z_INDEX[keyof typeof Z_INDEX];
```

**Step 2: Find all z-index usage**
```bash
grep -rn "z-\[" src/components/
grep -rn "z-[0-9]" src/components/
grep -rn "zIndex" src/components/
```

**Step 3: Update each component systematically**

Components to update:
- `MessageList.tsx` - DiceRollRequest popup (line 825): `z-50` → `z-[${Z_INDEX.POPOVER}]`
- `GameContent.tsx` - LoadingOverlay (line 191): `z-50` → `z-[${Z_INDEX.LOADING_OVERLAY}]`
- Character card hover popup: `z-20` → `z-[${Z_INDEX.CARD_HOVER}]`
- Alert dialogs: `z-50` → `z-[${Z_INDEX.MODAL}]`
- Floating action panel: `z-30` → `z-[${Z_INDEX.OVERLAY}]`
- Sheet overlays: Verify using `z-[${Z_INDEX.MODAL_BACKDROP}]`
- Toast notifications: `z-[${Z_INDEX.TOAST}]`

**Step 4: Create helper utility (optional)**
```typescript
// src/utils/z-index.ts
import { Z_INDEX } from '@/constants/z-index';

export const getZIndexClass = (layer: keyof typeof Z_INDEX) => {
  return `z-[${Z_INDEX[layer]}]`;
};
```

**Step 5: Testing checklist**
- [ ] Dice rolls visible over chat
- [ ] Loading overlay covers everything except toasts
- [ ] Modals appear above all content
- [ ] Tooltips not hidden by modals
- [ ] Combat sheet z-index correct
- [ ] No visual regressions

#### Files Affected (estimated 10-15 files)
- `src/constants/z-index.ts` (new file)
- `src/components/game/MessageList.tsx`
- `src/components/game/GameContent.tsx`
- `src/components/campaign-list/character-selection-modal.tsx`
- `src/components/ui/dialog.tsx`
- `src/components/ui/sheet.tsx`
- `src/components/game/FloatingActionPanel.tsx`
- `src/components/game/DiceRollRequest.tsx`
- And others found in grep

#### Dependencies
- None

#### Risk Assessment
- **Low Risk:** Purely visual changes
- **Breaking Change Potential:** None
- **Testing:** Visual regression testing needed

---

### Issue #5: Missing Error Boundaries
**Severity:** HIGH
**File:** None (need to create)
**Complexity:** MEDIUM
**Estimated Time:** 3-4 hours

#### Problem Analysis
- No React error boundaries in component tree
- Any component error causes white screen of death
- No graceful degradation or error recovery
- Poor user experience on exceptions

#### Implementation Steps

**Step 1: Create base ErrorBoundary component**
```typescript
// src/components/error/ErrorBoundary.tsx
import React, { Component, ErrorInfo, ReactNode } from 'react';
import logger from '@/lib/logger';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  level?: 'app' | 'route' | 'feature' | 'component';
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const { level = 'component', onError } = this.props;

    logger.error(`[ErrorBoundary:${level}] Component error:`, {
      error,
      errorInfo,
      componentStack: errorInfo.componentStack
    });

    onError?.(error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex items-center justify-center min-h-screen bg-background">
          <div className="max-w-md p-8 bg-card border border-destructive/20 rounded-lg shadow-lg">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="h-6 w-6 text-destructive" />
              <h2 className="text-xl font-semibold">Something went wrong</h2>
            </div>
            <p className="text-muted-foreground mb-4">
              {this.state.error?.message || 'An unexpected error occurred'}
            </p>
            <div className="flex gap-2">
              <Button onClick={this.handleReset} variant="default">
                Try Again
              </Button>
              <Button onClick={() => window.location.reload()} variant="outline">
                Reload Page
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
```

**Step 2: Create specialized error fallbacks**
```typescript
// src/components/error/GameErrorFallback.tsx
export const GameErrorFallback: React.FC<{error: Error, reset: () => void}> = ({error, reset}) => (
  <div className="flex flex-col items-center justify-center h-full p-8">
    <h3 className="text-xl font-semibold mb-4">Game Session Error</h3>
    <p className="text-muted-foreground mb-4">Your game session encountered an error.</p>
    <Button onClick={reset}>Restart Session</Button>
  </div>
);
```

**Step 3: Wrap App at multiple levels**
```typescript
// src/App.tsx - Top level
function App() {
  return (
    <ErrorBoundary level="app">
      <QueryClientProvider client={queryClient}>
        {/* ... */}
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

// src/main.tsx or router setup - Route level
{
  path: '/app/game/:id',
  element: (
    <ErrorBoundary level="route" fallback={<GameErrorFallback />}>
      <GamePage />
    </ErrorBoundary>
  )
}

// src/components/game/GameContent.tsx - Feature level
export const GameContent: React.FC = () => {
  return (
    <ErrorBoundary level="feature">
      {/* existing content */}
    </ErrorBoundary>
  );
};
```

**Step 4: Add error reporting (optional)**
```typescript
const reportError = (error: Error, errorInfo: ErrorInfo) => {
  // Send to error tracking service
  // e.g., Sentry, LogRocket, etc.
  logger.error('Reported to error tracking:', { error, errorInfo });
};

<ErrorBoundary onError={reportError}>
  {/* ... */}
</ErrorBoundary>
```

**Step 5: Testing checklist**
- [ ] Throw test error - boundary catches it
- [ ] Reset button restores functionality
- [ ] Nested boundaries work correctly
- [ ] Error logged properly
- [ ] User can recover without full reload
- [ ] Different fallbacks for different levels

#### Files Affected
- `src/components/error/ErrorBoundary.tsx` (new)
- `src/components/error/GameErrorFallback.tsx` (new)
- `src/App.tsx` (wrap root)
- Router configuration (wrap routes)
- `src/components/game/GameContent.tsx` (wrap features)

#### Dependencies
- None

#### Risk Assessment
- **Low Risk:** Additive change only
- **Breaking Change Potential:** None
- **Testing:** Trigger errors to verify boundaries work

---

### Issue #6: GameContext Infinite Loop Prevention
**Severity:** HIGH
**File:** `src/contexts/GameContext.tsx` (Lines 230-257)
**Complexity:** MEDIUM
**Estimated Time:** 2 hours

#### Problem Analysis
- Combat state sync effect can cause re-render loops
- Dependencies trigger oscillating state updates
- No guards against rapid state changes

#### Implementation Steps

**Step 1: Add previous value tracking refs**
```typescript
const prevCombatStateRef = useRef({
  isInCombat: false,
  currentTurnPlayerId: undefined as string | undefined
});
```

**Step 2: Update combat state sync effect**
```typescript
useEffect(() => {
  const isInCombat = combatState.isInCombat;
  const currentTurnPlayerId = combatState.activeEncounter?.currentTurnParticipantId;

  // Only dispatch if values actually changed
  const prevState = prevCombatStateRef.current;
  if (prevState.isInCombat !== isInCombat ||
      prevState.currentTurnPlayerId !== currentTurnPlayerId) {

    prevCombatStateRef.current = { isInCombat, currentTurnPlayerId };

    dispatch({
      type: 'SET_COMBAT_STATE',
      payload: { isInCombat, currentTurnPlayerId }
    });
  }
}, [combatState.isInCombat, combatState.activeEncounter?.currentTurnParticipantId, dispatch]);
```

**Step 3: Add debouncing for auto-cleanup (optional)**
```typescript
useEffect(() => {
  const timeoutId = setTimeout(() => {
    // Auto-cleanup logic
    // Only fires after 2 seconds of no changes
  }, 2000);

  return () => clearTimeout(timeoutId);
}, [/* dependencies */]);
```

**Step 4: Testing checklist**
- [ ] No infinite loops during combat
- [ ] State updates only when values change
- [ ] CPU usage normal during combat
- [ ] UI responsive during state changes
- [ ] Rapid combat state changes handled correctly

#### Files Affected
- `src/contexts/GameContext.tsx`

#### Dependencies
- None

#### Risk Assessment
- **Medium Risk:** Combat is core feature
- **Breaking Change Potential:** Low
- **Testing:** Monitor render counts with React DevTools

---

## MEDIUM PRIORITY (5 issues)

### Issue #7: Console.log Replacement (84 files)
**Severity:** MEDIUM
**File:** 84 files across codebase
**Complexity:** LOW (tedious)
**Estimated Time:** 2-3 hours

#### Problem Analysis
- Direct console.log/warn/error statements throughout
- Should use logger utility instead
- Performance impact in production
- Potential sensitive data logging

#### Implementation Steps

**Step 1: Find all instances**
```bash
# Get full list
grep -r "console\." src/ --include="*.ts" --include="*.tsx" > console_usage.txt

# Count by type
grep -r "console\.log" src/ --include="*.ts" --include="*.tsx" | wc -l
grep -r "console\.warn" src/ --include="*.tsx" --include="*.ts" | wc -l
grep -r "console\.error" src/ --include="*.ts" --include="*.tsx" | wc -l
```

**Step 2: Create replacement script (recommended approach)**
```bash
# Create a script to do bulk replacement
# scripts/replace-console.sh
#!/bin/bash

# Replace console.log with logger.info
find src -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i 's/console\.log/logger.info/g' {} +

# Replace console.warn with logger.warn
find src -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i 's/console\.warn/logger.warn/g' {} +

# Replace console.error with logger.error
find src -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i 's/console\.error/logger.error/g' {} +

# Replace console.debug with logger.debug
find src -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i 's/console\.debug/logger.debug/g' {} +
```

**Step 3: Manual review high-risk files**
- Review changes in critical files before committing
- Verify logger import exists in each file
- Check for any console.table or console.dir that need special handling

**Step 4: Add missing logger imports**
```bash
# Find files using logger without import
grep -r "logger\." src/ --include="*.ts" --include="*.tsx" -l | while read file; do
  if ! grep -q "import.*logger" "$file"; then
    echo "$file needs logger import"
  fi
done
```

**Step 5: Add ESLint rule to prevent future violations**
```json
// .eslintrc.json
{
  "rules": {
    "no-console": ["error", {
      "allow": [] // No console methods allowed
    }]
  }
}
```

**Step 6: Testing checklist**
- [ ] All console statements replaced
- [ ] Logger imports added where missing
- [ ] Production build has no console output
- [ ] Development logging still works
- [ ] ESLint enforces no-console rule

#### Files Affected
- 84+ files (systematic replacement)
- `.eslintrc.json` (add rule)

#### Dependencies
- Logger utility already exists

#### Risk Assessment
- **Low Risk:** Logging changes only
- **Breaking Change Potential:** None
- **Automation:** Use scripts for bulk replacement

---

### Issue #12: Standardize localStorage Pattern
**Severity:** MEDIUM
**File:** Multiple components
**Complexity:** MEDIUM
**Estimated Time:** 3-4 hours

#### Problem Analysis
- Mixed patterns for localStorage initialization
- Inconsistent error handling
- Some use immediate reads, others use useEffect
- Synchronization issues

#### Implementation Steps

**Step 1: Create custom hook**
```typescript
// src/hooks/use-local-storage.ts
import { useState, useEffect } from 'react';
import logger from '@/lib/logger';

export function useLocalStorage<T>(
  key: string,
  defaultValue: T
): [T, (value: T | ((prev: T) => T)) => void] {
  // Initialize state
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === 'undefined') {
      return defaultValue;
    }

    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      logger.warn(`Error reading localStorage key "${key}":`, error);
      return defaultValue;
    }
  });

  // Update localStorage when state changes
  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      window.localStorage.setItem(key, JSON.stringify(storedValue));
    } catch (error) {
      logger.error(`Error setting localStorage key "${key}":`, error);
    }
  }, [key, storedValue]);

  return [storedValue, setStoredValue];
}
```

**Step 2: Find all localStorage usage**
```bash
grep -r "localStorage\." src/ --include="*.ts" --include="*.tsx" > localStorage_usage.txt
```

**Step 3: Replace patterns systematically**
```typescript
// Before:
const [showSceneBlurb, setShowSceneBlurb] = useState(() => {
  try {
    const v = localStorage.getItem('ui:sceneBlurb');
    return v === null ? true : v === '1';
  } catch {
    return true;
  }
});

useEffect(() => {
  localStorage.setItem('ui:sceneBlurb', showSceneBlurb ? '1' : '0');
}, [showSceneBlurb]);

// After:
const [showSceneBlurb, setShowSceneBlurb] = useLocalStorage<boolean>(
  'ui:sceneBlurb',
  true
);
```

**Step 4: Handle special cases**
- Boolean stored as '1'/'0' strings
- Complex objects
- Session storage vs localStorage
- Items that don't need persistence

**Step 5: Testing checklist**
- [ ] All localStorage patterns use hook
- [ ] Values persist across reloads
- [ ] Error handling works
- [ ] No localStorage quota exceeded errors
- [ ] SSR-safe (no window undefined errors)

#### Files Affected (estimated 15-20 files)
- `src/hooks/use-local-storage.ts` (new)
- `src/components/game/GameContent.tsx`
- `src/contexts/VoiceContext.tsx`
- `src/components/game/audio/MultiVoicePlayer.tsx`
- Any component using localStorage directly

#### Dependencies
- None

#### Risk Assessment
- **Low Risk:** Improvement to existing functionality
- **Breaking Change Potential:** None (same behavior)

---

### Issue #13: TypeScript Strict Null Checks
**Severity:** MEDIUM
**File:** tsconfig.json + many files
**Complexity:** HIGH
**Estimated Time:** 6-8 hours

#### Problem Analysis
- TypeScript strict mode not enabled
- Many optional properties accessed without null checks
- Potential runtime errors from undefined access
- Inconsistent null handling

#### Implementation Steps

**Step 1: Enable strict null checks gradually**
```json
// tsconfig.json
{
  "compilerOptions": {
    "strict": false, // Keep false initially
    "strictNullChecks": true, // Enable ONLY null checks first
    // ...other options
  }
}
```

**Step 2: Run TypeScript compiler to see errors**
```bash
npx tsc --noEmit > typescript_errors.txt
# Expect 100-500+ errors initially
```

**Step 3: Create error categories**
```bash
# Categorize by error type
grep "Object is possibly 'undefined'" typescript_errors.txt > undefined_errors.txt
grep "Object is possibly 'null'" typescript_errors.txt > null_errors.txt
grep "Type 'undefined' is not assignable" typescript_errors.txt > type_errors.txt
```

**Step 4: Fix errors by category (prioritize)**

**Priority 1: Critical paths (game session, character, campaign)**
```typescript
// Before:
const character = characterState.character;
const name = character.name; // Error: character possibly undefined

// After:
const character = characterState.character;
const name = character?.name ?? 'Unknown';
```

**Priority 2: Props and function parameters**
```typescript
// Before:
function processMessage(message: ChatMessage | undefined) {
  return message.text.length; // Error
}

// After:
function processMessage(message: ChatMessage | undefined) {
  if (!message) return 0;
  return message.text?.length ?? 0;
}
```

**Priority 3: Array operations**
```typescript
// Before:
const lastMessage = messages.find(m => m.sender === 'dm');
const text = lastMessage.text; // Error

// After:
const lastMessage = messages.find(m => m.sender === 'dm');
const text = lastMessage?.text ?? '';
```

**Step 5: Add type guards for common patterns**
```typescript
// src/utils/type-guards.ts
export function isDefined<T>(value: T | undefined | null): value is T {
  return value !== undefined && value !== null;
}

export function assertDefined<T>(value: T | undefined | null, message?: string): asserts value is T {
  if (value === undefined || value === null) {
    throw new Error(message ?? 'Value must be defined');
  }
}

// Usage:
const character = characterState.character;
assertDefined(character, 'Character must be loaded');
// TypeScript now knows character is defined
```

**Step 6: Testing checklist**
- [ ] All TypeScript errors resolved
- [ ] No new runtime errors introduced
- [ ] Proper null checks in critical paths
- [ ] Type guards used appropriately
- [ ] Optional chaining (?.) used consistently

#### Files Affected
- `tsconfig.json`
- `src/utils/type-guards.ts` (new)
- Potentially 50-100+ files with type errors

#### Dependencies
- None (but do AFTER other fixes to avoid conflicts)

#### Risk Assessment
- **High Risk:** Type system changes affect everything
- **Breaking Change Potential:** Medium (may reveal bugs)
- **Recommended:** Do incrementally, one module at a time

---

### Issue #14: Refactor GameContent.tsx (801 lines → <200)
**Severity:** LOW (code quality)
**File:** `src/components/game/GameContent.tsx`
**Complexity:** HIGH
**Estimated Time:** 6-8 hours

#### Problem Analysis
- GameContent.tsx is 801 lines (violates 200-line standard)
- Mixed concerns: loading, layout, combat, state management
- Difficult to maintain and test
- Hard to understand component responsibility

#### Implementation Steps

**Step 1: Analyze component structure**
```
GameContent.tsx (801 lines) breaks down to:
- Lines 1-43: Imports and types
- Lines 44-153: State initialization and data loading (110 lines)
- Lines 154-173: Event handlers (20 lines)
- Lines 174-223: LoadingOverlay component (50 lines)
- Lines 224-800: Main render and layout (576 lines)
  - Combat interface
  - Sidebars (left/right)
  - Chat area
  - Floating panels
```

**Step 2: Extract LoadingOverlay**
```typescript
// src/components/game/GameLoadingOverlay.tsx (new)
interface GameLoadingOverlayProps {
  loadingPhase: 'initial' | 'data' | 'session' | 'greeting';
}

export const GameLoadingOverlay: React.FC<GameLoadingOverlayProps> = ({ loadingPhase }) => {
  // Lines 174-223 from GameContent
  // ...
};
```

**Step 3: Extract layout logic**
```typescript
// src/components/game/GameLayout.tsx (new)
interface GameLayoutProps {
  leftPanel: ReactNode;
  mainContent: ReactNode;
  rightPanel: ReactNode;
  isLeftCollapsed: boolean;
  isRightCollapsed: boolean;
  onLeftToggle: () => void;
  onRightToggle: () => void;
}

export const GameLayout: React.FC<GameLayoutProps> = ({ ... }) => {
  // Layout grid logic
  // Sidebar collapse logic
  // Responsive behavior
};
```

**Step 4: Extract data loading hook**
```typescript
// src/hooks/use-game-data-loader.ts (new)
export function useGameDataLoader(
  campaignId: string,
  characterId: string
) {
  const [isLoading, setIsLoading] = useState(true);
  const [loadingPhase, setLoadingPhase] = useState<LoadingPhase>('initial');
  const [error, setError] = useState<string | null>(null);

  // Lines 80-153 from GameContent
  // Data loading logic

  return { isLoading, loadingPhase, error };
}
```

**Step 5: Extract combat sheet logic**
```typescript
// src/components/game/GameCombatSheet.tsx (new)
interface GameCombatSheetProps {
  isOpen: boolean;
  onClose: () => void;
  sessionId?: string;
}

export const GameCombatSheet: React.FC<GameCombatSheetProps> = ({ ... }) => {
  // Combat sheet rendering
  // Combat tracker
};
```

**Step 6: Refactored GameContent structure**
```typescript
// src/components/game/GameContent.tsx (now ~150 lines)
export const GameContent: React.FC = () => {
  // URL params
  const { id: campaignId } = useParams();
  const characterId = useSearchParams().get('character');

  // Custom hooks
  const { isLoading, loadingPhase, error } = useGameDataLoader(campaignId, characterId);
  const { sessionData, sessionId } = useGameSession(campaignId, characterId);

  // UI state
  const [isLeftCollapsed, setIsLeftCollapsed] = useLocalStorage('ui:leftCollapsed', false);
  const [isRightCollapsed, setIsRightCollapsed] = useLocalStorage('ui:rightCollapsed', false);
  const [combatMode, setCombatMode] = useState(false);

  // Handlers (memoized)
  const handleLeftToggle = useCallback(() => setIsLeftCollapsed(v => !v), []);
  const handleRightToggle = useCallback(() => setIsRightCollapsed(v => !v), []);
  const handleCombatToggle = useCallback(() => setCombatMode(v => !v), []);

  if (isLoading) {
    return <GameLoadingOverlay loadingPhase={loadingPhase} />;
  }

  if (error) {
    return <GameErrorState error={error} />;
  }

  return (
    <GameProviders sessionId={sessionId}>
      <GameLayout
        leftPanel={<CampaignSidePanel />}
        mainContent={<GameChatArea sessionId={sessionId} />}
        rightPanel={<GameSidePanel sessionData={sessionData} />}
        isLeftCollapsed={isLeftCollapsed}
        isRightCollapsed={isRightCollapsed}
        onLeftToggle={handleLeftToggle}
        onRightToggle={handleRightToggle}
      />
      <GameCombatSheet
        isOpen={combatMode}
        onClose={handleCombatToggle}
        sessionId={sessionId}
      />
    </GameProviders>
  );
};
```

**Step 7: Testing checklist**
- [ ] All functionality works after refactor
- [ ] No visual regressions
- [ ] State management unchanged
- [ ] Combat mode still works
- [ ] Sidebar collapse behavior identical
- [ ] Loading states correct
- [ ] Each new component under 200 lines

#### Files Affected
- `src/components/game/GameContent.tsx` (refactor to ~150 lines)
- `src/components/game/GameLoadingOverlay.tsx` (new)
- `src/components/game/GameLayout.tsx` (new)
- `src/components/game/GameChatArea.tsx` (new)
- `src/components/game/GameCombatSheet.tsx` (new)
- `src/components/game/GameProviders.tsx` (new)
- `src/components/game/GameErrorState.tsx` (new)
- `src/hooks/use-game-data-loader.ts` (new)

#### Dependencies
- Do AFTER useGameSession fix (#1)
- Do AFTER useLocalStorage hook (#12)

#### Risk Assessment
- **Medium Risk:** Large refactor
- **Breaking Change Potential:** Low (internal only)
- **Testing:** Extensive manual testing required

---

### Issue #15: Refactor MessageList.tsx (866 lines → <200)
**Severity:** LOW (code quality)
**File:** `src/components/game/MessageList.tsx`
**Complexity:** HIGH
**Estimated Time:** 6-8 hours

#### Problem Analysis
- MessageList.tsx is 866 lines (violates 200-line standard)
- Multiple responsibilities: rendering, image generation, dynamic options, combat detection
- Complex state management
- Difficult to test individual features

#### Implementation Steps

**Step 1: Analyze component structure**
```
MessageList.tsx (866 lines):
- Lines 1-30: Imports and types
- Lines 31-99: Component setup, refs, state
- Lines 100-221: Dynamic options fetch logic (121 lines)
- Lines 222-250: Message grouping logic (29 lines)
- Lines 251-333: Image generation logic (82 lines)
- Lines 334-866: Render logic (532 lines)
  - Message groups
  - Combat messages
  - Dice rolls
  - Image buttons
  - Action options
```

**Step 2: Extract dynamic options logic**
```typescript
// src/hooks/use-dynamic-options.ts (new)
export function useDynamicOptions(
  messages: ChatMessage[],
  getCurrentDiceRoll: () => any,
  combatState: CombatState
) {
  const [dynamicOptions, setDynamicOptions] = useState<DynamicOptions | null>(null);

  useEffect(() => {
    // Lines 108-221 from MessageList
    // Dynamic options fetch logic with cleanup
  }, [messages, getCurrentDiceRoll]);

  return dynamicOptions;
}
```

**Step 3: Extract image generation logic**
```typescript
// src/hooks/use-message-image-generation.ts (new)
export function useMessageImageGeneration(
  sessionId?: string
) {
  const [generatingFor, setGeneratingFor] = useState<Set<string>>(new Set());
  const [imageByMessage, setImageByMessage] = useState<Record<string, ImageData>>({});
  const [genErrorByMessage, setGenErrorByMessage] = useState<Record<string, string>>({});

  const handleGenerateScene = useCallback(async (message: ChatMessage) => {
    // Lines 261-333 from MessageList
    // Image generation logic
  }, [sessionId]);

  return {
    generatingFor,
    imageByMessage,
    genErrorByMessage,
    handleGenerateScene,
  };
}
```

**Step 4: Extract message grouping**
```typescript
// src/utils/message-grouping.ts (new)
export function groupConsecutiveMessages(messages: ChatMessage[]) {
  // Lines 222-250 from MessageList
  // Pure function for message grouping
  if (!messages.length) return [];

  const groups: MessageGroup[] = [];
  let currentGroup = {
    sender: messages[0].sender,
    messages: [messages[0]],
    isPlayer: messages[0].sender === 'player'
  };

  // ... grouping logic

  return groups;
}
```

**Step 5: Extract message rendering components**
```typescript
// src/components/game/message/MessageGroup.tsx (new)
interface MessageGroupProps {
  group: MessageGroup;
  isLastGroup: boolean;
  onGenerateImage?: (message: ChatMessage) => void;
  generatingFor: Set<string>;
  imageData?: ImageData;
  error?: string;
}

export const MessageGroup: React.FC<MessageGroupProps> = ({ ... }) => {
  // Render message group
  // DM vs Player styling
  // Voice controls
  // Image generation buttons
};

// src/components/game/message/DMMessageGroup.tsx (new)
// src/components/game/message/PlayerMessageGroup.tsx (new)
// src/components/game/message/SystemMessageGroup.tsx (new)
```

**Step 6: Refactored MessageList structure**
```typescript
// src/components/game/MessageList.tsx (now ~180 lines)
export const MessageList: React.FC<MessageListProps> = ({
  onSendFullMessage,
  sessionId,
  containerRef
}) => {
  const { messages } = useMessageContext();
  const { combatState } = useCombat();
  const { getCurrentDiceRoll } = useGame();

  // Custom hooks
  const dynamicOptions = useDynamicOptions(messages, getCurrentDiceRoll, combatState);
  const imageGen = useMessageImageGeneration(sessionId);
  const groupedMessages = useMemo(() => groupConsecutiveMessages(messages), [messages]);

  // Scroll management
  const messagesRef = useRef<HTMLDivElement>(null);
  const [isUserScrolledUp, setIsUserScrolledUp] = useState(false);

  useEffect(() => {
    // Auto-scroll logic
  }, [messages, isUserScrolledUp]);

  return (
    <div ref={messagesRef} className="flex-1 overflow-y-auto p-4 space-y-4">
      {groupedMessages.map((group, idx) => (
        <MessageGroup
          key={idx}
          group={group}
          isLastGroup={idx === groupedMessages.length - 1}
          onGenerateImage={imageGen.handleGenerateScene}
          generatingFor={imageGen.generatingFor}
          imageData={imageGen.imageByMessage[group.messages[0].id]}
          error={imageGen.genErrorByMessage[group.messages[0].id]}
        />
      ))}

      {dynamicOptions && (
        <ActionOptions
          options={dynamicOptions.lines}
          onOptionSelect={handleOptionSelect}
        />
      )}
    </div>
  );
};
```

**Step 7: Testing checklist**
- [ ] Messages render correctly
- [ ] Grouping works as before
- [ ] Image generation functional
- [ ] Dynamic options appear
- [ ] Scroll behavior unchanged
- [ ] Combat messages render
- [ ] Dice rolls display
- [ ] Each new component under 200 lines

#### Files Affected
- `src/components/game/MessageList.tsx` (refactor to ~180 lines)
- `src/hooks/use-dynamic-options.ts` (new)
- `src/hooks/use-message-image-generation.ts` (new)
- `src/utils/message-grouping.ts` (new)
- `src/components/game/message/MessageGroup.tsx` (new)
- `src/components/game/message/DMMessageGroup.tsx` (new)
- `src/components/game/message/PlayerMessageGroup.tsx` (new)

#### Dependencies
- Do AFTER memory leak fix is tested (#2 - already done)

#### Risk Assessment
- **Medium Risk:** Core message display
- **Breaking Change Potential:** Low (internal only)
- **Testing:** Visual and functional testing required

---

## LOW PRIORITY (3 issues)

### Issue #16: Consolidate Voice Player Components
**Severity:** LOW
**Files:** `ProgressiveVoicePlayer.tsx`, `MultiVoicePlayer.tsx`
**Complexity:** MEDIUM
**Estimated Time:** 4-5 hours

#### Implementation Steps

**Step 1: Analyze differences**
```bash
# Compare the two files
diff src/components/game/audio/ProgressiveVoicePlayer.tsx \
     src/components/game/audio/MultiVoicePlayer.tsx > voice_player_diff.txt
```

**Step 2: Create unified component**
```typescript
// src/components/game/audio/VoicePlayer.tsx (new)
interface VoicePlayerProps {
  text: string;
  narrationSegments?: NarrationSegment[];
  mode?: 'progressive' | 'multi';
  autoPlay?: boolean;
  onComplete?: () => void;
}

export const VoicePlayer: React.FC<VoicePlayerProps> = ({
  mode = 'multi',
  ...props
}) => {
  // Unified implementation with feature flags
  // Use mode prop to enable/disable progressive features
};
```

**Step 3: Migrate usage**
- Find all usages of both components
- Replace with new unified VoicePlayer
- Test each migration

**Step 4: Remove old components**

#### Files Affected
- `src/components/game/audio/VoicePlayer.tsx` (new)
- Remove `ProgressiveVoicePlayer.tsx`
- Remove `MultiVoicePlayer.tsx`
- Update all components using voice players

---

### Issue #17: Add Loading States with Skeleton
**Severity:** LOW
**File:** Multiple components
**Complexity:** LOW
**Estimated Time:** 2-3 hours

#### Implementation Steps

**Step 1: Create Skeleton components**
```typescript
// src/components/ui/skeleton.tsx (if doesn't exist)
export const Skeleton: React.FC<{className?: string}> = ({ className }) => (
  <div className={`animate-pulse bg-muted rounded ${className}`} />
);

// src/components/game/skeletons/MessageListSkeleton.tsx
export const MessageListSkeleton = () => (
  <div className="space-y-4 p-4">
    {[1,2,3].map(i => (
      <div key={i} className="flex gap-2">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </div>
    ))}
  </div>
);
```

**Step 2: Add to loading states**
```typescript
// Replace generic "Loading..." text with Skeleton
{isLoading ? <MessageListSkeleton /> : <MessageList />}
```

**Step 3: Identify components needing skeletons**
- Character list loading
- Campaign list loading
- Message history loading
- Combat tracker loading
- Image generation (already has spinner - add skeleton?)

---

### Issue #18: Standardize Error Handling
**Severity:** LOW
**File:** Multiple components
**Complexity:** MEDIUM
**Estimated Time:** 3-4 hours

#### Implementation Steps

**Step 1: Create error handling utility**
```typescript
// src/utils/error-handler.ts
import { toast } from 'sonner';
import logger from '@/lib/logger';

interface ErrorHandlerOptions {
  userMessage?: string;
  logLevel?: 'error' | 'warn' | 'info';
  showToast?: boolean;
  onError?: (error: unknown) => void;
}

export function handleAsyncError(
  error: unknown,
  options: ErrorHandlerOptions = {}
) {
  const {
    userMessage = 'An error occurred',
    logLevel = 'error',
    showToast = true,
    onError
  } = options;

  // Log the error
  logger[logLevel]('Error:', error);

  // Show user feedback
  if (showToast) {
    toast.error(userMessage, {
      description: error instanceof Error ? error.message : undefined
    });
  }

  // Custom error handler
  onError?.(error);
}

// Convenience wrappers
export const withErrorHandling = <T extends (...args: any[]) => Promise<any>>(
  fn: T,
  options?: ErrorHandlerOptions
): T => {
  return (async (...args: Parameters<T>) => {
    try {
      return await fn(...args);
    } catch (error) {
      handleAsyncError(error, options);
      throw error;
    }
  }) as T;
};
```

**Step 2: Find all try-catch patterns**
```bash
grep -rn "try {" src/ --include="*.ts" --include="*.tsx" > try_catch_locations.txt
```

**Step 3: Standardize error handling**
```typescript
// Before:
try {
  await someAsyncOperation();
} catch (error) {
  console.error('Operation failed:', error);
  toast({
    title: "Error",
    description: "Operation failed",
    variant: "destructive"
  });
}

// After:
try {
  await someAsyncOperation();
} catch (error) {
  handleAsyncError(error, {
    userMessage: 'Operation failed',
    logLevel: 'error'
  });
}

// Or with wrapper:
const handleOperation = withErrorHandling(
  async () => {
    await someAsyncOperation();
  },
  { userMessage: 'Operation failed' }
);
```

---

## EXECUTION PLAN

### Phase 1: Critical Stability (Week 1)
**Priority:** Fix crashes and major bugs
**Time:** 10-12 hours

1. ✅ **Issue #2: MessageList memory leak** - DONE
2. ⏭️ **Issue #1: useGameSession race conditions** (4-6 hours)
3. ⏭️ **Issue #3: MessageHandler stale closure** (3-4 hours)
4. ⏭️ **Issue #6: GameContext infinite loop** (2 hours)

**Success Criteria:**
- No memory leaks in long sessions
- No race conditions in session management
- No infinite render loops
- All critical paths stable

---

### Phase 2: High Priority UX (Week 2)
**Priority:** Improve reliability and error handling
**Time:** 7-9 hours

1. ⏭️ **Issue #5: Add Error Boundaries** (3-4 hours)
2. ⏭️ **Issue #4: Z-Index standardization** (2-3 hours)
3. ✅ **Issue #9: MultiVoicePlayer cleanup** - DONE
4. ⏭️ **Issue #18: Standardize error handling** (3-4 hours)

**Success Criteria:**
- Graceful error recovery
- No white screen of death
- Consistent UI layering
- Standardized error patterns

---

### Phase 3: Code Quality (Week 3)
**Priority:** Technical debt and maintainability
**Time:** 10-12 hours

1. ⏭️ **Issue #7: Console.log replacement** (2-3 hours)
2. ⏭️ **Issue #12: localStorage standardization** (3-4 hours)
3. ✅ **Issue #17: Extract magic numbers** - DONE
4. ⏭️ **Issue #17: Add loading skeletons** (2-3 hours)
5. ⏭️ **Issue #16: Consolidate voice players** (4-5 hours)

**Success Criteria:**
- ESLint enforces no-console
- Consistent localStorage patterns
- Skeleton loading states
- Single voice player component

---

### Phase 4: Large Refactorings (Week 4+)
**Priority:** Long-term maintainability
**Time:** 18-24 hours

1. ⏭️ **Issue #14: Refactor GameContent** (6-8 hours)
2. ⏭️ **Issue #15: Refactor MessageList** (6-8 hours)
3. ⏭️ **Issue #13: TypeScript strict mode** (6-8 hours)

**Success Criteria:**
- All files under 200 lines
- No TypeScript strict errors
- Improved code organization
- Better testability

---

## RISK MITIGATION

### Before Starting Any Issue
1. Create feature branch: `git checkout -b fix/issue-[number]`
2. Commit frequently with descriptive messages
3. Test thoroughly before merging
4. Have rollback plan ready

### Testing Strategy
1. **Unit tests:** Add for new utilities/hooks
2. **Integration tests:** Test critical paths
3. **Manual testing:** Test actual gameplay
4. **Performance testing:** Monitor with React DevTools

### Rollback Strategy
```bash
# If issue causes problems
git revert [commit-hash]

# Or reset branch
git reset --hard origin/main
```

---

## TRACKING PROGRESS

### Create GitHub Issues (Optional)
- One issue per fix
- Link to this plan
- Track completion

### Update This Document
- Mark ✅ when complete
- Add notes on challenges
- Document decisions made

---

## ESTIMATED TOTAL TIME

- **Phase 1 (Critical):** 10-12 hours
- **Phase 2 (High Priority):** 7-9 hours
- **Phase 3 (Code Quality):** 10-12 hours
- **Phase 4 (Refactoring):** 18-24 hours

**Grand Total:** 45-57 hours (~1-1.5 weeks of full-time work)

**Already Complete:** 7 hours (Issues #2, #8, #9, #11, #17 partial, #19)

**Remaining:** ~40-50 hours

---

## NOTES

- Some issues can be done in parallel
- Phase 4 is optional but highly recommended
- Prioritize based on actual pain points
- Adjust plan based on discoveries
- Don't hesitate to break large issues into sub-tasks
