/**
 * CampaignListSkeleton Component
 *
 * Loading skeleton for campaign list display.
 * Shows placeholder campaign cards while data is being fetched.
 *
 * Note: This wraps the existing CampaignSkeleton component
 * to provide a consistent grid layout.
 */

import React from 'react';

import CampaignSkeleton from '@/components/campaign-list/campaign-skeleton';

/**
 * CampaignListSkeleton - Skeleton loader for campaign grid
 *
 * Displays animated placeholders matching the campaign card layout.
 * Shows 3 skeleton cards in a responsive grid.
 */
export const CampaignListSkeleton: React.FC = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {[...Array(3)].map((_, i) => (
        <CampaignSkeleton key={i} />
      ))}
    </div>
  );
};
