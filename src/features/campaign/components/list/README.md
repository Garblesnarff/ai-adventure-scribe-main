# Campaign List Components

## Purpose

This directory contains React components responsible for displaying a list of available D&D campaigns. It allows users to view existing campaigns and potentially select one to view its details or start a game session.

## Structure and Important Files

- **`campaign-list.tsx`**: The main component that fetches and renders the list of campaigns. It likely uses `campaign-card.tsx` for each item in the list.
- **`campaign-card.tsx`**: A component that displays summary information for a single campaign in a card format (e.g., name, description, image). This component is typically clickable to navigate to the campaign's details or game interface.
- **`campaign-skeleton.tsx`**: A skeleton/loading state component displayed while campaign data is being fetched. This improves user experience by providing a visual placeholder.
- **`empty-state.tsx`**: A component displayed if there are no campaigns to show, prompting the user to create a new campaign.

## How Components Interact

- A page component (e.g., a "Campaigns Dashboard") would render `campaign-list.tsx`.
- `campaign-list.tsx` fetches campaign data (e.g., from Supabase via a hook or context).
    - While loading, it displays `campaign-skeleton.tsx`.
    - If no campaigns are found, it displays `empty-state.tsx`.
    - Once data is available, it maps over the campaign data and renders a `campaign-card.tsx` for each campaign.
- Each `campaign-card.tsx` might have internal state for hover effects and handles navigation when clicked.

## Usage Example

```typescript
// Example conceptual usage within a page component:
// src/pages/CampaignDashboardPage.tsx

import { CampaignList } from '@/components/campaign-list/campaign-list';

const CampaignDashboardPage = () => {
  return (
    <div>
      <h2>Your Campaigns</h2>
      <CampaignList />
      {/* Button to create new campaign might be here or in empty-state */}
    </div>
  );
};

export default CampaignDashboardPage;
```

## Notes

- This module focuses on the presentation of campaign data. Data fetching logic might be encapsulated in custom hooks (e.g., `useCampaigns`) or context providers.
- Ensure responsive design for `campaign-card.tsx` to display well on different screen sizes.
- See the main `/src/components/README.md` for the overall component architecture.
