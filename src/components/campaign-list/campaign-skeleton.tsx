import React from 'react';

import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * Skeleton loader component for campaign cards
 * Displays a loading placeholder while campaign data is being fetched
 * @returns {JSX.Element} Skeleton loader for campaign cards
 */
const CampaignSkeleton = () => {
  return (
    <div className="campaign-card h-[220px] animate-scale-in">
      <div className="campaign-hero flex items-center p-4">
        <div className="campaign-thumb mr-4">
          <Skeleton className="h-14 w-14 rounded-lg" />
        </div>
        <div className="flex-1">
          <Skeleton className="h-6 w-3/4 mb-2" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </div>

      <div className="px-6 pt-4">
        <Skeleton className="h-4 w-full mb-2" />
        <Skeleton className="h-4 w-3/4 mb-2" />
        <div className="flex justify-between items-center mt-4">
          <Skeleton className="h-8 w-32 rounded-md" />
          <Skeleton className="h-8 w-8 rounded-lg" />
        </div>
      </div>
    </div>
  );
};

export default CampaignSkeleton;
