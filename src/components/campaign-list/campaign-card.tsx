import React, { useState } from 'react';
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
const CampaignCard = ({ campaign, isFeatured = false, coverImage }: CampaignCardProps) => {
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
  };

  // Use campaign's generated background image, fallback to coverImage, then default
  const resolvedImage = campaign.background_image || 
                       (coverImage ? new URL(coverImage, import.meta.url).href : null) ||
                       new URL('/card-background.jpeg', import.meta.url).href;

  return (
    <Card
      className="campaign-card featured-card group relative overflow-hidden border border-border/30 shadow-md transition-all duration-300 hover:shadow-xl"
      style={{ minHeight: '320px', padding: 0 }}
    >
      {/* Hero / thumbnail area */}
      <div
        className="campaign-hero featured flex items-end p-4 cursor-pointer aspect-square bg-cover bg-center bg-no-repeat"
        onClick={() => navigate(`/campaign/${campaign.id}`)}
        style={resolvedImage ? { backgroundImage: `url(${resolvedImage})` } : undefined}
      >
        {/* Overlay and popup for all cards */}
        <div className="featured-overlay" />
        <div className="hover-popup opacity-0 transform translate-y-2 transition-all duration-200 pointer-events-none">
          <div className="bg-white/95 p-3 rounded-md shadow-md border border-border">
            <div className="text-sm font-semibold text-infinite-dark mb-1">{campaign.name}</div>
            {campaign.description && <div className="text-xs text-muted-foreground line-clamp-3">{campaign.description}</div>}
            
            {/* Campaign badges in popup */}
            <div className="campaign-badges flex gap-1 flex-wrap text-xs mt-2 mb-3">
              {campaign.genre && <span className="badge genre">{campaign.genre}</span>}
              {campaign.difficulty_level && <span className="badge difficulty">{campaign.difficulty_level}</span>}
              {campaign.campaign_length && <span className="badge length">{campaign.campaign_length}</span>}
              {campaign.tone && <span className="badge tone">{campaign.tone}</span>}
            </div>

            <div className="flex items-center gap-2">
              <Button size="sm" className="bg-infinite-gold text-infinite-dark flex items-center gap-2" onClick={(e) => { e.stopPropagation(); setShowCharacterModal(true); }}>
                <Play className="w-4 h-4" />
                Play
              </Button>
              <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); navigate(`/campaign/${campaign.id}`); }}>
                Enter
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
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

export default CampaignCard;
