import { ArrowRight, Play, Trash2, User, Sword, Shield, Star, AlertTriangle } from 'lucide-react';
import React, { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

import CampaignSelectionModal from './campaign-selection-modal';

import type { Character } from '@/types/character';

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
import { Z_INDEX } from '@/constants/z-index';
import { useCharacterImageHotLoading } from '@/hooks/use-image-hot-loading';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import logger from '@/lib/logger';

/**
 * Props interface for CharacterCard component
 * Requires id and name, but allows other Character properties to be partial
 */
interface CharacterCardProps {
  character: Partial<Character> & Required<Pick<Character, 'id' | 'name'>>;
  onDelete?: () => void;
}

/**
 * CharacterCard component displays individual character information in a card format
 * Includes options to view, play, or delete the character
 * @param character - Character data to display
 */
const CharacterCardComponent = ({ character, onDelete }: CharacterCardProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [showCampaignModal, setShowCampaignModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const hoverTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = useCallback(() => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
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

  React.useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  // Use hot loading hook for background image
  const {
    imageUrl: hotLoadedImage,
    isLoading: imageLoading,
    hasImage,
    error: imageError,
    connectionStatus,
    retryCount,
  } = useCharacterImageHotLoading(character.id);

  /**
   * Handles character deletion confirmation
   * Shows delete dialog when user clicks delete button
   */
  const handleDeleteClick = () => {
    setShowDeleteDialog(true);
  };

  /**
   * Handles actual character deletion
   * Removes character from database and updates UI
   */
  const handleDelete = useCallback(async () => {
    try {
      const { error } = await supabase.from('characters').delete().eq('id', character.id);

      if (error) throw error;

      toast({
        title: 'Character Deleted',
        description: 'The character has been successfully removed.',
      });

      setShowDeleteDialog(false);

      // Call parent callback to refresh character list
      if (onDelete) {
        onDelete();
      }
    } catch (error) {
      logger.error('Error deleting character:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete character. Please try again.',
        variant: 'destructive',
      });
      setShowDeleteDialog(false);
    }
  }, [character.id, toast, onDelete]);

  // Generate avatar background color based on name
  const getAvatarColor = useMemo(
    () => (name: string) => {
      const colors = [
        'bg-infinite-purple',
        'bg-infinite-gold',
        'bg-infinite-teal',
        'bg-destructive',
        'bg-secondary',
      ];
      let hash = 0;
      for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
      }
      return colors[Math.abs(hash) % colors.length];
    },
    [],
  );

  // Get first initial
  const getInitial = useMemo(() => (name: string) => name.charAt(0).toUpperCase(), []);

  // Calculate ability score modifier
  const getModifier = (score: number) => {
    return Math.floor((score - 10) / 2);
  };

  // Format modifier with + or - sign
  const formatModifier = (score: number) => {
    const modifier = getModifier(score);
    return modifier >= 0 ? `+${modifier}` : `${modifier}`;
  };

  // Calculate proficiency bonus based on character level
  const getProficiencyBonus = (level?: number) => {
    if (!level) return 2;
    return Math.ceil(level / 4) + 1;
  };

  // Use hot loaded background image, fallback to default
  const resolvedBackgroundImage = useMemo(() => {
    // Priority: hot loaded image > character background image > default background
    if (hasImage && hotLoadedImage !== '/character-background-placeholder.png') {
      return hotLoadedImage;
    }

    if (character.background_image) {
      return character.background_image;
    }

    // If we don't have an image and it's loading, show placeholder
    if (imageLoading || !hasImage) {
      return hotLoadedImage; // This will be the placeholder
    }

    return new URL('/card-background.jpeg', import.meta.url).href;
  }, [hotLoadedImage, hasImage, imageLoading, character.background_image]);

  return (
    <Card
      className="character-card group relative border-2 border-border/30 shadow-md transition-all duration-500 hover:shadow-2xl hover:shadow-infinite-purple/50 hover:border-infinite-gold aspect-square w-full"
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

      {/* Hero / background area */}
      <div
        className="character-hero group flex items-end p-4 cursor-pointer h-full w-full bg-cover bg-center bg-no-repeat filter sepia-[0.1] relative overflow-hidden transition-all duration-700 ease-out group-hover:scale-[1.02] group-hover:brightness-110 rounded-sm"
        onClick={() => {
          // Character access is now properly restricted by RLS, so navigation should work
          navigate(`/app/character/${character.id}`);
        }}
        style={
          resolvedBackgroundImage
            ? {
                backgroundImage: `url(${resolvedBackgroundImage})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center center',
              }
            : undefined
        }
      >
        {/* Loading overlay for image generation */}
        {imageLoading && !hasImage && (
          <div className="absolute inset-0 bg-gradient-to-br from-infinite-purple/20 via-infinite-dark/40 to-infinite-purple/20 backdrop-blur-sm flex items-center justify-center">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-infinite-gold mb-2"></div>
              <div className="text-xs text-infinite-gold font-medium">
                {connectionStatus === 'connecting' && 'Connecting...'}
                {connectionStatus === 'connected' && 'Generating image...'}
                {connectionStatus === 'timeout' && retryCount > 0 && `Retrying... (${retryCount})`}
                {connectionStatus === 'error' && 'Checking for updates...'}
                {!connectionStatus && 'Generating image...'}
              </div>
              {connectionStatus === 'error' && (
                <div className="text-xs text-infinite-gold/70 mt-1">Using fallback polling</div>
              )}
            </div>
          </div>
        )}

        {/* Error state overlay */}
        {imageError && !imageLoading && !hasImage && (
          <div className="absolute inset-0 bg-gradient-to-br from-destructive/20 via-infinite-dark/40 to-destructive/20 backdrop-blur-sm flex items-center justify-center">
            <div className="text-center">
              <div className="text-xs text-destructive font-medium mb-1">
                Image generation failed
              </div>
              <div className="text-xs text-muted-foreground">Using default background</div>
            </div>
          </div>
        )}
        {/* Overlay and popup for character details */}
        <div className="character-overlay bg-gradient-to-b from-infinite-purple/80 via-transparent to-infinite-dark/90" />
        <div
          className={`hover-popup ${isHovered ? `opacity-100 scale-100 pointer-events-auto z-[${Z_INDEX.CARD_HOVER}]` : 'opacity-0 scale-95 pointer-events-none'} absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 transition-all duration-300 ease-out`}
        >
          <div className="bg-white/95 backdrop-blur-sm p-4 rounded-lg shadow-xl border border-border max-w-xs">
            {/* Avatar Display */}
            {character.avatar_url && (
              <div className="flex justify-center mb-3">
                <img
                  src={character.avatar_url}
                  alt={`${character.name} avatar`}
                  className="w-20 h-20 rounded-full object-cover border-4 border-infinite-gold/80 shadow-lg shadow-infinite-gold/50 transition-all duration-300 hover:scale-110 hover:border-infinite-purple hover:shadow-infinite-purple/70"
                />
              </div>
            )}

            <div className="text-xl font-bold text-foreground mb-2 leading-tight break-words">
              {imageLoading ? <Skeleton className="h-6 w-48" /> : character.name}
            </div>

            {imageLoading ? (
              <Skeleton className="h-4 w-full" />
            ) : (
              <>
                {/* Race/Class Info */}
                <div className="flex items-center gap-3 text-sm text-foreground mb-3">
                  {character.race && (
                    <span className="flex items-center gap-1">
                      <Shield className="w-3 h-3 text-infinite-purple" />
                      {character.subrace
                        ? `${typeof character.subrace === 'string' ? character.subrace : character.subrace.name} (${typeof character.race === 'string' ? character.race : character.race.name})`
                        : typeof character.race === 'string'
                          ? character.race
                          : character.race.name}
                    </span>
                  )}
                  {character.class && (
                    <span className="flex items-center gap-1">
                      <Sword className="w-3 h-3 text-infinite-gold" />
                      {typeof character.class === 'string' ? character.class : character.class.name}
                    </span>
                  )}
                  {character.level && (
                    <span className="flex items-center gap-1">
                      <Star className="w-3 h-3 text-infinite-teal" />
                      Level {character.level}
                    </span>
                  )}
                </div>

                {/* Ability Scores Grid */}
                <div className="mb-3">
                  <div className="text-sm font-semibold text-foreground mb-2">Ability Scores</div>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="flex justify-between items-center bg-secondary/20 px-2 py-1 rounded">
                      <span className="font-medium">STR</span>
                      <span>
                        {character.character_stats?.strength || 10} (
                        {formatModifier(character.character_stats?.strength || 10)})
                      </span>
                    </div>
                    <div className="flex justify-between items-center bg-secondary/20 px-2 py-1 rounded">
                      <span className="font-medium">INT</span>
                      <span>
                        {character.character_stats?.intelligence || 10} (
                        {formatModifier(character.character_stats?.intelligence || 10)})
                      </span>
                    </div>
                    <div className="flex justify-between items-center bg-secondary/20 px-2 py-1 rounded">
                      <span className="font-medium">DEX</span>
                      <span>
                        {character.character_stats?.dexterity || 10} (
                        {formatModifier(character.character_stats?.dexterity || 10)})
                      </span>
                    </div>
                    <div className="flex justify-between items-center bg-secondary/20 px-2 py-1 rounded">
                      <span className="font-medium">WIS</span>
                      <span>
                        {character.character_stats?.wisdom || 10} (
                        {formatModifier(character.character_stats?.wisdom || 10)})
                      </span>
                    </div>
                    <div className="flex justify-between items-center bg-secondary/20 px-2 py-1 rounded">
                      <span className="font-medium">CON</span>
                      <span>
                        {character.character_stats?.constitution || 10} (
                        {formatModifier(character.character_stats?.constitution || 10)})
                      </span>
                    </div>
                    <div className="flex justify-between items-center bg-secondary/20 px-2 py-1 rounded">
                      <span className="font-medium">CHA</span>
                      <span>
                        {character.character_stats?.charisma || 10} (
                        {formatModifier(character.character_stats?.charisma || 10)})
                      </span>
                    </div>
                  </div>
                </div>

                {/* Combat Stats */}
                <div className="flex items-center gap-4 text-xs text-foreground mb-4 bg-accent/10 px-3 py-2 rounded">
                  {character.character_stats?.max_hit_points && (
                    <span className="flex items-center gap-1">
                      <span className="font-medium">HP:</span>{' '}
                      {character.character_stats.current_hit_points ||
                        character.character_stats.max_hit_points}
                      /{character.character_stats.max_hit_points}
                    </span>
                  )}
                  {character.character_stats?.armor_class && (
                    <span className="flex items-center gap-1">
                      <span className="font-medium">AC:</span>{' '}
                      {character.character_stats.armor_class}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <span className="font-medium">Prof:</span> +
                    {getProficiencyBonus(character.level)}
                  </span>
                </div>
              </>
            )}

            <div className="flex items-center gap-2 justify-end">
              <Button
                size="sm"
                className="bg-infinite-gold text-infinite-dark flex items-center gap-2 hover:bg-infinite-purple"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowCampaignModal(true);
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
                  // Character access is now properly restricted by RLS, so navigation should work
                  navigate(`/app/character/${character.id}`);
                }}
              >
                View Details
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 hover:border-infinite-dark/20"
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
      </div>

      <CampaignSelectionModal
        isOpen={showCampaignModal}
        onClose={() => setShowCampaignModal(false)}
        characterId={character.id}
      />

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogPortal>
          <AlertDialogOverlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
          <AlertDialogContent className="fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border !bg-white dark:!bg-slate-100 rounded-lg border-infinite-purple/30 p-6 shadow-2xl duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg dark:border-gray-300 text-foreground">
            <AlertDialogHeader className="flex flex-col space-y-2 text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                <AlertDialogTitle className="text-lg font-semibold text-foreground">
                  Delete Character
                </AlertDialogTitle>
              </div>
              <AlertDialogDescription className="text-sm text-muted-foreground leading-relaxed">
                Are you sure you want to delete{' '}
                <span className="font-semibold text-foreground">"{character.name}"</span>?{' '}
                <span className="text-destructive font-medium">This action cannot be undone</span>{' '}
                and will permanently remove the character from your account.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 gap-2">
              <AlertDialogCancel className="bg-white hover:bg-gray-50">Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Permanently Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogPortal>
      </AlertDialog>
    </Card>
  );
};

const MemoizedCharacterCard = React.memo(CharacterCardComponent);

export { MemoizedCharacterCard };
export default CharacterCardComponent;
