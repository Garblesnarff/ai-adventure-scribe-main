# Skeleton Components

This directory contains loading skeleton components for various UI elements.

## Components

### CharacterListSkeleton
- **Purpose**: Loading placeholder for character list grid
- **Usage**: Displayed while character data is being fetched
- **Design**: Shows 6 skeleton cards matching character card layout

### CampaignListSkeleton
- **Purpose**: Loading placeholder for campaign list grid
- **Usage**: Displayed while campaign data is being fetched
- **Design**: Wraps existing CampaignSkeleton component in consistent grid

### CharacterSelectionSkeleton
- **Purpose**: Loading placeholder for character selection modal
- **Usage**: Displayed while character data is being fetched in modals/dialogs
- **Design**: Shows 4 skeleton cards optimized for modal display with avatar and stats

### TimelineSkeleton
- **Purpose**: Loading placeholder for timeline/history views
- **Usage**: Displayed while timeline events are being loaded
- **Design**: Shows 5 skeleton events with timeline dots and descriptions

## Usage Example

```tsx
import { CharacterListSkeleton } from '@/components/skeletons/CharacterListSkeleton';

const MyComponent = () => {
  if (loading) {
    return <CharacterListSkeleton />;
  }

  return <CharacterList characters={characters} />;
};
```

## Design Principles

1. **Consistency**: Skeleton layouts match the actual component structure
2. **Performance**: Use simple animated pulse effects for low CPU usage
3. **Accessibility**: Proper semantic HTML and ARIA attributes
4. **Reusability**: Components can be used across different contexts

## Related Files

- `/src/components/ui/skeleton.tsx` - Base Skeleton component
- `/src/components/game/skeletons/` - Game-specific skeleton components
