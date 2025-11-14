import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';

import { CampaignCollapsible } from './sections/CampaignCollapsible';
import { CampaignHeader } from './sections/CampaignHeader';
import { GameSession } from './sections/GameSession';

import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import logger from '@/lib/logger';
import { isValidUUID } from '@/utils/validation';

/**
 * CampaignView component displays campaign details and handles game sessions
 */
const CampaignView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [campaign, setCampaign] = React.useState<import('@/types/game').Campaign | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = React.useState(true);
  const { toast } = useToast();

  /**
   * Validates campaign ID and redirects if invalid
   */
  React.useEffect(() => {
    if (!id || !isValidUUID(id)) {
      toast({
        title: 'Invalid Campaign',
        description: 'The campaign ID is invalid. Redirecting to home page.',
        variant: 'destructive',
      });
      navigate('/');
      return;
    }
  }, [id, navigate, toast]);

  /**
   * Fetches campaign data from Supabase
   */
  React.useEffect(() => {
    const fetchCampaign = async () => {
      try {
        if (!id || !isValidUUID(id)) return;

        const { data, error } = await supabase
          .from('campaigns')
          .select('*')
          .eq('id', id)
          .maybeSingle();

        if (error) throw error;

        if (!data) {
          toast({
            title: 'Campaign Not Found',
            description: 'The requested campaign could not be found. Redirecting to home page.',
            variant: 'destructive',
          });
          navigate('/');
          return;
        }

        setCampaign(data);
      } catch (error) {
        logger.error('Error fetching campaign:', error);
        toast({
          title: 'Error',
          description: 'Failed to load campaign data. Please try again.',
          variant: 'destructive',
        });
        navigate('/');
      } finally {
        setLoading(false);
      }
    };

    fetchCampaign();
  }, [id, toast, navigate]);

  /**
   * Handles campaign deletion
   */
  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      if (!id) throw new Error('No campaign ID provided');

      const { error } = await supabase.from('campaigns').delete().eq('id', id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Campaign deleted successfully',
      });
      navigate('/');
    } catch (error) {
      logger.error('Error deleting campaign:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete campaign',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="p-6 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
          <div className="flex justify-center items-center min-h-[200px]">
            Loading campaign data...
          </div>
        </Card>
      </div>
    );
  }

  if (!campaign) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Card className="p-6 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
        <CampaignHeader campaign={campaign} isDeleting={isDeleting} onDelete={handleDelete} />

        <CampaignCollapsible
          campaign={campaign}
          isOpen={isDetailsOpen}
          onOpenChange={setIsDetailsOpen}
        />

        <GameSession campaignId={campaign.id} />
      </Card>
    </div>
  );
};

export default CampaignView;
