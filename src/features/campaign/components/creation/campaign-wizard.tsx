/**
 * Campaign Wizard Component
 *
 * Multi-step wizard for creating a new campaign.
 * Provides campaign context to all wizard steps.
 *
 * Dependencies:
 * - React
 * - CampaignProvider (src/contexts/CampaignContext.tsx)
 * - WizardContent (src/components/campaign-creation/wizard/WizardContent.tsx)
 * - ErrorBoundary (src/components/error/ErrorBoundary.tsx)
 *
 * @author AI Dungeon Master Team
 */

// ============================
// SDK/library imports
// ============================
import React from 'react';

// ============================
// Project modules
// ============================
import WizardContent from './wizard/WizardContent';

import { CampaignErrorFallback } from '@/components/error/CampaignErrorFallback';
import { CampaignProvider } from '@/contexts/CampaignContext';
import { ErrorBoundary } from '@/shared/components/error/ErrorBoundary';

/**
 * Campaign Wizard Component
 *
 * Multi-step wizard for creating a new campaign.
 * Provides campaign context to all wizard steps.
 * Wrapped with ErrorBoundary for graceful error handling.
 *
 * @returns {JSX.Element} The complete campaign creation wizard UI
 */
const CampaignWizard: React.FC = () => {
  const [resetKey, setResetKey] = React.useState(0);

  const handleReset = () => {
    setResetKey((prev) => prev + 1);
  };

  return (
    <ErrorBoundary
      level="feature"
      fallback={<CampaignErrorFallback reset={handleReset} showReturnToCampaigns={true} />}
    >
      <CampaignProvider key={resetKey}>
        <WizardContent />
      </CampaignProvider>
    </ErrorBoundary>
  );
};

export default CampaignWizard;
