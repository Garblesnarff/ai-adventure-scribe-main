import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Play, Users, Shield, Sword, Star, ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { SimpleGameChat } from '@/components/game/SimpleGameChat';
import { toast } from 'sonner';

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

interface Character {
  id: string;
  name: string;
  race: string;
  class: string;
  level: number | null;
}

export const SimpleCampaignView: React.FC = () => {
  const { id: campaignId } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null);
  const [loading, setLoading] = useState(true);
  const [isGameStarted, setIsGameStarted] = useState(false);

  const characterIdFromUrl = searchParams.get('character');

  useEffect(() => {
    if (campaignId) {
      loadCampaignData();
      loadUserCharacters();
    }
  }, [campaignId, user]);

  useEffect(() => {
    if (characterIdFromUrl && characters.length > 0) {
      const character = characters.find(c => c.id === characterIdFromUrl);
      if (character) {
        setSelectedCharacter(character);
        setIsGameStarted(true);
      }
    }
  }, [characterIdFromUrl, characters]);

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
      console.error('Error loading campaign:', error);
      toast.error('Failed to load campaign data');
    }
  };

  const loadUserCharacters = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('characters')
        .select('id, name, race, class, level')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCharacters((data || []).map(char => ({
        ...char,
        level: char.level || 1
      })) as Character[]);
    } catch (error) {
      console.error('Error loading characters:', error);
      toast.error('Failed to load characters');
    } finally {
      setLoading(false);
    }
  };

  const startGameWithCharacter = useCallback((character: Character) => {
    setSelectedCharacter(character);
    setIsGameStarted(true);
    setSearchParams({ character: character.id });
  }, [setSearchParams]);

  const backToCharacterSelection = useCallback(() => {
    setIsGameStarted(false);
    setSelectedCharacter(null);
    setSearchParams({});
  }, [setSearchParams]);

  // Memoize characters array to prevent unnecessary re-renders
  const memoizedCharacters = useMemo(() => characters, [characters]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="flex flex-col items-center space-y-2">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p className="text-muted-foreground">Loading campaign...</p>
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

  // Generate character avatar color
  const getCharacterAvatarColor = useMemo(() => (name: string) => {
    const colors = ['bg-infinite-purple', 'bg-infinite-gold', 'bg-infinite-teal', 'bg-destructive', 'bg-secondary'];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  }, []);

  const getInitial = useMemo(() => (name: string) => name.charAt(0).toUpperCase(), []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-indigo-100">
      {/* Campaign Banner Header */}
      <div className="relative">
        <div 
          className="h-64 bg-cover bg-center relative" 
          style={{ 
            backgroundImage: `url(${campaign.background_image || '/parchment-bg.png'})` 
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 to-transparent"></div>
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent h-32"></div>
        </div>
        
        {/* Header Content */}
        <div className="absolute top-8 left-8 right-8">
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-4xl font-bold text-white mb-2 drop-shadow-lg">{campaign.name}</CardTitle>
              <div className="flex flex-wrap gap-2 mb-4">
                <Badge variant="secondary" className="bg-infinite-gold/20 text-infinite-gold border-infinite-gold/30">{campaign.genre || 'Unknown'}</Badge>
                <Badge variant="secondary" className="bg-destructive/20 text-destructive border-destructive/30">{campaign.difficulty_level || 'Unknown'}</Badge>
                <Badge variant="secondary" className="bg-secondary/20 text-secondary-foreground border-secondary/30">{campaign.campaign_length || 'Unknown'}</Badge>
                <Badge variant="secondary" className="bg-secondary/20 text-secondary-foreground border-secondary/30">{campaign.tone || 'Unknown'}</Badge>
              </div>
              {campaign.description && (
                <p className="text-white/90 text-lg max-w-2xl drop-shadow-md leading-relaxed">{campaign.description}</p>
              )}
            </div>
            {isGameStarted && selectedCharacter && (
              <Button onClick={backToCharacterSelection} variant="outline" className="border-white/20 text-white hover:bg-white/10 backdrop-blur-sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Change Hero
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 relative z-10 -mt-16">
        <div className="grid lg:grid-cols-4 gap-8">
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
                </div>
              </CardContent>
            </Card>

            {isGameStarted && selectedCharacter && (
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
                      <div className="font-semibold text-foreground">Level {selectedCharacter.level || 1}</div>
                      <div className="text-muted-foreground">{selectedCharacter.race} {selectedCharacter.class}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-infinite-gold">
                    <Star className="w-4 h-4" />
                    <span>Active Hero</span>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3 space-y-8">
            {!isGameStarted ? (
              /* Enhanced Character Selection */
              <Card className="bg-background/80 backdrop-blur-sm border-border/50">
                <CardHeader className="pb-6">
                  <CardTitle className="flex items-center gap-2 text-2xl font-bold">
                    <Users className="h-6 w-6 text-infinite-purple" />
                    Select Your Hero
                  </CardTitle>
                  <p className="text-muted-foreground text-lg">Choose the character who will embark on this legendary quest</p>
                </CardHeader>
                <CardContent>
                  {memoizedCharacters.length === 0 ? (
                    <div className="text-center py-12 bg-muted/30 rounded-xl">
                      <Users className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground mb-6 text-lg">No heroes forged yet</p>
                      <Button onClick={() => window.location.href = '/characters/create'} variant="fantasy" size="lg" className="px-8">
                        <Play className="w-5 h-5 mr-2" />
                        Forge Your First Hero
                      </Button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {memoizedCharacters.map((character) => (
                        <Card key={character.id} className="group cursor-pointer hover:shadow-xl transition-all duration-300 border-border/50 overflow-hidden bg-gradient-to-br from-muted/50 to-transparent hover:from-accent/10">
                          <CardContent className="p-6 relative">
                            {/* Character Avatar */}
                            <div className={`absolute -top-4 left-6 w-20 h-20 rounded-full overflow-hidden border-4 border-background shadow-lg group-hover:scale-105 transition-transform duration-300 ${getCharacterAvatarColor(character.name)}`}>
                              <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-white">
                                {getInitial(character.name)}
                              </div>
                            </div>

                            <div className="pt-12 space-y-4">
                              <div>
                                <h3 className="text-xl font-bold text-foreground group-hover:text-infinite-purple transition-colors">{character.name}</h3>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                                  <Star className="w-4 h-4 text-infinite-gold" />
                                  <span>Level {character.level || 1}</span>
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-3 text-sm">
                                <div className="flex items-center gap-1 text-muted-foreground">
                                  <Shield className="w-4 h-4" />
                                  <span>{character.race}</span>
                                </div>
                                <div className="flex items-center gap-1 text-muted-foreground">
                                  <Sword className="w-4 h-4" />
                                  <span>{character.class}</span>
                                </div>
                              </div>

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
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              /* Enhanced Game Interface with Sidebar */
              <div className="space-y-6">
                <div className="flex gap-6">
                  <div className="w-80 bg-background/80 backdrop-blur-sm border border-border/50 rounded-2xl p-6 sticky top-24 self-start h-fit">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <Sword className="w-5 h-5 text-infinite-teal" />
                      Current Quest: {campaign.name}
                    </h3>
                    <div className="space-y-3 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="font-medium min-w-[5rem]">Genre:</span>
                        <Badge variant="secondary" className="bg-infinite-purple/20 text-infinite-purple">{campaign.genre}</Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium min-w-[5rem]">Difficulty:</span>
                        <Badge variant="destructive" className="bg-destructive/20 text-destructive">{campaign.difficulty_level}</Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium min-w-[5rem]">Length:</span>
                        <Badge variant="secondary" className="bg-secondary/20 text-secondary-foreground">{campaign.campaign_length}</Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium min-w-[5rem]">Tone:</span>
                        <Badge variant="secondary" className="bg-accent/20 text-accent-foreground">{campaign.tone}</Badge>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex-1">
                    <SimpleGameChat
                      campaignId={campaign.id}
                      characterId={selectedCharacter!.id}
                      campaignDetails={campaign}
                      characterDetails={selectedCharacter}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
