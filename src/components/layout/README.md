# Layout Components

## Purpose

This directory contains React components that define the overall structure and navigation of the application. These components are typically used to wrap page content and provide consistent layout elements like sidebars, headers, footers, and navigation menus.

## Structure and Important Files

- **`navigation.tsx`**: This component likely renders the main navigation for the application. This could be a top navigation bar, a sidebar menu, or a combination of both. It would include links to different sections of the app like "Campaigns", "Characters", "Create Campaign", etc.
- **`breadcrumbs.tsx`**: This component is responsible for displaying breadcrumb navigation, helping users understand their current location within the application's hierarchy and allowing easy navigation back to parent pages.

*(Other common layout components might include `Header.tsx`, `Footer.tsx`, `Sidebar.tsx`, `MainContentWrapper.tsx` if the application grows more complex).*

## How Components Interact

- Layout components are typically used in the main application component (e.g., `App.tsx` or a main router layout) to structure the views.
- `navigation.tsx` would contain `Link` components (from `react-router-dom` or a similar library) to navigate between different routes/pages.
- `breadcrumbs.tsx` would likely use routing information (e.g., from `useLocation` or `useMatches` in `react-router-dom`) to dynamically generate the breadcrumb trail.
- Page-specific content is usually rendered as children of these layout components, ensuring a consistent look and feel across the application.

## Usage Example

```typescript
// Example conceptual usage within App.tsx or a main layout component:

import { Outlet } from 'react-router-dom'; // Assuming React Router
import { Navigation } from '@/components/layout/navigation';
import { Breadcrumbs } from '@/components/layout/breadcrumbs';

const AppLayout = () => {
  return (
    <div className="app-container">
      <header>
        <Navigation />
      </header>
      <main>
        <Breadcrumbs />
        <Outlet /> {/* This is where routed page content will be rendered */}
      </main>
      <footer>
        {/* Footer content */}
      </footer>
    </div>
  );
};

export default AppLayout;
```

## Notes

- Consistent layout is key to a good user experience.
- These components should be highly reusable and configurable if needed.
- Consider responsiveness to ensure the layout adapts well to different screen sizes.
- See the main `/src/components/README.md` for the overall component architecture.
