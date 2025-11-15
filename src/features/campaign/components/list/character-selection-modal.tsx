import { useQuery } from '@tanstack/react-query';
import { Play, Plus } from 'lucide-react';
import React from 'react';
import { useNavigate } from 'react-router-dom';

import { CharacterSelectionSkeleton } from '@/components/skeletons/CharacterSelectionSkeleton';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { isCampaignCharacterFlowEnabled } from '@/config/featureFlags';
import { Z_INDEX } from '@/constants/z-index';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

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
    queryKey: isCampaignCharacterFlowEnabled()
      ? ['campaign', campaignId, 'characters', 'play']
      : ['user-characters'],
    queryFn: async () => {
      let query = supabase
        .from('characters')
        .select(
          `
          id, name, race, class, level, avatar_url, background_image,
          character_stats (
            strength, dexterity, constitution,
            intelligence, wisdom, charisma,
            armor_class, max_hit_points
          )
        `,
        )
        .order('created_at', { ascending: false });

      if (isCampaignCharacterFlowEnabled()) {
        query = query.eq('campaign_id', campaignId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as Character[];
    },
  });

  /**
   * Handles starting a game with the selected character
   */
  const startGameWithCharacter = (character: Character) => {
    navigate(`/app/game/${campaignId}?character=${character.id}`);
    onClose();
    toast({
      title: 'Starting Adventure!',
      description: `Beginning your journey with ${character.name} in ${campaignName}.`,
    });
  };

  /**
   * Handles creating a new character
   */
  const handleCreateCharacter = () => {
    navigate(`/app/characters/create?campaign=${campaignId}`);
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
            <CharacterSelectionSkeleton />
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
                const backgroundImage =
                  character.background_image ||
                  new URL('/card-background.jpeg', import.meta.url).href;

                return (
                  <Card
                    key={character.id}
                    className="group cursor-pointer hover:shadow-2xl hover:shadow-infinite-purple/40 transition-all duration-500 overflow-hidden border-2 border-border/60 hover:border-infinite-gold/90 hover:scale-[1.02] relative bg-white dark:bg-background"
                  >
                    {/* Glow effect on hover - uses BACKGROUND_LAYER for visual effects within card */}
                    <div
                      className={`absolute inset-0 z-[${Z_INDEX.BACKGROUND_LAYER}] opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none`}
                    >
                      <div className="absolute inset-0 shadow-[inset_0_0_30px_rgba(168,85,247,0.4)]" />
                    </div>

                    <div
                      className="relative h-32 bg-cover bg-center transition-all duration-700 ease-out group-hover:scale-105 group-hover:brightness-110"
                      style={{
                        backgroundImage: `url(${backgroundImage})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                      }}
                    >
                      <div className="absolute inset-0 bg-gradient-to-b from-white/60 via-white/80 to-white/95 dark:from-background/60 dark:via-background/80 dark:to-background/95" />
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
                    <CardContent className="p-4 pt-10 bg-white dark:bg-background">
                      <div className="space-y-3">
                        <div>
                          <h3 className="font-semibold text-lg text-foreground">
                            {character.name}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            Level {character.level} {character.race} {character.class}
                          </p>
                        </div>

                        {stats && (
                          <>
                            {/* HP and AC */}
                            <div className="flex gap-4 text-sm bg-gray-100 dark:bg-muted p-2 rounded-md border border-gray-200 dark:border-border">
                              <div className="flex items-center gap-1">
                                <span className="font-semibold text-foreground">HP:</span>
                                <span className="text-foreground">
                                  {stats.max_hit_points || '—'}
                                </span>
                              </div>
                              <div className="flex items-center gap-1">
                                <span className="font-semibold text-foreground">AC:</span>
                                <span className="text-foreground">{stats.armor_class || '—'}</span>
                              </div>
                            </div>

                            {/* Ability Scores Grid */}
                            <div className="grid grid-cols-3 gap-2 text-xs">
                              <div className="flex flex-col items-center p-2 bg-gray-50 dark:bg-muted/50 rounded border border-gray-200 dark:border-border shadow-sm">
                                <span className="font-semibold text-muted-foreground">STR</span>
                                <span className="text-lg font-bold text-foreground">
                                  {getModifier(stats.strength)}
                                </span>
                              </div>
                              <div className="flex flex-col items-center p-2 bg-gray-50 dark:bg-muted/50 rounded border border-gray-200 dark:border-border shadow-sm">
                                <span className="font-semibold text-muted-foreground">DEX</span>
                                <span className="text-lg font-bold text-foreground">
                                  {getModifier(stats.dexterity)}
                                </span>
                              </div>
                              <div className="flex flex-col items-center p-2 bg-gray-50 dark:bg-muted/50 rounded border border-gray-200 dark:border-border shadow-sm">
                                <span className="font-semibold text-muted-foreground">CON</span>
                                <span className="text-lg font-bold text-foreground">
                                  {getModifier(stats.constitution)}
                                </span>
                              </div>
                              <div className="flex flex-col items-center p-2 bg-gray-50 dark:bg-muted/50 rounded border border-gray-200 dark:border-border shadow-sm">
                                <span className="font-semibold text-muted-foreground">INT</span>
                                <span className="text-lg font-bold text-foreground">
                                  {getModifier(stats.intelligence)}
                                </span>
                              </div>
                              <div className="flex flex-col items-center p-2 bg-gray-50 dark:bg-muted/50 rounded border border-gray-200 dark:border-border shadow-sm">
                                <span className="font-semibold text-muted-foreground">WIS</span>
                                <span className="text-lg font-bold text-foreground">
                                  {getModifier(stats.wisdom)}
                                </span>
                              </div>
                              <div className="flex flex-col items-center p-2 bg-gray-50 dark:bg-muted/50 rounded border border-gray-200 dark:border-border shadow-sm">
                                <span className="font-semibold text-muted-foreground">CHA</span>
                                <span className="text-lg font-bold text-foreground">
                                  {getModifier(stats.charisma)}
                                </span>
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
