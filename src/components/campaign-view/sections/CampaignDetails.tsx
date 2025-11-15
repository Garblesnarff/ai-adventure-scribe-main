import React from 'react';

import type { Campaign } from '@/types/game';

interface CampaignDetailsProps {
  campaign: Campaign;
}

/**
 * CampaignDetails component displays basic campaign information
 */
export const CampaignDetails: React.FC<CampaignDetailsProps> = ({ campaign }) => {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Campaign Details</h2>
      <div className="space-y-2">
        {campaign.description && <p className="text-gray-600">{campaign.description}</p>}
        {campaign.genre && (
          <p>
            <span className="font-medium">Genre:</span> {campaign.genre}
          </p>
        )}
        {campaign.difficulty_level && (
          <p>
            <span className="font-medium">Difficulty:</span> {campaign.difficulty_level}
          </p>
        )}
      </div>
    </div>
  );
};
