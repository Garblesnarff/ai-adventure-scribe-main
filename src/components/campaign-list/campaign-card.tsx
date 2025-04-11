import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight, Trash2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';

interface CampaignCardProps {
  campaign: {
    id: string;
    name: string;
    description: string | null;
    genre: string | null;
    difficulty_level: string | null;
    campaign_length: string | null;
    tone: string | null;
  };
}

/**
 * CampaignCard component
 * Displays individual campaign information in a card format
 * @param campaign - Campaign data to display
 */
const CampaignCard = ({ campaign }: CampaignCardProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  /**
   * Handles campaign deletion
   * Removes campaign from database and updates UI
   */
  const handleDelete = async () => {
    try {
      const { error } = await supabase
        .from('campaigns')
        .delete()
        .eq('id', campaign.id);

      if (error) throw error;

      toast({
        title: "Campaign Deleted",
        description: "The campaign has been successfully removed.",
      });

      // Invalidate campaigns query to refresh the list
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
    } catch (error) {
      console.error('Error deleting campaign:', error);
      toast({
        title: "Error",
        description: "Failed to delete campaign. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="p-6 hover:shadow-lg transition-shadow">
      <div 
        className="cursor-pointer"
        onClick={() => navigate(`/campaign/${campaign.id}`)}
      >
        <h3 className="text-xl font-semibold mb-2">{campaign.name}</h3>
        {campaign.description && (
          <p className="text-muted-foreground mb-4 line-clamp-2">
            {campaign.description}
          </p>
        )}
        <div className="space-y-2">
          {campaign.genre && (
            <p className="text-sm"><span className="font-medium">Genre:</span> {campaign.genre}</p>
          )}
          {campaign.difficulty_level && (
            <p className="text-sm"><span className="font-medium">Difficulty:</span> {campaign.difficulty_level}</p>
          )}
          {campaign.campaign_length && (
            <p className="text-sm"><span className="font-medium">Length:</span> {campaign.campaign_length}</p>
          )}
          {campaign.tone && (
            <p className="text-sm"><span className="font-medium">Tone:</span> {campaign.tone}</p>
          )}
        </div>
      </div>
      <div className="flex justify-between mt-6">
        <Button
          variant="destructive"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            handleDelete();
          }}
        >
          <Trash2 className="w-4 h-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate(`/campaign/${campaign.id}`)}
        >
          View Campaign <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </Card>
  );
};

export default CampaignCard;