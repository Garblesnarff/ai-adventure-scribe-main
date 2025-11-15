import { Trash2 } from 'lucide-react';
import React from 'react';

import type { Campaign } from '@/types/game';

import { Button } from '@/components/ui/button';

interface CampaignHeaderProps {
  campaign: Campaign;
  isDeleting: boolean;
  onDelete: () => void;
}

/**
 * CampaignHeader component displays the campaign title and delete button
 */
export const CampaignHeader: React.FC<CampaignHeaderProps> = ({
  campaign,
  isDeleting,
  onDelete,
}) => {
  return (
    <div className="flex justify-between items-start mb-8">
      <h1 className="text-3xl font-bold">{campaign.name}</h1>
      <Button variant="destructive" size="icon" onClick={onDelete} disabled={isDeleting}>
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
};
