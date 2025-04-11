import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

/**
 * EmptyState component
 * Displayed when no campaigns are available
 * Provides quick action to create a new campaign
 */
const EmptyState = () => {
  const navigate = useNavigate();

  return (
    <div className="text-center py-12">
      <h3 className="text-xl font-semibold mb-4">No Campaigns Yet</h3>
      <p className="text-muted-foreground mb-8">
        Create your first campaign to begin your adventure!
      </p>
      <Button
        onClick={() => navigate('/campaigns/create')}
        className="flex items-center gap-2"
      >
        <Plus className="w-4 h-4" />
        Create Campaign
      </Button>
    </div>
  );
};

export default EmptyState;