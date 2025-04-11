import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight, Play, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import CampaignSelectionModal from './CampaignSelectionModal';
import { Character } from '@/types/character';

/**
 * Props interface for CharacterCard component
 * Requires id and name, but allows other Character properties to be partial
 */
interface CharacterCardProps {
  character: Partial<Character> & Required<Pick<Character, 'id' | 'name'>>;
}

/**
 * CharacterCard component displays individual character information in a card format
 * Includes options to view, play, or delete the character
 * @param character - Character data to display
 */
const CharacterCard = ({ character }: CharacterCardProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showCampaignModal, setShowCampaignModal] = useState(false);

  /**
   * Handles character deletion
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

      // Invalidate characters query to refresh the list
      queryClient.invalidateQueries({ queryKey: ['characters'] });
    } catch (error) {
      console.error('Error deleting character:', error);
      toast({
        title: "Error",
        description: "Failed to delete character. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <>
      <Card className="p-6 hover:shadow-lg transition-shadow">
        <div 
          className="cursor-pointer"
          onClick={() => navigate(`/character/${character.id}`)}
        >
          <h3 className="text-xl font-semibold mb-2">{character.name}</h3>
          {character.description && (
            <p className="text-muted-foreground mb-4 line-clamp-2">
              {character.description}
            </p>
          )}
          <div className="space-y-2">
            {character.race && (
              <p className="text-sm"><span className="font-medium">Race:</span> {typeof character.race === 'string' ? character.race : character.race.name}</p>
            )}
            {character.class && (
              <p className="text-sm"><span className="font-medium">Class:</span> {typeof character.class === 'string' ? character.class : character.class.name}</p>
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
                handleDelete();
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
    </>
  );
};

export default CharacterCard;