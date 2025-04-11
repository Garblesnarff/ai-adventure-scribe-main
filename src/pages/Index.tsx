import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import CampaignList from '@/components/campaign-list/CampaignList';

/**
 * Index page component serving as the landing page
 * Displays available campaigns and quick actions
 * @returns {JSX.Element} The index page with campaign list
 */
const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Your Campaigns</h1>
        <Button 
          onClick={() => navigate('/campaigns/create')}
          className="flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          New Campaign
        </Button>
      </div>
      <CampaignList />
    </div>
  );
};

export default Index;