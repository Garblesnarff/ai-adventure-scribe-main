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

  return (
    <Card className="group relative overflow-hidden border border-border/50 bg-card/80 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300 hover:bg-card hover:border-infinite-purple/30">
      <div
        className="p-6 cursor-pointer"
        onClick={() => navigate(`/campaign/${campaign.id}`)}
      >
        <div className="flex items-start justify-between mb-4">
          <h3 className="text-lg font-semibold text-card-foreground group-hover:text-infinite-gold transition-colors">
            {campaign.name}
          </h3>
          <Button
            variant="ghost"
            size="sm"
            className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            onClick={(e) => {
              e.stopPropagation();
              handleDeleteClick();
            }}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>

        {campaign.description && (
          <p className="text-muted-foreground text-sm leading-relaxed mb-4 line-clamp-2">
            {campaign.description}
          </p>
        )}

        <div className="space-y-3">
          {campaign.genre && (
            <div className="flex items-center text-xs text-muted-foreground">
              <span className="font-medium text-card-foreground mr-2">Genre:</span>
              <span className="bg-infinite-purple/20 text-infinite-purple px-2 py-1 rounded-full border border-infinite-purple/30">{campaign.genre}</span>
            </div>
          )}
          {campaign.difficulty_level && (
            <div className="flex items-center text-xs text-muted-foreground">
              <span className="font-medium text-card-foreground mr-2">Difficulty:</span>
              <span className="bg-infinite-teal/20 text-infinite-teal px-2 py-1 rounded-full border border-infinite-teal/30">{campaign.difficulty_level}</span>
            </div>
          )}
          {campaign.campaign_length && (
            <div className="flex items-center text-xs text-muted-foreground">
              <span className="font-medium text-card-foreground mr-2">Length:</span>
              <span className="bg-infinite-gold/20 text-infinite-gold px-2 py-1 rounded-full border border-infinite-gold/30">{campaign.campaign_length}</span>
            </div>
          )}
          {campaign.tone && (
            <div className="flex items-center text-xs text-muted-foreground">
              <span className="font-medium text-card-foreground mr-2">Tone:</span>
              <span className="bg-accent/20 text-accent px-2 py-1 rounded-full border border-accent/30">{campaign.tone}</span>
            </div>
          )}
        </div>
      </div>

      <div className="px-6 pb-6 space-y-2">
        <div className="flex gap-2">
          <Button
            variant="default"
            size="sm"
            className="flex-1 bg-primary hover:bg-primary/90"
            onClick={(e) => {
              e.stopPropagation();
              setShowCharacterModal(true);
            }}
          >
            <Play className="w-4 h-4 mr-2" />
            Quick Play
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1 bg-primary/10 hover:bg-primary/20 border-primary/30 hover:border-primary text-primary-foreground hover:text-infinite-gold transition-all duration-200"
            onClick={() => navigate(`/campaign/${campaign.id}`)}
          >
            Enter Realm
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
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
