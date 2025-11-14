import { Loader2, Play, Users, Shield, Sword, Star } from 'lucide-react';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import type { Character } from '@/types/character';

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import CampaignGallery from '@/features/campaign/components/gallery/CampaignGallery';
import { useCharacterStats } from '@/features/character/hooks';
import { SimpleGameChatWithVoice } from '@/features/game-session/components';
import { supabase } from '@/integrations/supabase/client';
import logger from '@/lib/logger';
import { analytics } from '@/services/analytics';

interface Campaign {
  id: string;
  name: string;
  description: string | null;
  genre: string | null;
  difficulty_level: string | null;
  campaign_length: string | null;
  tone: string | null;
  era: string | null;
  location: string | null;
  atmosphere: string | null;
  background_image?: string | null;
}

interface CharacterListItem {
  id: string;
  name: string;
  race: string;
  class: string;
  level: number | null;
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

export const SimpleCampaignView: React.FC = () => {
  const { id: campaignId } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const characterIdFromUrl = searchParams.get('character');

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [characters, setCharacters] = useState<CharacterListItem[]>([]);
  const [selectedCharacter, setSelectedCharacter] = useState<CharacterListItem | null>(null);
  const [fullSelectedCharacter, setFullSelectedCharacter] = useState<Character | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (campaignId) {
      loadCampaignData();
      loadUserCharacters();
    }
  }, [campaignId, user]);

  useEffect(() => {
    if (characterIdFromUrl && characters.length > 0) {
      const character = characters.find((c) => c.id === characterIdFromUrl);
      if (character) {
        // Navigate directly to the game route with this character
        navigate(`/app/game/${campaignId}?character=${character.id}`);
      }
    }
  }, [characterIdFromUrl, characters, navigate, campaignId]);

  const loadCampaignData = async () => {
    try {
      const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .eq('id', campaignId!)
        .single();

      if (error) throw error;
      setCampaign(data);
    } catch (error) {
      logger.error('Error loading campaign:', error);
      toast.error('Failed to load campaign data');
    }
  };

  const loadUserCharacters = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
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
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCharacters(
        (data || []).map((char) => ({
          ...char,
          level: char.level || 1,
          character_stats: Array.isArray(char.character_stats)
            ? char.character_stats[0]
            : char.character_stats,
        })) as CharacterListItem[],
      );
    } catch (error) {
      logger.error('Error loading characters:', error);
      toast.error('Failed to load characters');
    } finally {
      setLoading(false);
    }
  };

  const loadFullCharacterData = async (characterId: string) => {
    try {
      const { data: characterData, error: characterError } = await supabase
        .from('characters')
        .select(
          `
          *,
          character_stats (*),
          character_equipment (*)
        `,
        )
        .eq('id', characterId)
        .single();

      if (characterError) throw characterError;
      if (!characterData) return null;

      const stats = Array.isArray(characterData.character_stats)
        ? characterData.character_stats[0]
        : characterData.character_stats;
      const equipment = characterData.character_equipment || [];

      const fullCharacter: Character = {
        id: characterData.id,
        user_id: characterData.user_id || undefined,
        name: characterData.name,
        race: characterData.race
          ? ({ name: characterData.race } as unknown as Character['race'])
          : null,
        class: characterData.class
          ? ({ name: characterData.class } as unknown as Character['class'])
          : null,
        level: characterData.level || 1,
        background: characterData.background
          ? ({ name: characterData.background } as unknown as Character['background'])
          : null,
        abilityScores: stats
          ? {
              strength: {
                score: stats.strength,
                modifier: Math.floor((stats.strength - 10) / 2),
                savingThrow: false,
              },
              dexterity: {
                score: stats.dexterity,
                modifier: Math.floor((stats.dexterity - 10) / 2),
                savingThrow: false,
              },
              constitution: {
                score: stats.constitution,
                modifier: Math.floor((stats.constitution - 10) / 2),
                savingThrow: false,
              },
              intelligence: {
                score: stats.intelligence,
                modifier: Math.floor((stats.intelligence - 10) / 2),
                savingThrow: false,
              },
              wisdom: {
                score: stats.wisdom,
                modifier: Math.floor((stats.wisdom - 10) / 2),
                savingThrow: false,
              },
              charisma: {
                score: stats.charisma,
                modifier: Math.floor((stats.charisma - 10) / 2),
                savingThrow: false,
              },
            }
          : undefined,
        experience: characterData.experience_points || 0,
        alignment: characterData.alignment || '',
        equipment: equipment.map((item: any) => item.item_name) || [],
        personalityTraits: [],
        ideals: [],
        bonds: [],
        flaws: [],
      };

      setFullSelectedCharacter(fullCharacter);
      return fullCharacter;
    } catch (error) {
      logger.error('Error loading full character data:', error);
      toast.error('Failed to load character details');
      return null;
    }
  };

  const startGameWithCharacter = useCallback(
    async (character: CharacterListItem) => {
      // Navigate to the game route with campaign ID and character ID as query param
      navigate(`/app/game/${campaignId}?character=${character.id}`);
    },
    [navigate, campaignId],
  );

  // Memoize characters array to prevent unnecessary re-renders
  const memoizedCharacters = useMemo(() => characters, [characters]);

  // Calculate character stats at the top level to follow Rules of Hooks
  const characterStats = useCharacterStats(fullSelectedCharacter);

  // Generate character avatar color
  const getCharacterAvatarColor = useMemo(
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

  const getInitial = useMemo(() => (name: string) => name.charAt(0).toUpperCase(), []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="w-full max-w-4xl p-6 space-y-4">
          <Skeleton className="h-12 w-2/3" />
          <Skeleton className="h-6 w-1/3" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!campaign) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-muted-foreground">Campaign not found</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-indigo-100">
      {/* Campaign Banner Header */}
      <div className="relative">
        <div
          className="h-48 sm:h-56 md:h-64 lg:h-72 bg-cover bg-center bg-no-repeat relative overflow-hidden"
          style={{
            backgroundImage: `url('/card-background.jpeg')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center center',
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 to-transparent"></div>
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent h-32"></div>
        </div>

        {/* Header Content */}
        <div className="absolute top-8 left-8 right-8">
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-4xl font-bold text-white mb-2 drop-shadow-lg">
                {campaign.name}
              </CardTitle>
              <div className="flex flex-wrap gap-2 mb-4">
                <Badge
                  variant="secondary"
                  className="bg-infinite-gold/20 text-infinite-gold border-infinite-gold/30"
                >
                  {campaign.genre || 'Unknown'}
                </Badge>
                <Badge
                  variant="secondary"
                  className="bg-destructive/20 text-destructive border-destructive/30"
                >
                  {campaign.difficulty_level || 'Unknown'}
                </Badge>
                <Badge
                  variant="secondary"
                  className="bg-secondary/20 text-secondary-foreground border-secondary/30"
                >
                  {campaign.campaign_length || 'Unknown'}
                </Badge>
                <Badge
                  variant="secondary"
                  className="bg-secondary/20 text-secondary-foreground border-secondary/30"
                >
                  {campaign.tone || 'Unknown'}
                </Badge>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 relative z-10 -mt-16">
        {!selectedCharacter ? (
          /* Character Selection Layout */
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Campaign Details Sidebar */}
            <div className="lg:col-span-1 space-y-6">
              <Card className="bg-background/80 backdrop-blur-sm border-border/50">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-foreground">
                    <Shield className="w-5 h-5 text-infinite-purple" />
                    Campaign Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <span className="font-medium min-w-[4rem]">Era:</span>
                      <span>{campaign.era || 'Unknown'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <span className="font-medium min-w-[4rem]">Location:</span>
                      <span>{campaign.location || 'Unknown'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <span className="font-medium min-w-[4rem]">Atmosphere:</span>
                      <span>{campaign.atmosphere || 'Unknown'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <span className="font-medium min-w-[4rem]">Genre:</span>
                      <span>{campaign.genre || 'Unknown'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <span className="font-medium min-w-[4rem]">Difficulty:</span>
                      <span>{campaign.difficulty_level || 'Unknown'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <span className="font-medium min-w-[4rem]">Length:</span>
                      <span>{campaign.campaign_length || 'Unknown'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <span className="font-medium min-w-[4rem]">Tone:</span>
                      <span>{campaign.tone || 'Unknown'}</span>
                    </div>
                  </div>
                  {campaign.description && (
                    <Accordion type="single" collapsible className="w-full">
                      <AccordionItem value="description">
                        <AccordionTrigger className="text-sm font-medium hover:no-underline">
                          Description
                        </AccordionTrigger>
                        <AccordionContent className="text-sm text-muted-foreground pt-2">
                          <p>{campaign.description}</p>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  )}
                </CardContent>
              </Card>

              {/* Campaign Gallery */}
              <Card className="bg-background/80 backdrop-blur-sm border-border/50">
                <CardHeader className="pb-4">
                  <CardTitle className="text-foreground">Gallery</CardTitle>
                </CardHeader>
                <CardContent>
                  <CampaignGallery
                    campaignId={campaign.id}
                    backgroundImageUrl={campaign.background_image}
                  />
                </CardContent>
              </Card>
            </div>

            {/* Character Selection */}
            <div className="lg:col-span-2 space-y-8">
              <Card className="bg-background/80 backdrop-blur-sm border-border/50">
                <CardHeader className="pb-6">
                  <CardTitle className="flex items-center gap-2 text-2xl font-bold">
                    <Users className="h-6 w-6 text-infinite-purple" />
                    Select Your Hero
                  </CardTitle>
                  <p className="text-muted-foreground text-lg">
                    Choose the character who will embark on this legendary quest
                  </p>
                </CardHeader>
                <CardContent>
                  {memoizedCharacters.length === 0 ? (
                    <div className="text-center py-12 bg-muted/30 rounded-xl">
                      <Users className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground mb-6 text-lg">No heroes forged yet</p>
                      <Button
                        onClick={() => {
                          analytics.characterCreationStarted({
                            campaignId: campaign.id,
                            artStyle: campaign.genre || undefined,
                          });
                          navigate(`/app/characters/create?campaign=${campaign.id}`);
                        }}
                        variant="fantasy"
                        size="lg"
                        className="px-8"
                      >
                        <Play className="w-5 h-5 mr-2" />
                        Forge Your First Hero
                      </Button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {memoizedCharacters.map((character) => {
                        const backgroundImage =
                          character.background_image ||
                          new URL('/card-background.jpeg', import.meta.url).href;
                        return (
                          <Card
                            key={character.id}
                            className="group cursor-pointer hover:shadow-2xl hover:shadow-infinite-purple/50 transition-all duration-500 border-2 border-border/50 hover:border-infinite-gold/70 overflow-hidden relative"
                          >
                            {/* Glow effect on hover */}
                            <div className="absolute inset-0 z-[1] opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
                              <div className="absolute inset-0 shadow-[inset_0_0_30px_rgba(168,85,247,0.4)]" />
                            </div>

                            {/* Background Image Layer with zoom on hover */}
                            <div
                              className="absolute inset-0 z-0 transition-transform duration-700 ease-out group-hover:scale-110 group-hover:brightness-110"
                              style={{
                                backgroundImage: `url(${backgroundImage})`,
                                backgroundSize: 'cover',
                                backgroundPosition: 'center',
                              }}
                            />
                            {/* Dark Overlay for Text Readability */}
                            <div className="absolute inset-0 z-0 bg-gradient-to-br from-black/60 via-black/70 to-black/80 transition-opacity duration-500 group-hover:from-black/50 group-hover:via-black/60 group-hover:to-black/70" />

                            <CardContent className="p-6 relative z-10">
                              {/* Character Avatar */}
                              <div
                                className={`absolute -top-4 left-6 w-20 h-20 rounded-full overflow-hidden border-4 border-infinite-gold/80 shadow-lg shadow-infinite-gold/50 group-hover:scale-110 group-hover:border-infinite-purple group-hover:shadow-infinite-purple/70 transition-all duration-300 ${!character.avatar_url ? getCharacterAvatarColor(character.name) : ''}`}
                              >
                                {character.avatar_url ? (
                                  <img
                                    src={character.avatar_url}
                                    alt={`${character.name} avatar`}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-white">
                                    {getInitial(character.name)}
                                  </div>
                                )}
                              </div>

                              <div className="pt-12 space-y-4">
                                <div>
                                  <h3 className="text-xl font-bold text-white drop-shadow-lg group-hover:text-infinite-purple transition-colors">
                                    {character.name}
                                  </h3>
                                  <div className="flex items-center gap-2 text-sm text-gray-200 mt-1">
                                    <Star className="w-4 h-4 text-infinite-gold" />
                                    <span>Level {character.level || 1}</span>
                                  </div>
                                </div>

                                <div className="flex items-center gap-3 text-sm">
                                  <div className="flex items-center gap-1 text-gray-200">
                                    <Shield className="w-4 h-4" />
                                    <span>{character.race}</span>
                                  </div>
                                  <div className="flex items-center gap-1 text-gray-200">
                                    <Sword className="w-4 h-4" />
                                    <span>{character.class}</span>
                                  </div>
                                </div>

                                {character.character_stats && (
                                  <div className="space-y-3">
                                    {/* HP and AC */}
                                    <div className="flex gap-4 text-sm">
                                      <div className="flex items-center gap-1">
                                        <span className="font-semibold text-white">HP:</span>
                                        <span className="text-gray-200">
                                          {character.character_stats.max_hit_points || '—'}
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-1">
                                        <span className="font-semibold text-white">AC:</span>
                                        <span className="text-gray-200">
                                          {character.character_stats.armor_class || '—'}
                                        </span>
                                      </div>
                                    </div>

                                    {/* Ability Scores */}
                                    <div className="grid grid-cols-3 gap-2 text-xs">
                                      {[
                                        { name: 'STR', value: character.character_stats.strength },
                                        { name: 'DEX', value: character.character_stats.dexterity },
                                        {
                                          name: 'CON',
                                          value: character.character_stats.constitution,
                                        },
                                        {
                                          name: 'INT',
                                          value: character.character_stats.intelligence,
                                        },
                                        { name: 'WIS', value: character.character_stats.wisdom },
                                        { name: 'CHA', value: character.character_stats.charisma },
                                      ].map((stat) => {
                                        const modifier = stat.value
                                          ? Math.floor((stat.value - 10) / 2)
                                          : 0;
                                        const modifierText =
                                          modifier >= 0 ? `+${modifier}` : `${modifier}`;
                                        return (
                                          <div
                                            key={stat.name}
                                            className="flex flex-col items-center p-2 bg-black/40 rounded backdrop-blur-sm"
                                          >
                                            <span className="font-semibold text-gray-300">
                                              {stat.name}
                                            </span>
                                            <span className="text-base font-bold text-white">
                                              {stat.value || '—'}
                                            </span>
                                            <span className="text-xs text-gray-300">
                                              ({modifierText})
                                            </span>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}

                                <Button
                                  onClick={() => startGameWithCharacter(character)}
                                  variant="fantasy"
                                  size="lg"
                                  className="w-full group-hover:shadow-lg transition-shadow duration-200"
                                >
                                  <Play className="h-5 w-5 mr-2" />
                                  Embark on Adventure
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        ) : (
          /* Game Interface Layout - Chat at top, details below */
          <div className="space-y-8">
            {/* AI DM Chat Window - Full Width */}
            <div className="w-full">
              <SimpleGameChatWithVoice
                campaignId={campaign.id}
                characterId={selectedCharacter!.id}
                campaignDetails={campaign}
                characterDetails={selectedCharacter}
              />
            </div>

            {/* Character and Campaign Details Below Chat */}
            <div className="grid lg:grid-cols-2 gap-8">
              {/* Campaign Details */}
              <Card className="bg-background/80 backdrop-blur-sm border-border/50">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-foreground">
                    <Shield className="w-5 h-5 text-infinite-purple" />
                    Campaign Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <span className="font-medium min-w-[4rem]">Era:</span>
                      <span>{campaign.era || 'Unknown'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <span className="font-medium min-w-[4rem]">Location:</span>
                      <span>{campaign.location || 'Unknown'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <span className="font-medium min-w-[4rem]">Atmosphere:</span>
                      <span>{campaign.atmosphere || 'Unknown'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <span className="font-medium min-w-[4rem]">Genre:</span>
                      <span>{campaign.genre || 'Unknown'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <span className="font-medium min-w-[4rem]">Difficulty:</span>
                      <span>{campaign.difficulty_level || 'Unknown'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <span className="font-medium min-w-[4rem]">Length:</span>
                      <span>{campaign.campaign_length || 'Unknown'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <span className="font-medium min-w-[4rem]">Tone:</span>
                      <span>{campaign.tone || 'Unknown'}</span>
                    </div>
                  </div>
                  {campaign.description && (
                    <Accordion type="single" collapsible className="w-full">
                      <AccordionItem value="description">
                        <AccordionTrigger className="text-sm font-medium hover:no-underline">
                          Description
                        </AccordionTrigger>
                        <AccordionContent className="text-sm text-muted-foreground pt-2">
                          <p>{campaign.description}</p>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  )}
                </CardContent>
              </Card>

              {/* Character Details */}
              {selectedCharacter && (
                <Card className="bg-background/80 backdrop-blur-sm border-border/50">
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-2 text-foreground">
                      <Sword className="w-5 h-5 text-infinite-teal" />
                      {selectedCharacter.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-infinite-purple to-infinite-teal flex items-center justify-center text-white text-xs font-bold">
                        {getInitial(selectedCharacter.name)}
                      </div>
                      <div>
                        <div className="font-semibold text-foreground">
                          Level {selectedCharacter.level || 1}
                        </div>
                        <div className="text-muted-foreground">
                          {selectedCharacter.race} {selectedCharacter.class}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-infinite-gold">
                      <Star className="w-4 h-4" />
                      <span>Active Hero</span>
                    </div>
                    {fullSelectedCharacter ? (
                      <div className="grid grid-cols-3 gap-2 mt-3">
                        {[
                          'strength',
                          'dexterity',
                          'constitution',
                          'intelligence',
                          'wisdom',
                          'charisma',
                        ].map((ability) => {
                          const abilityScore =
                            fullSelectedCharacter.abilityScores?.[
                              ability as keyof typeof fullSelectedCharacter.abilityScores
                            ];
                          return (
                            <div key={ability} className="text-center py-1">
                              <div className="text-xs font-medium capitalize">{ability}</div>
                              <div className="text-sm font-bold">
                                {abilityScore
                                  ? `${abilityScore.score} (${abilityScore.modifier >= 0 ? '+' : ''}${abilityScore.modifier})`
                                  : '—'}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-2 text-muted-foreground">
                        Loading character stats...
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
