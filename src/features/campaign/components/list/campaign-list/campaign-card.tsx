import { useQueryClient } from '@tanstack/react-query';
import { ArrowRight, Trash2, Play, AlertTriangle } from 'lucide-react';
import React, { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

import CharacterSelectionModal from './character-selection-modal';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogOverlay,
  AlertDialogPortal,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/use-toast';
import { Z_INDEX } from '@/constants/z-index';
import { useCampaignImageHotLoading } from '@/hooks/use-image-hot-loading';
import { supabase } from '@/integrations/supabase/client';
import logger from '@/lib/logger';

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
  const [isHovered, setIsHovered] = useState(false);
  const hoverTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  // Use hot loading hook for background image
  const {
    imageUrl: hotLoadedImage,
    isLoading: imageLoading,
    hasImage,
  } = useCampaignImageHotLoading(campaign.id);

  // Handle hover with delay
  const handleMouseEnter = useCallback(() => {
    hoverTimeoutRef.current = setTimeout(() => {
      setIsHovered(true);
    }, 1000);
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    setIsHovered(false);
  }, []);

  // Cleanup timeout on unmount
  React.useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

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
      const { error } = await supabase.from('campaigns').delete().eq('id', campaign.id);

      if (error) throw error;

      toast({
        title: 'Campaign Deleted',
        description: 'The campaign has been successfully removed.',
      });

      setShowDeleteDialog(false);

      // Invalidate campaigns query to refresh the list
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
    } catch (error) {
      logger.error('Error deleting campaign:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete campaign. Please try again.',
        variant: 'destructive',
      });
      setShowDeleteDialog(false);
    }
  }, [campaign.id, toast, queryClient]);

  // Use hot loaded image, fallback to coverImage, then default
  const resolvedImage = useMemo(() => {
    // Priority: hot loaded image > static cover image > default background
    if (hasImage && hotLoadedImage && hotLoadedImage !== '/campaign-background-placeholder.png') {
      return hotLoadedImage;
    }

    if (coverImage) {
      return new URL(coverImage, import.meta.url).href;
    }

    // If we don't have an image and it's loading, show placeholder
    if (imageLoading || !hasImage) {
      return hotLoadedImage || '/campaign-background-placeholder.png'; // This will be the placeholder
    }

    return new URL('/card-background.jpeg', import.meta.url).href;
  }, [hotLoadedImage, hasImage, imageLoading, coverImage]);

  return (
    <Card
      className="campaign-card featured-card group relative border-2 border-border/30 shadow-md transition-all duration-500 hover:shadow-2xl hover:shadow-infinite-purple/50 hover:border-infinite-gold aspect-square w-full"
      style={{ padding: '2px' }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Glow effect on hover - uses OVERLAY_EFFECT for visual effects */}
      <div
        className={`absolute inset-0 z-[${Z_INDEX.OVERLAY_EFFECT}] opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none`}
      >
        <div className="absolute inset-0 shadow-[inset_0_0_30px_rgba(168,85,247,0.4)]" />
      </div>

      {/* Hero / thumbnail area */}
      <div
        className="campaign-hero featured flex items-end p-4 cursor-pointer h-full w-full bg-cover bg-center bg-no-repeat filter sepia-[0.1] relative bg-gray-500 overflow-hidden transition-all duration-700 ease-out group-hover:scale-[1.02] group-hover:brightness-110 rounded-sm"
        role="link"
        tabIndex={0}
        aria-label={`Open campaign ${campaign.name}`}
        onClick={() => navigate(`/app/campaigns/${campaign.id}`)}
        onFocus={() => setIsHovered(true)}
        onBlur={() => setIsHovered(false)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            navigate(`/app/campaigns/${campaign.id}`);
          }
        }}
        style={
          resolvedImage
            ? {
                backgroundImage: `url(${resolvedImage})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center center',
                backgroundColor: '#6b7280',
              }
            : { backgroundColor: '#6b7280' }
        }
      >
        {/* Loading overlay for image generation */}
        {imageLoading && !hasImage && (
          <div className="absolute inset-0 bg-gradient-to-br from-infinite-purple/20 via-infinite-dark/40 to-infinite-purple/20 backdrop-blur-sm flex items-center justify-center">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-infinite-gold mb-2"></div>
              <div className="text-xs text-infinite-gold font-medium">Generating image...</div>
            </div>
          </div>
        )}
        {/* Overlay and popup for all cards */}
        <div className="featured-overlay bg-gradient-to-b from-infinite-purple/80 via-transparent to-infinite-dark/90" />
        <div
          className={`hover-popup ${isHovered ? `opacity-100 pointer-events-auto z-[${Z_INDEX.CARD_HOVER}]` : 'opacity-0 pointer-events-none'} absolute left-1/2 top-1/2 transition-all duration-200 w-80 max-w-full filter drop-shadow-[0_10px_25px_rgba(0,0,0,0.2)]`}
        >
          <div className="bg-white/95 backdrop-blur-sm p-4 rounded-lg shadow-xl border border-border">
            <div className="text-xl font-bold text-foreground mb-2 leading-tight break-words">
              {imageLoading ? <Skeleton className="h-6 w-48" /> : campaign.name}
            </div>
            {imageLoading ? (
              <Skeleton className="h-4 w-full" />
            ) : (
              <>
                {logger.debug('Campaign description:', campaign.description)}
                <div className="description-section min-h-[3rem] max-h-[200px] overflow-y-auto text-sm text-foreground leading-relaxed mb-3 break-words hyphens-auto p-2 pr-3 scrollbar-thin scrollbar-thumb-muted-foreground/30 scrollbar-track-transparent">
                  {campaign.description ? (
                    campaign.description
                  ) : (
                    <span className="italic text-muted-foreground">
                      No description yet. Enter the campaign to begin your adventure!
                    </span>
                  )}
                </div>
              </>
            )}

            {/* Campaign badges in popup */}
            <div className="campaign-badges flex gap-1 flex-wrap text-xs mt-2 mb-4">
              {campaign.genre && (
                <span className="inline-flex items-center px-2 py-1 rounded-full bg-infinite-purple/10 text-infinite-purple border border-infinite-purple/20 font-medium">
                  {campaign.genre}
                </span>
              )}
              {campaign.difficulty_level && (
                <span className="inline-flex items-center px-2 py-1 rounded-full bg-destructive/10 text-destructive border border-destructive/20 font-medium">
                  {campaign.difficulty_level}
                </span>
              )}
              {campaign.campaign_length && (
                <span className="inline-flex items-center px-2 py-1 rounded-full bg-secondary/10 text-secondary-foreground border border-secondary/20 font-medium">
                  {campaign.campaign_length}
                </span>
              )}
              {campaign.tone && (
                <span className="inline-flex items-center px-2 py-1 rounded-full bg-accent/10 text-accent-foreground border border-accent/20 font-medium">
                  {campaign.tone}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 justify-end">
              <Button
                size="sm"
                className="bg-infinite-gold text-infinite-dark flex items-center gap-2 hover:bg-infinite-purple"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowCharacterModal(true);
                }}
              >
                <Play className="w-4 h-4" />
                Play
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="border-infinite-teal text-infinite-teal hover:bg-infinite-teal hover:text-infinite-dark"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/app/campaigns/${campaign.id}`);
                }}
              >
                Enter
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 hover:border-infinite-dark/20"
                aria-label="Delete campaign"
                title="Delete campaign"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteClick();
                }}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile actions (visible on touch / small screens) */}
        <div className={`absolute bottom-3 left-3 z-[${Z_INDEX.CARD_HOVER}] flex gap-2 md:hidden`}>
          <Button
            size="sm"
            className="bg-infinite-gold text-infinite-dark hover:bg-infinite-purple"
            aria-label="Play campaign"
            onClick={(e) => {
              e.stopPropagation();
              setShowCharacterModal(true);
            }}
          >
            <Play className="w-4 h-4" />
            Play
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="border-infinite-teal text-infinite-teal hover:bg-infinite-teal hover:text-infinite-dark"
            aria-label="Enter campaign"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/app/campaign/${campaign.id}`);
            }}
          >
            Enter
          </Button>
        </div>
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogPortal>
          <AlertDialogOverlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
          <AlertDialogContent className="fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border !bg-white dark:!bg-slate-100 rounded-lg border-infinite-purple/30 p-6 shadow-2xl duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg dark:border-gray-300 text-foreground">
            <AlertDialogHeader className="flex flex-col space-y-2 text-center">
              <AlertDialogTitle className="text-lg font-semibold text-foreground">
                Delete Campaign
              </AlertDialogTitle>
              <AlertDialogDescription className="text-sm text-muted-foreground leading-relaxed">
                Are you sure you want to delete "{campaign.name}"? This will permanently remove the
                campaign and all associated game sessions. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 gap-2">
              <AlertDialogCancel className="bg-white hover:bg-gray-50">Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete Campaign
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogPortal>
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
