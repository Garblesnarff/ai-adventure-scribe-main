/**
 * CampaignCard Component
 *
 * Displays a campaign as a clickable card with name and description.
 * Text wraps naturally and the card is visually distinct.
 *
 * Dependencies:
 * - Card UI component (src/components/ui/card.tsx)
 * - Campaign type (src/types/campaign.ts)
 *
 * @author AI Dungeon Master Team
 */

import React from 'react';

import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

/**
 * Props for CampaignCard
 * @param campaign - The campaign object to display
 * @param onSelect - Callback when the card is clicked
 * @param className - Optional additional class names
 */
interface CampaignCardProps {
  campaign: {
    id: string;
    name: string;
    description?: string;
  };
  onSelect: (campaignId: string) => void;
  className?: string;
}

/**
 * Renders a campaign as a clickable card.
 * @param {CampaignCardProps} props
 * @returns {JSX.Element}
 */
const CampaignCard: React.FC<CampaignCardProps> = ({ campaign, onSelect, className }) => (
  <Card
    className={cn(
      'w-full p-4 mb-3 cursor-pointer hover:shadow-lg transition whitespace-normal',
      className,
    )}
    tabIndex={0}
    role="button"
    aria-label={`Select campaign ${campaign.name}`}
    onClick={() => onSelect(campaign.id)}
    onKeyDown={(e) => {
      if (e.key === 'Enter' || e.key === ' ') onSelect(campaign.id);
    }}
  >
    <h3 className="font-semibold text-lg mb-1 break-words">{campaign.name}</h3>
    {campaign.description && (
      <p className="text-sm text-muted-foreground whitespace-pre-line break-words">
        {campaign.description}
      </p>
    )}
  </Card>
);

export default CampaignCard;
