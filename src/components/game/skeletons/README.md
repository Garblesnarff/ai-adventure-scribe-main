# Game Skeleton Components

This directory contains loading skeleton components for game-specific UI elements.

## Components

### MessageListSkeleton
- **Purpose**: Loading placeholder for game message history
- **Usage**: Displayed while chat messages are being loaded
- **Design**: Shows alternating DM and player message placeholders

### CombatTrackerSkeleton
- **Purpose**: Loading placeholder for combat tracker interface
- **Usage**: Displayed while combat encounter data is being loaded
- **Design**: Shows initiative order, participant cards, and action controls

## Usage Example

```tsx
import { MessageListSkeleton } from '@/components/game/skeletons/MessageListSkeleton';

const MessageList = () => {
  const { messages, isLoading } = useMessageContext();

  if (isLoading) {
    return <MessageListSkeleton />;
  }

  return <div>{/* Render messages */}</div>;
};
```

## Design Principles

1. **Game Context**: Skeletons reflect D&D game UI patterns
2. **Animation**: Subtle pulse effects maintain immersion
3. **Layout**: Match exact spacing and structure of loaded content
4. **Performance**: Minimal re-renders during loading states

## Integration Notes

- MessageList currently uses a custom empty state (lines 860-876)
- CombatTracker can integrate this skeleton for better UX during initialization
- Both components are ready for future loading state improvements

## Related Files

- `/src/components/ui/skeleton.tsx` - Base Skeleton component
- `/src/components/skeletons/` - General purpose skeleton components
