import React from 'react';

import CampaignHub from './CampaignHub';

import { ErrorBoundary, CampaignErrorFallback } from '@/components/error';

/**
 * CampaignHubWithErrorBoundary Component
 *
 * Wraps the CampaignHub component with an ErrorBoundary to gracefully handle
 * campaign-related errors and provide user-friendly recovery options.
 *
 * Features:
 * - Feature-level error boundary for campaign hub
 * - Custom campaign-specific error fallback UI
 * - Multiple recovery options for users
 * - Prevents campaign errors from crashing the entire app
 *
 * @returns {JSX.Element} CampaignHub wrapped in ErrorBoundary
 */
const CampaignHubWithErrorBoundary: React.FC = () => {
  const [resetKey, setResetKey] = React.useState(0);

  const handleReset = () => {
    setResetKey((prev) => prev + 1);
  };

  return (
    <ErrorBoundary
      level="feature"
      fallback={<CampaignErrorFallback reset={handleReset} showReturnToCampaigns={true} />}
    >
      <CampaignHub key={resetKey} />
    </ErrorBoundary>
  );
};

export default CampaignHubWithErrorBoundary;
