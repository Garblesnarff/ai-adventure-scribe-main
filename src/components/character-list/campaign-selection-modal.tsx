import { useQuery } from '@tanstack/react-query';
import React from 'react';
import { useNavigate } from 'react-router-dom';

import CampaignCard from './campaign-card';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import logger from '@/lib/logger';

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
      // Only select minimal fields needed for campaign selection
      // Excludes heavy JSONB fields (setting_details, thematic_elements, style_config, rules_config)
      const { data, error } = await supabase
        .from('campaigns')
        .select(
          `
          id, name, description, genre,
          difficulty_level, campaign_length, tone,
          status, background_image, art_style,
          created_at, updated_at
        `,
        )
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
      logger.info('Starting session with character:', characterId);

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
        title: 'Session Started',
        description: 'Your game session has begun!',
      });

      // Navigate to campaign hub with character and session IDs
      navigate(`/app/campaigns/${campaignId}?session=${session.id}&character=${characterId}`);
    } catch (error) {
      logger.error('Error starting session:', error);
      toast({
        title: 'Error',
        description: 'Failed to start game session',
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg w-full max-h-[80vh] p-6 rounded-lg shadow-lg bg-white overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Choose a Campaign</DialogTitle>
        </DialogHeader>
        <div className="py-2">
          {isLoading ? (
            <p>Loading campaigns...</p>
          ) : campaigns?.length ? (
            <div className="flex flex-col gap-3 max-h-[60vh] overflow-y-auto">
              {campaigns.map((campaign) => (
                <CampaignCard key={campaign.id} campaign={campaign} onSelect={handleStartSession} />
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground">No available campaigns found</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CampaignSelectionModal;
