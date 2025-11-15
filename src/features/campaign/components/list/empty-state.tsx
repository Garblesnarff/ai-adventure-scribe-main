import { Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { Button } from '@/components/ui/button';

/**
 * EmptyState component
 * Displayed when no campaigns are available
 * Provides quick action to create a new campaign
 */
const EmptyState = () => {
  const navigate = useNavigate();

  return (
    <div className="text-center py-12 parchment-panel rounded-lg p-8">
      <h3 className="text-2xl font-semibold mb-2 gradient-text">No Campaigns Found</h3>
      <p className="text-muted-foreground mb-6">
        You haven't created any campaigns yet. Your tales await.
      </p>
      <div className="flex items-center justify-center">
        <Button
          onClick={() => navigate('/app/campaigns/create')}
          className="flex items-center gap-2 bg-infinite-gold text-infinite-dark"
        >
          <Plus className="w-4 h-4" />
          Create Campaign
        </Button>
      </div>
    </div>
  );
};

export default EmptyState;
