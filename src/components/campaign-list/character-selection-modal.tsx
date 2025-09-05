import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Play, Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Character {
  id: string;
  name: string;
  race: string;
  class: string;
  level: number;
}

interface CharacterSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  campaignId: string;
  campaignName: string;
}

/**
 * Modal component for selecting a character to play a campaign
 * @param isOpen - Controls modal visibility
 * @param onClose - Callback to close modal
 * @param campaignId - ID of the selected campaign
 * @param campaignName - Name of the campaign for display
 */
const CharacterSelectionModal: React.FC<CharacterSelectionModalProps> = ({
  isOpen,
  onClose,
  campaignId,
  campaignName,
}) => {
  const navigate = useNavigate();
  const { toast } = useToast();

  // Fetch available characters
  const { data: characters, isLoading } = useQuery({
    queryKey: ['user-characters'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('characters')
        .select('id, name, race, class, level')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Character[];
    },
  });

  /**
   * Handles starting a game with the selected character
   */
  const startGameWithCharacter = (character: Character) => {
    navigate(`/campaign/${campaignId}?character=${character.id}`);
    onClose();
    toast({
      title: "Starting Adventure!",
      description: `Beginning your journey with ${character.name} in ${campaignName}.`,
    });
  };

  /**
   * Handles creating a new character
   */
  const handleCreateCharacter = () => {
    navigate('/characters/create');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Choose Your Character</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Select a character to play in "{campaignName}"
          </p>
        </DialogHeader>
        
        <div className="mt-4">
          {isLoading ? (
            <div className="text-center py-8">Loading your characters...</div>
          ) : characters && characters.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {characters.map((character) => (
                <Card key={character.id} className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      <div>
                        <h3 className="font-semibold text-lg">{character.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          Level {character.level} {character.race} {character.class}
                        </p>
                      </div>
                      <Button 
                        onClick={() => startGameWithCharacter(character)}
                        className="w-full"
                      >
                        <Play className="h-4 w-4 mr-2" />
                        Start Adventure
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">You don't have any characters yet.</p>
              <Button onClick={handleCreateCharacter}>
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Character
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CharacterSelectionModal;