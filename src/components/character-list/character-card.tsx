import React, { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight, Play, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
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
import { User, Sword, Shield, Star, AlertTriangle } from 'lucide-react';
import CampaignSelectionModal from './campaign-selection-modal';
import { Character } from '@/types/character';
import { useCharacterImageHotLoading } from '@/hooks/use-image-hot-loading';
import { Skeleton } from '@/components/ui/skeleton';

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

  // Use hot loading hook for background image
  const {
    imageUrl: hotLoadedImage,
    isLoading: imageLoading,
    hasImage,
    error: imageError,
    connectionStatus,
    retryCount
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
      const { error } = await supabase
        .from('characters')
        .delete()
        .eq('id', character.id);

      if (error) throw error;

      toast({
        title: "Character Deleted",
        description: "The character has been successfully removed.",
      });

      setShowDeleteDialog(false);
      
      // Call parent callback to refresh character list
      if (onDelete) {
        onDelete();
      }
    } catch (error) {
      console.error('Error deleting character:', error);
      toast({
        title: "Error",
        description: "Failed to delete character. Please try again.",
        variant: "destructive",
      });
      setShowDeleteDialog(false);
    }
  }, [character.id, toast, onDelete]);

  // Generate avatar background color based on name
  const getAvatarColor = useMemo(() => (name: string) => {
    const colors = ['bg-infinite-purple', 'bg-infinite-gold', 'bg-infinite-teal', 'bg-destructive', 'bg-secondary'];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  }, []);

  // Get first initial
  const getInitial = useMemo(() => (name: string) => name.charAt(0).toUpperCase(), []);

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
      className="character-card group relative overflow-hidden border border-border/30 shadow-md transition-all duration-300 hover:shadow-xl hover:border-infinite-purple/50 aspect-square"
      style={{ padding: 0 }}
    >
      {/* Hero / background area */}
      <div
        className="character-hero group flex items-end p-4 cursor-pointer aspect-square bg-cover bg-center bg-no-repeat filter sepia-[0.1] relative"
        onClick={() => navigate(`/character/${character.id}`)}
        style={resolvedBackgroundImage ? { backgroundImage: `url(${resolvedBackgroundImage})` } : undefined}
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
              <div className="text-xs text-destructive font-medium mb-1">Image generation failed</div>
              <div className="text-xs text-muted-foreground">Using default background</div>
            </div>
          </div>
        )}
        {/* Overlay and popup for character details */}
        <div className="character-overlay bg-gradient-to-b from-infinite-purple/80 via-transparent to-infinite-dark/90" />
        <div className="hero-popup opacity-0 transform translate-y-2 transition-all duration-200 pointer-events-none">
          <div className="bg-white/95 p-4 rounded-lg shadow-md border border-border">
            <div className="flex items-center gap-4 mb-3">
              {/* Avatar in popup */}
              <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-background">
                {imageLoading ? (
                  <Skeleton className="w-full h-full rounded-full" />
                ) : character.image_url ? (
                  <img
                    src={character.image_url}
                    alt={`Portrait of ${character.name}`}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      const parent = target.parentElement;
                      if (parent) {
                        parent.innerHTML = `<div class="w-full h-full flex items-center justify-center text-xl font-bold text-white ${getAvatarColor(character.name)}">${getInitial(character.name)}</div>`;
                      }
                    }}
                  />
                ) : (
                  <div className={`w-full h-full flex items-center justify-center text-xl font-bold text-white ${getAvatarColor(character.name)}`}>
                    {getInitial(character.name)}
                  </div>
                )}
              </div>
              <div>
                <div className="text-xl font-bold text-infinite-dark mb-1 leading-tight break-words">{character.name}</div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  {character.race && (
                    <span className="flex items-center gap-1">
                      <Shield className="w-3 h-3" />
                      {typeof character.race === 'string' ? character.race : character.race.name}
                    </span>
                  )}
                  {character.class && (
                    <span className="flex items-center gap-1">
                      <Sword className="w-3 h-3" />
                      {typeof character.class === 'string' ? character.class : character.class.name}
                    </span>
                  )}
                  {character.level && (
                    <span className="flex items-center gap-1">
                      <Star className="w-3 h-3" />
                      {character.level}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {character.description && (
              <div className="text-base text-muted-foreground line-clamp-3 leading-relaxed mb-3 break-words hyphens-auto">
                {character.description}
              </div>
            )}

            <div className="flex items-center gap-2">
              <Button size="sm" className="bg-infinite-gold text-infinite-dark flex items-center gap-2 hover:bg-infinite-purple" onClick={(e) => { e.stopPropagation(); setShowCampaignModal(true); }}>
                <Play className="w-4 h-4" />
                Play
              </Button>
              <Button size="sm" variant="outline" className="border-infinite-teal text-infinite-teal hover:bg-infinite-teal hover:text-infinite-dark" onClick={(e) => { e.stopPropagation(); navigate(`/character/${character.id}`); }}>
                View Details
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

        {/* Action popup for hovering */}
        <div className="action-popup opacity-0 transform translate-y-2 transition-all duration-200 pointer-events-none">
          <div className="bg-white/95 p-3 rounded-lg shadow-md border border-border">
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" className="h-7 px-2" onClick={(e) => { e.stopPropagation(); navigate(`/character/${character.id}`); }}>
                View
              </Button>
              <Button size="sm" variant="default" className="h-7 px-2 bg-infinite-gold text-infinite-dark" onClick={(e) => { e.stopPropagation(); setShowCampaignModal(true); }}>
                <Play className="w-3 h-3" />
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
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader className="space-y-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <AlertDialogTitle className="text-lg font-semibold text-foreground">Delete Character</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-sm leading-relaxed">
              Are you sure you want to delete <span className="font-semibold text-foreground">"{character.name}"</span>?{" "}
              <span className="text-destructive font-medium">This action cannot be undone</span> and will permanently remove the character from your account.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel className="px-4 py-2">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete} 
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 px-4 py-2 font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive focus-visible:ring-offset-2"
            >
              Permanently Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};

const MemoizedCharacterCard = React.memo(CharacterCardComponent);

export { MemoizedCharacterCard };
export default CharacterCardComponent;
