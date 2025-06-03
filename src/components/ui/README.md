# UI Primitives and Base Components

## Purpose

This directory contains a collection of reusable, low-level UI components, often referred to as UI primitives or base components. These are the fundamental building blocks for creating more complex user interfaces throughout the application. Many of these components are likely sourced or adapted from a UI library like Shadcn/UI, Radix UI, or similar, providing pre-built accessibility and styling.

## Structure and Important Files

This directory contains numerous components. Key categories and examples include:

- **Layout & Structure:**
    - `card.tsx`: For displaying content in card-like containers.
    - `accordion.tsx`, `collapsible.tsx`, `tabs.tsx`: For organizing content in collapsible sections or tabs.
    - `scroll-area.tsx`: For creating scrollable content areas.
    - `separator.tsx`: Visual dividers.
    - `resizable.tsx`: For creating resizable panel layouts.
    - `sheet.tsx`, `drawer.tsx`: Side panels or drawers.
    - `sidebar.tsx`: A dedicated sidebar component.
- **Navigation & Menus:**
    - `breadcrumb.tsx`: For breadcrumb navigation.
    - `dropdown-menu.tsx`, `menubar.tsx`, `navigation-menu.tsx`, `context-menu.tsx`: Various types of menus.
    - `pagination.tsx`: For paginating lists of items.
- **Forms & Input:**
    - `button.tsx`: Standard button component.
    - `input.tsx`, `textarea.tsx`: Text input fields.
    - `checkbox.tsx`, `radio-group.tsx`, `switch.tsx`, `toggle.tsx`, `toggle-group.tsx`: Selection controls.
    - `select.tsx`: Dropdown select component.
    - `form.tsx`: Higher-level component or utilities for form handling (likely with `react-hook-form`).
    - `label.tsx`: For associating labels with form inputs.
    - `input-otp.tsx`: For one-time password style input.
- **Feedback & Display:**
    - `alert.tsx`, `alert-dialog.tsx`: For displaying messages and alerts.
    - `dialog.tsx`, `popover.tsx`, `hover-card.tsx`, `tooltip.tsx`: For modals, popups, and tooltips.
    - `toast.tsx`, `toaster.tsx`, `sonner.tsx`: For displaying toast notifications. (`use-toast.ts` is a hook for triggering toasts).
    - `badge.tsx`: For small status indicators or tags.
    - `avatar.tsx`: For displaying user avatars.
    - `progress.tsx`: For displaying progress bars.
    - `skeleton.tsx`: For loading state placeholders.
    - `table.tsx`: For displaying tabular data.
    - `calendar.tsx`: For date picking.
    - `chart.tsx`: For displaying charts (likely a wrapper around a charting library).
    - `aspect-ratio.tsx`: For maintaining aspect ratios of media.

## How Components Interact

- These UI components are designed to be highly reusable and composable.
- They are imported and used by more complex feature components in other directories (e.g., `src/components/campaign-creation/`, `src/components/game/`).
- Many components are self-contained, managing their own state (e.g., a dropdown menu's open/closed state) but receive data and callbacks via props.
- `form.tsx` likely integrates with `react-hook-form` and other input components to provide robust form handling.
- `toaster.tsx` (or `sonner.tsx`) is typically placed at a high level in the application tree to display toasts triggered by `use-toast.ts`.

## Usage Example

```typescript
// Using a Button and an Input component:
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import React, { useState } from 'react';

const MyFormComponent = () => {
  const [value, setValue] = useState('');

  return (
    <div className="space-y-2">
      <Label htmlFor="my-input">My Input</Label>
      <Input 
        id="my-input" 
        value={value} 
        onChange={(e) => setValue(e.target.value)} 
        placeholder="Enter text..." 
      />
      <Button onClick={() => console.log('Clicked with value:', value)}>
        Submit
      </Button>
    </div>
  );
};
```

## Notes

- These components form the visual foundation of the application.
- Consistency in their usage helps maintain a coherent user experience.
- Many components are likely styled using Tailwind CSS and follow accessibility best practices.
- Refer to the documentation of the underlying UI library (e.g., Shadcn/UI) for detailed props and usage of each component.
- See the main `/src/components/README.md` for the overall component architecture.
