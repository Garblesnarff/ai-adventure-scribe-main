import React, { useState } from 'react';
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
const CharacterCard = ({ character, onDelete }: CharacterCardProps) => {
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
  const handleDelete = async () => {
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
  };

  return (
    <>
      <Card className="p-6 hover:shadow-lg transition-shadow">
        <div 
          className="cursor-pointer"
          onClick={() => navigate(`/character/${character.id}`)}
        >
          <h3 className="text-xl font-semibold mb-2 break-words">{character.name}</h3>
          {character.description && (
            <p className="text-muted-foreground mb-4 line-clamp-2 leading-relaxed break-words hyphens-auto">
              {character.description}
            </p>
          )}
          <div className="space-y-2">
            {character.race && (
              <p className="text-sm"><span className="font-medium">Race:</span> <span className="break-words">{typeof character.race === 'string' ? character.race : character.race.name}</span></p>
            )}
            {character.class && (
              <p className="text-sm"><span className="font-medium">Class:</span> <span className="break-words">{typeof character.class === 'string' ? character.class : character.class.name}</span></p>
            )}
            {character.level && (
              <p className="text-sm"><span className="font-medium">Level:</span> {character.level}</p>
            )}
          </div>
        </div>
        <div className="flex justify-between mt-6">
          <div className="flex gap-2">
            <Button
              variant="destructive"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteClick();
              }}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/character/${character.id}`)}
            >
              View <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
          <Button
            variant="default"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              setShowCampaignModal(true);
            }}
          >
            Play <Play className="w-4 h-4 ml-2" />
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

export default CharacterCard;
