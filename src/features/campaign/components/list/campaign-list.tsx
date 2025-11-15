/**
 * Campaign List Component
 *
 * Fetches and displays all campaigns for the current user.
 * Handles loading, error, and empty states.
 *
 * Dependencies:
 * - React Query (tanstack)
 * - Supabase client (src/integrations/supabase/client.ts)
 * - Toast hook (src/components/ui/use-toast.ts)
 * - CampaignCard (src/components/campaign-list/campaign-card.tsx)
 * - CampaignSkeleton (src/components/campaign-list/campaign-skeleton.tsx)
 * - EmptyState (src/components/campaign-list/empty-state.tsx)
 *
 * @author AI Dungeon Master Team
 */

// ============================
// SDK/library imports
// ============================
import { useQuery } from '@tanstack/react-query';
import React, { useMemo } from 'react';

// ============================
// External integrations
// ============================

// ============================
// Project hooks
// ============================

// ============================
// Feature components
// ============================
import { MemoizedCampaignCard } from './campaign-card';
import CampaignSkeleton from './campaign-skeleton';
import EmptyState from './empty-state';

import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import logger from '@/lib/logger';

/**
 * Props for CampaignList component
 * @param searchTerm - Search term to filter campaigns
 * @param sortBy - Field to sort campaigns by
 */
interface CampaignListProps {
  searchTerm?: string;
  sortBy?: 'name' | 'created_at';
}

/**
 * Campaign List Component
 *
 * Fetches and displays all campaigns for the current user.
 * Handles loading, error, and empty states.
 *
 * @returns {JSX.Element} List of campaign cards or appropriate feedback state
 */
const CampaignList = ({ searchTerm = '', sortBy = 'created_at' }: CampaignListProps) => {
  const { toast } = useToast();

  // map known campaign names to public cover images
  const getCoverFor = useMemo(
    () => (name: string | null) => {
      if (!name) return undefined;
      const n = name.toLowerCase();
      if (n.includes('kleetus') || n.includes('carnival')) return '/carnival.jpeg';
      if (n.includes('erebo') || n.includes('new erebo')) return '/erebo.jpeg';
      if (n.includes('tenebrous')) return '/tenebrous.jpeg';
      return undefined;
    },
    [],
  );

  // Fetch campaigns from Supabase with proper error handling and filtering/sorting
  const {
    data: campaigns,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['campaigns', searchTerm, sortBy],
    queryFn: async () => {
      try {
        // Only select minimal fields needed for campaign list view
        // Excludes heavy JSONB fields (setting_details, thematic_elements, style_config, rules_config)
        let query = supabase
          .from('campaigns')
          .select(
            `
            id, name, description, genre,
            difficulty_level, campaign_length, tone,
            status, background_image, art_style,
            created_at, updated_at
          `,
          )
          .order(sortBy, { ascending: false });

        // Apply search filter
        if (searchTerm) {
          query = query.or(`name.ilike.%${searchTerm}%,genre.ilike.%${searchTerm}%`);
        }

        const { data, error: supabaseError } = await query;

        if (supabaseError) {
          throw new Error(supabaseError.message);
        }

        return data;
      } catch (err) {
        logger.error('Error fetching campaigns:', err);
        toast({
          title: 'Error loading campaigns',
          description: 'There was a problem loading your campaigns. Please try again.',
          variant: 'destructive',
        });
        throw err;
      }
    },
  });

  // Show loading state with skeletons
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(3)].map((_, i) => (
          <CampaignSkeleton key={i} />
        ))}
      </div>
    );
  }

  // Show error state with retry option
  if (error) {
    return (
      <div className="text-center space-y-4">
        <p className="text-destructive">Error loading campaigns</p>
        <button
          onClick={() => window.location.reload()}
          className="text-sm text-muted-foreground hover:text-primary underline"
        >
          Click here to try again
        </button>
      </div>
    );
  }

  // Show empty state if no campaigns
  if (!campaigns?.length) {
    return <EmptyState />;
  }

  // Render campaign grid

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {campaigns.map((campaign, i) => {
        // prefer explicit mapping; fall back to default test image for the first card
        const mapped = getCoverFor(campaign.name);
        const cover = mapped ?? (i === 0 ? '/card-background.jpeg' : undefined);
        return (
          <MemoizedCampaignCard
            key={campaign.id}
            campaign={campaign}
            isFeatured={Boolean(cover)}
            coverImage={cover}
          />
        );
      })}
    </div>
  );
};

export default CampaignList;
