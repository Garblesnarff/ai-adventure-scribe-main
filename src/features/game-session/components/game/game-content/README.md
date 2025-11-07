# Game Content Sub-Components

This directory contains the refactored sub-components that compose the main GameContent interface. The original 812-line monolithic component has been split into focused, maintainable pieces following the 200-line code standard.

## Architecture Overview

The game interface follows a three-column responsive layout with collapsible panels:

```
┌─────────────────────────────────────────────────────────┐
│  Left Panel    │   Main Content   │   Right Panel      │
│  (Campaign)    │   (Chat/Combat)  │   (Character)      │
└─────────────────────────────────────────────────────────┘
```

## Component Hierarchy

```
GameContent.tsx (< 200 lines - entry point)
└── GameLayout.tsx (main orchestrator)
    ├── GameLeftPanel.tsx (campaign sidebar)
    ├── GameMainContent.tsx (center content area)
    │   ├── GamePanelControls.tsx (toggle buttons)
    │   ├── MessageHandler (chat logic)
    │   ├── MessageList (message display)
    │   ├── ChatInput (user input)
    │   └── TimelineRail (timeline visualization)
    ├── GameRightPanel.tsx (character sidebar)
    ├── GameCombatSheet.tsx (combat tracker)
    └── FloatingActionPanel (quick actions)
```

## Component Responsibilities

### GameContent.tsx (~150 lines)
**Entry point and data orchestrator**
- Manages data loading (character, campaign, session)
- Provides context providers (Combat, Message, Memory, Voice)
- Handles loading states and error states
- Delegates rendering to GameContentInner

### GameLayout.tsx (~150 lines)
**Main layout orchestrator**
- Calculates viewport constraints (top offset)
- Manages three-column grid layout
- Controls responsive panel collapsing
- Coordinates sub-component communication

### GameLoadingOverlay.tsx (~70 lines)
**Loading state visualization**
- Displays cinematic loading screen
- Shows phase-specific messages (initial, data, session, greeting)
- Animated DM icon and progress indicators

### GameLeftPanel.tsx (~25 lines)
**Left sidebar wrapper**
- Wraps CampaignSidePanel component
- Handles collapse/expand behavior
- Conditional rendering when collapsed

### GameRightPanel.tsx (~70 lines)
**Right sidebar wrapper**
- Wraps GameSidePanel (character/memory)
- Displays floating toggle button when collapsed
- Context indicators (combat mode, status)

### GameMainContent.tsx (~250 lines)
**Primary game interface**
- Chat message display and input
- Combat status and stats bars
- Scene information header
- Typing indicators
- Pending roll notifications
- Safety banner integration
- Timeline rail visualization

### GamePanelControls.tsx (~50 lines)
**Panel visibility controls**
- Toggle buttons for left/right panels
- Scene blurb visibility toggle
- Responsive button layout

### GameCombatSheet.tsx (~30 lines)
**Combat tracker overlay**
- Side sheet for combat interface
- Only shown when tracker is opened
- DM controls integration

## State Management

### Top-Level State (GameContent.tsx)
- Character data loading
- Campaign data loading
- Session initialization
- DM role determination
- Loading phases

### Layout State (GameLayout.tsx)
- Panel collapsed states (left/right)
- Scene blurb visibility
- Top offset calculation
- Floating panel visibility

### Combat State (Shared)
- Combat mode tracking
- Tracker visibility
- Combat detection status

## Data Flow

1. **GameContent** loads data (character, campaign, session)
2. **Context Providers** wrap the interface
3. **GameLayout** receives props and manages layout
4. **Sub-components** receive focused props for their responsibilities
5. **MessageHandler** coordinates chat and AI responses
6. **Combat detection** triggers UI updates across components

## Responsive Behavior

### Desktop (≥ 1440px)
- Three-column layout with all panels visible
- Scene blurb displayed in header
- Full-width combat tracker sheet

### Tablet (768px - 1439px)
- Two-column layout (main + one sidebar)
- Collapsible panels with toggle buttons
- Condensed header elements

### Mobile (< 768px)
- Single-column layout
- Panels stack vertically
- Floating toggle buttons
- Mobile-optimized touch targets

## Performance Optimizations

### Memoization
- `useCallback` for toggle handlers
- `React.memo` for expensive sub-components (future)
- Conditional rendering for collapsed panels

### Code Splitting
- Lazy loading of heavy components (potential future enhancement)
- Dynamic imports for combat interface (potential future enhancement)

### Layout Calculations
- `useLayoutEffect` for synchronous DOM measurements
- Cached offset calculations with resize listener

## Integration Points

### Context Dependencies
- `CharacterContext` - character data and state
- `CampaignContext` - campaign information
- `MessageContext` - chat messages and queue
- `MemoryContext` - episodic memory retrieval
- `CombatContext` - combat state management
- `VoiceContext` - text-to-speech integration
- `GameContext` - game session state

### External Services
- `useGameSession` - session management hook
- `useCombatAIIntegration` - AI combat detection
- `useInitialGreeting` - opening scene generation
- `usePendingRolls` - dice roll tracking

## Testing Considerations

### Unit Testing
- Each sub-component can be tested independently
- Mock props and context providers
- Test responsive behavior with different viewport sizes

### Integration Testing
- Test panel collapse/expand functionality
- Verify combat mode transitions
- Ensure message flow works correctly

### Visual Testing
- Verify layout at different breakpoints
- Check loading state animations
- Validate combat tracker appearance

## Future Enhancements

1. **Code Splitting**: Lazy load GameCombatSheet and heavy components
2. **Virtualization**: Implement virtual scrolling for message list
3. **Performance**: Add React.memo to prevent unnecessary re-renders
4. **Accessibility**: Enhance keyboard navigation and screen reader support
5. **Animations**: Add smoother panel transitions with Framer Motion

## Migration Notes

### Breaking Changes
None - the refactoring maintains full backward compatibility with parent components.

### API Changes
None - GameContent.tsx maintains the same interface as before.

### Testing Requirements
- Run full build to verify TypeScript types
- Test all panel collapse/expand functionality
- Verify combat mode transitions
- Check responsive behavior on mobile/tablet/desktop
- Ensure voice integration still works
- Validate message sending and receiving

## File Size Breakdown

| Component | Lines | Responsibility |
|-----------|-------|----------------|
| GameContent.tsx | ~150 | Entry point, data loading |
| GameLayout.tsx | ~150 | Layout orchestration |
| GameMainContent.tsx | ~250 | Chat interface |
| GameLoadingOverlay.tsx | ~70 | Loading states |
| GameRightPanel.tsx | ~70 | Character sidebar |
| GamePanelControls.tsx | ~50 | Panel toggles |
| GameCombatSheet.tsx | ~30 | Combat tracker |
| GameLeftPanel.tsx | ~25 | Campaign sidebar |
| index.ts | ~15 | Exports |
| README.md | Documentation | Architecture docs |

**Total Reduction**: 812 lines → ~150 lines (main file) + 7 focused sub-components

## Questions or Issues?

If you encounter any issues with the refactored components, please check:
1. Are all imports correctly pointing to the new sub-components?
2. Are context providers wrapping the components in the correct order?
3. Is the session ID being passed correctly through the component tree?
4. Are toggle handlers being called with the correct state?

For additional help, refer to the main CLAUDE.md documentation or CODE_STANDARDS.md.
