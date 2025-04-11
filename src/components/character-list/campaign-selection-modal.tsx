import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface CampaignSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  characterId: string;
}

/**
 * Modal component for selecting a campaign to play with a character
 * @param isOpen - Controls modal visibility
 * @param onClose - Callback to close modal
 * @param characterId - ID of the selected character
 */
const CampaignSelectionModal: React.FC<CampaignSelectionModalProps> = ({
  isOpen,
  onClose,
  characterId,
}) => {
  const navigate = useNavigate();
  const { toast } = useToast();

  // Fetch available campaigns
  const { data: campaigns, isLoading } = useQuery({
    queryKey: ['available-campaigns', characterId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .eq('status', 'active');

      if (error) throw error;
      return data;
    },
  });

  /**
   * Handles starting a new game session
   * Creates session and navigates to campaign view
   */
  const handleStartSession = async (campaignId: string) => {
    try {
      console.log('Starting session with character:', characterId);
      
      // Create new game session
      const { data: session, error } = await supabase
        .from('game_sessions')
        .insert({
          campaign_id: campaignId,
          character_id: characterId,
          status: 'active',
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Session Started",
        description: "Your game session has begun!",
      });

      // Navigate to campaign view with both session and character IDs
      navigate(`/campaign/${campaignId}?session=${session.id}&character=${characterId}`);
    } catch (error) {
      console.error('Error starting session:', error);
      toast({
        title: "Error",
        description: "Failed to start game session",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Choose a Campaign</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {isLoading ? (
            <p>Loading campaigns...</p>
          ) : campaigns?.length ? (
            campaigns.map((campaign) => (
              <Button
                key={campaign.id}
                onClick={() => handleStartSession(campaign.id)}
                className="justify-start h-auto py-4"
                variant="outline"
              >
                <div className="text-left">
                  <h3 className="font-semibold">{campaign.name}</h3>
                  {campaign.description && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {campaign.description}
                    </p>
                  )}
                </div>
              </Button>
            ))
          ) : (
            <p className="text-center text-muted-foreground">
              No available campaigns found
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CampaignSelectionModal;