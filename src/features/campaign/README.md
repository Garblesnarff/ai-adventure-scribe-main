# Campaign Feature

## Purpose
Campaign feature module providing all UI components, hooks, and types for campaign creation, management, and viewing. This is the main feature for organizing and running D&D campaigns.

## Key Files
- `index.ts` - Main exports for the campaign feature

## Directory Structure
- `components/` - React components for campaign UI
  - `creation/` - Campaign creation wizard and forms
  - `list/` - Campaign listing and selection
  - `view/` - Campaign detail view and session management
  - `gallery/` - Campaign image gallery
- `hooks/` - Custom React hooks for campaign operations
- `types/` - TypeScript type definitions for campaigns

## How It Works
The campaign feature follows a modular architecture organized by functionality:

**Campaign Creation**: A multi-step wizard guides users through creating a new campaign, including basic details, world-building, player management, and AI-generated content (images, descriptions). The wizard uses a state machine pattern to manage the creation flow.

**Campaign Management**: Campaign lists provide filtering, sorting, and quick actions. Each campaign card displays key information like player count, session history, and campaign images. Users can archive, delete, or duplicate campaigns.

**Campaign View**: The detail view provides access to campaign information, session history, character rosters, and world notes. It integrates with the game session feature to launch active sessions.

## Usage Examples
```typescript
// Using campaign creation wizard
import { CampaignCreationWizard } from '@/features/campaign/components/creation';

<CampaignCreationWizard
  onComplete={(campaign) => navigateToCampaign(campaign.id)}
  onCancel={() => navigateBack()}
/>

// Listing campaigns
import { CampaignList } from '@/features/campaign/components/list';

<CampaignList
  userId={currentUser.id}
  onSelectCampaign={(id) => navigate(`/campaigns/${id}`)}
/>

// Using campaign hooks
import { useCampaign } from '@/features/campaign/hooks';

const { campaign, loading, error } = useCampaign(campaignId);
```

## Dependencies
- **React Query** - Data fetching and caching
- **Supabase Client** - Database operations
- **AI Services** - Campaign image and description generation
- **Form Libraries** - Wizard form management

## Related Documentation
- [Campaign Components](./components/README.md)
- [Character Feature](../character/README.md)
- [Game Session Feature](../game-session/README.md)
- [Campaign Services](../../services/README.md)

## Maintenance Notes
- Campaign creation wizard state is persisted to prevent data loss
- Image generation can be slow; UI provides loading states
- Campaign archival is soft-delete for data recovery
- Campaign templates use special handling for public campaigns
