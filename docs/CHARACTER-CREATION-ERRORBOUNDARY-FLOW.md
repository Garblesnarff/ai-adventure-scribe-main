# Character Creation ErrorBoundary Flow Diagram

## Component Hierarchy with ErrorBoundary Protection

```
┌─────────────────────────────────────────────────────────────────┐
│ App Component                                                   │
│ ├─ Route: /app/characters/create                               │
│ │  └─ ErrorBoundary (route level)                              │
│ │     └─ CharacterCreateEntry                                  │
│ │        │                                                      │
│ │        ├─ [Feature Flag OFF] ─────────────────────┐          │
│ │        │   └─ CharacterWizard                     │          │
│ │        │      └─ ErrorBoundary (feature level) ◄──┼──────┐   │
│ │        │         └─ CharacterProvider             │      │   │
│ │        │            └─ WizardContent               │      │   │
│ │        │                                           │      │   │
│ │        └─ [Feature Flag ON] ──────────────────────┤      │   │
│ │            └─ ErrorBoundary (feature level) ◄─────┼──┐   │   │
│ │               └─ Campaign Selection UI            │  │   │   │
│ │                                                    │  │   │   │
│ └─ Route: /app/campaigns/:id/characters/new         │  │   │   │
│    └─ CampaignHubWithErrorBoundary                  │  │   │   │
│       └─ CampaignHub                                │  │   │   │
│          └─ CampaignCharacters                      │  │   │   │
│             └─ CreateCharacterPanel                 │  │   │   │
│                └─ Sheet Component                   │  │   │   │
│                   └─ CharacterWizard ───────────────┘  │   │   │
│                      └─ (Same as above)                │   │   │
│                                                         │   │   │
└─────────────────────────────────────────────────────────┼───┼───┘
                                                          │   │
                                                          ▼   ▼
        ┌──────────────────────────────────────────────────────────┐
        │ CharacterCreationErrorFallback                           │
        │ ┌──────────────────────────────────────────────────────┐ │
        │ │ 🔺 Character Creation Error                          │ │
        │ │ Something went wrong during character creation       │ │
        │ ├──────────────────────────────────────────────────────┤ │
        │ │ 💡 Tip: Take screenshots of your character details   │ │
        │ │    before restarting                                 │ │
        │ ├──────────────────────────────────────────────────────┤ │
        │ │ [🔄 Restart Character Creation]                      │ │
        │ │ [🏠 Return to Campaign Characters / Character List]  │ │
        │ │ [🏠 Return to Home]                                  │ │
        │ │ [↻ Reload Page]                                      │ │
        │ └──────────────────────────────────────────────────────┘ │
        └──────────────────────────────────────────────────────────┘
```

## Error Boundary Levels

### Route Level ErrorBoundary
- **Scope**: Entire route
- **Purpose**: Catch unhandled errors from any component in the route
- **Fallback**: Generic app error fallback
- **Located**: App.tsx route definitions

### Feature Level ErrorBoundary (CharacterWizard)
- **Scope**: Character creation wizard and all steps
- **Purpose**: Isolate character creation errors from rest of app
- **Fallback**: CharacterCreationErrorFallback (context-aware)
- **Located**: character-wizard.tsx (line 24-32)

### Feature Level ErrorBoundary (CharacterCreateEntry)
- **Scope**: Campaign selection UI (when feature flag ON)
- **Purpose**: Protect campaign template loading errors
- **Fallback**: CharacterCreationErrorFallback
- **Located**: CharacterCreateEntry.tsx (line 106-160)

## Error Flow Examples

### Example 1: Error in Wizard Step Component

```
User Action: Fills out character details
  │
  ├─ Step Component throws error
  │   │
  │   └─ Error bubbles up
  │       │
  │       ├─ CharacterProvider catches? No
  │       │
  │       └─ ErrorBoundary (feature level) catches? YES! ✅
  │           │
  │           └─ CharacterCreationErrorFallback renders
  │               │
  │               ├─ Shows error message
  │               ├─ Displays recovery options
  │               └─ User clicks "Restart Character Creation"
  │                   │
  │                   └─ ErrorBoundary.reset() called
  │                       │
  │                       └─ Wizard re-renders from scratch
```

### Example 2: Error in Campaign Selection

```
User Action: Navigates to /app/characters/create (flag ON)
  │
  ├─ Campaign templates query fails
  │   │
  │   └─ Error thrown during render
  │       │
  │       └─ ErrorBoundary (feature level) catches? YES! ✅
  │           │
  │           └─ CharacterCreationErrorFallback renders
  │               │
  │               └─ User clicks "Return to Home"
  │                   │
  │                   └─ navigate('/app') called
```

