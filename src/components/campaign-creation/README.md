# Campaign Creation Components

## Purpose

This directory contains all React components and related logic for the multi-step campaign creation wizard. It allows users to define the various aspects of their new D&D campaign.

## Structure and Important Files

- **`campaign-wizard.tsx`**: The main container component that manages the state and flow of the campaign creation process. It likely orchestrates the different steps.
- **`shared/`**: Components used across multiple steps of the wizard.
    - **`ProgressIndicator.tsx`**: UI component to show the user their current progress through the wizard steps.
    - **`StepNavigation.tsx`**: UI component for "Next" and "Previous" buttons to navigate between steps.
- **`steps/`**: Contains individual components for each step in the campaign creation wizard.
    - **`BasicDetails.tsx`** (and its subfolder `basic-details/`): Component for inputting fundamental campaign details like name, description.
    - **`CampaignParameters.tsx`**: Component for setting parameters like difficulty, length, tone.
    - **`GenreSelection.tsx`**: Component for selecting the campaign's genre.
    - *(Other step files would follow a similar pattern)*
- **`wizard/`**: Contains core wizard logic, types, and hooks.
    - **`WizardContent.tsx`**: Renders the content for the current active step.
    - **`WizardHeader.tsx`**: Displays the title or header for the current step.
    - **`constants.ts`**: Defines constants used within the wizard (e.g., step names, IDs).
    - **`types.ts`**: TypeScript types specific to the campaign creation wizard state and props.
    - **`useCampaignSave.ts`**: A React hook to handle the logic of saving the campaign data (likely to Supabase).
    - **`validation.ts`**: Contains validation schemas or functions (e.g., using Zod) for the campaign creation form data.


## How Components Interact

- `campaign-wizard.tsx` is the parent component. It holds the overall state of the campaign being created and which step is currently active.
- It renders the appropriate step component from the `steps/` directory based on the current state.
- `StepNavigation.tsx` components within each step trigger state changes in `campaign-wizard.tsx` to move between steps.
- `ProgressIndicator.tsx` reads the current step from `campaign-wizard.tsx` to display progress.
- Data entered in each step is collected and managed by `campaign-wizard.tsx`, possibly using React Context or a state management library.
- `useCampaignSave.ts` is used by `campaign-wizard.tsx` (likely on the final step) to persist the created campaign data.
- `validation.ts` is used by individual steps or the wizard to validate user input.

## Usage Example

The `campaign-wizard.tsx` component would typically be routed to a specific page like `/create-campaign`.

```typescript
// Example conceptual usage within a page component:
// src/pages/CreateCampaignPage.tsx

import { CampaignWizard } from '@/components/campaign-creation/campaign-wizard';

const CreateCampaignPage = () => {
  return (
    <div>
      <h1>Create Your New Adventure</h1>
      <CampaignWizard />
    </div>
  );
};

export default CreateCampaignPage;
```

## Notes

- This module aims to provide a guided, user-friendly experience for setting up new campaigns.
- Pay attention to the state management and validation logic to ensure data integrity.
- See the main `/src/components/README.md` for how this fits into the overall component structure.
