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
  isFeatured?: boolean;
}

/**
 * CampaignCard component
 * Displays individual campaign information in a card format
 * @param campaign - Campaign data to display
 */
const CampaignCard = ({ campaign, isFeatured = false }: CampaignCardProps) => {
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
    <Card
      className={"campaign-card group relative overflow-hidden border border-border/30 shadow-md transition-all duration-300 hover:shadow-xl " + (isFeatured ? 'featured-card' : '')}
      style={isFeatured ? { minHeight: '320px', padding: 0 } : undefined}
    >
      {/* Hero / thumbnail area */}
      <div
        className={"campaign-hero flex items-end p-4 cursor-pointer " + (isFeatured ? 'featured' : '')}
        onClick={() => navigate(`/campaign/${campaign.id}`)}
        style={isFeatured ? { backgroundImage: `url(${new URL('/card-background.jpeg', import.meta.url).href})` } : undefined}
      >
        {isFeatured && (
          <>
            <div className="featured-overlay" />
            <div className="hover-popup opacity-0 transform translate-y-2 transition-all duration-200 pointer-events-none">
              <div className="bg-white/95 p-3 rounded-md shadow-md border border-border">
                <div className="text-sm font-semibold text-infinite-dark mb-1">{campaign.name}</div>
                {campaign.description && <div className="text-xs text-muted-foreground line-clamp-3">{campaign.description}</div>}
                <div className="flex items-center gap-2 mt-3">
                  <Button size="sm" className="bg-infinite-gold text-infinite-dark flex items-center gap-2" onClick={(e) => { e.stopPropagation(); setShowCharacterModal(true); }}>
                    <Play className="w-4 h-4" />
                  </Button>
                  <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); navigate(`/campaign/${campaign.id}`); }}>
                    Enter
                  </Button>
                </div>
              </div>
            </div>
          </>
        )}

        <div className="campaign-thumb mr-4 flex-shrink-0">
          {/* Initials fallback when not featured */}
          {!isFeatured && (
            <div className="w-14 h-14 rounded-lg flex items-center justify-center text-lg font-bold text-card-foreground avatar-dm">{(campaign.name || 'C').split(' ').map(s => s[0]).slice(0,2).join('')}</div>
          )}
        </div>

        <div className="flex-1 relative">
          {!isFeatured && (
            <>
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-lg font-semibold text-card-foreground group-hover:text-infinite-gold transition-colors">{campaign.name}</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                  onClick={(e) => { e.stopPropagation(); handleDeleteClick(); }}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>

              {campaign.description && (
                <p className="text-muted-foreground text-sm leading-relaxed mb-2 line-clamp-2">{campaign.description}</p>
              )}

              <div className="campaign-badges flex gap-2 flex-wrap text-xs">
                {campaign.genre && <span className="badge genre">{campaign.genre}</span>}
                {campaign.difficulty_level && <span className="badge difficulty">{campaign.difficulty_level}</span>}
                {campaign.campaign_length && <span className="badge length">{campaign.campaign_length}</span>}
                {campaign.tone && <span className="badge tone">{campaign.tone}</span>}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Actions - hidden for featured (popup owns actions) */}
      {!isFeatured && (
        <div className="px-6 pb-6 pt-2">
          <div className="flex gap-3">
            <Button
              variant="default"
              size="sm"
              className="flex-1 bg-infinite-gold text-infinite-dark hover:brightness-95"
              onClick={(e) => { e.stopPropagation(); setShowCharacterModal(true); }}
            >
              <Play className="w-4 h-4 mr-2" />
              Quick Play
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1 border border-border/20 text-card-foreground hover:text-infinite-gold"
              onClick={() => navigate(`/campaign/${campaign.id}`)}
            >
              Enter Realm
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      )}

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
