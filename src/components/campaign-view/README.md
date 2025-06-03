# Campaign View Components

## Purpose

This directory houses React components dedicated to displaying the detailed information of a specific D&D campaign. It typically renders when a user selects a campaign from a list to see more about its setting, plot, characters involved (NPCs), and potentially manage or initiate game sessions.

## Structure and Important Files

- **`CampaignView.tsx`**: The main container component for viewing a single campaign's details. It orchestrates the display of various sections of campaign information.
- **`sections/`**: Contains sub-components, each responsible for rendering a specific part of the campaign's details.
    - **`CampaignHeader.tsx`**: Displays the campaign's title, perhaps a banner image, and primary actions (e.g., "Start Game", "Edit Campaign").
    - **`CampaignDetails.tsx`**: Shows core descriptive information about the campaign, such as its genre, overall plot summary, setting description, etc.
    - **`CampaignParameters.tsx`**: Displays parameters like difficulty, expected length, tone, etc.
    - **`CampaignCollapsible.tsx`**: A generic collapsible container that might be used by various sections to show/hide detailed content.
    - **`GameSession.tsx`**: (Potentially) Displays information about past or ongoing game sessions related to this campaign, or provides an interface to start a new one.

## How Components Interact

- A page, often routed with a dynamic campaign ID (e.g., `/campaigns/:campaignId`), would render `CampaignView.tsx`.
- `CampaignView.tsx` fetches the data for the specific campaign ID (likely using a custom hook or context that interacts with Supabase).
- It then passes relevant parts of the campaign data as props to the various sub-components in the `sections/` directory.
- For example, `CampaignHeader.tsx` receives the campaign name, `CampaignDetails.tsx` receives the description and plot, and so on.
- `CampaignCollapsible.tsx` might be used by components like `CampaignDetails.tsx` to make large blocks of text more manageable.

## Usage Example

```typescript
// Example conceptual usage within a dynamic route page:
// src/pages/ViewCampaignPage.tsx
import { useParams } from 'react-router-dom';
import { CampaignView } from '@/components/campaign-view/CampaignView';

const ViewCampaignPage = () => {
  const { campaignId } = useParams<{ campaignId: string }>();

  if (!campaignId) return <p>Campaign not found.</p>;

  return (
    <div>
      {/* CampaignView would fetch data based on campaignId */}
      <CampaignView campaignId={campaignId} />
    </div>
  );
};

export default ViewCampaignPage;
```

## Notes

- This module is primarily for displaying campaign information. Editing capabilities might be separate or integrated carefully.
- Data fetching and state management for the viewed campaign are crucial and likely handled by custom hooks or context that `CampaignView.tsx` utilizes.
- See the main `/src/components/README.md` for the overall component architecture.