### Example 3: Error in Character Context

```
User Action: Wizard component mounts
  │
  ├─ CharacterProvider initialization fails
  │   │
  │   └─ Error during context setup
  │       │
  │       └─ ErrorBoundary (feature level) catches? YES! ✅
  │           │
  │           └─ CharacterCreationErrorFallback renders
  │               │
  │               ├─ Context-aware navigation
  │               │   ├─ campaign param detected? → "Return to Campaign Characters"
  │               │   └─ no campaign param? → "Return to Character List"
  │               │
  │               └─ User selects appropriate recovery option
```

## Recovery Paths

### 1. Restart Character Creation (reset)
```
ErrorBoundary.reset() → CharacterWizard re-mounts → Fresh state
```
**Use Case**: Transient errors, user wants to try again immediately

### 2. Return to Campaign Characters
```
navigate(`/app/campaigns/${campaignId}/characters`)
```
**Use Case**: Error in campaign-based character creation, user wants to go back to campaign

### 3. Return to Character List
```
navigate('/app/characters')
```
**Use Case**: Error in legacy character creation, user wants to see existing characters

### 4. Return to Home
```
navigate('/app')
```
**Use Case**: User wants to exit character creation entirely

### 5. Reload Page
```
window.location.reload()
```
**Use Case**: Last resort for persistent errors, full app reset

## Smart Features

### Context Detection
```typescript
const [searchParams] = useSearchParams();
const campaignId = searchParams.get('campaign');

// Smart navigation based on context
if (campaignId) {
  navigate(`/app/campaigns/${campaignId}/characters`);
} else {
  navigate('/app/characters');
}
```

### Conditional Recovery Options
```typescript
{showReturnToCharacters && (
  <Button onClick={handleReturnToCharacters}>
    {campaignId ? 'Return to Campaign Characters' : 'Return to Character List'}
  </Button>
)}
```

### Developer Tools
```typescript
{import.meta.env.DEV && error?.stack && (
  <details>
    <summary>Error Stack (Development Only)</summary>
    <pre>{error.stack}</pre>
  </details>
)}
```

## Testing Scenarios

### Scenario 1: Test ErrorBoundary Catches Render Errors
```typescript
// In any wizard step component, temporarily add:
throw new Error('Test render error');

// Expected:
// ✅ CharacterCreationErrorFallback displays
// ✅ Error message shown
// ✅ Recovery buttons available
// ✅ Can click "Restart" to recover
```

### Scenario 2: Test Context-Aware Navigation
```typescript
// Test with campaign parameter:
// URL: /app/characters/create?campaign=abc123

// Trigger error
// Expected:
// ✅ "Return to Campaign Characters" button shown
// ✅ Clicking navigates to /app/campaigns/abc123/characters

// Test without campaign parameter:
// URL: /app/characters/create

// Trigger error
// Expected:
// ✅ "Return to Character List" button shown
// ✅ Clicking navigates to /app/characters
```

### Scenario 3: Test Sheet Panel Error Isolation
```typescript
// Open CreateCharacterPanel from Campaign Hub
// Trigger error in CharacterWizard

// Expected:
// ✅ Error contained within Sheet
// ✅ Campaign Hub still functional
// ✅ Can close sheet and continue using campaign hub
```

## Error Boundary Configuration

### CharacterWizard ErrorBoundary
```typescript
<ErrorBoundary
  level="feature"
  fallback={<CharacterCreationErrorFallback showReturnToCharacters />}
>
  <CharacterProvider>
    <WizardContent />
  </CharacterProvider>
</ErrorBoundary>
```

### CharacterCreateEntry ErrorBoundary
```typescript
<ErrorBoundary
  level="feature"
  fallback={<CharacterCreationErrorFallback showReturnToCharacters />}
>
  <div className="container mx-auto px-4 py-8">
    {/* Campaign selection UI */}
  </div>
</ErrorBoundary>
```

## Key Principles

1. **Isolation**: Character creation errors don't crash entire app
2. **Context Awareness**: Recovery options adapt to user's entry point
3. **User Guidance**: Clear messaging about what happened and what to do
4. **Multiple Paths**: Various recovery options for different user preferences
5. **Developer Support**: Error details available in dev mode
6. **Graceful Degradation**: Always provide way back to working state

## Related Documentation
- WU12-CHARACTER-CREATION-ERRORBOUNDARY-REPORT.md - Full implementation report
- WU11-CAMPAIGN-HUB-ERRORBOUNDARY.md - Campaign Hub error handling (reference)
- ErrorBoundary.tsx - Core ErrorBoundary implementation
- CharacterCreationErrorFallback.tsx - Custom fallback component
