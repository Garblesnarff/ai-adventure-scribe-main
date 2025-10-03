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
  avatar_url?: string | null;
  background_image?: string | null;
  character_stats?: {
    strength?: number;
    dexterity?: number;
    constitution?: number;
    intelligence?: number;
    wisdom?: number;
    charisma?: number;
    armor_class?: number;
    max_hit_points?: number;
  };
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
        .select(`
          id, name, race, class, level, avatar_url, background_image,
          character_stats (
            strength, dexterity, constitution,
            intelligence, wisdom, charisma,
            armor_class, max_hit_points
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Character[];
    },
  });

  /**
   * Handles starting a game with the selected character
   */
  const startGameWithCharacter = (character: Character) => {
    navigate(`/app/campaign/${campaignId}?character=${character.id}`);
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
    navigate('/app/characters/create');
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
              {characters.map((character) => {
                // Helper function to calculate ability modifier
                const getModifier = (score?: number) => {
                  if (!score) return '+0';
                  const mod = Math.floor((score - 10) / 2);
                  return mod >= 0 ? `+${mod}` : `${mod}`;
                };

                const stats = character.character_stats;

                // Resolve background image
                const backgroundImage = character.background_image || new URL('/card-background.jpeg', import.meta.url).href;

                return (
                  <Card key={character.id} className="group cursor-pointer hover:shadow-xl hover:shadow-infinite-purple/30 transition-all duration-500 overflow-hidden border-2 border-border/30 hover:border-infinite-gold/70 relative">
                    {/* Glow effect on hover */}
                    <div className="absolute inset-0 z-[1] opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
                      <div className="absolute inset-0 shadow-[inset_0_0_20px_rgba(168,85,247,0.3)]" />
                    </div>
                    
                    <div 
                      className="relative h-32 bg-cover bg-center transition-all duration-700 ease-out group-hover:scale-110 group-hover:brightness-110"
                      style={{
                        backgroundImage: `url(${backgroundImage})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center'
                      }}
                    >
                      <div className="absolute inset-0 bg-gradient-to-b from-transparent to-background/90" />
                      {character.avatar_url && (
                        <div className="absolute -bottom-8 left-4 z-10">
                          <img
                            src={character.avatar_url}
                            alt={`${character.name} avatar`}
                            className="w-16 h-16 rounded-full object-cover border-4 border-infinite-gold/80 shadow-lg shadow-infinite-gold/50 transition-all duration-300 group-hover:scale-110 group-hover:border-infinite-purple group-hover:shadow-infinite-purple/70"
                          />
                        </div>
                      )}
                    </div>
                    <CardContent className="p-4 pt-10">
                      <div className="space-y-3">
                        <div>
                          <h3 className="font-semibold text-lg">{character.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            Level {character.level} {character.race} {character.class}
                          </p>
                        </div>

                        {stats && (
                          <>
                            {/* HP and AC */}
                            <div className="flex gap-4 text-sm">
                              <div className="flex items-center gap-1">
                                <span className="font-semibold">HP:</span>
                                <span>{stats.max_hit_points || '—'}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <span className="font-semibold">AC:</span>
                                <span>{stats.armor_class || '—'}</span>
                              </div>
                            </div>

                            {/* Ability Scores Grid */}
                            <div className="grid grid-cols-3 gap-2 text-xs">
                              <div className="flex flex-col items-center p-2 bg-muted rounded">
                                <span className="font-semibold text-muted-foreground">STR</span>
                                <span className="text-lg font-bold">{getModifier(stats.strength)}</span>
                              </div>
                              <div className="flex flex-col items-center p-2 bg-muted rounded">
                                <span className="font-semibold text-muted-foreground">DEX</span>
                                <span className="text-lg font-bold">{getModifier(stats.dexterity)}</span>
                              </div>
                              <div className="flex flex-col items-center p-2 bg-muted rounded">
                                <span className="font-semibold text-muted-foreground">CON</span>
                                <span className="text-lg font-bold">{getModifier(stats.constitution)}</span>
                              </div>
                              <div className="flex flex-col items-center p-2 bg-muted rounded">
                                <span className="font-semibold text-muted-foreground">INT</span>
                                <span className="text-lg font-bold">{getModifier(stats.intelligence)}</span>
                              </div>
                              <div className="flex flex-col items-center p-2 bg-muted rounded">
                                <span className="font-semibold text-muted-foreground">WIS</span>
                                <span className="text-lg font-bold">{getModifier(stats.wisdom)}</span>
                              </div>
                              <div className="flex flex-col items-center p-2 bg-muted rounded">
                                <span className="font-semibold text-muted-foreground">CHA</span>
                                <span className="text-lg font-bold">{getModifier(stats.charisma)}</span>
                              </div>
                            </div>
                          </>
                        )}

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
                );
              })}
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
