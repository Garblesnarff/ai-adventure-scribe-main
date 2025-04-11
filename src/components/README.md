# Components Module

This directory contains all React UI components for the AI Dungeon Master application, including campaign management, character creation, gameplay interface, layout, and reusable UI primitives.

## Purpose

To provide a modular, reusable, and well-documented set of UI components that compose the user interface of the app.

## Structure and Important Files

- **`campaign-creation/`**  
  Multi-step wizard and related components for creating new campaigns.

- **`campaign-list/`**  
  Components for listing, displaying, and managing campaigns.

- **`campaign-view/`**  
  Components for viewing campaign details and sections.

- **`character-creation/`**  
  Multi-step wizard and related components for creating characters.

- **`character-list/`**  
  Components for listing and selecting characters.

- **`character-sheet/`**  
  Components for displaying character details and stats.

- **`game/`**  
  Core gameplay interface components, including chat, memory panel, and audio controls.

- **`layout/`**  
  Navigation, breadcrumbs, and layout wrappers.

- **`ui/`**  
  Reusable UI primitives like buttons, dialogs, forms, tooltips, etc.

- **`GameInterface.tsx`**  
  Main container component for the gameplay interface (to be renamed `game-interface.tsx`).

## How Components Interact

- **Container components** (e.g., `GameInterface`) compose multiple presentational components.
- **Presentational components** receive props and render UI.
- Components are **composed hierarchically** to build complex interfaces.
- UI primitives in `ui/` are reused across all feature components.

## Usage Example

Import and use a button component:

```tsx
import { Button } from './ui/button';

<Button onClick={handleClick}>Start Game</Button>
```

## Notes

- Follow the coding standards for file naming, documentation, and modularity.
- See subdirectory README.md files for more details on specific feature areas.
