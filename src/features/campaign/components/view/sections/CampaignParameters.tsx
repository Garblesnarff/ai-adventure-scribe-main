import React from 'react';

import type { Campaign } from '@/types/game';

interface CampaignParametersProps {
  campaign: Campaign;
}

/**
 * CampaignParameters component displays campaign settings and parameters
 */
export const CampaignParameters: React.FC<CampaignParametersProps> = ({ campaign }) => {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Campaign Parameters</h2>
      <div className="space-y-2">
        {campaign.campaign_length && (
          <p>
            <span className="font-medium">Length:</span> {campaign.campaign_length}
          </p>
        )}
        {campaign.tone && (
          <p>
            <span className="font-medium">Tone:</span> {campaign.tone}
          </p>
        )}
      </div>
    </div>
  );
};
