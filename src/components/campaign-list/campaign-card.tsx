import React, { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight, Trash2, Play } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import CharacterSelectionModal from './character-selection-modal';

interface CampaignCardProps {
  campaign: {
    id: string;
    name: string;
    description: string | null;
    genre: string | null;
    difficulty_level: string | null;
    campaign_length: string | null;
    tone: string | null;
    background_image?: string | null;
  };
  isFeatured?: boolean;
  coverImage?: string;
}

/**
 * CampaignCard component
 * Displays individual campaign information in a card format
 * @param campaign - Campaign data to display
 */
const CampaignCardComponent = ({ campaign, isFeatured = false, coverImage }: CampaignCardProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showCharacterModal, setShowCharacterModal] = useState(false);

  /**
   * Handles campaign deletion confirmation
   * Shows delete dialog when user clicks delete button
   */
  const handleDeleteClick = () => {
    setShowDeleteDialog(true);
  };

  /**
   * Handles actual campaign deletion
   * Removes campaign from database and updates UI
   */
  const handleDelete = useCallback(async () => {
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

      setShowDeleteDialog(false);
      
      // Invalidate campaigns query to refresh the list
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
    } catch (error) {
      console.error('Error deleting campaign:', error);
      toast({
        title: "Error",
        description: "Failed to delete campaign. Please try again.",
        variant: "destructive",
      });
      setShowDeleteDialog(false);
    }
  }, [campaign.id, toast, queryClient]);

  // Use campaign's generated background image, fallback to coverImage, then default
  const resolvedImage = useMemo(() => 
    campaign.background_image || 
    (coverImage ? new URL(coverImage, import.meta.url).href : null) ||
    new URL('/card-background.jpeg', import.meta.url).href, 
  [campaign.background_image, coverImage]);

  return (
    <Card
      className="campaign-card featured-card group relative overflow-hidden border border-border/30 shadow-md transition-all duration-300 hover:shadow-xl hover:border-infinite-purple/50 aspect-square"
      style={{ padding: 0 }}
    >
      {/* Hero / thumbnail area */}
      <div
        className="campaign-hero featured flex items-end p-4 cursor-pointer aspect-square bg-cover bg-center bg-no-repeat filter sepia-[0.1]"
        onClick={() => navigate(`/campaign/${campaign.id}`)}
        style={resolvedImage ? { backgroundImage: `url(${resolvedImage})` } : undefined}
      >
        {/* Overlay and popup for all cards */}
        {isFeatured && (
          <div className="absolute top-2 right-2 z-10">
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-infinite-gold text-infinite-dark">
              Featured
            </span>
          </div>
        )}
        <div className="featured-overlay bg-gradient-to-b from-infinite-purple/80 via-transparent to-infinite-dark/90" />
        <div className="hover-popup opacity-0 transform translate-y-2 transition-all duration-200 pointer-events-none">
          <div className="bg-white/95 p-4 rounded-lg shadow-md border border-border">
            <div className="text-xl font-bold text-infinite-dark mb-2 leading-tight break-words">{campaign.name}</div>
            {campaign.description && <div className="text-base text-muted-foreground line-clamp-3 leading-relaxed mb-3 break-words hyphens-auto">{campaign.description}</div>}
            
            {/* Campaign badges in popup */}
            <div className="campaign-badges flex gap-1 flex-wrap text-xs mt-2 mb-4">
              {campaign.genre && <span className="inline-flex items-center px-2 py-1 rounded-full bg-infinite-purple/10 text-infinite-purple border border-infinite-purple/20 font-medium">{campaign.genre}</span>}
              {campaign.difficulty_level && <span className="inline-flex items-center px-2 py-1 rounded-full bg-destructive/10 text-destructive border border-destructive/20 font-medium">{campaign.difficulty_level}</span>}
              {campaign.campaign_length && <span className="inline-flex items-center px-2 py-1 rounded-full bg-secondary/10 text-secondary-foreground border border-secondary/20 font-medium">{campaign.campaign_length}</span>}
              {campaign.tone && <span className="inline-flex items-center px-2 py-1 rounded-full bg-accent/10 text-accent-foreground border border-accent/20 font-medium">{campaign.tone}</span>}
            </div>

            <div className="flex items-center gap-2">
              <Button size="sm" className="bg-infinite-gold text-infinite-dark flex items-center gap-2 hover:bg-infinite-purple" onClick={(e) => { e.stopPropagation(); setShowCharacterModal(true); }}>
                <Play className="w-4 h-4" />
                Play
              </Button>
              <Button size="sm" variant="outline" className="border-infinite-teal text-infinite-teal hover:bg-infinite-teal hover:text-infinite-dark" onClick={(e) => { e.stopPropagation(); navigate(`/campaign/${campaign.id}`); }}>
                Enter
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 hover:border-infinite-dark/20"
                onClick={(e) => { e.stopPropagation(); handleDeleteClick(); }}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Campaign</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{campaign.name}"? This will permanently remove the campaign and all associated game sessions. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete Campaign
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <CharacterSelectionModal
        isOpen={showCharacterModal}
        onClose={() => setShowCharacterModal(false)}
        campaignId={campaign.id}
        campaignName={campaign.name}
      />
    </Card>
  );
};

const MemoizedCampaignCard = React.memo(CampaignCardComponent);

export { MemoizedCampaignCard };
export default CampaignCardComponent;
