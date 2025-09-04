import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import CampaignList from '@/components/campaign-list/campaign-list';

/**
 * Index page component serving as the landing page
 * Displays available campaigns and quick actions
 * @returns {JSX.Element} The index page with campaign list
 */
const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="flex justify-between items-center mb-12">
          <div>
            <h1 className="text-4xl font-semibold text-foreground mb-2">Your Worlds</h1>
            <p className="text-muted-foreground">Choose a realm to continue your infinite story</p>
          </div>
          <Button
            onClick={() => navigate('/campaigns/create')}
            className="bg-primary hover:bg-infinite-purple text-primary-foreground px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 flex items-center gap-2 border border-infinite-purple/20"
          >
            <Plus className="w-5 h-5" />
            Create New World
          </Button>
        </div>
        <CampaignList />
      </div>
    </div>
  );
};

export default Index;
