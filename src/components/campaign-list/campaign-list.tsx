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

 // ============================
 // External integrations
 // ============================
import { supabase } from '@/integrations/supabase/client';

 // ============================
 // Project hooks
 // ============================
import { useToast } from '@/components/ui/use-toast';

 // ============================
 // Feature components
 // ============================
import CampaignCard from './campaign-card';
import CampaignSkeleton from './campaign-skeleton';
import EmptyState from './empty-state';

/**
 * Campaign List Component
 * 
 * Fetches and displays all campaigns for the current user.
 * Handles loading, error, and empty states.
 * 
 * @returns {JSX.Element} List of campaign cards or appropriate feedback state
 */
const CampaignList = () => {
  const { toast } = useToast();

  // Fetch campaigns from Supabase with proper error handling
  const { data: campaigns, isLoading, error } = useQuery({
    queryKey: ['campaigns'],
    queryFn: async () => {
      try {
        const { data, error: supabaseError } = await supabase
          .from('campaigns')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (supabaseError) {
          throw new Error(supabaseError.message);
        }
        
        return data;
      } catch (err) {
        console.error('Error fetching campaigns:', err);
        toast({
          title: "Error loading campaigns",
          description: "There was a problem loading your campaigns. Please try again.",
          variant: "destructive",
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
      {campaigns.map((campaign) => (
        <CampaignCard key={campaign.id} campaign={campaign} />
      ))}
    </div>
  );
};

export default CampaignList;
