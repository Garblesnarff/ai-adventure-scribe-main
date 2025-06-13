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
import { CampaignProvider } from '@/contexts/campaign-context';
import WizardContent from './wizard/WizardContent';

/**
 * Campaign Wizard Component
 * 
 * Multi-step wizard for creating a new campaign.
 * Provides campaign context to all wizard steps.
 * 
 * @returns {JSX.Element} The complete campaign creation wizard UI
 */
const CampaignWizard: React.FC = () => {
  return (
    <CampaignProvider>
      <WizardContent />
    </CampaignProvider>
  );
};

export default CampaignWizard;
