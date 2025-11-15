import { ChevronDown } from 'lucide-react';
import React from 'react';

import { CampaignDetails } from './CampaignDetails';
import { CampaignParameters } from './CampaignParameters';

import type { Campaign } from '@/types/game';

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface CampaignCollapsibleProps {
  campaign: Campaign;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * CampaignCollapsible component handles the collapsible section containing campaign details
 */
export const CampaignCollapsible: React.FC<CampaignCollapsibleProps> = ({
  campaign,
  isOpen,
  onOpenChange,
}) => {
  return (
    <Collapsible open={isOpen} onOpenChange={onOpenChange} className="mb-8">
      <CollapsibleTrigger className="flex items-center justify-between w-full p-4 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg transition-all duration-200 border-2 border-primary shadow-lg hover:shadow-xl transform hover:-translate-y-0.5">
        <div className="flex items-center gap-3">
          <ChevronDown
            className={`h-6 w-6 transition-transform duration-200 ${
              isOpen ? 'transform rotate-180' : ''
            }`}
          />
          <span className="font-bold text-lg">Campaign Information</span>
        </div>
        <span className="text-sm opacity-80">
          {isOpen ? 'Click to collapse' : 'Click to expand'}
        </span>
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <CampaignDetails campaign={campaign} />
          <CampaignParameters campaign={campaign} />
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};
