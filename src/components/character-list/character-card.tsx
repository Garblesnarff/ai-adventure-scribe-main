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
import { User, Sword, Shield, Star } from 'lucide-react';
import CampaignSelectionModal from './campaign-selection-modal';
import { Character } from '@/types/character';

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

  return (
    <>
      <Card className="group relative overflow-hidden rounded-2xl border-2 border-border/30 p-6 hover:shadow-2xl hover:border-infinite-purple/50 transition-all duration-300 bg-gradient-to-br from-background to-muted/50 hover:from-background hover:to-accent/20">
        {/* Avatar */}
        <div className="absolute -top-6 left-6 w-16 h-16 rounded-full overflow-hidden border-4 border-background shadow-lg group-hover:scale-110 transition-transform duration-300">
          <div className={`w-full h-full flex items-center justify-center text-2xl font-bold text-white ${getAvatarColor(character.name)}`}>
            {getInitial(character.name)}
          </div>
        </div>

        <div 
          className="cursor-pointer pt-8"
          onClick={() => navigate(`/character/${character.id}`)}
        >
          <h3 className="text-2xl font-bold mb-3 text-foreground break-words group-hover:text-infinite-purple transition-colors duration-200">{character.name}</h3>
          {character.description && (
            <p className="text-muted-foreground mb-6 line-clamp-3 leading-relaxed opacity-90 group-hover:opacity-100 transition-opacity duration-200">
              {character.description}
            </p>
          )}
          <div className="space-y-3 mb-6">
            {character.race && (
              <div className="flex items-center gap-2 text-sm font-medium">
                <Shield className="w-4 h-4 text-infinite-gold" />
                <span className="text-foreground/80">{typeof character.race === 'string' ? character.race : character.race.name}</span>
              </div>
            )}
            {character.class && (
              <div className="flex items-center gap-2 text-sm font-medium">
                <Sword className="w-4 h-4 text-infinite-teal" />
                <span className="text-foreground/80">{typeof character.class === 'string' ? character.class : character.class.name}</span>
              </div>
            )}
            {character.level && (
              <div className="flex items-center gap-2 text-sm font-semibold text-infinite-gold">
                <Star className="w-4 h-4" />
                <span>Level {character.level}</span>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between items-center pt-4 border-t border-border/30">
          <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 delay-100">
            <Button
              variant="destructive"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteClick();
              }}
              className="h-8 px-3"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/character/${character.id}`)}
              className="h-8 px-3 border-infinite-purple text-infinite-purple hover:bg-infinite-purple/10"
            >
              View Details
            </Button>
          </div>
          <Button
            variant="fantasy"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              setShowCampaignModal(true);
            }}
            className="h-8 px-4 shadow-md hover:shadow-lg transition-shadow duration-200"
          >
            <Play className="w-4 h-4 mr-2" />
            Embark
          </Button>
        </div>
      </Card>

      <CampaignSelectionModal
        isOpen={showCampaignModal}
        onClose={() => setShowCampaignModal(false)}
        characterId={character.id}
      />

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Character</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{character.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete Character
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

const MemoizedCharacterCard = React.memo(CharacterCardComponent);

export { MemoizedCharacterCard };
export default CharacterCardComponent;
